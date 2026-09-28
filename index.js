const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  PORT,
  ZOHO_ORG_ID,
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_API_DOMAIN,
  ZOHO_DEPT_ID
} = process.env;

/* ---------------- DATA STORE ---------------- */
const userState = {};

const KNOWLEDGE_BASE = {
  HEATWATCH: {
    title: "🔥 HeatWatch Monitoring System",
    options: [
      { id: "HW_RTD", title: "RTD / Sensor Channels", desc: "Open circuit, erratic temp, drift" },
      { id: "HW_COMM", title: "AIME 8U Comm Failure", desc: "Module offline, timeout, mock mode" },
      { id: "HW_ALARM", title: "Siren & Alarm Relay", desc: "Siren won't stop, no alarm, mute" },
      { id: "HW_DASH", title: "Dashboard & Kiosk", desc: "Blank screen, InfluxDB down, reboot" }
    ],
    help: {
      HW_RTD: "🌡 *HeatWatch RTD / Sensor Channels Check:*\n1. Check if channel displays 'OPEN' or 'INACTIVE' on the dashboard.\n2. Inspect 3-wire/4-wire PT100 wiring on the PPI AIME 8U terminal block.\n3. Measure RTD sensor resistance with a multimeter (~107.8Ω at 20°C, ~100Ω at 0°C).\n4. Check sensor calibration offset in Admin Settings (`/api/config`).",
      HW_COMM: "🌐 *PPI AIME 8U Telemetry Module Comm Check:*\n1. Check if module power LED (24V DC auxiliary PSU) is solid green.\n2. Verify Ethernet link lights between AIME 8U and Raspberry Pi / Switch.\n3. Confirm default module IP is reachable (`192.168.1.2`, port 80).\n4. Check poller status: `sudo systemctl status heatwatch-poller`.\n5. If in mock mode, ensure `mockMode: false` in `setup_config.json`.",
      HW_ALARM: "🚨 *HeatWatch Siren & Relay Check:*\n1. *Continuous Siren:* Check if temperature breached HiHi or LoLo emergency limits on dashboard.\n2. *Mute Siren:* Use the 'Mute' button on dashboard or press emergency silence.\n3. *No Sound on Alarm:* Verify 12V/24V external power supply to relay contacts.\n4. Check relay service status: `sudo systemctl status heatwatch-relay`.\n5. Verify GPIO pins (GPIO 18 hooter, 23 warning, 24 critical).",
      HW_DASH: "🖥 *HeatWatch Dashboard & Services Check:*\n1. If screen is blank/frozen, check Raspberry Pi power and HDMI/display ribbon cable.\n2. Restart dashboard service: `sudo systemctl restart heatwatch-dashboard`.\n3. Restart poller & relay: `sudo systemctl restart heatwatch-poller heatwatch-relay`.\n4. If historical trends / charts fail to load, verify InfluxDB is running on port 8086: `sudo systemctl status influxdb`.\n5. Full reboot: `sudo reboot`."
    },
    keywords: {
      HW_RTD: ["rtd", "pt100", "probe", "temperature", "temp", "ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8", "open", "drift", "inactive"],
      HW_COMM: ["aime", "aime 8u", "comm", "communication", "modbus", "192.168.1.2", "ethernet", "timeout", "offline", "mock"],
      HW_ALARM: ["siren", "hooter", "alarm", "relay", "buzzer", "mute", "hihi", "lolo", "beeping"],
      HW_DASH: ["dashboard", "kiosk", "screen", "influx", "influxdb", "blank", "frozen", "reboot", "touchscreen", "display"]
    }
  },
  PLC: {
    title: "🖥 PLC Control Panel",
    options: [
      { id: "PLC_CPU", title: "CPU Status", desc: "ERR/ALM LED or CPU Stop" },
      { id: "PLC_PWR", title: "Power Supply", desc: "No power or voltage drop" },
      { id: "PLC_IO", title: "I/O Modules", desc: "Input/Output signal issues" },
      { id: "PLC_COMM", title: "Communication", desc: "Ethernet or Profibus failure" }
    ],
    help: {
      PLC_CPU: "🖥 *PLC CPU Check:*\n1. Check if the CPU is in 'RUN' mode.\n2. Note any blinking red LEDs (ERR/ALM).\n3. Check diagnostic buffer in the software.\n4. Ensure internal battery is healthy.",
      PLC_PWR: "🔌 *Power Supply Check (Multimeter Required):*\n1. Verify incoming 230V AC or 24V DC.\n2. Check if the PSU output LED is ON.\n3. Inspect for blown fuses or tripped breakers.\n4. Check for loose wiring on terminals.",
      PLC_IO: "🚥 *I/O Module Check (Multimeter Required):*\n1. Check status LEDs on the module.\n2. Verify 24V DC field supply is present.\n3. Check for short circuits in field wiring.\n4. Swap module if internal hardware failure.",
      PLC_COMM: "🌐 *Communication Check:*\n1. Inspect RJ45 or Profibus connectors.\n2. Check link LEDs on Ethernet ports.\n3. Ping the PLC IP from the local network.\n4. Verify node addresses and terminations."
    },
    keywords: {
      PLC_CPU: ["cpu", "run mode", "stop mode", "err", "alm", "diagnostic", "battery"],
      PLC_PWR: ["power supply", "psu", "voltage drop", "blown fuse", "tripped breaker", "loose wiring"],
      PLC_IO: ["io module", "i/o", "input signal", "output signal", "short circuit", "field supply"],
      PLC_COMM: ["profibus", "profinet", "rj45", "ethernet failure", "node address", "plc comm"]
    }
  },
  INSTRUMENTS: {
    title: "📏 Instruments",
    options: [
      { id: "INST_SENS", title: "Sensors", desc: "No signal or value jump" },
      { id: "INST_TEMP", title: "Temp / RTD", desc: "Open circuit or error value" },
      { id: "INST_LEV", title: "Level Sensor", desc: "Stuck value or no feedback" },
      { id: "INST_PRES", title: "Pressure TX", desc: "Offset or zero signal" }
    ],
    help: {
      INST_SENS: "📏 *Sensor Check (Multimeter Required):*\n1. Check M12 cable connection.\n2. Verify input signal in PLC (4-20mA).\n3. Clean the sensor sensing face/probe.\n4. Recalibrate if value is inaccurate.",
      INST_TEMP: "🌡 *Temp Sensor Check (Multimeter Required):*\n1. Check RTD/Thermocouple wiring.\n2. Look for open circuit (32767 value).\n3. Verify PT100 resistance matches temp.\n4. Check for interference on shielded cable.",
      INST_LEV: "💧 *Level Sensor Check:*\n1. Inspect ultrasonic/radar for build-up.\n2. Check if sensor is correctly aimed.\n3. Verify tank empty/full setpoints.\n4. Bypass to test if PLC logic reacts.",
      INST_PRES: "📉 *Pressure Transmitter (Multimeter Required):*\n1. Ensure isolation valve is open.\n2. Check for leaks in capillary tubes.\n3. Verify loop power (24V DC).\n4. Bleed air from the process line."
    },
    keywords: {
      INST_SENS: ["sensor", "4-20ma", "m12", "analog input", "sensing face"],
      INST_TEMP: ["rtd", "thermocouple", "open circuit", "32767", "shielded cable", "temp sensor"],
      INST_LEV: ["level sensor", "ultrasonic", "radar", "tank level", "setpoint"],
      INST_PRES: ["pressure", "transmitter", "transducer", "capillary", "bleed air"]
    }
  },
  VFD: {
    title: "⚙ VFD (Variable Frequency Drive)",
    options: [
      { id: "VFD_FLT", title: "Fault Codes", desc: "OL, OC, or OV faults" },
      { id: "VFD_COMM", title: "No Comm", desc: "HMI/PLC comm failure" },
      { id: "VFD_RUN", title: "Motor Not Run", desc: "No movement or humming" },
      { id: "VFD_PARAM", title: "Parameters", desc: "Incorrect speed/torque" }
    ],
    help: {
      VFD_FLT: "⚙ *VFD Fault Reset (Multimeter Required):*\n1. Identify code (e.g., OC = Overcurrent).\n2. Reset VFD on keypad or HMI.\n3. Check motor phase-to-phase insulation.\n4. Verify deceleration time isn't too short.",
      VFD_COMM: "🕸 *VFD Comm Check:*\n1. Inspect communication card/plug.\n2. Check Modbus/Profinet cable.\n3. Verify VFD Slave ID and Baud rate.\n4. Check terminator resistors.",
      VFD_RUN: "🔄 *Motor Run Check (Multimeter Required):*\n1. Verify 'Run' command is active in PLC.\n2. Check 'Ready' signal back to PLC.\n3. Ensure STO (Safety Torque Off) is high.\n4. Check VFD logic (Input/Source)."
    },
    keywords: {
      VFD_FLT: ["vfd fault", "fault code", "overcurrent", "overvoltage", "overload", "oc fault", "ov fault", "ol fault"],
      VFD_COMM: ["vfd comm", "modbus", "slave id", "baud rate", "comm card"],
      VFD_RUN: ["motor not run", "motor run", "humming", "sto", "safety torque"],
      VFD_PARAM: ["vfd parameter", "speed", "torque", "acceleration", "deceleration"]
    }
  },
  OTHERS: {
    title: "🔧 Others",
    options: [
      { id: "OT_VALVE", title: "Valves", desc: "No feedback or stuck open" },
      { id: "OT_PUMP", title: "Pumps", desc: "Mechanical seal / Noise" },
      { id: "OT_LOAD", title: "Load Cells", desc: "Weight error or drift" }
    ],
    help: {
      OT_VALVE: "⚙ *Valve Check:*\n1. Check solenoid air supply.\n2. Verify proximity sensor mounting.\n3. Manually override the solenoid.\n4. Inspect valve seal for blockage.",
      OT_PUMP: "🔄 *Pump Check:*\n1. Check rotation direction.\n2. Verify mechanical seal for leaks.\n3. Listen for cavitation noises.\n4. Ensure suction strainer is clean.",
      OT_LOAD: "⚖ *Load Cell Check (Multimeter Required):*\n1. Check millivolt (mV) signal output.\n2. Verify bridge excitation voltage (5-10V DC).\n3. Check for physical binding or dirt.\n4. Inspect cable for cuts or moisture."
    },
    keywords: {
      OT_VALVE: ["valve", "solenoid", "pneumatic", "proximity sensor", "valve seal"],
      OT_PUMP: ["pump", "mechanical seal", "cavitation", "suction strainer", "pump noise"],
      OT_LOAD: ["load cell", "loadcell", "weight error", "excitation voltage", "drift"]
    }
  }
};

