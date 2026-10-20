import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client.js';

const STORAGE_KEY = 'noxfit.session';
const AuthContext = createContext(null);

const readStoredSession = () => {
  const value = window.localStorage.getItem(STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => readStoredSession());

  useEffect(() => {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        setSession(readStoredSession());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async ({ role, email, password }) => {
    const response = await authApi.login(role, { email, password });

    setSession({
      role,
      token: response.token,
      user: response.user,
    });
  };

  const register = async ({ email, password, ...profile }) => {
    await authApi.registerMember({ email, password, ...profile });
    await login({ role: 'member', email, password });
  };

  const logout = () => {
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};