# RoboDesk — AI-First Enterprise CX Platform

## High-Level Architecture Documentation

---

<video controls width="100%" style="border-radius: 8px; margin-top: 1rem;">
  <source src="/assets/1-Robodesk-architecture_RoboDesk_Architecture.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## 1. Platform Overview

**RoboDesk** is an AI-first, omni-channel enterprise Customer Experience (CX) platform. It enables organizations to manage customer interactions across 20+ communication channels (WhatsApp, Facebook, Instagram, Email, SMS, Voice/SIP, Telegram, LinkedIn, and more) from a single unified agent workspace.

The platform combines real-time messaging, AI-powered automation (via Moonshot), a ticketing system, quality control, workforce management, and deep analytics — all orchestrated through a monolithic Node.js backend that communicates with external AI services, databases, and message queues.

![Platform_Architecture_Message_Journey_Flow-part1.png](/assets/1-Robodesk-architecture_Platform_Architecture_Message_Journey_Flow-part1.png)

### Key Capabilities

| Capability | Description |
| --- | --- |
| **Omni-Channel Inbox** | Unified agent workspace for 20+ channels |
| **AI Copilot (Moonshot)** | AI-driven chat, summarization, image/audio recognition, RAG |
| **Automation Engine** | Trigger-Action system for workflow automation |
| **Ticketing System** | Full ticket lifecycle with custom forms and workflows |
| **Knowledge Base** | Articles with AI-powered RAG search |
| **Quality Control** | AI-assisted conversation scoring and agent evaluation |
| **Workforce Management** | Shifts, attendance, auto-distribution of work |
| **Analytics & Reporting** | Real-time insights via Kibana dashboards |
| **SSO Integration** | Enterprise single sign-on via Themis IDP |

---

## 2. Architecture Diagram

```mermaid
graph TB
    subgraph "DevOps & Testing"
        EE["Eagle Eye<br/>(E2E Tests)"]
        ARGO["Argo CD<br/>(GitOps)"]
        GHA["GitHub Actions<br/>(CI Pipeline)"]
    end

    subgraph "Client Layer"
        WEB["Web App<br/>(AngularJS SPA)"]
    end

    subgraph "External Channels"
        WA["WhatsApp"]
        FB["Facebook"]
        IG["Instagram"]
        TG["Telegram"]
        EM["Email/Office365"]
        SIP_CH["Voice/SIP"]
        SMS_CH["SMS"]
        LI["LinkedIn"]
    end

    subgraph "Application Server"
        API["Express.js API<br/>(Dynamic Router)"]
        MW["Middlewares<br/>(Auth, Logger, Shift)"]
        CTRL["Controllers<br/>(50 REST endpoints)"]
        UC["Use Cases<br/>(Business Logic)"]
        CMD["Commander<br/>(Trigger-Action Engine)"]
        ADAPT["Adapters<br/>(40 Channel Connectors)"]
        SM["Service Mesh<br/>(EventHub)"]
    end

    subgraph "AI Layer"
        MS["Moonshot<br/>(AI Engine)"]
        LF["Langfuse<br/>(Prompt Management)"]
        NLP["NLP Module<br/>(Intent Recognition)"]
    end

    subgraph "Data Layer"
        REDIS["Redis<br/>(RT DB + PubSub + MQ)"]
        MONGO["MongoDB<br/>(Primary Store)"]
        MINIO["MinIO/S3<br/>(File Storage)"]
    end

    subgraph "Analytics Layer"
        ELK["Elasticsearch<br/>(ELK)"]
        KB["Kibana<br/>(Dashboards)"]
        GENIE["Genie<br/>(Tenant Provisioner)"]
    end

    subgraph "Identity"
        SSO["SSO / Themis<br/>(OAuth2 IDP)"]
    end

    WEB -->|"HTTP/WS"| API
    WA & FB & IG & TG & EM & SIP_CH & SMS_CH & LI -->|"Webhooks"| ADAPT
    API --> MW --> CTRL --> UC
    UC --> CMD
    UC --> ADAPT
    SM -->|"Redis PubSub"| REDIS
    UC -->|"Mongoose"| MONGO
    UC -->|"AI API calls"| MS
    MS -->|"Prompt fetch"| LF
    MONGO -->|"Monstache sync"| ELK
    ELK --> KB
    REDIS -->|"Message Queue"| UC
    GENIE -->|"Provisions"| MONGO
    GENIE -->|"Provisions"| KB
    GENIE -->|"Provisions"| MINIO
    SSO -->|"OAuth2 Code Flow"| API
    GHA -->|"Build + Push Image"| ARGO
    EE -->|"Playwright Tests"| WEB
```

# RoboDesk Architecture — Part 2: Application Layer Deep Dive

---
![Desk_Application_Technical_Architecture_Overview-part2.png](/assets/1-Robodesk-architecture_Desk_Application_Technical_Architecture_Overview-part2.png)
## 3. Web Application (Frontend)

### Tech Stack