/* ---------------- WHATSAPP SENDERS ---------------- */

async function sendMessage(to, payload) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: "whatsapp", to, ...payload },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Send error:", err.response?.data || err.message);
  }
}

async function sendList(to, header, body, buttonText, sections) {
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      footer: { text: "Select an option to proceed" },
      action: {
        button: buttonText,
        sections: sections
      }
    }
  });
}

async function sendButtons(to, text, buttons) {
  const safeButtons = buttons.slice(0, 3);
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: safeButtons.map(b => ({
          type: "reply", reply: { id: b.id, title: b.title }
        }))
      }
    }
  });
}

async function sendText(to, text) {
  await sendMessage(to, { type: "text", text: { body: text } });
}

/* ---------------- FLOW CONTROLLERS ---------------- */

async function showMainMenu(to) {
  userState[to] = { state: "MAIN_MENU" };
  await sendList(
    to,
    "🏭 Factory Assist",
    "Welcome! Select the equipment category you need troubleshooting assistance with:",
    "View Options",
    [{
      title: "Troubleshooting",
      rows: [
        { id: "MENU_HEATWATCH", title: "HeatWatch System", description: "RTD, Comm, Siren, Kiosk" },
        { id: "MENU_PLC", title: "PLC Control Panel", description: "CPU, I/O, Power, Comm" },
        { id: "MENU_INST", title: "Instruments", description: "Sensors, Levels, Pressure" },
        { id: "MENU_VFD", title: "VFD", description: "Faults, Motor Run, Comm" },
        { id: "MENU_OT", title: "Others", description: "Valves, Pumps, Mechanical" }
      ]
    }, {
      title: "Support",
      rows: [
        { id: "MENU_SEARCH", title: "Smart Search", description: "Describe your issue" },
        { id: "MENU_STATUS", title: "Check Ticket Status", description: "View status of your requests" },
        { id: "CONTACT_START", title: "Request Engineer", description: "Request direct human support" }
      ]
    }]
  );
}

