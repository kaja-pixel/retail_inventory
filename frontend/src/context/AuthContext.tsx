import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getApiErrorMessage } from '../services/api.js';
import { User, UserRole } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; confirmPassword?: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('skillforge_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('skillforge_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('skillforge_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data.data) {
            setUser(res.data.data);
            localStorage.setItem('skillforge_user', JSON.stringify(res.data.data));
          }
        } catch {
          // Token invalid or expired
          localStorage.removeItem('skillforge_token');
          localStorage.removeItem('skillforge_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const res = await api.post('/auth/login', credentials);
      const { token: receivedToken, user: receivedUser } = res.data.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('skillforge_token', receivedToken);
      localStorage.setItem('skillforge_user', JSON.stringify(receivedUser));
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  };

  const register = async (data: { fullName: string; email: string; password: string; confirmPassword?: string }) => {
    try {
      await api.post('/auth/register', data);
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await api.post('/auth/google', { credential });
      const { token: receivedToken, user: receivedUser } = res.data.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('skillforge_token', receivedToken);
      localStorage.setItem('skillforge_user', JSON.stringify(receivedUser));
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('skillforge_token');
      localStorage.removeItem('skillforge_user');
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updatedFields };
      setUser(updated);
      localStorage.setItem('skillforge_user', JSON.stringify(updated));
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isStaff = user?.role === 'STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        updateUser,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
