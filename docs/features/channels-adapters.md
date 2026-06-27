---
category: Features
order: 3
title: Channels & Adapters
---
# Understanding Core Concepts: Channels, Adapters, Triggers, and Actions

<video controls width="100%" style="border-radius: 8px; margin-top: 1rem;">
  <source src="/assets/6-Channels,-Adapters,-Triggers,-and-Actions_Channels_and_Adapters.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

Welcome to the Robodesk-v3 codebase! If you are a new developer, understanding how the system communicates with the outside world and how it executes dynamic workflows is essential.

This guide breaks down two fundamental architectural pairs in the system:

1. **Channels vs. Adapters** (How the system talks to users)
2. **Triggers vs. Actions** (How the system automates behavior)

---

## 1. Channels and Adapters: Communication Layer

The relationship between Adapters and Channels is essentially the relationship between a **Blueprint (Class)** and an **Instance (Object)**. They work together to handle inbound and outbound communication across platforms like WhatsApp, Facebook Messenger, Emails, and Web Chat.

### What is an Adapter?

An **Adapter** is the concrete implementation and codebase that knows *how* to communicate with a specific 3rd-party platform. It acts as the translation layer between external platforms and Robodesk.

- **Location:** `Infra/Adapters/` (e.g., `web.js`, `facebook.js`, `whatsapp360.js`, `sms.js`)
- **Role:**
    - Handles external API requests (e.g., calling Facebook Graph API to send a message).
    - Listens to external Webhooks (e.g., receiving inbound messages from WhatsApp).
    - Standardizes incoming messages into a universal Robodesk format before passing them to the system's Core (specifically the `control` usecase).
- **Analogy:** The Adapter is like a specific type of phone model (e.g., an iPhone or Android). It knows the technical details of how to make a call.

### What is a Channel?

A **Channel** (frequently referred to interchangeably with the DB Adapter Model in usecases) represents a specific, active **configuration** of an Adapter in the database.

- **Location:** `Core/channel.js` / `Core/adapter.js`
- **Role:**
    - Stores the specific credentials required by the Adapter (e.g., Page Access Tokens, Webhook Secrets, API Keys, Identifiers).
    - Keeps state details like `mode` (active, disabled, learning), time windows, SLA configurations, and routing names.
    - Connects to exactly *one* adapter.
- **Analogy:** If the Adapter is the phone model, the Channel is the specific phone number and SIM card providing the actual line of communication. You can have multiple Channels (e.g., "Sales WhatsApp" and "Support WhatsApp") that both utilize the exact same "WhatsApp" Adapter logic.

### Their Relationship & Workflow

1. At system startup (`main.js`), the application fetches all active Channels/Adapters configurations from the database (`global.settingsChannels`).
2. For each active Channel, it dynamically initializes the corresponding Adapter class in memory (`global.adapters[adapter.name] = new (require('./Infra/Adapters/...'))`).
3. **Inbound Flow:** An external user sends a message. The Adapter receives the raw payload, structures it, and tags it with the **Channel's name**, then pushes it into the system.
4. **Outbound Flow:** The system decides to send a message to a user. It looks up the associated `channel` (by name), finds the corresponding generic `adapter` class instantiated in memory, and triggers the adapter's `outbound()` function, utilizing the Channel's cached API configurations.

---

## 2. Triggers and Actions: Automation & Extensibility

Robodesk-v3 uses an event-driven architecture to automate workflows without needing hardcoded business logic for every single edge case. This is achieved via Triggers and Actions.

### What is a Trigger?

A **Trigger** represents a specific system event or hook in the lifecycle of Robodesk entities (like Conversations, Users, or Tickets).

- **Location:** `Core/triggerSchema.js`
- **Role:**
    - Points of interception. Triggers are fired by the core system when certain milestones occur (e.g., "On Conversation Opened", "On Ticket Closed", "On Tag Added").
    - A Trigger acts as an empty bucket that listens for an event. By itself, a trigger does not modify data; it just alerts the system that an event has occurred.

### What is an Action?

An **Action** is a concrete unit of work or logic that the system executes.

- **Location:** `Core/action.js` and `Core/actionSchema.js` (Definition), `Services/Commander/triggerActionCommander.js` (Execution).
- **Role:**
    - Represents dynamic steps configured (often via a UI) such as "Assign to an Agent", "Send an Auto-Reply Email", or "Close the Ticket".
    - Actions contain specific `conditions` (e.g., "Only run this if the user is VIP") and `configurations` (e.g., "Send this specific Welcome message").
    - **An Action must be bound exactly to a Trigger schema.**

### Their Relationship & Workflow

The relationship between Triggers and Actions is managed by the **Trigger Action Commander (`triggerActionCommander.js`)**. It follows the **Observer Pattern**.

1. **Mapping:** An administrator links an Action to a Trigger in the UI. (e.g., linking the Action: "Send Email" into the Trigger: "On New Ticket"). The database attaches the `actionSchema` to the respective `triggerSchema` inside the `action.js` model.
2. **Initialization:** On boot (`main.js`), the `triggerActionCommander` loads all Triggers schemas and maps all configured Actions to their respective Triggers in memory mapped by the Trigger name (`#activeTriggers`).
3. **Execution (`executeTriggerActions`):**
    - When the core system reaches a hook point (e.g. Conversation logic), it shouts out to the commander: *"Hey! Trigger 'Conv_Received_New_Msg' just fired!"*
    - The Commander looks up that Trigger in memory and iterates through its list of active Actions.
    - For every mapped Action, the Commander evaluates `action.verifyConditions()` against the current context (e.g., checking if the message context fits the rules).
    - If the condition is met, the Commander runs `action.execute()`.

### Summary

- **Adapters & Channels:** How the system connects to the world. Adapters are the code interfaces; Channels are the database configurations mapping that code to real-world accounts and identities.
- **Triggers & Actions:** How the system automates internally. Triggers are the "When this happens" events; Actions are the conditional "Do this step" tasks that run when the event occurs.