async function showSystemMenu(to, systemKey) {
  const sys = KNOWLEDGE_BASE[systemKey];
  userState[to] = { state: `MENU_${systemKey}` };

  await sendList(
    to,
    sys.title,
    "What specific area are you having trouble with?",
    "Select Issue",
    [{
      title: "Common Issues",
      rows: sys.options.map(opt => ({
        id: opt.id,
        title: opt.title,
        description: opt.desc
      }))
    }, {
      title: "Navigation",
      rows: [{ id: "GO_MAIN", title: "Main Menu", description: "Back to system selection" }]
    }]
  );
}

async function handleSmartSearch(to, query) {
  const lowerQuery = query.toLowerCase().trim();

  // Direct HeatWatch intent handling
  if (
    lowerQuery === "heatwatch" ||
    lowerQuery === "heat watch" ||
    lowerQuery.includes("heatwatch") ||
    lowerQuery.includes("heat watch")
  ) {
    const hwKeywords = KNOWLEDGE_BASE.HEATWATCH.keywords;
    let specificFound = null;

    for (const [id, words] of Object.entries(hwKeywords)) {
      if (words.some(w => lowerQuery.includes(w))) {
        specificFound = { id, text: KNOWLEDGE_BASE.HEATWATCH.help[id] };
        break;
      }
    }

    if (specificFound) {
      return await sendButtons(to, `🔍 *HeatWatch Search Result:*\n\n${specificFound.text}`, [
        { id: "GO_MAIN", title: "🏠 Main Menu" },
        { id: "CONTACT_START", title: "👨‍🔧 Request Engineer" }
      ]);
    }

    // General inquiry -> Direct to HeatWatch System menu
    return await showSystemMenu(to, "HEATWATCH");
  }

  let found = null;

  // Search across all knowledge base categories
  for (const sys of Object.values(KNOWLEDGE_BASE)) {
    if (sys.keywords) {
      for (const [id, words] of Object.entries(sys.keywords)) {
        if (words.some(w => lowerQuery.includes(w))) {
          found = { id, text: sys.help[id] };
          break;
        }
      }
    } else {
      for (const [id, text] of Object.entries(sys.help)) {
        const idKey = id.split('_')[1]?.toLowerCase();
        if (idKey && lowerQuery.includes(idKey)) {
          found = { id, text };
          break;
        }
      }
    }
    if (found) break;
  }

  if (found) {
    await sendButtons(to, `🔍 *Search Result:*\n\n${found.text}`, [
      { id: "GO_MAIN", title: "🏠 Main Menu" },
      { id: "CONTACT_START", title: "👨‍🔧 Request Engineer" }
    ]);
  } else {
    await sendText(to, "Sorry, I couldn't find a direct match. Try selecting a category or phrase your issue differently (e.g., 'HeatWatch', 'RTD', 'Pump', 'Sensor', 'VFD').");
    await showMainMenu(to);
  }
}

