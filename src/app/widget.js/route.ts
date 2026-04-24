const widgetScript = `(() => {
  if (window.__showupWidgetLoaded) return;
  window.__showupWidgetLoaded = true;
  var BRAND = "#1A7F5A";
  var scriptEl = document.currentScript;
  var widgetKey = scriptEl ? (scriptEl.getAttribute("data-key") || "").trim() : "";
  if (!widgetKey) {
    console.error("ShowUp widget: missing data-key");
    return;
  }

  var apiBase;
  try {
    apiBase = scriptEl && scriptEl.src ? new URL(scriptEl.src, window.location.href).origin : window.location.origin;
  } catch (_e) {
    apiBase = window.location.origin;
  }

  var storagePrefix = "showup_widget";
  var storageKey = storagePrefix + ":" + widgetKey;
  var sessionStorageKey = storagePrefix + ":session:" + widgetKey;
  var openStorageKey = storagePrefix + ":open:" + widgetKey;
  var businessNameStorageKey = storagePrefix + ":business:" + widgetKey;
  var sessionId = localStorage.getItem(sessionStorageKey);
  if (!sessionId) {
    sessionId = (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "sess_" + Math.random().toString(36).slice(2));
    localStorage.setItem(sessionStorageKey, sessionId);
  }

  var storedBusinessName = localStorage.getItem(businessNameStorageKey) || "";
  var uuidLikeKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedBusinessName);
  var businessName = storedBusinessName && !uuidLikeKey ? storedBusinessName : "ShowUp";
  var isOpen = localStorage.getItem(openStorageKey) === "1";
  var isSending = false;
  var messages = [];
  try {
    var existing = localStorage.getItem(storageKey);
    if (existing) messages = JSON.parse(existing);
    if (!Array.isArray(messages)) messages = [];
  } catch (_e2) {
    messages = [];
  }

  var styleTag = document.createElement("style");
  styleTag.textContent = [
    ".showup-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:58px;height:58px;border-radius:9999px;border:0;background:" + BRAND + ";color:#fff;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.2);display:inline-flex;align-items:center;justify-content:center}",
    ".showup-tooltip{position:fixed;right:88px;bottom:30px;z-index:2147483000;background:#111827;color:#fff;border-radius:10px;padding:8px 10px;font:500 12px/1.3 system-ui;opacity:0;transform:translateY(4px);transition:150ms ease;pointer-events:none;white-space:nowrap}",
    ".showup-fab:hover + .showup-tooltip,.showup-tooltip:hover{opacity:1;transform:translateY(0)}",
    ".showup-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:350px;height:500px;max-height:calc(100vh - 120px);display:none;overflow:hidden;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,.18);font-family:system-ui;color:#0f172a}",
    ".showup-panel.open{display:flex;flex-direction:column}",
    ".showup-header{display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e5e7eb}",
    ".showup-brand{display:flex;align-items:center;gap:10px}.showup-logo{width:28px;height:28px;border-radius:8px;background:" + BRAND + ";color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}",
    ".showup-title{margin:0;font:600 14px/1.2 system-ui}.showup-subtitle{margin:2px 0 0;font:500 12px/1.2 system-ui;color:#64748b}",
    ".showup-close{border:0;background:transparent;cursor:pointer;color:#475569;font-size:18px;line-height:1;width:28px;height:28px;border-radius:8px}",
    ".showup-messages{flex:1;overflow-y:auto;padding:12px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}",
    ".showup-msg{max-width:86%;padding:9px 11px;border-radius:12px;font:500 13px/1.4 system-ui;white-space:pre-wrap;word-wrap:break-word}",
    ".showup-msg.user{margin-left:auto;background:" + BRAND + ";color:#fff;border-bottom-right-radius:4px}",
    ".showup-msg.bot{margin-right:auto;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px}",
    ".showup-reset-wrap{border-top:1px solid #e5e7eb;background:#fff;padding:8px 10px 0}",
    ".showup-reset{border:0;background:transparent;padding:0;color:#6b7280;font:500 12px/1.2 system-ui;text-decoration:underline;cursor:pointer}",
    ".showup-reset:hover{color:#374151}",
    ".showup-input-wrap{background:#fff;padding:10px;display:flex;gap:8px}",
    ".showup-input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:10px;outline:none;font:500 13px/1.4 system-ui}",
    ".showup-input:focus{border-color:" + BRAND + ";box-shadow:0 0 0 2px rgba(26,127,90,.15)}",
    ".showup-send{border:0;border-radius:10px;background:" + BRAND + ";color:#fff;font:600 13px/1 system-ui;padding:0 14px;cursor:pointer}",
    ".showup-send:disabled{opacity:.5;cursor:default}",
    "@media (max-width:640px){.showup-panel{width:100vw;height:100vh;max-height:100vh;right:0;bottom:0;border-radius:0;border:0}.showup-fab{right:16px;bottom:16px}.showup-tooltip{display:none}}"
  ].join("");
  document.head.appendChild(styleTag);

  var host = document.createElement("div");
  var fab = document.createElement("button");
  fab.type = "button";
  fab.className = "showup-fab";
  fab.setAttribute("aria-label", "Open ShowUp chat");
  fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10h10M7 14h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  var tooltip = document.createElement("div");
  tooltip.className = "showup-tooltip";
  tooltip.textContent = "Book an appointment";
  var panel = document.createElement("section");
  panel.className = "showup-panel";
  panel.innerHTML = '<header class="showup-header"><div class="showup-brand"><span class="showup-logo">S</span><div><p class="showup-title"></p><p class="showup-subtitle">Book an appointment</p></div></div><button type="button" class="showup-close" aria-label="Close chat">×</button></header><div class="showup-messages"></div><div class="showup-reset-wrap"><button type="button" class="showup-reset">Start a new booking</button></div><form class="showup-input-wrap"><input class="showup-input" type="text" placeholder="Type your message..." maxlength="500"/><button class="showup-send" type="submit">Send</button></form>';

  var titleEl = panel.querySelector(".showup-title");
  if (titleEl) titleEl.textContent = businessName;
  var messagesEl = panel.querySelector(".showup-messages");
  var closeBtn = panel.querySelector(".showup-close");
  var resetBtn = panel.querySelector(".showup-reset");
  var formEl = panel.querySelector(".showup-input-wrap");
  var inputEl = panel.querySelector(".showup-input");
  var sendBtn = panel.querySelector(".showup-send");

  function persistState() {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    localStorage.setItem(openStorageKey, isOpen ? "1" : "0");
    localStorage.setItem(businessNameStorageKey, businessName);
  }

  function newSessionId() {
    return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "sess_" + Math.random().toString(36).slice(2);
  }

  function resetConversation() {
    messages = [];
    sessionId = newSessionId();
    localStorage.setItem(sessionStorageKey, sessionId);
    localStorage.removeItem(storageKey);
    renderMessages();
    persistState();
    if (inputEl) inputEl.focus();
  }

  function renderMessages() {
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
    if (!messages.length) {
      var welcome = document.createElement("div");
      welcome.className = "showup-msg bot";
      welcome.textContent = "Hi, I can help you book an appointment. What service are you looking for?";
      messagesEl.appendChild(welcome);
      return;
    }
    for (var i = 0; i < messages.length; i += 1) {
      var msg = messages[i];
      var row = document.createElement("div");
      row.className = "showup-msg " + (msg.role === "user" ? "user" : "bot");
      row.textContent = msg.content;
      messagesEl.appendChild(row);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function togglePanel(nextOpen) {
    isOpen = typeof nextOpen === "boolean" ? nextOpen : !isOpen;
    panel.classList.toggle("open", isOpen);
    persistState();
    if (isOpen && inputEl) inputEl.focus();
  }

  async function sendToApi(userText) {
    var history = messages.map(function (m) { return { role: m.role, content: m.content }; });
    var res = await fetch(apiBase + "/api/widget/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey: widgetKey, sessionId: sessionId, message: userText, conversationHistory: history })
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!inputEl || isSending) return;
    var text = inputEl.value.trim();
    if (!text) return;

    messages.push({ role: "user", content: text, ts: Date.now() });
    inputEl.value = "";
    renderMessages();
    persistState();

    isSending = true;
    if (sendBtn) sendBtn.disabled = true;
    try {
      var data = await sendToApi(text);
      if (data && typeof data.businessName === "string" && data.businessName) {
        businessName = data.businessName;
        if (titleEl) titleEl.textContent = businessName;
        localStorage.setItem(businessNameStorageKey, businessName);
      }
      var reply = data && typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : "Thanks — I can help with that. Could you share your preferred date and time?";
      messages.push({ role: "assistant", content: reply, ts: Date.now() });
    } catch (_err) {
      messages.push({ role: "assistant", content: "Sorry, I could not connect just now. Please try again in a moment.", ts: Date.now() });
    } finally {
      isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      renderMessages();
      persistState();
    }
  }

  fab.addEventListener("click", function () { togglePanel(); });
  if (closeBtn) closeBtn.addEventListener("click", function () { togglePanel(false); });
  if (resetBtn) resetBtn.addEventListener("click", resetConversation);
  if (formEl) formEl.addEventListener("submit", handleSubmit);
  if (inputEl) inputEl.addEventListener("keydown", function (e) { if (e.key === "Escape") togglePanel(false); });

  host.appendChild(fab);
  host.appendChild(tooltip);
  host.appendChild(panel);
  document.body.appendChild(host);
  renderMessages();
  if (isOpen) togglePanel(true);
})();`;

export async function GET() {
  return new Response(widgetScript, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
