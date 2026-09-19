import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './store.jsx';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Feed from './pages/Feed.jsx';
import Matches from './pages/Matches.jsx';
import Chat from './pages/Chat.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

function Guard({ children }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return <div className="boot">Загружаем сессию…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  const { user } = useSession();

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
  return (
    <div className="shell">
      <Nav />
      <main className="shell-main">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
