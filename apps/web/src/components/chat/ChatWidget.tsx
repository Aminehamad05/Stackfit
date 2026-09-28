import { useEffect, useRef, useState } from 'react';
import { ApiError, api, getToken } from '../../lib/api';

interface Thread {
  id: number;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

interface Msg {
  id: number | string;
  role: string;
  content: string;
}

// Floating study-buddy widget (students only). Threads persist server-side;
// without LLM_API_KEY the API answers 503 and the panel explains the setup.
export default function ChatWidget(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const signedIn = getToken() !== null;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function refreshThreads(select?: number): Promise<void> {
    const r = await api<{ threads: Thread[] }>('/chat/threads');
    setThreads(r.threads);
    if (select !== undefined) setActiveId(select);
    else if (r.threads.length > 0 && activeId === null) setActiveId(r.threads[0].id);
  }

  async function openChat(): Promise<void> {
    setOpen(true);
    setNotice(null);
    try {
      await refreshThreads();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load chats.');
    }
  }

  async function loadMessages(id: number): Promise<void> {
    setActiveId(id);
    setNotice(null);
    try {
      const r = await api<{ messages: Msg[] }>(`/chat/threads/${id}/messages`);
      setMessages(r.messages);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load messages.');
    }
  }

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      let tid = activeId;
      if (tid === null) {
        const t = await api<{ thread: Thread }>('/chat/threads', { method: 'POST', body: {} });
        tid = t.thread.id;
        setActiveId(tid);
        void refreshThreads(tid);
      }
      setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: text }]);
      setInput('');
      const r = await api<{ message: Msg }>(`/chat/threads/${tid}/messages`, {
        method: 'POST',
        body: { content: text },
      });
      setMessages((m) => [...m, r.message]);
      void refreshThreads(tid);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setNotice('Chat needs an API key. Add LLM_API_KEY to .env (free at aistudio.google.com) and restart the API.');
      } else {
        setNotice(e instanceof Error ? e.message : 'Send failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function newChat(): Promise<void> {
    try {
      const t = await api<{ thread: Thread }>('/chat/threads', { method: 'POST', body: {} });
      setMessages([]);
      await refreshThreads(t.thread.id);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not start a chat.');
    }
  }

  if (!signedIn) return <></>;
  if (!open) {
    return (
      <button
        onClick={() => void openChat()}
        aria-label="Open study assistant"
        title="Ask the study assistant"
        style={fab}
      >
        💬
      </button>
    );
  }
  return (
    <div style={panel} role="dialog" aria-label="Study assistant">
      <div style={head}>
        <strong>Study assistant</strong>
        <span>
          <button onClick={() => void newChat()} title="New chat" style={iconBtn}>＋</button>
          <button onClick={() => setOpen(false)} title="Close" style={iconBtn}>✕</button>
        </span>
      </div>
      {threads.length > 1 ? (
        <div style={threadRow}>
          {threads.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => void loadMessages(t.id)}
              title={t.title}
              style={t.id === activeId ? chipOn : chip}
            >
              {(t.title || 'Chat').slice(0, 18)}
            </button>
          ))}
        </div>
      ) : null}
      <div style={msgs}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Hi! Ask about your field, roadmap, or any concept you&apos;re learning. ✨</p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} style={m.role === 'user' ? bubbleUser : bubbleAi}>
            {m.content}
          </div>
        ))}
        {busy ? <div style={bubbleAi}>…</div> : null}
        <div ref={bottomRef} />
      </div>
      {notice ? <p style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 8px' }}>{notice}</p> : null}
      <div style={composer}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask anything…"
          aria-label="Chat message"
          style={textInput}
        />
        <button onClick={() => void send()} disabled={busy || input.trim() === ''} style={sendBtn}>
          ➤
        </button>
      </div>
    </div>
  );
}

const fab: React.CSSProperties = {
  position: 'fixed', right: 20, bottom: 20, width: 56, height: 56, borderRadius: '50%',
  fontSize: 26, background: '#3255fd', color: '#fff', border: 'none', cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,.3)', zIndex: 60,
};
const panel: React.CSSProperties = {
  position: 'fixed', right: 16, bottom: 16, width: 360, maxWidth: 'calc(100vw - 32px)',
  height: 500, maxHeight: '70vh', background: 'var(--surface)', border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,.25)', zIndex: 60,
};
const head: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 12px', background: '#1c2333', color: '#fff',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, marginLeft: 8,
};
const threadRow: React.CSSProperties = { display: 'flex', gap: 6, padding: '8px 10px 0', overflowX: 'auto' };
const chip: React.CSSProperties = {
  border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--text-primary)',
  borderRadius: 12, padding: '2px 8px',
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
const chipOn: React.CSSProperties = { ...chip, background: 'var(--blue-soft)', borderColor: '#3255fd' };
const msgs: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 };
const bubbleUser: React.CSSProperties = {
  alignSelf: 'flex-end', background: '#3255fd', color: '#fff', borderRadius: '12px 12px 2px 12px',
  padding: '8px 12px', maxWidth: '85%', fontSize: 14, whiteSpace: 'pre-wrap',
};
const bubbleAi: React.CSSProperties = {
  alignSelf: 'flex-start', background: 'var(--surface-soft)', color: 'var(--text-primary)',
  borderRadius: '12px 12px 12px 2px',
  padding: '8px 12px', maxWidth: '85%', fontSize: 14, whiteSpace: 'pre-wrap',
};
const composer: React.CSSProperties = { display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)' };
const textInput: React.CSSProperties = {
  flex: 1, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)',
  borderRadius: 20, padding: '8px 14px', fontSize: 14,
};
const sendBtn: React.CSSProperties = {
  border: 'none', background: '#3255fd', color: '#fff', borderRadius: '50%',
  width: 38, height: 38, cursor: 'pointer', fontSize: 16,
};
