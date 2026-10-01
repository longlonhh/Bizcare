import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authApi, TOKEN_KEY, USER_KEY } from "@/lib/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login({ username, password });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => {
    const role = user?.role?.name || null;
    return {
      user,
      role,
      isAuthenticated: Boolean(user) && Boolean(localStorage.getItem(TOKEN_KEY)),
      hasRole: (...roles) => roles.includes(role),
      login,
      logout,
    };
  }, [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong <AuthProvider>");
  return ctx;
}
