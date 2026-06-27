---
category: Features
order: 1
title: Inbound & Outbound
---
**Inbound & Outbound Deep Dive — WhatsApp Meta Edition**

A detailed walkthrough of how messages flow through RoboDesk V3, using the **`whatsapp-meta.js`** adapter and **`control.js`** as the primary examples.

---

<video controls width="100%" style="border-radius: 8px; margin-top: 1rem;">
  <source src="/assets/4-Inpound&Outpound_RoboDesk_V3_Message_Path.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

### 1. The Big Picture

Every interaction in RoboDesk flows through a three-layer sandwich:

```mermaid
graph TB
    subgraph "Layer 1: Adapter (whatsapp-meta.js)"
        direction LR
        IN_WH["Webhook: POST /services/{name}/webhook"]
        OUT_API["Facebook Graph API: POST /messages"]
    end

    subgraph "Layer 2: Control (control.js) — THE BRAIN"
        RCV["receive()"]
        ANZ["analyze()"]
        PRF["perform()"]
        FMT["formatMessage()"]
        HBR["handleBotReply()"]
    end

    subgraph "Layer 3: Conversation Usecase (conversation.js)"
        GC["getConversation()"]
        SEND["send()"]
        UPD["update()"]
        SAVE["saveMultiMsg()"]
    end

    IN_WH -->|"inbound()"| RCV
    RCV --> GC
    GC --> ANZ
    ANZ --> PRF
    PRF --> FMT
    FMT --> HBR
    HBR --> SEND
    SEND -->|"prepareBeforeOutbound()"| OUT_API
    SEND --> UPD
    UPD --> SAVE
```

**IMPORTANT:**  **control.js is a global singleton.** Line 79-83: if **`global.control`** already exists, the constructor returns it. There is only ever ONE instance of Control alive in the entire application. This is critical — every adapter (WhatsApp, Facebook, Telegram, etc.) calls the SAME **`control.receive()`** method.

---

### 2. Inbound Flow: Customer → RoboDesk

This is the complete journey of a customer message from WhatsApp to the agent's dashboard.

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Customer
    participant META as WhatsApp Cloud API
    participant WH as whatsapp-meta.js webhook
    participant IB as whatsapp-meta.inbound()
    participant CTRL as control.receive()
    participant CONTACT as contactRepo.createInbound()
    participant CONV as conversations.getConversation()
    participant ANZ as control.analyze()
    participant NLP as analyzer.analyze()
    participant PRF as control.perform()
    participant BOT as botFactory.handover()
    participant AI as control.handledAiReply()
    participant SEND as conversations.send()
    participant OB as adapter.prepareBeforeOutbound()
    participant DB as MongoDB
    participant WS as Socket.io
    participant AGENT as 🧑‍💻 Agent Dashboard

    C->>META: Sends "Hello"
    META->>WH: POST /{adapter-route}/webhook
    Note over WH: Parse webhook event, extract message type
    WH->>WH: Normalize into internal message format
    WH->>IB: inbound(message, from, channelId)
    IB->>CTRL: control.receive(from, channelId, message)

    Note over CTRL: Strip leading '+' from phone number

    CTRL->>CONTACT: Find or create contact for this phone number
    CONTACT-->>CTRL: Returns contact object (isBlocked, labels, etc.)

    CTRL->>CONV: Get or create conversation
    Note over CONV: Searches for open conversation with same from+channel
    CONV-->>CTRL: Returns conversation object (_c)

    alt Brand New Conversation
        Note over CTRL: Log "New interaction started"
        CTRL->>CTRL: Apply summary context from previous interactions
        CTRL->>CTRL: Check if conversation is billable
    end

    CTRL->>DB: Save incoming message + system logs

    alt Conversation has an assigned agent (handledBy exists)
        CTRL->>WS: Notify agent via Socket.io "new-msg"
        Note over AGENT: Agent sees message in dashboard
        opt AI Assistant enabled
            CTRL->>BOT: Run AI copilot in background
        end
    else No agent assigned (bot handling)
        alt Bot step is active (_c.bot exists)
            CTRL->>BOT: botFactory.create(bot).handover(message, intention, ...)
            BOT-->>AI: Returns AI reply object
            AI->>PRF: Navigate to next step if needed
            PRF-->>AI: Returns performReply
            AI-->>CTRL: Returns {_c, botReply}
            CTRL->>SEND: conversations.send(conv, botReply, channel)
            SEND->>OB: adapter.prepareBeforeOutbound(msg, ...)
            OB->>META: POST to Facebook Graph API /messages
            META->>C: Customer receives bot reply
        else Traditional NLP step
            CTRL->>ANZ: analyze(from, conv, message)
            ANZ->>NLP: analyzer.analyze(message, expected)
            NLP-->>ANZ: Returns entities, procedure, language
            ANZ->>ANZ: Match entities to conversation step
            ANZ->>PRF: perform(conv) — execute step state machine
            PRF-->>ANZ: Returns reply message
            ANZ-->>CTRL: Returns botReply
            CTRL->>SEND: conversations.send(conv, botReply, channel)
            SEND->>OB: adapter.prepareBeforeOutbound(msg, ...)
            OB->>META: POST to Graph API
            META->>C: Customer receives reply
        end
    end