| Technology | Purpose |
| --- | --- |
| **AngularJS 1.x** | SPA framework (MVC pattern) |
| **Materialize CSS** | UI component library |
| **jQuery 3.7.1** | DOM manipulation |
| **Socket.IO** | Real-time bidirectional communication |
| **Chart.js** | Dashboard charting |
| **TinyMCE** | Rich text editor (email composition) |
| **SIP.js** | WebRTC-based voice calls |
| **Gulp** | Build pipeline (minify, concat, optimize) |

### Frontend Architecture

The frontend is a **server-side rendered SPA** — the AngularJS app is served as static files directly from the Express.js backend.

```
Infra/web/                    ← Development source
├── index.html                ← Single entry point (loads all scripts)
├── css/                      ← Stylesheets (Materialize, themes, custom)
├── js/
│   ├── app.js                ← AngularJS module declaration (67KB)
│   ├── routes.js             ← UI-Router state definitions (23KB)
│   ├── controller/           ← 69 AngularJS controllers
│   ├── models/               ← Data models (API service wrappers)
│   ├── services/             ← 31 shared services
│   ├── directives.js         ← Custom AngularJS directives
│   ├── helpers.js            ← Utility functions
│   └── translate.js          ← i18n translation strings (245KB)
├── templates/                ← HTML partial templates
├── img/                      ← Static images
├── fonts/                    ← Custom font files
└── sound/                    ← Notification audio files

Infra/dist/                   ← Production build (generated by Gulp)
```

### Build Pipeline (Gulp)

The `gulpfile.js` defines a build pipeline that compiles `Infra/web/` → `Infra/dist/`:

1. **clean** — Removes previous `dist/` output
2. **copyHtml** — Minifies all HTML (collapse whitespace, remove comments)
3. **styles** — Minifies CSS via CSSO
4. **copyJs** — Uglifies JS (drops `console.log` and `debugger` in production)
5. **imageMin** — Optimizes PNG/JPG/GIF images
6. **copyFonts/copyStorage/copyJson** — Copies static assets

> [!NOTE]
When `PORT=8500` (development), Express serves from `Infra/web/`. Otherwise it serves from `Infra/dist/` (production minified build).
> 

### Key Frontend Controllers

| Controller | Size | Purpose |
| --- | --- | --- |
| `conversations.controller.js` | 342KB | Main agent inbox — real-time conversation handling |
| `conversations.history.controller.js` | 294KB | Historical conversation search and review |
| `ticket.view.controller.js` | 238KB | Ticket detail view with full lifecycle management |
| `form.tickets.controller.js` | 167KB | Ticket forms, filters, bulk operations |
| `menu.controller.js` | 134KB | Main navigation, notifications, global state |
| `flow_designer.controller.js` | 130KB | Visual flow builder for bot procedures |
| `procedure.create.controller.js` | 89KB | Bot procedure step editor |
| `automation.controller.js` | 90KB | Trigger-Action automation rule builder |
| `insights.controller.js` | 88KB | Analytics dashboards and charts |

---

## 4. API Layer & Dynamic Routing

### How Routing Works

RoboDesk uses a **convention-based dynamic router**. At startup, `main.js` scans the `Services/Controllers/` folder and automatically mounts each file as an API endpoint:

```jsx
// main.js — Dynamic route registration
const routes = fs
  .readdirSync("./Services/Controllers/")
  .map((file) => file.replace(".js", ""));

for (let route of routes)
  app.use(
    `/api/${route}`,
    require(`./Services/Controllers/${route}`)(app, express, server)
  );
```

**Example:** `Services/Controllers/conversation.js` → mounted at `/api/conversation`

### All 50 API Endpoints

| Endpoint | Domain |
| --- | --- |
| `/api/conversation` | Core inbox operations (55KB of routes) |
| `/api/contact` | Contact CRUD and search |
| `/api/user` | Agent management (13KB) |
| `/api/settings` | Instance configuration |
| `/api/adapter` | Channel adapter management |
| `/api/form.tickets` | Ticket operations (15KB) |
| `/api/insight` | Analytics queries (23KB) |
| `/api/procedure` | Bot procedure management |
| `/api/flow_builder` | Visual flow designer API |
| `/api/qualityControl` | QC scoring API |
| `/api/oauth` | SSO authentication |
| `/api/prompts` | Langfuse prompt management |
| `/api/article` | Knowledge base articles |
| `/api/shiftmgt` | Shift management |
| `/api/billing` | Subscription and billing |
| `/api/system` | System-level operations |
| ...and 34 more | Various domain modules |

### Middleware Pipeline

Every request passes through this middleware chain (in order):

```mermaid
graph LR
    REQ["Incoming Request"] --> BP["Body Parser<br/>(JSON 50MB limit)"]
    BP --> COMP["Compression<br/>(gzip)"]
    COMP --> CORS["CORS"]
    CORS --> LOG["Logger<br/>(Request logging)"]
    LOG --> AUTH["check-auth<br/>(JWT + SSO + Base64)"]
    AUTH --> SHIFT["check-shift-expiry<br/>(Workforce validation)"]
    SHIFT --> ERR["Error Handler"]
    ERR --> CTRL["Controller"]
```

### Authentication Middleware (`check-auth.js` — 311 lines)

The auth system supports **three authentication methods**:

1. **JWT Tokens** — Primary method. Access token (24h TTL) + refresh token (30d TTL)
2. **SSO/OAuth2** — Via Themis IDP (see SSO section)
3. **Base64 Credentials** — Legacy API access

Key features:

- **Token compression** — Large JWT tokens are ZIP-compressed (AdmZip) to fit cookie size limits
- **LRU Cache** — Decompressed tokens are cached (500 entries) to avoid repeated decompression
- **Permission-based access** — Each endpoint has a required permission code checked against the user's role
- **Billing suspension check** — Suspended instances get blocked before auth
- **Auto-refresh** — Expired access tokens are automatically refreshed using the refresh token

---

## 5. Adapters (Channel Connectors)

Adapters are the **bridge between external communication channels and RoboDesk**. Each adapter normalizes incoming messages from a specific channel into RoboDesk's internal format, and converts outgoing messages back to the channel's format.

### How Adapters Load

At startup, `main.js` reads active adapters from MongoDB and dynamically instantiates them:

```jsx
let adapters = global.settingsChannels.filter(x => x.mode == 'active');
for (let adapter of adapters) {
    global.adapters[adapter.name] = new(require(`./Infra/Adapters/${adapter.adapter}`))(
        app,
        { route: `/services/${adapter.name}/`, settings: adapter },
        server
    );
    global.from[adapter.name] = adapter.identifier;
}
```

Each adapter registers its own webhook routes under `/services/{adapterName}/`.

### All 40 Adapter Modules

| Category | Adapters | Files |
| --- | --- | --- |
| **WhatsApp** | Meta Cloud API, 360Dialog (3 variants), Unofficial WA | `whatsapp-meta.js` (80KB), `whatsapp360.js`, `whatsapp360-cloud.js`, `unofficialwhatsapp.js` (53KB) |
| **Meta Social** | Facebook Messenger (2), Facebook Comments, Instagram DM, Instagram Comments | `facebook.js`, `messenger.js`, `facebook-comments.js`, `instagram.js`, `insta-comments.js` |
| **Email** | IMAP (3 variants), Office 365 (Graph API) | `email.js` (49KB), `email-2.js`, `email-3.js`, `office365.js` (50KB) |
| **Voice** | Twilio, Twilio SIP, Asterisk AMI, SIP.js | `twilio.js`, `twilio-sip.js`, `asterisk.js`, `sip.js` |
| **SMS** | Generic SMS, VictoryLink, Vodafone, Infobip | `sms.js`, `SMS-VictoryLink.js`, `sms-vodafone.js`, `infobip-2.js` |
| **Other** | Telegram, LinkedIn, Web Chat, Edge, Zagel, MFMS, Freshdesk | Various files |
| **Internal** | RoboAgent (bot-to-bot), Virtual | `roboagent.js`, `virtual.js` |

---

## 6. Service Layer (Clean Architecture)

### Layered Architecture

```mermaid
graph TB
    subgraph "Services Layer"
        CTRL2["Controllers<br/>(HTTP routing)"]
        UC2["Use Cases<br/>(Business logic)"]
        CMD2["Commander<br/>(Automation engine)"]
        FACT["Factories<br/>(Object creation)"]
        STRAT["Strategies<br/>(Algorithms)"]
        DI2["DI Container<br/>(Dependency injection)"]
    end
    subgraph "Infra Layer"
        REPO["Repositories<br/>(Data access)"]
        MODEL["Models<br/>(Mongoose schemas)"]
        ADAPT2["Adapters<br/>(External systems)"]
        MAP["Mappers<br/>(Data transformation)"]
        DS["DataStores<br/>(Redis client)"]
        INT["Integrations<br/>(3rd party APIs)"]
    end
    CTRL2 --> UC2
    UC2 --> REPO
    UC2 --> CMD2
    CMD2 --> FACT
    FACT --> STRAT
    REPO --> MODEL
    UC2 --> MAP
    UC2 --> DS
    UC2 --> INT
    DI2 -.->|"registers"| FACT
```

### Core Repositories (Data Access — 50 files)

Located in `Infra/Reposatories/`, each repository wraps Mongoose model operations:

- `conversation.js` (61KB) — Core conversation CRUD, archival, search
- `archived.js` (139KB) — Conversation archival with Elasticsearch sync
- `form.tickets.js` (29KB) — Ticket operations with custom fields
- `moonshot.js` (13KB) — Moonshot AI API client
- `langfuse.js` (5KB) — Langfuse prompt management client
- `user.js` (10KB) — User/agent management
- `settings.js` (25KB) — Instance configuration

### Core Use Cases (Business Logic — 67 files)

Located in `Services/Usecases/`, these contain the business rules:

- `conversation.js` (430KB!) — The largest file; handles the entire conversation lifecycle
- `control.js` (141KB) — Bot control flow execution
- `form.tickets.js` (149KB) — Ticket lifecycle management
- `actions.js` (294KB) — Automation action implementations
- `user.js` (62KB) — Agent operations, login, status management
- `settings.js` (35KB) — Instance settings management
- `moonshot.js` (7KB) — AI service orchestration

### Design Patterns Used

