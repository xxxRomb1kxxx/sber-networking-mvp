import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { useSession } from '../store.jsx';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useSession();
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const err = params.get('error');
    const savedState = sessionStorage.getItem('sbn.state');

    if (!err && state && savedState && state !== savedState) {
      setError('Не совпал параметр state — вход прерван для безопасности.');
      return;
    }

    api('/auth/sberid/callback', { method: 'POST', body: { code, error: err } })
      .then(({ sessionToken, user, needsOnboarding }) => {
        setToken(sessionToken);
        setUser(user);
        sessionStorage.removeItem('sbn.state');
        navigate(needsOnboarding ? '/onboarding' : '/', { replace: true });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="login">
        <h1>Вход не завершён</h1>
        <div className="error-box" style={{ margin: '18px 0 22px' }}>{error}</div>
        <button className="btn btn-wide" onClick={() => navigate('/login', { replace: true })}>
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return <div className="boot">Проверяем данные СберБизнес ID…</div>;
}
