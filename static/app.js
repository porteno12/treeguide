// ── Config ────────────────────────────────────────────────────────────────────

const MAX_TURNS = 10;

const TREE_KEYWORDS = [
  'tree','node','bst','traversal','insert','delete','search','height','depth',
  'balance','avl','java','recursive','recursion','binary','left','right','root',
  'leaf','parent','inorder','preorder','postorder','treenode','subtree',
  'עץ','עצים','צומת','הכנסה','מחיקה','חיפוש','גובה','עומק','רקורסיה',
  'שמאל','ימין','שורש','עלה','הורה','סדר','בינארי','מאוזן','מעבר'
];

// ── State ─────────────────────────────────────────────────────────────────────

let conversationHistory = [];
let typingEl = null;

// ── Topic guard ───────────────────────────────────────────────────────────────

function isOffTopic(text) {
  if (text.trim().length <= 15) return false;
  const lower = text.toLowerCase();
  return !TREE_KEYWORDS.some(kw => lower.includes(kw));
}

// ── API call ──────────────────────────────────────────────────────────────────

async function sendMessage(userText) {
  userText = userText.trim();
  if (!userText) return;

  renderMessage('user', userText);
  setInputEnabled(false);
  showTyping();

  // Snapshot history before this turn (server adds current message itself)
  const historySnapshot = [...conversationHistory];

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: historySnapshot.slice(-MAX_TURNS),
        off_topic: isOffTopic(userText)
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `שגיאת שרת ${res.status}`);
    }

    const data = await res.json();
    const reply = data?.reply?.trim();
    if (!reply) throw new Error('התגובה ריקה — נסה שוב.');

    // Update history only on success
    conversationHistory.push({ role: 'user', content: userText });
    conversationHistory.push({ role: 'assistant', content: reply });
    if (conversationHistory.length > MAX_TURNS * 2) {
      conversationHistory = conversationHistory.slice(-MAX_TURNS * 2);
    }

    hideTyping();
    renderMessage('bot', reply);

  } catch (err) {
    hideTyping();
    renderMessage('error', `שגיאה: ${err.message}`);
  } finally {
    setInputEnabled(true);
    document.getElementById('user-input').focus();
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderMessage(role, text) {
  const container = document.getElementById('messages');

  const wrap = document.createElement('div');
  wrap.className = `message message--${role}`;

  if (role === 'bot' || role === 'error') {
    const avatar = document.createElement('span');
    avatar.className = 'message__avatar';
    avatar.textContent = role === 'error' ? '⚠' : '⬡';
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';
  bubble.setAttribute('dir', 'auto');
  bubble.innerHTML = parseMarkdown(text);

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

// Lightweight markdown: code blocks → <pre>, inline code → <code>, bold, newlines.
// HTML is escaped first to prevent XSS.
function parseMarkdown(raw) {
  const safe = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const parts = [];
  let lastIdx = 0;
  const codeBlockRe = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let m;

  while ((m = codeBlockRe.exec(safe)) !== null) {
    parts.push(processInline(safe.slice(lastIdx, m.index)));
    parts.push(`<pre><code>${m[1].trim()}</code></pre>`);
    lastIdx = m.index + m[0].length;
  }
  parts.push(processInline(safe.slice(lastIdx)));

  return parts.join('');
}

function processInline(text) {
  return text
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function showTyping() {
  if (typingEl) return;
  const container = document.getElementById('messages');
  typingEl = document.createElement('div');
  typingEl.className = 'message message--bot typing-indicator';
  typingEl.innerHTML = `
    <span class="message__avatar">⬡</span>
    <div class="message__bubble"><span></span><span></span><span></span></div>
  `;
  container.appendChild(typingEl);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function hideTyping() {
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

// ── Input helpers ─────────────────────────────────────────────────────────────

function setInputEnabled(on) {
  const input = document.getElementById('user-input');
  const btn   = document.getElementById('send-btn');
  input.disabled = !on;
  btn.disabled   = !on;
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  renderMessage('bot',
    'שלום! אני **TreeGuide** — העוזר שלך לנושא עצי בינארי ב-Java ⬡\n' +
    'אני לא אכתוב עבורך קוד, אבל אעזור לך לחשוב ולהבין.\n' +
    'על מה אתה עובד היום?'
  );

  document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('user-input');
    const val = input.value;
    if (val.trim()) {
      input.value = '';
      autoResizeTextarea(input);
      sendMessage(val);
    }
  });

  document.getElementById('user-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('send-btn').click();
    }
  });

  document.getElementById('user-input').addEventListener('input', e => {
    autoResizeTextarea(e.target);
  });
}

document.addEventListener('DOMContentLoaded', init);