```

**What happens at each numbered step:**

| **#** | **Method** | **File** | **What It Does** |
| --- | --- | --- | --- |
| 1-4 | Webhook handler | **`whatsapp-meta.js:86`** | Meta sends POST with webhook event payload |
| 5 | **`inbound()`** | **`whatsapp-meta.js:597`** | One-liner: calls **`control.receive()`** |
| 6 | **`receive()`** | **`control.js:898`** | **The entry point for ALL inbound messages from ALL adapters** |
| 7 | **`createInbound()`** | **`contact.js`** | Finds existing contact by phone or creates a new one |
| 8 | **`getConversation()`** | **`conversation.js`** | Finds open conversation or creates new one with default procedure |
| 9-10 | System logging | **`control.js:920-956`** | Creates "New interaction started" log, applies summary history |
| 11 | **`saveMultiMsg()`** | **`conversation.js`** | Batch-saves all messages to MongoDB |
| 12 | Bot/Agent routing | **`control.js:975-1041`** | **The critical decision point** — see next section |

---

### 3. Outbound Flow: RoboDesk → Customer

Outbound messages go through the adapter's **`prepareBeforeOutbound()`** → **`outbound()`** chain.

```mermaid
sequenceDiagram
    autonumber
    participant SRC as Source (Bot reply / Agent UI)
    participant SEND as conversations.send()
    participant PBO as adapter.prepareBeforeOutbound()
    participant FH as fileHostingFactory
    participant OB as adapter.outbound()
    participant META as Facebook Graph API
    participant C as 👤 Customer

    SRC->>SEND: Send reply message object
    SEND->>PBO: prepareBeforeOutbound(msg, channelId, lastInteraction, to)

    alt Plain text message
        PBO->>OB: outbound({reply: {text, type: "text"}}, to)
    else Template message with attachment
        PBO->>FH: Upload attachment to S3/GCP
        FH-->>PBO: Returns signed URL
        PBO->>OB: outbound(msg with signed URL, to)
    else Array of messages
        loop For each message
            PBO->>OB: outbound(msg, to)
        end
    end

    Note over OB: Build WhatsApp API payload

    OB->>OB: createPayloadBasedOnMessageType()
    Note over OB: Determines: text / template / image / video / document / interactive / carousel

    OB->>META: axios.post("graph.facebook.com/.../messages", payload)
    META-->>OB: Returns {messages: [{id: "wamid.xxx"}]}
    OB-->>PBO: Returns {msgId, isTemplate}
    PBO-->>SEND: Returns message with channelId attached

    SEND->>SEND: Save outbound message to DB
    META->>C: Customer receives message on WhatsApp
