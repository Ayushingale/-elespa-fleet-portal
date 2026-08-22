import { createContext, useContext, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { setToken, clearToken } from '../utils/tokenStore';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, role }
  const [status, setStatus] = useState('idle'); // idle | loading | authenticated | error

  const login = useCallback(async (credentials) => {
    setStatus('loading');
    const { token } = await authApi.login(credentials);
    setToken(token);
    const decoded = jwtDecode(token); // { sub, name, role, exp }
    setUser({ id: decoded.sub, name: decoded.name, role: decoded.role });
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('idle');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
