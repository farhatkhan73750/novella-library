import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext.js";
import { api, getToken, setToken, clearToken } from "../api/client.js";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there is a saved token we still need to check
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  // On first load: if a token is saved, ask the server who it belongs to
  useEffect(() => {
    if (!getToken()) return;

    let cancelled = false;
    api("/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((err) => {
        // 401 = token expired or invalid, so throw it away
        if (err.status === 401) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name, email, password) => {
    const data = await api("/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}