```

**Outbound Message Type Decision Tree**

The adapter's **`createPayloadBasedOnMessageType()`** method (line 896) determines the exact WhatsApp API payload structure:

```mermaid
graph TD
    START["Incoming message object"] --> IS_CAROUSEL{"Is carousel template?"}
    IS_CAROUSEL -->|Yes| CAROUSEL["createCarouselTemplatePayload()"]
    IS_CAROUSEL -->|No| IS_TEMPLATE{"Has .template property?"}

    IS_TEMPLATE -->|Yes| TEMPLATE["Build template payload with params, language, components"]
    IS_TEMPLATE -->|No| CHECK_TYPE{"Check reply.type"}

    CHECK_TYPE -->|"image"| IMG["Payload: {image: {link, caption}}"]
    CHECK_TYPE -->|"document"| DOC["Payload: {document: {link, filename}}"]
    CHECK_TYPE -->|"video"| VID["Payload: {video: {link, caption}}"]
    CHECK_TYPE -->|"audio/voice"| AUD["Payload: {audio: {link}}"]
    CHECK_TYPE -->|"interactive"| INT{"Check contentType"}
    CHECK_TYPE -->|"text/default"| TXT["Payload: {text: {body}}"]

    INT -->|"buttons"| BTN["createInteractiveButtonPayload() — max 3 buttons"]
    INT -->|"list"| LST["createInteractiveListPayload() — expandable list menu"]
    INT -->|"product_list"| PROD["createInteractiveProductListPayload()"]
    INT -->|"form_flow"| FORM["createInteractiveFormFlowPayload()"]
    INT -->|"location"| LOC["createInteractiveLocationPayload()"]
```

---

### 4. Deep Dive: whatsapp-meta.js Adapter

**File: `Infra/Adapters/whatsapp-meta.js` (1,568 lines, 75KB)**

This adapter connects to the **WhatsApp Cloud API** (Meta's direct API, not a third-party BSP).

**Class Structure**

```mermaid
classDiagram
    class IntervalCleanerInterface {
        <<abstract>>
    }

    class whatsappMetaGateway {
        -settings: Object
        -phoneAutocorrectService: PhoneAutocorrectService

        +constructor(express, config)

        %% === INBOUND ===
        +inbound(message, from, conversation)
        +download2(url) : Promise~Buffer~
        +downloadURL(url) : Promise~Buffer~
        +download(url, res) : Promise~Buffer~
        +downloadWhatsAppDocument(responseData) : Promise

        %% === OUTBOUND ===
        +prepareBeforeOutbound(msg, channelId, lastInteraction, to, metadata, mediaObj) : Promise
        +outbound(msg, to, channel, lastInteraction, enableSend, options) : Promise
        +createPayloadBasedOnMessageType(msg, to, mediaObj) : Object
        +createInteractiveButtonPayload(object, to) : Object
        +createInteractiveListPayload(object, to) : Object
        +createInteractiveLocationPayload(object, to) : Object
        +createInteractiveProductListPayload(object, to) : Object
        +createInteractiveFormFlowPayload(object, to) : Object
        +createCarouselTemplatePayload(msg, to) : Object

        %% === TEMPLATE MANAGEMENT ===
        +createTemplate(obj) : Promise
        +listTemplates(adapterObj) : Promise
        +getTemplate(templateName) : Object
        +deleteTemplate(templateObj) : Promise

        %% === INTEGRATION ===
        +selfIntegration(adapterName, config, reqType) : Promise
        +removeConfiguration(pageName, config) : Promise
        +subscribeToFields(config) : Promise
        +registerPhoneNumber(config) : Promise
        +isPhoneNumberRegistered(config) : Promise

        %% === UTILITIES ===
        +autocorrectPhoneNumber(to) : Array
        +cleanUrl(url) : String
        +initiate(conv, to, convid) : Promise
        +typingIndicator(msgId, psid, isTyping) : Promise
        +uploadMediaFile(imageUrl) : Promise~String~
        +setTemplateFilename(payload) : void
        +sanitizeText(text) : String
        +withRetry(fn, retries) : Promise
    }

    IntervalCleanerInterface <|-- whatsappMetaGateway