| Pattern | Implementation | Purpose |
| --- | --- | --- |
| **Repository** | `Infra/Reposatories/*` | Abstracts data access from business logic |
| **Factory** | `Services/Factories/` (Abstracts, Concretes, Creators) | Creates trigger/action objects dynamically |
| **Strategy** | `Services/Strategy/` | Timeout strategies, bot sanitization |
| **Commander** | `Services/Commander/triggerActionCommander.js` | Executes trigger-action automation rules |
| **Dependency Injection** | `Services/DI/` (DIContainer + DIMap) | Registers auto-distribution strategies |
| **Singleton** | `EventHub`, `AutoDistributionEventEmitter` | Ensures single instances for global services |
| **Observer/EventEmitter** | `Services/event-emitters/` | Decoupled event-driven communication |

# RoboDesk Architecture — Part 3: Data Layer & Analytics

---

![Data_Architecture__Operations_to_Analytics- part3.png](/assets/1-Robodesk-architecture_Data_Architecture__Operations_to_Analytics-_part3.png)

## 7. Real-Time Database (Redis)

Redis serves **three critical roles** in RoboDesk simultaneously:

### 7.1 Real-Time Cache & Session Store

The Redis client (`Infra/DataStores/redisClient.js`) is a **singleton** with automatic reconnection using an exponential backoff strategy: `[1s, 5s, 30s, 1m, 5m, 15m, 30m, 1h, 2h, 3h]`.

### 7.2 Pub/Sub EventHub (Cross-Instance Sync)

The **EventHub** (`Services/service-mesh/service-consumer/EventHub.js`) is the backbone of multi-instance synchronization. When RoboDesk runs multiple replicas (K8s pods), changes made on one instance must propagate to all others.

```mermaid
sequenceDiagram
    participant Pod1 as RoboDesk Pod 1
    participant Redis as Redis PubSub
    participant Pod2 as RoboDesk Pod 2
    participant Pod3 as RoboDesk Pod 3

    Pod1->>Redis: PUBLISH "{hostname}-EventHub" {type: "settings"}
    Redis->>Pod2: SUBSCRIBE notification
    Redis->>Pod3: SUBSCRIBE notification
    Pod2->>Pod2: Reload settings from MongoDB
    Pod3->>Pod3: Reload settings from MongoDB
```

**Synced event types:**

| Event Type | What Gets Refreshed |
| --- | --- |
| `procedures` | Bot procedures reloaded into memory |
| `entities` | NLP entities updated in memory |
| `adapters` | Channel adapter configs refreshed |
| `settings` | Global settings reloaded |
| `action` | Automation trigger-actions refreshed |
| `ticketFields` | Ticket custom field cache invalidated |

### 7.3 Message Queue (Redis Lists)

The message queue system (`Services/service-mesh/message-queue-providers/redis.list.webdis.js`) uses **Redis Lists** as a lightweight job queue for asynchronous processing (lab system results, scan system results, etc.).

**How it works:**

1. **Producer** pushes JSON messages to a Redis list via `LPUSH`
2. **Consumer** polls with `RPOP` at a configurable interval (`global.settings.redisPopTime`)
3. Messages are processed one-by-one through a callback with configurable throttling

The system includes a **circuit breaker** strategy for resilient reconnection.

---

## 8. MongoDB (Primary Data Store)

MongoDB is the **single source of truth** for all operational data. Connected via Mongoose with a **replica set** configuration for high availability.

### Connection Configuration

```
mongodb://user:pass@node1:27017,node2:27017,node3:27017/robodesk-{tenant}
  ?retryWrites=true
  &replicaSet=rs0
  &readPreference=primary
  &authSource=admin
  &authMechanism=SCRAM-SHA-1
```

### Key Collections (from Repository/Core analysis)

| Collection | Repository File | Purpose |
| --- | --- | --- |
| `conversations` | `conversation.js` (61KB) | Active and recent conversations |
| `archiveds` | `archived.js` (139KB) | Archived conversations (synced to ELK) |
| `messages` | `message.js` | All conversation messages |
| `users` | `user.js` | Agents, admins, supervisors |
| `contacts` | `contact.js` | Customer contact records |
| `settings` | `settings.js` | Instance-level configuration |
| `adapters` | `adapter.js` | Channel adapter configurations |
| `procedures` | `procedure.js` | Bot conversation flows |
| `entities` | `entity.js` | NLP entity definitions |
| `intents` | `intent.js` | NLP intent definitions |
| `activities` | `activity.js` | Agent activity logs |
| `labels` | `label.js` | Conversation tags/labels |
| `labelsactivities` | `labelsActivity.js` | Label usage tracking |
| `qualitycontrols` | `qualityControl.js` | QC evaluation records |
| `tickets` | `form.tickets.js` | Ticket records with custom fields |
| `articles` | `article.js` | Knowledge base articles |
| `attendances` | `attendance.js` | Agent attendance records |
| `triggerSchemas` | `triggerSchema.js` | Automation trigger definitions |
| `actions` | `action.js` | Automation action configurations |
| `teams` | `team.js` | Agent team groupings |
| `roles` | `roles.js` | Permission roles |
| `accesses` | `access.js` | API endpoint permission mappings |

### Data Retention Strategy