/* ---------------- ZOHO DESK INTEGRATION ---------------- */

let cachedZohoToken = null;

async function getZohoAccessToken() {
  if (cachedZohoToken) return cachedZohoToken;

  try {
    const params = new URLSearchParams();
    params.append('refresh_token', ZOHO_REFRESH_TOKEN);
    params.append('client_id', ZOHO_CLIENT_ID);
    params.append('client_secret', ZOHO_CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');

    const res = await axios.post('https://accounts.zoho.in/oauth/v2/token', params);
    cachedZohoToken = res.data.access_token;

    // Reset cache after 50 mins (token lasts 60)
    setTimeout(() => { cachedZohoToken = null; }, 50 * 60 * 1000);

    return cachedZohoToken;
  } catch (err) {
    console.error("❌ Zoho Token Refresh Error:", err.response?.data || err.message);
    return null;
  }
}

async function downloadWhatsAppMedia(mediaId) {
  try {
    // 1. Get Media URL
    const urlRes = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });

    // 2. Download File
    const fileRes = await axios.get(urlRes.data.url, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
      responseType: 'arraybuffer'
    });

    return {
      buffer: fileRes.data,
      mimeType: urlRes.data.mime_type
    };
  } catch (err) {
    console.error("❌ Media Download Error:", err.response?.data || err.message);
    return null;
  }
}