```

**Inbound Webhook Message Parsing (lines 166-309)**

When a customer sends a message, Meta's webhook delivers the raw payload. The adapter normalizes every message type into a standard internal format:

| **WhatsApp Type** | **Internal Type** | **Key Fields Extracted** |
| --- | --- | --- |
| **`text`** | **`text`** | **`text: body`** |
| **`interactive.button_reply`** | **`text`** | **`text: button_reply.title`** |
| **`interactive.list_reply`** | **`text`** | **`text: list_reply.title`** |
| **`interactive.nfm_reply`** | **`text`** | **`text: response_json`**, **`formData: parsed JSON`** |
| **`image`** | **`image`** | **`attachement: graph.facebook.com/{imageId}`** |
| **`video`** | **`video`** | **`attachement: graph.facebook.com/{videoId}`** |
| **`audio`** / **`voice`** | **`audio`** | **`attachement: graph.facebook.com/{audioId}`** |
| **`document`** | **`document`** | **`attachement: graph.facebook.com/{docId}`** |
| **`location`** | **`location`** | **`latitude, longitude`** |
| **`reaction`** | **`reaction`** | **`text: emoji, channelId: original_msg_id`** |
| **`button`** | **`text`** | **`text: button.text`** |
| **`sticker`** / **`contact`** | **Ignored** | **`message = null`** |

**TIP:**  All media (images, audio, documents) are NOT downloaded at this stage. Only the Facebook Graph API media ID URL is stored. The actual download happens later when needed.

**Error Code Mapping (lines 29-78)**

The adapter has a comprehensive mapping of WhatsApp Cloud API error codes to failure categories:

| **Category** | **Error Codes** | **Meaning** |
| --- | --- | --- |
| **Unreachable** | 131026, 131049, 131048, 133010, 136004 | Customer can't receive messages (blocked, not on WhatsApp, spam limit) |
| **Configuration** | 0, 3, 10, 190, 131005, 132000-132016 | Server setup error (bad token, missing template, payment issue) |
| **TimeWindow** | 131047 | 24-hour window expired — must send a template to re-engage |

---

### 5. Deep Dive: control.js — The Brain

**File: `Services/Usecases/control.js` (2,609 lines, 136KB)**

This is the **central nervous system** of the entire application. It orchestrates every message from initial receipt through NLP analysis, procedure step navigation, bot handover, and response delivery.

**Class Structure**

```mermaid
classDiagram
    class Control {
        <<Singleton via global.control>>

        %% === INBOUND ENTRY POINTS ===
        +receive(from, channelId, message)
        +receiveVoice(from, conversation, message, token, statusIsVoice, isCreate)

        %% === NLP & ANALYSIS ===
        +analyze(from, conv, message) : Promise~Reply~
        +match(conv, msg) : void
        +checkChangeBotIntention(message, conv) : Promise

        %% === STATE MACHINE ===
        +perform(conv) : Promise~Reply~
        +getStep(conv, stepName) : Step
        +getDefault(channel) : Procedure

        %% === BOT / AI ===
        +handledAiReply(conv, reply) : Promise~BotReply~
        +handleBotReply(conv, botReply, messageArray, question) : void
        +setTimeoutImplementation(conv, notChangeIntentionFlag, contextPayload) : Promise
        +checkMessagesCount(conv, msgDate, checkCount, oldCombinedMessage) : Promise

        %% === MESSAGE FORMATTING ===
        +formatMessage(reply, contact, channel, convId) : Array
        +prepareMessage(conv) : Promise~Reply~

        %% === LANGUAGE ===
        +changeLanguageMoonshoot(text, conv) : Promise~String~
        +detectLang(text) : Promise~String~
        +checkLanguageDetected(procedure, language) : Boolean

        %% === SCHEDULED CAMPAIGNS ===
        +startScheduled() : Promise~Number~
        +processDispatchesInBatches(dispatchList, now) : Promise~Array~
        +processDispatchWithFreshData(freshDispatch, now) : Promise~Result~
        +processInitialDispatchAttempt(freshDispatch) : Promise~Result~
        +processRetryDispatchAttempt(freshDispatch, now) : Promise~Result~

        %% === STATUS & UPDATES ===
        +updateMsgStatus(from, channel, status, msgId, reason, failureCategory)
        +status(status, contact, channel, closed, channelId, channelStatus, channelIsHold)
        +statusVoice(status, contact, channel, channelId)

        %% === EXTERNAL INTEGRATIONS ===
        +updateStepAndPushMessage(convId, from, stepName, fields, values, messages, channel, procedureId)
        +updateStepAndPushMessageAlfaScan(...)
        +updateStepAndPushMessageRoyalLabs(...)

        %% === UTILITY ===
        +trace(conv, action) : void
        +dateDiffInSec(d1, d2) : Number
        +chunk(arr, size) : Array
        +resolveConditionalAttribute(conv, selectedAttribute) : any
        +ensureMoonshotSummaryInjectedFlag(conv) : void
    }
