import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function Login() {
  const [params] = useSearchParams();
  const [error, setError] = useState(
    params.get('expired') ? 'Сессия истекла. Войдите заново.' : ''
  );
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const { authorizeUrl, state } = await api('/auth/sberid/start', {
        method: 'POST',
        body: { redirectUri: `${location.origin}${import.meta.env.BASE_URL}auth/callback` },
      });
      sessionStorage.setItem('sbn.state', state);
      // Экран имитации провайдера отдаёт наш же сервер — путь от корня приложения.
      location.href = authorizeUrl.startsWith('/')
        ? import.meta.env.BASE_URL.replace(/\/$/, '') + authorizeUrl
        : authorizeUrl;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-brand">
        <span className="brand-logo brand-logo--md">Сберконнект</span>
      </div>

      <h1>Деловые знакомства и встречи СберБизнеса</h1>
      <p className="login-lead">
        Опишите, кого вы ищете. ИИ разберёт запрос, найдёт подходящих предпринимателей в закрытой
        базе и объяснит, почему каждый из них вам полезен.
      </p>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <button className="btn btn-wide" onClick={start} disabled={busy}>
        {busy ? 'Открываем СберБизнес ID…' : 'Войти через СберБизнес ID'}
      </button>

      <ul className="login-points">
        <li>
          <b>Закрытый круг</b> Только действующие клиенты СберБизнеса с подтверждённым ИНН
        </li>
        <li>
          <b>Подбор</b> Кандидаты ранжируются по совместимости, с обоснованием по каждому
        </li>
        <li>
          <b>Чат</b> Открывается при взаимном интересе
        </li>
        <li>
          <b>Встречи</b> Мастер-классы и разборы клуба, места — в порядке очереди
        </li>
      </ul>

      <p className="login-note">
        Демо-версия. СберБизнес ID и GigaChat имитируются локально, внешних вызовов нет, пароль не
        запрашивается — на следующем экране выберите любую тестовую компанию.
      </p>
    </div>
  );
}
