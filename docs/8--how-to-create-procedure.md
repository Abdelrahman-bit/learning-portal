# 🛠️ Ticket Inquiry — Procedure UI Walkthrough

This is a step-by-step guide for configuring the `getTicketDetails` procedure flow in the RoboDesk UI.

---

## Step 0: Navigate to the Procedure Editor

1. Go to **Automation** in the sidebar menu
2. Click **+ New Procedure** (or open an existing procedure you want to add these steps to)

---

## Step 0.5: Add the Personalization Field

Before adding steps, you need to register `ticketInQueryId` as a personalization field so the bot can store the user's input.

1. In the **Personalization** section at the top of the procedure editor
2. Add a new field: `ticketInQueryId`

> [!IMPORTANT]
This field name **must match exactly** `ticketInQueryId` — the `getTicketDetails` action reads from `_conv.personalization.ticketInQueryId`.
> 

---

## Step 1: Create the "Ask Ticket ID" Step

Click the ➕ button to add a new step, then fill in:

| Field | Value |
| --- | --- |
| **Name** | `askTicketId` |
| **Type** | `message` |
| **Field** | `ticketInQueryId` ← select from the personalization dropdown |
| **Success** | `getTicketDetails` |

### Messages Section

Add a message with the text:

```
Please enter your ticket ID:
```

**What this does:** The bot sends the message asking for the ticket ID. When the user replies, their answer is stored in `_conv.personalization.ticketInQueryId`, then the flow jumps to the `success` step (`getTicketDetails`).

---

## Step 2: Create the "getTicketDetails" Action Step

Click ➕ to add another step, then fill in:

| Field | Value |
| --- | --- |
| **Name** | `getTicketDetails` |
| **Type** | `action` |
| **Action** | `getTicketDetails` ← select from the dropdown |
| **Success** | `ticketFound` |
| **Fail** | `ticketNotFound` |

> [!TIP]
The **Action** dropdown is automatically populated from the backend. `getTicketDetails` should already appear in the list since it was added to `actions.js`. If it doesn't show up, restart the server.
> 

**What this does:** Calls the `getTicketDetails(_conv)` function:

- ✅ **Truthy return** → flow follows **Success** → `ticketFound`
- ❌ **Null return** → flow follows **Fail** → `ticketNotFound`

---

## Step 3: Create the "ticketFound" Success Message

Click ➕ to add another step:

| Field | Value |
| --- | --- |
| **Name** | `ticketFound` |
| **Type** | `message` (or `end` if this is the final step) |

### Messages Section

Add a message with this text:

```
Your ticket {{ticketInQuery.ticketID}} status is: {{ticketInQuery.status}}.
```

> [!NOTE]
The double curly braces `{{ }}` reference the DTO that was injected into `_conv.personalization.ticketInQuery` by the action. Only `ticketID` and `status` are available — no sensitive internal data.
> 

---

## Step 4: Create the "ticketNotFound" Fallback Message

Click ➕ to add one more step:

| Field | Value |
| --- | --- |
| **Name** | `ticketNotFound` |
| **Type** | `message` (or `end`) |

### Messages Section

Add a message with this text:

```
Sorry, we couldn't find a ticket matching this ID for your account.
```

---

## Step 5: Set the Entry Point

Click the ▶️ (play) icon on the `askTicketId` step to mark it as the **entry point**.

This tells the bot engine to start the flow from this step.

---

## Step 6: Save & Test

1. Click **Save** at the top
2. Open the **Bot Simulator**
3. Trigger this procedure
4. Type a ticket ID (e.g., `1234`)
5. Verify the response

---

## Summary: Complete Flow Diagram

```
┌─────────────────────────┐
│  askTicketId (message)  │ ← Entry Point
│  "Enter your ticket ID" │
│  Field: ticketInQueryId │
│  Success → getTicketDetails │
└────────────┬────────────┘
             │ (user replies with ticket ID)
             ▼
┌──────────────────────────┐
│ getTicketDetails (action) │
│ Action: getTicketDetails  │
│ Success → ticketFound     │
│ Fail → ticketNotFound     │
└─────┬──────────┬─────────┘
      │          │
   Success     Fail
      │          │
      ▼          ▼
┌──────────┐ ┌───────────────┐
│ticketFound│ │ticketNotFound │
│ (message) │ │  (message)    │
│ "T-1234   │ │ "Sorry, we    │
│  pending" │ │  couldn't..." │
└──────────┘ └───────────────┘
```

---

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `getTicketDetails` not in Action dropdown | Restart the server — the API at `/api/procedure/actions/class-functions` scans methods at startup |
| `{{ticketInQuery.ticketID}}` shows blank | Ensure the action step **name** is `getTicketDetails` and the action returned truthy |
| Bot says "couldn't find" for valid ticket | Check the phone number used — `_conv.contact` must match `ticket.contact` or `_conv.clientContact` must match `ticket.contactID` |
| Ticket ID normalization | The action auto-trims whitespace, uppercases, and prefixes `T-` — user can type `1234`, `t-1234`, or `T-1234` |