```

**The `receive()` Method — Step by Step (line 898)**

This is the most important method in the entire codebase. Here is exactly what happens:

```mermaid
graph TD
    START["receive(from, channelId, message)"] --> STRIP["Strip '+' from phone number"]
    STRIP --> CREATE_CONTACT["contactRepo.createInbound(from, channel)"]
    CREATE_CONTACT --> GET_CONV["conversations.getConversation(from, channel, message, contact)"]
    GET_CONV --> SET_MSG["_c.message = message"]

    SET_MSG --> IS_NEW{"_c.created == true?"}
    IS_NEW -->|Yes| APPLY_SUMMARY["Apply summary context from past interactions"]
    APPLY_SUMMARY --> CHECK_BILLABLE["Check if billable (WhatsApp billing rules)"]
    CHECK_BILLABLE --> LOG_NEW["Create system logs: 'New interaction started'"]
    IS_NEW -->|No| SKIP_NEW["Skip new-conversation setup"]

    LOG_NEW --> CHECK_BOT_MEDIA{"Bot active AND unsupported media?"}
    SKIP_NEW --> CHECK_BOT_MEDIA
    CHECK_BOT_MEDIA -->|Yes, proceed to AI disabled| FAIL_STEP["Navigate to fail step"]
    CHECK_BOT_MEDIA -->|Yes, proceed to AI enabled| ADD_META["Append unsupported media metadata"]
    CHECK_BOT_MEDIA -->|No| CONTINUE["Continue"]

    FAIL_STEP --> SAVE_MSG
    ADD_META --> SAVE_MSG
    CONTINUE --> SAVE_MSG["Save all messages to MongoDB"]

    SAVE_MSG --> CHECK_HOLD{"On hold with holdRouting?"}
    CHECK_HOLD -->|Yes| EMIT_HOLD["Emit InteractionHoldInactive event"]
    CHECK_HOLD -->|No| CHECK_AGENT{"Has assigned agent?"}

    CHECK_AGENT -->|"Yes (handledBy exists)"| NOTIFY_AGENT["Notify agent via Socket.io"]
    NOTIFY_AGENT --> CHECK_AI{"AI Assistant enabled?"}
    CHECK_AI -->|Yes| RUN_COPILOT["Run AI copilot in background"]
    CHECK_AI -->|No| DONE["Done ✅"]

    CHECK_AGENT -->|"No (unassigned)"| CHECK_BLOCKED{"Contact blocked?"}
    CHECK_BLOCKED -->|Yes| DONE
    CHECK_BLOCKED -->|No| CHECK_STATUS{"Status is routed/pending?"}
    CHECK_STATUS -->|Yes| DONE
    CHECK_STATUS -->|No| IS_BOT{"_c.bot == currentStep.name?"}

    IS_BOT -->|"Yes (AI Bot active)"| CHANGE_LANG["changeLanguageMoonshoot()"]
    CHANGE_LANG --> HAS_BUFFER{"moonshotBuffer enabled?"}
    HAS_BUFFER -->|Yes| TIMEOUT["setTimeoutImplementation() — wait for more messages"]
    HAS_BUFFER -->|No| DIRECT_HANDOVER["Direct botFactory.handover()"]
    TIMEOUT --> HANDLED_AI["handledAiReply()"]
    DIRECT_HANDOVER --> HANDLED_AI
    HANDLED_AI --> FORMAT["formatMessage() + handleBotReply()"]

    IS_BOT -->|"No (classic NLP)"| ANALYZE["this.analyze(from, conv, message)"]
    ANALYZE --> FORMAT
    FORMAT --> DONE

    EMIT_HOLD --> CHECK_AGENT
