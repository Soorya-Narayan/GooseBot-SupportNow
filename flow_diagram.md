# Chatbot Flow Architecture

This diagram illustrates how the chatbot handles different user interactions, state transitions, and the internal logic for troubleshooting and engineer requests.

```mermaid
flowchart TD
    %% Entry Point
    Start((User Message)) --> MsgType{Message Type?}

    %% Text Message Handling
    MsgType -- "Text: 'Hi' / 'Menu'" --> MainMenu[Show Main Menu\nList Message]
    MsgType -- "Other Text" --> StateCheck{Active State?}

    %% State Management for Engineer Request
    StateCheck -- "AWAITING_PROBLEM" --> AskCompany[Store Problem\nAsk Company Name]
    StateCheck -- "AWAITING_COMPANY" --> AskImage[Store Company\nPrompt for Image or Skip]
    StateCheck -- "AWAITING_IMAGE" --> AskSupport[Store Image/Skip\nShow Online/Offline Buttons]
    StateCheck -- "AWAITING_SUPPORT_TYPE" --> AskButton[Prompt for\nButton Click]
    StateCheck -- "None / MAIN_MENU" --> SmartSearch[Smart Search Logic\nKeyword Matching]

    %% Smart Search Logic
    SmartSearch -- "Match Found" --> ShowHelp[Display Troubleshooting Info\nShow Follow-up Buttons]
    SmartSearch -- "No Match" --> SearchFail[Show Failure Message\nRedirect to Main Menu]

    %% Interactive Message Handling (Lists/Buttons)
    MsgType -- "Interactive" --> ActionType{ID Triggered?}

    %% Main Menu Actions
    ActionType -- "MENU_PLC" --> ShowPLC[Show PLC Panel List]
    ActionType -- "MENU_INST" --> ShowInst[Show Instruments List]
    ActionType -- "MENU_VFD" --> ShowVFD[Show VFD List]
    ActionType -- "MENU_OT" --> ShowOther[Show Others List]
    ActionType -- "MENU_SEARCH" --> StartSearch[Prompt for Description]
    ActionType -- "CONTACT_START" -->    Main --> EngReq[Request Engineer]
    EngReq --> Prob[Type Problem]
    Prob --> Comp[Type Company]
    Comp --> Img[Optional Image upload]
    Img --> Supp[Online/Offline]
    Supp --> Zoho{Zoho Ticket Creation}
    Zoho --> Final[Summary + Ticket ID]
    Final --> Main
    ActionType -- "SKIP_IMAGE" --> AskSupport

    %% Issue Selection Handling
    ActionType -- "Issue ID (e.g., CIP_VALVE)" --> ShowHelp
    ActionType -- "GO_MAIN" --> MainMenu

    %% Support Type Handling
    ActionType -- "SUPP_ONLINE / OFFLINE" --> Finalize[Store Support Type\nLog to Console\nConfirm to User\nShow Main Menu]

    %% Styling
    style Start fill:#f9f,stroke:#333,stroke-width:2px
    style MainMenu fill:#bbf,stroke:#333,stroke-width:2px
    style Finalize fill:#bfb,stroke:#333,stroke-width:2px
    style ShowHelp fill:#fdf,stroke:#333,stroke-width:2px
```

### Logical Components

1.  **Webhook Handler**: Receives POST requests from Meta, identifies the sender (`from`), and determines the message type (`text` vs `interactive`).
2.  **State Machine (`userState`)**: Tracks where a user is in a multi-step process (like the Engineer Request). This allows the bot to "remember" the previous answer.
3.  **Keyword Matching (`handleSmartSearch`)**: A loop that scans the `KNOWLEDGE_BASE` for keywords (e.g., "Pump", "Valve", "Temp") present in the user's free-text message.
4.  **Messaging Utility**: Abstracted functions (`sendList`, `sendButtons`, `sendText`) that format the JSON required by the WhatsApp Graph API.

### State Transitions for "Request Engineer"
| Current State | Input Received | Next State | Action |
| :--- | :--- | :--- | :--- |
| `None` | Button: `CONTACT_START` | `AWAITING_PROBLEM` | Ask for description |
| `AWAITING_PROBLEM` | Text (Problem) | `AWAITING_COMPANY` | Store problem, ask company |
| `AWAITING_COMPANY` | Text (Company) | `AWAITING_IMAGE` | Store company, prompt for image |
| `AWAITING_IMAGE` | Image / Skip Button | `AWAITING_SUPPORT_TYPE` | Store Image, show buttons |
| `AWAITING_SUPPORT_TYPE` | Button: `SUPP_ONLINE` | `None` / `MAIN_MENU` | Finalize, log, and reset |
