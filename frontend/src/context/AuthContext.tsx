import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../config/api';

interface User {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
  permisos?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permiso: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me').then((res) => {
        const userData = res.data.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }).catch(() => {
        logout();
      });
    }
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: newToken, usuario } = res.data.data;
    setToken(newToken);
    setUser(usuario);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(usuario));
  }, []);

  const loginWithPin = useCallback(async (pin: string) => {
    const res = await api.post('/auth/pin', { pin });
    const { token: newToken, usuario } = res.data.data;
    setToken(newToken);
    setUser(usuario);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(usuario));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const hasPermission = useCallback((permiso: string) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.permisos?.includes(permiso) ?? false;
  }, [user]);

  const isAdmin = user?.roles.includes('admin') ?? false;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isAdmin,
      login,
      loginWithPin,
      logout,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