- **Active conversations** stay in MongoDB for operational use
- **Archived conversations** are written to **both** MongoDB AND Elasticsearch via Monstache
- **Tenant data deletion**: When tenant data is purged, only tenant-specific records are removed from MongoDB. The **raw data in Elasticsearch is preserved** for AI model training
- **Messages older than 15 days** are available via a separate Elasticsearch alias (`messages-log`) for long-term analytics

---

## 9. Monstache (MongoDB → Elasticsearch Sync)

**Monstache** is the real-time sync pipeline that mirrors MongoDB data into Elasticsearch. It acts as a **Change Data Capture (CDC)** bridge.

```mermaid
graph LR
    MONGO2["MongoDB<br/>(Replica Set)"] -->|"Change Streams<br/>(oplog tailing)"| MONST["Monstache<br/>(CDC Bridge)"]
    MONST -->|"Index Documents"| ELK2["Elasticsearch<br/>(ELK Stack)"]
    MONST -->|"Index Documents"| MONGO3["MongoDB<br/>(Archival Collections)"]
```

### What Gets Synced

Based on the Genie provisioning script and Kibana role definitions, these collections are synced to Elasticsearch indices:

| MongoDB Collection | Elasticsearch Index | Purpose |
| --- | --- | --- |
| `archiveds` | `robodesk-{tenant}.archiveds` | Archived conversation data |
| `activities` | `activities.robodesk-{tenant}` | Agent activity timelines |
| `qualitycontrols` | `qualitycontrols.robodesk-{tenant}` | QC scores and evaluations |
| `attendances` | `attendances.robodesk-{tenant}` | Shift attendance records |
| `users` | `users.robodesk-{tenant}` | Agent metadata for reporting |
| `labelsactivities` | `robodesk-{tenant}.labelsactivities` | Label usage analytics |
| `messages` | `robodesk-{tenant}.messages` | All conversation messages |

### Dual-Write Architecture

The key insight is that Monstache writes to **two places**:

1. **Elasticsearch** — For analytics, search, and Kibana dashboards
2. **MongoDB archival collections** — For operational queries on archived data

This ensures data survives even if MongoDB operational data is purged for a tenant.

---

## 10. Elasticsearch & Kibana (Analytics Layer)

### Elasticsearch

Elasticsearch stores the analytical copy of all platform data. It powers:

- **Full-text search** across archived conversations and messages
- **Aggregation queries** for insights dashboards
- **RAG search** for AI knowledge base (`elk-8.robodesk.ai/rag/_search`)
- **Long-term data retention** (data persists even after MongoDB tenant cleanup)

### Kibana (Reporting Portal)

Kibana provides the **self-service analytics and reporting** interface.

Each tenant gets their own **Kibana Space** with isolated dashboards, provisioned automatically by the Genie module.

**Two access roles per tenant:**

| Role | Permissions |
| --- | --- |
| `{tenant}-report-viewer` | Read-only access to dashboards and discover |
| `{tenant}-report-designer` | Full dashboard creation + discover access |

Both roles have read access to all tenant-specific Elasticsearch indices.

### Messages-Log Alias

A special Elasticsearch alias is created for each tenant:

```
robodesk-{tenant}.messages-log → robodesk-{tenant}.messages (where createdAt < now-15d)
```

This alias filters to only show messages **older than 15 days**, providing a client-facing view that excludes recent operational data — useful for historical reporting without exposing live conversations.

---

## 11. Data Flow Lifecycle

```mermaid
sequenceDiagram
    participant Customer
    participant Channel as External Channel
    participant Adapter as Adapter Layer
    participant API as Express API
    participant UC as Use Case
    participant Bot as Bot Engine
    participant AI as Moonshot AI
    participant Mongo as MongoDB
    participant Monstache as Monstache
    participant ELK as Elasticsearch
    participant Kibana as Kibana
    participant Redis as Redis
    participant Agent as Agent (Web App)

    Customer->>Channel: Sends message
    Channel->>Adapter: Webhook POST
    Adapter->>Adapter: Normalize message format
    Adapter->>UC: Route to conversation use case
    UC->>Mongo: Save message
    UC->>Redis: Notify via PubSub
    Redis->>Agent: Socket.IO push

    alt Bot-Handled
        UC->>Bot: Execute procedure
        Bot->>AI: Chat/Classify request
        AI-->>Bot: AI response
        Bot->>Adapter: Send reply
        Adapter->>Channel: API call
        Channel->>Customer: Delivers response
    else Agent-Handled
        Agent->>API: Agent types reply
        API->>UC: Process reply
        UC->>Mongo: Save message
        UC->>Adapter: Send reply
        Adapter->>Channel: API call
        Channel->>Customer: Delivers response
    end

    Note over Mongo,ELK: Async Background Sync
    Mongo->>Monstache: Change stream event
    Monstache->>ELK: Index document
    ELK->>Kibana: Available for dashboards
```

# RoboDesk Architecture — Part 4: AI, DevOps & Supporting Systems

---

![RoboDesk_AI_and_DevOps_Architecture-part4.png](/assets/1-Robodesk-architecture_RoboDesk_AI_and_DevOps_Architecture-part4.png)

