import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, usersAPI, messagesAPI } from "@/services/api";

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ id: number; email: string; username: string; role: string; full_name?: string; avatar_url?: string }>;
  register: (data: RegisterData) => Promise<void>;
  loginWithProvider: (email: string, name: string, provider: string, token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  playNotificationSound: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("isoko_token"));
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 (pleasant ping)
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5 (higher ping)

      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Failed to play synthesized notification sound", e);
    }
  }, []);

  // Sync PWA / Mobile app badge with unread messages count
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount]);

  // Periodic poll of unread messages count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = () => {
      messagesAPI.getConversations()
        .then((res) => {
          const apiConvs = res.data as Array<{ unread_count: number }>;
          const totalUnread = apiConvs.reduce((sum, c) => sum + c.unread_count, 0);
          
          setUnreadCount((prev) => {
            // Play notification sound if unread count goes up
            if (totalUnread > prev) {
              playNotificationSound();
            }
            return totalUnread;
          });
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [user, playNotificationSound]);

  // On mount or token change, fetch current user
  useEffect(() => {
    if (token) {
      usersAPI
        .me()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("isoko_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    const { access_token } = res.data;
    localStorage.setItem("isoko_token", access_token);
    setToken(access_token);
    const me = await usersAPI.me();
    setUser(me.data);
    return me.data as { id: number; email: string; username: string; role: string; full_name?: string; avatar_url?: string };
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    await authAPI.register(data);
    // Auto-login after successful registration
    await login(data.email, data.password);
  }, [login]);

  const loginWithProvider = useCallback(async (email: string, name: string, provider: string, token: string) => {
    const res = await authAPI.socialLogin(email, name, provider, token);
    const { access_token } = res.data;
    localStorage.setItem("isoko_token", access_token);
    setToken(access_token);
    const me = await usersAPI.me();
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("isoko_token");
    setToken(null);
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithProvider,
        logout,
        isAuthenticated: !!user,
        unreadCount,
        setUnreadCount,
        playNotificationSound,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
