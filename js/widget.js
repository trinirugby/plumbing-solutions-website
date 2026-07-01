/* Floating AI chat widget ("Piper") for Plumbing Solutions.
   Self-bootstrapping: fetches its own partial, injects it, then binds — so it
   doesn't race the async partial loading in main.js. Talks to the Netlify
   function at /.netlify/functions/chat. */
(function () {
  const CHAT_URL = '/.netlify/functions/chat';
  const PARTIAL_URL = '/partials/chat-widget.html';

  function boot() {
    if (document.getElementById('chat-toggle')) {
      init();
      return;
    }
    fetch(PARTIAL_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error(PARTIAL_URL + ' ' + r.status)); })
      .then(function (html) {
        const root = document.createElement('div');
        root.innerHTML = html;
        document.body.appendChild(root);
        init();
      })
      .catch(function (err) { console.error('Chat widget failed to load:', err); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function init() {
  const toggle = document.getElementById('chat-toggle');
  const chatWindow = document.getElementById('chat-window');
  const messagesEl = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (!toggle || !chatWindow || !messagesEl || !input || !sendBtn) return;

  let isOpen = false;
  let isBusy = false;
  const history = [];

  function renderText(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
        let clean = url.trim();
        if (!clean.startsWith('/') && !clean.startsWith('http')) clean = '/' + clean;
        return '<a href="' + clean + '" target="_self">' + label + '</a>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function appendMsg(text, role) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = role === 'bot' ? renderText(text) : escapeHtml(text);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg bot';
    wrap.id = 'chat-typing';
    wrap.innerHTML =
      '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById('chat-typing');
    if (t) t.remove();
  }

  function openChat() {
    if (isOpen) return;
    isOpen = true;
    chatWindow.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-label', 'Close chat with Piper');
    setTimeout(function () { input.focus(); }, 250);
  }

  function closeChat() {
    isOpen = false;
    chatWindow.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-label', 'Open chat with Piper');
  }

  toggle.addEventListener('click', function () {
    isOpen ? closeChat() : openChat();
  });

  async function send() {
    const text = input.value.trim();
    if (!text || isBusy) return;

    input.value = '';
    isBusy = true;
    input.disabled = true;
    sendBtn.disabled = true;
    appendMsg(text, 'user');
    showTyping();

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-8) }),
      });

      let reply = "Sorry, I didn't catch that. Please try again, or call (868) 628-4646.";
      try {
        const data = await res.json();
        if (data && data.reply) reply = data.reply;
      } catch (e) { /* keep fallback */ }

      hideTyping();
      appendMsg(reply, 'bot');
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      hideTyping();
      appendMsg(
        "Something went wrong. For anything urgent, call our 24/7 hotline at (868) 280-6295.",
        'bot'
      );
    } finally {
      isBusy = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  }
})();