async function uploadToZohoAttachment(ticketId, media) {
  const token = await getZohoAccessToken();
  if (!token || !media) return;

  try {
    const formData = new FormData();
    const blob = new Blob([media.buffer], { type: media.mimeType });
    formData.append('file', blob, 'whatsapp_attachment.jpg');

    await axios.post(`${ZOHO_API_DOMAIN}/api/v1/tickets/${ticketId}/attachments`, formData, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'orgId': ZOHO_ORG_ID
      }
    });
    console.log(`✅ Attachment uploaded to Ticket: ${ticketId}`);
  } catch (err) {
    console.error("❌ Zoho Attachment Error:", err.response?.data || err.message);
  }
}

async function getTicketsByPhone(phone) {
  const token = await getZohoAccessToken();
  if (!token) return null;

  try {
    const res = await axios.get(`${ZOHO_API_DOMAIN}/api/v1/tickets/search`, {
      params: { phone: phone },
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'orgId': ZOHO_ORG_ID
      }
    });
    return res.data.data || [];
  } catch (err) {
    console.error("❌ Zoho Search Error:", err.response?.data || err.message);
    return [];
  }
}

async function handleStatusCheck(to) {
  const tickets = await getTicketsByPhone(to);

  if (!tickets || tickets.length === 0) {
    return await sendButtons(to, "🔍 *No tickets found* linked to this phone number.", [
      { id: "GO_MAIN", title: "🏠 Main Menu" },
      { id: "CONTACT_START", title: "👨‍🔧 Request Engineer" }
    ]);
  }

  // Show last 5 tickets
  let statusMsg = "🎫 *Your Recent Tickets:*\n\n";
  tickets.slice(0, 5).forEach(t => {
    const status = t.statusType === "Open" ? "🟢" : "⚪";
    statusMsg += `${status} *#${t.ticketNumber}* - ${t.status}\n`;
    statusMsg += `   _${t.subject}_\n\n`;
  });

  await sendButtons(to, statusMsg, [
    { id: "GO_MAIN", title: "🏠 Main Menu" },
    { id: "CONTACT_START", title: "👨‍🔧 Request Engineer" }
  ]);
}

async function createZohoTicket(to, data) {
  const token = await getZohoAccessToken();
  if (!token) return null;

  try {
    const ticketPayload = {
      subject: `WhatsApp Support: ${data.problem.substring(0, 50)}...`,
      description: `
        WhatsApp From: ${to}
        Company: ${data.company}
        Problem: ${data.problem}
        Support Type: ${data.supportType}
        Image ID: ${data.imageId || 'None'}
      `,
      departmentId: ZOHO_DEPT_ID,
      contact: {
        lastName: to,
        phone: to
      }
    };

    const res = await axios.post(`${ZOHO_API_DOMAIN}/api/v1/tickets`, ticketPayload, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'orgId': ZOHO_ORG_ID,
        'Content-Type': 'application/json'
      }
    });

    const ticketId = res.data.id;
    const ticketNumber = res.data.ticketNumber;

    // Handle Image Attachment
    if (data.imageId) {
      console.log(`📸 Processing image for Ticket ${ticketNumber}...`);
      const media = await downloadWhatsAppMedia(data.imageId);
      if (media) {
        await uploadToZohoAttachment(ticketId, media);
      }
    }

    return ticketNumber;
  } catch (err) {
    console.error("❌ Zoho Ticket Error:", err.response?.data || err.message);
    return null;
  }
}

/* ---------------- ENGINEER SUPPORT FLOW ---------------- */

async function startEngineerRequest(to) {
  userState[to] = { state: "AWAITING_PROBLEM", data: {} };
  await sendText(to, "🛠 *Engineer Support Request*\n\nPlease briefly describe the problem you are facing:");
}

async function askCompany(to, problem) {
  userState[to].state = "AWAITING_COMPANY";
  userState[to].data.problem = problem;
  await sendText(to, "🏢 Which *company* are you requesting assistance from?");
}

async function askImage(to, company) {
  userState[to].state = "AWAITING_IMAGE";
  userState[to].data.company = company;
  await sendButtons(to, "📸 *Optional: Send a Photo*\n\nPlease use the WhatsApp *Attachment (📎)* or *Camera (📷)* icon to send a photo of the problem.\n\nIf you don't have a photo, click 'Skip' below:", [
    { id: "SKIP_IMAGE", title: "⏭ Skip Image" }
  ]);
}