```

**The `perform()` Method — The Procedure State Machine (line 1183)**

This is the **step execution engine**. It's a giant **`switch`** statement that navigates through the conversation's procedure (workflow) steps. Each step has a **`type`** that determines what action to take:

```mermaid
graph TD
    START["perform(conv)"] --> CHECK_NULL{"conv or currentStep is null?"}
    CHECK_NULL -->|Yes| RETURN_NULL["Return null"]
    CHECK_NULL -->|No| CHECK_REPEAT{"Step repeat >= procedure.repeat?"}

    CHECK_REPEAT -->|Yes| HANDLE_EXCEED["Find 'other' entity → failStep"]
    CHECK_REPEAT -->|No| ADD_LABELS["Add AI labels from step"]

    ADD_LABELS --> SET_EXPIRY["Set nextExpiry timer if step has expiry"]
    SET_EXPIRY --> SWITCH{"switch(currentStep.type)"}

    SWITCH -->|"message"| MSG["Prepare reply message from step template"]
    SWITCH -->|"break"| BRK["Send message, then auto-advance to next step"]
    SWITCH -->|"end"| END_STEP["Close conversation, update contact, close dispatches"]
    SWITCH -->|"action"| ACTION["Execute actions (step.action, navigate to success/fail)"]
    SWITCH -->|"change bot"| CHG_BOT["Switch to AI bot — handover to Moonshot/Botpress"]
    SWITCH -->|"conditional"| COND["Evaluate regex conditions on conv attributes"]
    SWITCH -->|"failover"| FAIL["Execute failover action, set status"]
    SWITCH -->|"time"| TIME["Check if current time is within working hours"]
    SWITCH -->|"form"| FORM["Fill form with personalization data, submit ticket"]
    SWITCH -->|"flow"| FLOW["Send WhatsApp Flow interactive message"]
    SWITCH -->|"location"| LOCN["Send location request message"]
    SWITCH -->|"reminder"| REM["Send reminder message"]

    ACTION -->|"Recurse"| START
    COND -->|"Recurse"| START
    TIME -->|"Recurse"| START
    FORM -->|"Recurse"| START
    BRK -->|"Recurse"| START
