import { createContext, useContext, useState } from 'react';
import { Auth } from '../api.js';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => Auth.user());
  const login = async (e, p) => { const d = await Auth.login(e, p); setUser(d.user); return d; };
  const signup = async (pl) => { const d = await Auth.signup(pl); setUser(d.user); return d; };
  const logout = () => { Auth.logout(); setUser(null); };
  return <Ctx.Provider value={{ user, login, signup, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
