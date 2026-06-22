import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApi, getToken, setToken as persistToken, clearToken } from "../lib/adminApi";

type AuthState = {
  token: string;
  isAuthed: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTok] = useState<string>(() => getToken());

  const login = useCallback(async (password: string) => {
    const res = await adminApi.login(password);
    persistToken(res.token);
    setTok(res.token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTok("");
  }, []);

  // เด้งออกเมื่อ token หมดอายุ (adminApi ยิง event นี้ตอนเจอ 401)
  useEffect(() => {
    const onUnauth = () => {
      clearToken();
      setTok("");
    };
    window.addEventListener("admin-unauthorized", onUnauth);
    return () => window.removeEventListener("admin-unauthorized", onUnauth);
  }, []);

  return (
    <Ctx.Provider value={{ token, isAuthed: !!token, login, logout }}>{children}</Ctx.Provider>
  );
}

export function useAdminAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return c;
}