## 12. AI Layer — Moonshot

Moonshot is the **external AI engine** that powers all intelligent features in RoboDesk. It runs as a separate service (not in this repository) and is accessed via HTTP API calls.

### API Endpoint Structure

Each tenant gets a dedicated Moonshot instance at: `https://{MoonshotBucket}.robodesk.ai`

### Moonshot Capabilities

| API Endpoint | Purpose | Used By |
| --- | --- | --- |
| `/backend/api/chat/` | Conversational AI (text chat with prompt) | Bot engine, AI copilot |
| `/backend/api/v2/chat/` | Multi-modal chat (text + images + audio) | Enhanced bot with media |
| `/backend/api/chat/summarize` | Conversation summarization | Auto-summary feature |
| `/backend/api/image/recognition` | Image analysis (base64 input) | Bot image understanding |
| `/backend/api/audio/recognition` | Audio transcription/analysis | Voice message processing |
| `/backend/api/vectors/` | RAG vector indexing | Knowledge base ingestion |
| `/backend/api/rag/{ref}` | Remove RAG content | Article deletion |
| `/fscrawler/api/_document` | Document extraction (PDF, DOCX) | Knowledge base file upload |

### How Moonshot Integrates

```mermaid
graph LR
    subgraph "RoboDesk"
        UC3["Use Cases<br/>(conversation.js, control.js)"]
        MS_UC["moonshot.js<br/>(Service Layer)"]
        MS_REPO["moonshot.js<br/>(Repository Layer)"]
    end
    subgraph "Moonshot Platform"
        CHAT["Chat API"]
        SUM["Summarize API"]
        RAG["RAG/Vector API"]
        IMG["Image Recognition"]
        AUD["Audio Recognition"]
    end
    subgraph "Langfuse"
        PROMPTS["Prompt Store"]
    end

    UC3 --> MS_UC
    MS_UC --> MS_REPO
    MS_REPO -->|"HTTP POST"| CHAT
    MS_REPO -->|"HTTP POST"| SUM
    MS_REPO -->|"HTTP POST"| RAG
    MS_REPO -->|"HTTP POST"| IMG
    MS_REPO -->|"HTTP POST"| AUD
    CHAT -.->|"Fetches prompts"| PROMPTS
```

### Tag Extraction System

Moonshot responses contain **embedded tags** that RoboDesk parses to extract metadata:

- `<interaction:value>` — Interaction classification
- `<status:value>` — Conversation status update
- `<intention:value>` — Customer intent detection
- `<step:value>` — Current bot procedure step
- `<qc-phase-attribute-severity-weight>` — Quality control scores
- `<session_state>JSON</session_state>` — Persistent bot session state
- `[reason text]` — QC evaluation reasons

### Context Injection

Business context is appended to AI messages using a special format:

```
User message <contextStart>{"ticketId": "123", "status": "open"}</contextStart>
```

---

## 13. Langfuse (AI Prompt Management)

Langfuse is used to **manage, version, and deploy AI prompts** used by Moonshot. The integration is in `Infra/Reposatories/langfuse.js`.

### How It Works

- The Langfuse API is accessed through Moonshot's backend: `{moonshotBaseUrl}/backend/api/prompts/{tenantId}`
- Each tenant has isolated prompts identified by `tenantId`
- The RoboDesk frontend has a **Prompts management UI** (`prompts.js` controller) for CRUD operations

### Langfuse API Operations

| Operation | Method | Purpose |
| --- | --- | --- |
| List prompts | `GET /` | Paginated list with filters (name, label, tag, date) |
| Create prompt | `POST /` | New prompt with type (text/chat), config, labels, tags |
| Get version | `GET /{name}?version=N` | Retrieve specific prompt version |
| Set active | `PATCH /{name}/versions/{v}` | Promote a version to active |

---

## 14. SSO (Single Sign-On) — Themis Integration

RoboDesk supports enterprise SSO via **OAuth2 Authorization Code Flow** with Themis as the Identity Provider (IDP).

### SSO Authentication Flow

```mermaid
sequenceDiagram
    participant Agent as Agent Browser
    participant Robo as RoboDesk Backend
    participant Themis as Themis IDP

    Agent->>Robo: GET /api/oauth/initiate
    Robo->>Robo: Generate session ID
    Robo->>Agent: 302 Redirect to Themis
    Agent->>Themis: Login page
    Themis->>Agent: 302 Redirect back with auth code
    Agent->>Robo: POST /api/oauth/login {code, sessionId}
    Robo->>Themis: Exchange code for token
    Themis-->>Robo: Access token + user info
    Robo->>Robo: Find/create user, generate JWT
    Robo->>Agent: Set cookies (access_token, session_active, ssoSessionId)
```

### Security Features

- **CSRF Protection** — Session ID state parameter validated on callback
- **No refresh tokens for SSO** — Sessions expire based on Themis token TTL
- **Cookie-based transport** — `httpOnly`, `secure`, `sameSite` flags
- **Automatic session cleanup** — Expired SSO sessions clear all cookies

---

## 15. CI/CD Pipeline

### GitHub Actions → Argo CD Flow

