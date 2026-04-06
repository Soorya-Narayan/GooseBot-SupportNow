
# A guide on how to build WhatsApp chatbot with Zoho desk integration

This guide will walk you step-by-step through setting up your very own WhatsApp Chatbot from scratch using Node.js, the Meta WhatsApp Cloud API, and Zoho Desk.

## Features

- **Interactive Troubleshooting Menus**: Troubleshoot PLCs, VFDs, instruments, and more natively in WhatsApp using List and Button messages.
- **Smart Search**: Customers can simply type "Pump not starting" and get an immediate knowledge-base match.
- **Engineer Support Request Flow**: A state-based flow that asks for problem, company, an optional photo, and support type.
- **Zoho Desk Integration**: Automatically generates support tickets with customer info and image attachments right inside your Zoho Desk portal.




## Prerequisites

Before starting, make sure you have:
1. **Node.js** installed on your computer.
2. **Meta Developer Account** (to get WhatsApp API credentials).
3. **Zoho Desk Account** (for ticketing system integration).
4. **ngrok** (or a similar tool) to expose your local server to the public internet so Meta can reach your webhooks.

---
## Step-by-Step Setup Guide

### 1. Clone & Install
First, clone this repository to your local machine and install the required dependencies.
```bash
git clone https://github.com/YourUsername/GooseBot-SupportNow.git
cd GooseBot-SupportNow
npm install
```
*(This installs necessary packages like `express`, `axios`, `dotenv`, and `qrcode`)*

### 2. Set Up Your Meta App (WhatsApp API)
1. Go to the [Meta for Developers](https://developers.facebook.com/) portal.
2. Create a new App. Select **Other** -> **Business** -> Add **WhatsApp** to your App.
3. In the WhatsApp setup screen (API Setup), Meta will provide a **Temporary Access Token** and a **Phone Number ID**. Keep these handy.

### 3. Set Up Zoho Desk (Optional but recommended)
If you want to use the ticketing system, follow these steps. (If not, you can modify `index.js` to bypass Zoho and just console log the requests).
1. Go to [Zoho API Developer Console](https://api-console.zoho.com/) and register a new "Self Client".
2. You'll receive a **Client ID** and **Client Secret**.
3. Generate a **Refresh Token** for the `Desk.tickets.ALL`, `Desk.settings.ALL`, `Desk.contacts.ALL` scopes.
4. Note your **Org ID** and **Department ID** from your Zoho Desk portal.

### 4. Configure Environment Variables
Create a file named `.env` in the root directory of the project and add your specific credentials:

```env
PORT=3000

# WhatsApp Setup
WHATSAPP_TOKEN="your_meta_temporary_or_permanent_token"
PHONE_NUMBER_ID="your_whatsapp_phone_number_id"
VERIFY_TOKEN="your_custom_verify_token_here_eg_my_secret_token"

# Zoho Desk Setup
ZOHO_ORG_ID="your_zoho_org_id"
ZOHO_CLIENT_ID="your_zoho_client_id"
ZOHO_CLIENT_SECRET="your_zoho_client_secret"
ZOHO_REFRESH_TOKEN="your_zoho_refresh_token"
ZOHO_API_DOMAIN="https://desk.zoho.in" # or .com based on your region
ZOHO_DEPT_ID="your_zoho_department_id"
```

### 5. Run Your Server Locally
Start your server by typing this command in your terminal:
```bash
npm start
```
Your server will now run locally on `http://localhost:3000`.

### 6. Expose Server to the Internet
WhatsApp needs a public internet URL to send webhook events to. Use `ngrok` for this:
```bash
ngrok http 3000
```
Copy the secure `https://` URL provided by ngrok in your terminal.

### 7. Configure WhatsApp Webhook
1. Go back to your Meta Developer portal and navigate to **WhatsApp > Configuration**.
2. Click **Edit** on Webhook. 
3. For the Callback URL, paste your ngrok URL with `/webhook` at the end (e.g., `https://your-ngrok-url.ngrok-free.app/webhook`).
4. For the **Verify Token**, use the *exact* same string you put for `VERIFY_TOKEN` in your `.env` file.
5. Click **Verify and Save**.
6. Immediately below that, click **Manage** in Webhook fields and subscribe to `messages`.

### 8. Test Your Bot
1. Add the test WhatsApp number provided by Meta to your phone's contacts.
2. Send a message saying "Hi" or "Menu".
3. You should receive the main menu and be able to navigate the troubleshooting guides!

---

## ⚙️ Customizing the Knowledge Base
To make this bot completely your own, open `index.js` and modify the `KNOWLEDGE_BASE` object. You can change the categories, issues, and the helpful responses the bot gives without needing a database

```javascript
/* Inside index.js */
const KNOWLEDGE_BASE = {
  YOUR_CATEGORY: {
    title: "🔧 Your Custom Category",
    options: [
      { id: "ISSUE_1", title: "Issue Title", desc: "Short description" }
    ],
    help: {
      ISSUE_1: "Here is how to solve Issue 1! Step 1, Step 2..."
    }
  }
}
```

---