async function askSupportType(to, imageData) {
  userState[to].state = "AWAITING_SUPPORT_TYPE";
  if (imageData !== "SKIP") {
    userState[to].data.imageId = imageData;
  }
  await sendButtons(to, "🔧 What type of support do you require?", [
    { id: "SUPP_ONLINE", title: "🌐 Online Support" },
    { id: "SUPP_OFFLINE", title: "📍 Offline Support" }
  ]);
}

async function finalizeEngineerRequest(to, supportType) {
  const data = userState[to].data;
  data.supportType = supportType === "SUPP_ONLINE" ? "Online" : "Offline";

  const hasImage = data.imageId ? "✅ Provided" : "❌ Skipped";

  // Raise Zoho Ticket
  let ticketId = "Pending...";
  if (ZOHO_DEPT_ID !== "CHANGE_ME") {
    ticketId = await createZohoTicket(to, data) || "⚠️ Integration Error";
  }

  const summary = `✅ *Request Submitted!*

📝 *Problem:* ${data.problem}
🏢 *Company:* ${data.company}
📸 *Image:* ${hasImage}
🔧 *Support:* ${data.supportType}
🎫 *Ticket ID:* ${ticketId}

An engineer has been notified and will contact you shortly.`;

  console.log("📢 NEW ENGINEER REQUEST:", { from: to, ...data, ticketId });

  await sendButtons(to, summary, [{ id: "GO_MAIN", title: "🏠 Main Menu" }]);
}

/* ---------------- WEBHOOK ---------------- */

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const entry = req.body.entry?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  console.log("📩 Incoming message type:", message.type);

  const from = message.from;
  const state = userState[from]?.state;

  // Handle Image Messages
  if (message.type === "image") {
    if (state === "AWAITING_IMAGE") {
      return askSupportType(from, message.image.id);
    }
    return;
  }

  // Handle Text Messages
  if (message.type === "text") {
    const text = message.text.body;

    // Handle flow-based text inputs
    if (state === "AWAITING_PROBLEM") return askCompany(from, text);
    if (state === "AWAITING_COMPANY") return askImage(from, text);
    if (state === "AWAITING_IMAGE") {
      await sendText(from, "Please send an image or click the 'Skip Image' button.");
      return;
    }
    if (state === "AWAITING_SUPPORT_TYPE") {
      await sendText(from, "Please select support type using the buttons below.");
      return;
    }

    if (text.toLowerCase() === "hi" || text.toLowerCase() === "menu") {
      await showMainMenu(from);
    } else {
      await handleSmartSearch(from, text);
    }
    return;
  }

  // Handle Interactive Messages (Buttons and Lists)
  if (message.type === "interactive") {
    let id;
    if (message.interactive.type === "list_reply") {
      id = message.interactive.list_reply.id;
    } else if (message.interactive.type === "button_reply") {
      id = message.interactive.button_reply.id;
    }

    if (!id) return;

    if (id === "GO_MAIN") return await showMainMenu(from);
    if (id === "MENU_HEATWATCH") return await showSystemMenu(from, "HEATWATCH");
    if (id === "MENU_PLC") return await showSystemMenu(from, "PLC");
    if (id === "MENU_INST") return await showSystemMenu(from, "INSTRUMENTS");
    if (id === "MENU_VFD") return await showSystemMenu(from, "VFD");
    if (id === "MENU_OT") return await showSystemMenu(from, "OTHERS");
    if (id === "MENU_STATUS") return await handleStatusCheck(from);
    if (id === "CONTACT_START") return await startEngineerRequest(from);

    if (id === "SUPP_ONLINE" || id === "SUPP_OFFLINE") {
      return await finalizeEngineerRequest(from, id);
    }

    if (id === "SKIP_IMAGE" && state === "AWAITING_IMAGE") {
      return askSupportType(from, "SKIP");
    }

    if (id === "MENU_SEARCH") {
      await sendText(from, "📝 *Smart Search Mode*\n\nPlease describe your issue briefly (e.g., 'Pump not starting' or 'Divert valve').");
      return;
    }

    // Check knowledge base for help text
    for (const sys of Object.values(KNOWLEDGE_BASE)) {
      if (sys.help[id]) {
        await sendButtons(from, sys.help[id], [
          { id: "GO_MAIN", title: "🏠 Main Menu" },
          { id: "CONTACT_START", title: "👨‍🔧 Request Engineer" }
        ]);
        return;
      }
    }
  }
});

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(`🚀 SupportNow v2 (Enhanced) running on port ${PORT}`);
});