```mermaid
graph LR
    DEV["Developer Push"] --> GHA["GitHub Actions<br/>(CI Pipeline)"]
    GHA --> DOCKER["Docker Build<br/>(node:14-bullseye)"]
    DOCKER --> GHCR["GitHub Container<br/>Registry (GHCR)"]
    GHA --> KUST["Update Kustomize/<br/>Helm values"]
    KUST --> GIT["Git Commit<br/>(image tag update)"]
    GIT --> ARGO2["Argo CD<br/>(GitOps Sync)"]
    ARGO2 --> K8S["Kubernetes<br/>Cluster (GCP)"]
```

### CI Pipeline Details (`CI-gcp.yml`)

1. **Trigger**: Push to any feature branch, staging, or main
2. **Build**: Docker image from `Dockerfile` (Node 14 + Puppeteer deps)
3. **Push**: Image tagged with `GITHUB_SHA` to `ghcr.io`
4. **Deploy**: Helm values file updated with new image tag:
    - `values-dev.yaml` — Feature branches
    - `values-staging.yaml` — Staging branch
    - `values-prod.yaml` — Main branch
5. **Argo CD** detects the Git change and syncs the deployment

### Branch Strategy

| Branch | Environment | Helm Values |
| --- | --- | --- |
| `feature-one` through `feature-twenty` | Dev/Test | `values-dev.yaml` |
| `staging` | Staging | `values-staging.yaml` |
| `main` / `main-gcp` | Production | `values-prod.yaml` |
| `hotfix-1`, `hotfix-2` | Production (urgent) | `values-prod.yaml` |

### Kubernetes Deployment

- **Replicas**: 2 pods per deployment
- **Port**: 8500
- **Secrets**: Injected via `robo-secrets` K8s secret
- **Image Pull**: From GHCR with `regcred`
- **Node Selector**: Linux nodes
- **Tolerations**: Production node taints

---

## 16. Eagle Eye (E2E Testing)

Eagle Eye is a **separate repository** (`eagleeye/`) containing the end-to-end automation test suite for RoboDesk.

### Architecture

Eagle Eye runs as a **Docker Compose stack** with three services:

| Service | Purpose |
| --- | --- |
| `eagleeye` | Playwright-based E2E test runner |
| `webserver` | Nginx server for test result viewing |
| `logstash` | Ships test results to Elasticsearch |

### Test Infrastructure

- **Test Framework**: Playwright (`USE_PLAYWRIGHT_ONLY=1`)
- **Execution**: Can run on schedule (`FREQUENCY`) or one-shot (`RUN_ONCE`)
- **Parallelism**: Configurable parallel test execution (`PARALLEL`)
- **Recording**: Browser session recording support (`ENABLE_RECORDING`)
- **Screenshots**: Failure screenshot capture (`ENABLE_SCREENSHOT`)
- **Results**: JSONL format, shipped to Elasticsearch via Logstash

### Test Coverage Areas

Based on environment variables, tests cover:

- Outbound messaging (multi-channel)
- Agent routing and rerouting
- SIP/Voice call handling
- Interaction calculations and revisit logic
- WhatsApp 360Dialog integration
- Multi-agent workflows (4 concurrent workers)

---

## 17. Genie (Tenant Provisioner)

Genie (`Genie/` directory) is the **automated tenant onboarding system**. When a new customer instance is created, Genie provisions all required infrastructure.

### What Genie Provisions

```mermaid
graph TB
    GENIE2["Genie<br/>(Node 18 + mongosh + gcloud)"]
    GENIE2 -->|"1. Clone template DB"| MONGO4["MongoDB<br/>(New tenant database)"]
    GENIE2 -->|"2. Create bucket"| MINIO2["MinIO<br/>(File storage bucket)"]
    GENIE2 -->|"3. Create space + roles"| KB2["Kibana<br/>(Dashboards + RBAC)"]
    GENIE2 -->|"4. Create ELK user"| ELK3["Elasticsearch<br/>(Access credentials)"]
```

### Provisioning Steps (from `run.sh`)

1. **MongoDB**: Check if DB exists → If not, `mongodump` template → `mongorestore` with tenant name → Initialize settings → Create superuser
2. **MinIO**: Create dedicated storage bucket for tenant files
3. **Kibana**: Create space → Import dashboard templates → Create `report-viewer` and `report-designer` roles → Create messages-log alias (15-day filter) → Create tenant ELK user

### Genie Docker Image

- Base: `node:18-bullseye`
- Includes: `mongosh`, `mongodb-database-tools`, `gcloud CLI`
- Has its own CI pipeline (`CI-genie-init.yml`)

---

## 18. NS Sandbox

The NS (Namespace) Sandbox is a **Kubernetes namespace isolation** mechanism for testing. It allows feature branches to be deployed in isolated environments that mirror production.

Each sandbox namespace gets:

- Its own RoboDesk deployment (linked to a feature branch)
- Isolated database (via Genie provisioning)
- Separate adapter configurations

The sandbox setting is stored in `global.sandbox` (loaded from MongoDB settings at startup).

---

## 19. Repository Structure Reference