```

**Step Types Reference**

| **Step Type** | **What It Does** | **Recurses?** |
| --- | --- | --- |
| **`message`** | Sends a pre-configured message to the customer. Waits for input. | No |
| **`break`** | Sends a message but immediately advances to the **`next`** step without waiting. | **Yes** |
| **`end`** | Closes the conversation. Sets **`closed = true`**, **`clousureType = 'completed'`**. Updates contact's last interaction data. | No |
| **`action`** | Executes a server-side action function (e.g., call an API, query a database). Navigates to **`success`** or **`fail`** step based on result. | **Yes** |
| **`change bot`** | Hands conversation over to an AI chatbot (Moonshot, Botpress). The bot takes full control until it returns a **`close`** or **`failover`** interaction. | No (async) |
| **`conditional`** | Evaluates regex patterns against conversation attributes. Routes to matching step or **`on_failure_step`**. | **Yes** |
| **`failover`** | Executes an action and sends a message, typically used for error recovery or escalation to human agent. | No |
| **`time`** | Checks if the current time falls within configured working hours. Routes to **`success`** (in hours) or **`fail`** (off hours). | **Yes** |
| **`form`** | Fills a form/ticket using personalization data and submits it. Used for creating support tickets mid-conversation. | **Yes** |
| **`flow`** | Sends a WhatsApp Flow (interactive multi-screen form) to the customer. | No |
| **`location`** | Sends a location request to the customer. | No |
| **`reminder`** | Sends a reminder notification message. | No |

**WARNING:**  Steps that recurse (marked **Yes**) call **`perform()`** again from within **`perform()`**. This means a single customer message can trigger a chain of 5-10+ steps executing back-to-back before a reply is finally sent. Be very careful when debugging — a single **`receive()`** call can cascade through multiple steps.

---

### 6. The Procedure State Machine

A **Procedure** is a conversation workflow defined in the database. It consists of an array of **Steps**, and each step defines:

```mermaid
graph LR
    subgraph "Procedure (workflow)"
        direction TB
        S1["Step: greeting
        type: message
        messages: ['Hello! How can I help?']"]

        S2["Step: detect_intent
        type: change bot
        bot: moonshot-v2"]

        S3["Step: check_hours
        type: time
        success: route_agent
        fail: off_hours_msg"]

        S4["Step: route_agent
        type: failover
        action: routeToAgent
        effect: 'routed'"]

        S5["Step: off_hours_msg
        type: message
        messages: ['Our hours are 9-5']
        next: end_conv"]

        S6["Step: end_conv
        type: end
        effect: 'completed'"]

        S1 -->|"customer responds"| S2
        S2 -->|"bot says 'failover'"| S3
        S3 -->|"in hours"| S4
        S3 -->|"off hours"| S5
        S5 -->|"auto-advance"| S6
    end
```

**How the system tracks position:**

- **`_conv.procedure`** — The full procedure object (loaded from DB at conversation creation)
- **`_conv.currentStep`** — A reference to the current step within **`procedure.steps[]`**
- **`_conv.personalization`** — Key-value store populated by step fields (like a form being filled)
- **`_conv.intention`** — The AI bot's current conversation flow/intent
- **`_conv.bot`** — Name of the currently active AI bot (null if classic NLP)
- **`_conv.entities`** — Array of detected NLP entities across the conversation

**`getStep(conv, stepName)`** (line 2361) is the navigation method — it simply does:

```jsx
return conv.procedure.steps.find(st => st.name == stepName);
```

---

### 7. Bot Handover & AI Pipeline

When a step of type **`change bot`** is reached, the system switches from rule-based NLP to full AI control:

```mermaid
sequenceDiagram
    autonumber
    participant CTRL as control.perform()
    participant BF as botFactory.create(botName)
    participant BOT as Moonshot/Botpress Bot
    participant HAR as control.handledAiReply()
    participant PRF as control.perform()

    CTRL->>BF: Create bot service instance
    BF-->>CTRL: Returns bot service

    Note over CTRL: Set _conv.bot = stepName

    alt Moonshot Buffer is enabled
        CTRL->>CTRL: setTimeoutImplementation()
        Note over CTRL: Wait N seconds for customer to send more messages
        CTRL->>CTRL: Combine all subsequent messages into one
        CTRL->>BOT: botService.handover(combinedMessage, intention, language, ...)
    else Direct mode
        CTRL->>BOT: botService.handover(message, intention, language, ...)
    end

    BOT-->>CTRL: Returns {status, interaction, intention, step, cleanedData, trace, sessionState}

    CTRL->>HAR: handledAiReply(conv, reply)

    Note over HAR: Process AI response

    alt reply.status exists
        HAR->>HAR: Update conversation status and classification
    end

    alt reply.intention exists
        HAR->>HAR: moonshot.changeIntention(conv, intention)
    end

    alt reply.step exists
        HAR->>HAR: Navigate to specified step
        HAR->>PRF: perform(conv) — execute the new step
    end

    alt reply.interaction == "close" or "failover"
        HAR->>HAR: Navigate to currentStep.success or .fail
        HAR->>PRF: perform(conv) — execute step chain
    end

    HAR-->>CTRL: Returns {_c, botReply}
```

**The `moonshotBuffer` Feature**

This is a smart message-batching system. When enabled:

1. Customer sends "Hi"
2. System starts a timer (e.g., 3 seconds)
3. Customer sends "I need help with my order"
4. Timer resets
5. Customer sends "Order #12345"
6. Timer expires → All 3 messages are combined: "Hi I need help with my order Order #12345"
7. Combined message is sent to AI as a single request

This dramatically improves AI accuracy by giving it full context instead of fragmented messages.

---

### 8. Dispatch / Scheduled Outbound Campaigns

The **`startScheduled()`** system handles proactive outbound messaging (campaigns, reminders, follow-ups):

```mermaid
graph TD
    CRON["Cron job calls control.startScheduled()"] --> GET_DUE["conversations.getDue() — Find campaigns ready to send"]
    GET_DUE --> BATCH["processDispatchesInBatches(dispatches, now)"]

    BATCH --> LOOP["For each batch of 50"]
    LOOP --> FRESH["Re-read dispatch from DB (prevent race conditions)"]

    FRESH --> CHECK{"Dispatch status?"}
    CHECK -->|"attemptsDone == 0"| INITIAL["processInitialDispatchAttempt()"]
    CHECK -->|"attemptsDone > 0"| RETRY["processRetryDispatchAttempt()"]
    CHECK -->|"CANCELLED or exhausted"| SKIP["Skip (already processed)"]

    INITIAL --> START["conversations.start() — Create outbound conversation"]
    START --> TEMPLATE["Send template message via adapter"]
    TEMPLATE --> UPDATE_DB["Atomic update: attemptsDone + 1, status = IN_PROGRESS"]

    RETRY --> CHECK_COND{"Previous attempt status matches executeOnStatus?"}
    CHECK_COND -->|Yes| START
    CHECK_COND -->|No| WAIT["Wait for next iteration"]
```

**NOTE:**  Race condition prevention is critical here. The system uses **atomic MongoDB updates** with **`{_id: dispatchId, attemptsDone: expectedValue}`** as the filter. If another process already incremented **`attemptsDone`**, the update fails silently and the dispatch is skipped. Additionally, **`retryWithBackoff()`** handles MongoDB WriteConflict errors with exponential backoff.

---

### 9. Status Webhooks & Delivery Tracking

After sending a message, WhatsApp sends status webhooks back. The adapter handles these at lines 96-163:

```mermaid
graph LR
    WH["Status Webhook arrives"] --> IS_STATUS{"Is status webhook?"}
    IS_STATUS -->|No| PROCESS_MSG["Process as incoming message"]
    IS_STATUS -->|Yes| STATUS_TYPE{"Status type?"}

    STATUS_TYPE -->|"delivered / read"| DELIVERED["updateMsgStatus(to, channel, 'delivered', msgId)"]
    STATUS_TYPE -->|"sent"| SENT["updateMsgStatus(to, channel, '', msgId, 'Message Undelivered')"]
    STATUS_TYPE -->|"failed"| FAILED["Parse error code → map to failure category"]

    FAILED --> CAT{"Failure category?"}
    CAT -->|"Unreachable"| UNREACH["Customer blocked/not on WA"]
    CAT -->|"Configuration"| CONFIG["System config error"]
    CAT -->|"TimeWindow"| WINDOW["24h window expired"]

    DELIVERED --> DELAY["⏱️ 5-second delay (race condition prevention)"]
    SENT --> DELAY
    FAILED --> DELAY
    DELAY --> UPDATE["control.updateMsgStatus()"]
```

**WARNING:**  Notice the 5-second **`setTimeout()`** delay on all status webhook handlers (lines 113, 147, 157). This exists because WhatsApp often sends the delivery status webhook BEFORE RoboDesk has finished saving the outbound message's **`templateMId`** to the database. Without this delay, the status update would fail to find the matching conversation.

---

### 10. Key Method Reference Table

Quick-reference for the most important methods when debugging:

| **Method** | **File:Line** | **Purpose** |
| --- | --- | --- |
| **`receive()`** | **`control.js:898`** | **THE** entry point for all inbound messages |
| **`analyze()`** | **`control.js:1049`** | NLP analysis + entity matching + language detection |
| **`perform()`** | **`control.js:1183`** | Step state machine — executes current step type |
| **`getStep()`** | **`control.js:2361`** | Navigate to a named step in the procedure |
| **`match()`** | **`control.js:431`** | Match detected entities against expected step entities |
| **`handledAiReply()`** | **`control.js:765`** | Process AI bot response (status, intention, step changes) |
| **`handleBotReply()`** | **`control.js:579`** | Format and send bot reply to customer |
| **`formatMessage()`** | **`control.js:541`** | Convert reply objects into message array format |
| **`setTimeoutImplementation()`** | **`control.js:671`** | Message batching timer for Moonshot buffer |
| **`startScheduled()`** | **`control.js:366`** | Cron entry point for outbound campaigns |
| **`inbound()`** | **`whatsapp-meta.js:597`** | Adapter → Control bridge (calls **`control.receive()`**) |
| **`outbound()`** | **`whatsapp-meta.js:619`** | Build payload and POST to WhatsApp API |
| **`prepareBeforeOutbound()`** | **`whatsapp-meta.js:474`** | Handle attachments, templates, arrays before sending |
| **`createPayloadBasedOnMessageType()`** | **`whatsapp-meta.js:896`** | Build the exact WhatsApp API JSON payload |
| **`updateMsgStatus()`** | **`control.js`** | Update delivery/read status from webhooks |

---

**TIP:**  **Pro debugging tip:** When tracing a message through the system, search the console logs for these prefixes:

- **`RECEIVE STARTED`** — Message just arrived at **`control.receive()`**
- **`[CHANGE-BOT-START]`** — Switching to AI bot
- **`[HANDLED-AI-REPLY-START]`** — Processing AI bot's response
- **`[FAILOVER-DECISION]`** — Bot decided to escalate/close
- **`[SCHEDULE]`** — Outbound campaign processing
- **`[EXPIRY-SET]`** — Step timer configured