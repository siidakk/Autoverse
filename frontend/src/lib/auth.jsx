import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { apiBaseUrl } from "./api";
import { AuthContext } from "./authContext";

// Accounts. The token lives in localStorage, which is the usual trade for a
// site with no server rendering: it survives a refresh, and it is readable by
// anything that manages to run script on the page. Nothing here is worth more
// than a saved car, and the alternative needs cookies the API cannot set
// across origins.

const KEY = "autoverse.token";

const client = axios.create({ baseURL: apiBaseUrl, timeout: 30000 });

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(KEY));
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(KEY)));

  // A token kept from a previous visit is confirmed rather than trusted, so a
  // stale or revoked one does not leave the site pretending to be signed in.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    client
      .get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((error) => {
        if (cancelled) return;

        // Only drop the token when the server actually rejected it. A sleeping
        // API is not a reason to sign somebody out.
        if (error.response?.status === 401) {
          localStorage.removeItem(KEY);
          setToken(null);
        }
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const remember = useCallback((nextToken, nextUser) => {
    localStorage.setItem(KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setChecking(false);
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await client.post("/auth/register", details);
    remember(data.token, data.user);
    return data.user;
  }, [remember]);

  const login = useCallback(async (details) => {
    const { data } = await client.post("/auth/login", details);
    remember(data.token, data.user);
    return data.user;
  }, [remember]);

  const signOut = useCallback(() => {
    localStorage.removeItem(KEY);
    setToken(null);
    setUser(null);
  }, []);

  const authHeader = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const value = useMemo(
    () => ({ token, user, checking, register, login, signOut, authHeader }),
    [token, user, checking, register, login, signOut, authHeader]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
