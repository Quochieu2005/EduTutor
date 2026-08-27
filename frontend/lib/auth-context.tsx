"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin, register as apiRegister } from "./api";
import type { LoginPayload, RegisterPayload, User } from "./types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("user");
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const isLoading = false;

  const persistAuth = useCallback(
    (tokens: { access: string; refresh: string }, u: User) => {
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
    },
    [],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await apiLogin(payload);
      persistAuth(result, result.user);
    },
    [persistAuth],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await apiRegister(payload);
      persistAuth(result, result.user);
    },
    [persistAuth],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
