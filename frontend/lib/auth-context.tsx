"use client";

import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactElement,
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

// Compatibility helpers for pages that previously used Clerk. They are backed
// by EduTutor's own JWT session, so no Clerk key or third-party account is
// required during deployment.
type PortalUser = User & {
  firstName: string;
  lastName: string;
  imageUrl: string;
  externalAccounts: unknown[];
  primaryEmailAddress: { emailAddress: string };
  delete: () => Promise<void>;
};

function portalUser(user: User | null): PortalUser | null {
  if (!user) return null;
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  return {
    ...user,
    firstName: parts[0] || user.fullName,
    lastName: parts.slice(1).join(" "),
    imageUrl: "",
    externalAccounts: [],
    primaryEmailAddress: { emailAddress: user.email },
    delete: async () => {
      throw new Error("Xóa tài khoản cần được thực hiện qua API EduTutor.");
    },
  };
}

function redirectToLogin(options?: { fallbackRedirectUrl?: string; forceRedirectUrl?: string }) {
  if (typeof window === "undefined") return;
  const returnTo = options?.forceRedirectUrl || options?.fallbackRedirectUrl || window.location.pathname;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function useUser() {
  const { user, isLoading } = useAuth();
  const normalized = portalUser(user);
  return { user: normalized, isLoaded: !isLoading, isSignedIn: Boolean(normalized) };
}

export function useClerk() {
  const { logout } = useAuth();
  return {
    openSignIn: redirectToLogin,
    signOut: async () => {
      logout();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (typeof window !== "undefined") window.location.href = "/Home";
    },
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  return useUser().isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  return useUser().isSignedIn ? null : <>{children}</>;
}

type AuthButtonProps = { children: ReactElement<{ onClick?: (event: React.MouseEvent) => void }>; mode?: string };

function AuthButton({ children, destination }: AuthButtonProps & { destination: "/login" | "/register" }) {
  return cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      if (!event.defaultPrevented) {
        event.preventDefault();
        window.location.assign(destination);
      }
    },
  });
}

export function SignInButton({ children }: AuthButtonProps) {
  return <AuthButton destination="/login">{children}</AuthButton>;
}

export function SignUpButton({ children }: AuthButtonProps) {
  return <AuthButton destination="/register">{children}</AuthButton>;
}

export function UserButton(props: { userProfileMode?: string; userProfileUrl?: string; appearance?: unknown }) {
  void props;
  const { user } = useUser();
  return (
    <a href="/profile" aria-label="Hồ sơ cá nhân" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
      {user?.firstName?.[0]?.toUpperCase() || "U"}
    </a>
  );
}
