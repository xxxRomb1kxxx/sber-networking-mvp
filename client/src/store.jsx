import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, clearToken } from './api.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dictionaries, setDictionaries] = useState({ goals: {}, industries: [], companySizes: [] });
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await api('/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api('/auth/dictionaries').then(setDictionaries).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketReady(false);
      return;
    }
    const socket = io({ auth: { token: getToken() } });
    socketRef.current = socket;
    socket.on('connect', () => setSocketReady(true));
    socket.on('disconnect', () => setSocketReady(false));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* сессия и так закрыта */
    }
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, logout, reload: load, dictionaries, socket: socketRef, socketReady }),
    [user, loading, logout, load, dictionaries, socketReady]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
