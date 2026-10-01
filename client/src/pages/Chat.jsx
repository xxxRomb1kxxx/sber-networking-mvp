import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../store.jsx';
import Avatar from '../components/Avatar.jsx';
import { IconChevronLeft, IconSend } from '../components/Icons.jsx';

const time = (iso) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function Chat() {
  const { id } = useParams();
  const { user, socket, socketReady } = useSession();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    api(`/matches/${id}`)
      .then(({ match, messages }) => {
        setMatch(match);
        setMessages(messages);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const onMessage = ({ matchId, message }) => {
      if (matchId !== id) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.authorId !== user.id) s.emit('message:read', { matchId: id });
    };
    const onRead = ({ matchId, readerId, ids, readAt }) => {
      if (matchId !== id || readerId === user.id) return;
      setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, readAt } : m)));
    };
    const onTyping = ({ matchId, typing }) => matchId === id && setTyping(typing);
    const onPresence = ({ userId, online }) =>
      setMatch((m) =>
        m && m.companion?.id === userId ? { ...m, companion: { ...m.companion, online } } : m
      );

    s.on('message', onMessage);
    s.on('message:read', onRead);
    s.on('typing', onTyping);
    s.on('presence', onPresence);
    return () => {
      s.off('message', onMessage);
      s.off('message:read', onRead);
      s.off('typing', onTyping);
      s.off('presence', onPresence);
    };
  }, [id, socketReady, user.id]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const s = socket.current;
    if (s?.connected) {
      s.emit('message:send', { matchId: id, text: body }, (res) => {
        if (!res?.ok) setError('Сообщение не отправлено');
      });
    } else {
      try {
        const { message } = await api(`/matches/${id}/messages`, { method: 'POST', body: { text: body } });
        setMessages((prev) => [...prev, message]);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  const onType = (e) => {
    setText(e.target.value);
    const s = socket.current;
    if (!s) return;
    s.emit('typing', { matchId: id, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => s.emit('typing', { matchId: id, typing: false }), 1500);
  };

  const act = async (path, confirmText) => {
    if (!confirm(confirmText)) return;
    try {
      const res = await api(`/matches/${id}/${path}`, { method: 'POST', body: { reason: 'Из чата' } });
      if (res.match) setMatch(res.match);
      if (path === 'report') alert(res.message);
      if (path === 'block') navigate('/matches');
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !match) return <div className="error-box">{error}</div>;
  if (!match) return <div className="skeleton"><span className="spinner" />Открываем диалог…</div>;

  return (
    <div className="chat">
      <header className="chat-head">
        <button className="icon-btn" onClick={() => navigate('/matches')} aria-label="Назад">
          <IconChevronLeft width={20} height={20} />
        </button>
        <span className={`avatar-ring ${match.companion?.online ? 'online' : ''}`}>
          <Avatar user={match.companion} />
        </span>
        <div>
          <div className="chat-head-name">{match.companion?.fullName}</div>
          <div className="chat-head-status">
            {typing ? (
              <span className="typing-dots" aria-label="печатает">
                <span />
                <span />
                <span />
              </span>
            ) : match.companion?.online ? (
              'в сети'
            ) : (
              'не в сети'
            )}
          </div>
        </div>
      </header>

      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && (
          <p className="muted" style={{ fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            Диалог открыт. Напишите, что вам нужно и чем полезны вы — так отвечают чаще.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.authorId === user.id;
          return (
            <div key={m.id} className={`bubble ${mine ? 'mine' : ''}`}>
              {m.text}
              <div className="bubble-meta">
                <span>{time(m.createdAt)}</span>
                {mine && <span>{m.readAt ? 'прочитано' : 'отправлено'}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {match.closed ? (
        <div className="notice-box" style={{ marginTop: 12 }}>Диалог завершён.</div>
      ) : (
        <>
          <div className="chat-form">
            <textarea
              value={text}
              onChange={onType}
              placeholder="Сообщение"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="send-btn" onClick={send} disabled={!text.trim()} aria-label="Отправить">
              <IconSend width={19} height={19} />
            </button>
          </div>
          <div className="chat-tools">
            <button onClick={() => act('close', 'Завершить диалог?')}>Завершить диалог</button>
            <button onClick={() => act('block', 'Заблокировать пользователя?')}>Заблокировать</button>
            <button onClick={() => act('report', 'Пожаловаться модератору?')}>Пожаловаться</button>
          </div>
        </>
      )}
    </div>
  );
}