```
RoboDesk/
├── RoboDesk-V3/                    ← Main application
│   ├── main.js                     ← Application entry point (264 lines)
│   ├── package.json                ← Dependencies (100+ packages)
│   ├── Dockerfile                  ← Container image (Node 14)
│   ├── gulpfile.js                 ← Frontend build pipeline
│   ├── .env                        ← Environment configuration
│   ├── .github/workflows/          ← CI/CD pipelines
│   │   ├── CI.yml                  ← GitHub Packages pipeline
│   │   ├── CI-gcp.yml              ← GCP/GHCR pipeline (primary)
│   │   └── CI-genie-init.yml       ← Genie provisioner pipeline
│   ├── Core/                       ← Core domain models (53 files)
│   │   ├── conversation.js (13KB)  ← Conversation schema
│   │   ├── settings.js (25KB)      ← Settings schema
│   │   └── ...                     ← All Mongoose model definitions
│   ├── Infra/                      ← Infrastructure layer
│   │   ├── Adapters/ (40 files)    ← Channel connectors
│   │   ├── Reposatories/ (50 files)← Data access repositories
│   │   ├── Models/                 ← Additional model definitions
│   │   ├── Mappers/                ← Data transformation mappers
│   │   ├── DataStores/             ← Redis client singleton
│   │   ├── Interfaces/             ← Interface contracts
│   │   ├── integrations/           ← Third-party API integrations
│   │   ├── Config/                 ← App configuration files
│   │   ├── web/                    ← Frontend source (development)
│   │   ├── dist/                   ← Frontend build (production)
│   │   └── utils/                  ← Infrastructure utilities
│   ├── Services/                   ← Business logic layer
│   │   ├── Controllers/ (50 files) ← REST API endpoints
│   │   ├── Usecases/ (67 files)    ← Business logic implementations
│   │   ├── Commander/              ← Trigger-Action automation engine
│   │   ├── Factories/              ← Object creation (Abstract/Concrete/Creator)
│   │   ├── Strategy/               ← Algorithm strategies
│   │   ├── DI/                     ← Dependency injection container
│   │   ├── middlewares/            ← Express middleware (auth, logging)
│   │   ├── service-mesh/           ← Redis PubSub + Message Queue
│   │   ├── event-emitters/         ← Event-driven communication
│   │   ├── enums/                  ← System constants and enums
│   │   ├── nlp/                    ← NLP processing modules
│   │   ├── seeders/                ← Database initialization scripts
│   │   ├── lib/                    ← Error logging framework
│   │   └── utils/                  ← Service utilities
│   ├── Genie/                      ← Tenant provisioning system
│   │   ├── Dockerfile              ← Genie container (Node 18)
│   │   └── rootfs/opt/robodesk-genie/
│   │       ├── run.sh              ← Main provisioning script
│   │       ├── scripts/            ← DB init, MinIO, ELK setup
│   │       └── src/kibana/         ← Kibana dashboard templates
│   ├── k8s-deployment/             ← K8s manifests (Kustomize)
│   │   ├── stable-version/         ← Production deployment
│   │   ├── staging-version/        ← Staging deployment
│   │   └── feature-version/        ← Feature branch deployment
│   └── k8s-gcp-deployment/         ← GCP Helm chart
│       ├── Chart.yaml              ← Helm chart metadata
│       ├── values-dev.yaml         ← Dev environment values
│       ├── values-staging.yaml     ← Staging values
│       ├── values-prod.yaml        ← Production values
│       └── templates/              ← K8s resource templates
│
└── eagleeye/                       ← E2E Test Suite
    ├── docker-compose.yml          ← Test infrastructure
    ├── services/
    │   ├── eagleeye/               ← Playwright test runner
    │   ├── webserver/              ← Results web viewer
    │   └── logstash/               ← Results → ELK shipper
    └── docs/                       ← Test documentation
```

---

## 20. Component Communication Summary

```mermaid
graph TB
    subgraph "Synchronous Communication"
        A1["Web App ↔ API"] -->|"HTTP REST + WebSocket"| A2["via Express.js + Socket.IO"]
        B1["API ↔ MongoDB"] -->|"TCP"| B2["via Mongoose driver"]
        C1["API ↔ Moonshot"] -->|"HTTPS"| C2["via Axios HTTP client"]
        D1["API ↔ Langfuse"] -->|"HTTPS"| D2["via Axios through Moonshot"]
        E1["API ↔ Channels"] -->|"HTTPS Webhooks"| E2["via Adapter modules"]
        F1["API ↔ SSO"] -->|"OAuth2 HTTPS"| F2["via Themis IDP"]
    end

    subgraph "Asynchronous Communication"
        G1["Pod ↔ Pod"] -->|"Redis PubSub"| G2["via EventHub singleton"]
        H1["External Systems ↔ API"] -->|"Redis Lists"| H2["via Message Queue consumer"]
        I1["MongoDB ↔ Elasticsearch"] -->|"Change Streams"| I2["via Monstache CDC"]
    end
```

---

> [!TIP]
**For new developers**: Start by understanding `main.js` (the application bootstrap), then explore the specific domain you'll work on through its Controller → Use Case → Repository chain. The conversation domain (`conversation.js` at each layer) is the most complex and the heart of the platform.
>