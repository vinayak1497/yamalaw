import { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from '../api.js';
import { supabase } from '../supabase.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => Auth.user());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Auth.syncUser().then((u) => {
      if (mounted && u) setUser(u);
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const u = await Auth.syncUser();
          if (mounted && u) setUser(u);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (e, p) => {
    const d = await Auth.login(e, p);
    setUser(d.user);
    return d;
  };

  const signup = async (pl) => {
    const d = await Auth.signup(pl);
    if (d?.user) setUser(d.user);
    return d;
  };

  const logout = async () => {
    await Auth.logout();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, signup, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
