import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './store.jsx';
import Nav from './components/Nav.jsx';
import Splash from './components/Splash.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Feed from './pages/Feed.jsx';
import Matches from './pages/Matches.jsx';
import Chat from './pages/Chat.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

// Синхронизировано с длительностью полосы загрузки .splash-progress в styles.css.
const SPLASH_MIN_MS = 2000;
const SPLASH_EXIT_MS = 420;

function Guard({ children }) {
  const { user } = useSession();
  const location = useLocation();

  // На момент рендера Guard сессия уже загружена — заставка в App() ждёт !loading.
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useSession();
  const location = useLocation();
  // Редирект от имитации SberBusiness ID не должен повторно показывать заставку.
  const [showSplash, setShowSplash] = useState(location.pathname !== '/auth/callback');
  const [minElapsed, setMinElapsed] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // Решение «начать выход» и сам таймер выхода — в разных эффектах: если оба
  // завязать на один и тот же эффект с `exiting` в зависимостях, вызов
  // setExiting(true) тут же перезапускает этот же эффект, cleanup отменяет
  // только что созданный таймер, а условие уже false — новый не ставится,
  // и showSplash никогда не станет false (экран зависает после анимации).
  useEffect(() => {
    if (minElapsed && !loading) setExiting(true);
  }, [minElapsed, loading]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setShowSplash(false), SPLASH_EXIT_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  if (showSplash) {
    return <Splash exiting={exiting} />;
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/onboarding"
          element={
            <Guard>
              <Onboarding />
            </Guard>
          }
        />
        <Route
          path="/*"
          element={
            <Guard>
              <Shell />
            </Guard>
          }
        />
      </Routes>
    </div>
  );
}

function Shell() {
  const location = useLocation();
  return (
    <div className="shell">
      <Nav />
      <main className="shell-main">
        <div className="page-transition" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
