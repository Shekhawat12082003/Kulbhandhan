import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, apiPublic, tokens } from './api';
import { disconnectSocket } from './socket';

type User = { id: string; managedBy: string; onboardingStep: number };
type Ctx = {
  user: User | null; loading: boolean;
  completeAuth: (data: { user: User; accessToken: string; refreshToken: string }) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { if (await tokens.access()) setUser((await api('/auth/me')).user); }
      catch { await tokens.clear(); }
      finally { setLoading(false); }
    })();
  }, []);

  const completeAuth = useCallback(async (d: { user: User; accessToken: string; refreshToken: string }) => {
    await tokens.save(d.accessToken, d.refreshToken);
    setUser(d.user);
  }, []);

  const signOut = useCallback(async () => {
    const rt = await tokens.refresh();
    if (rt) await apiPublic('/auth/logout', 'POST', { refreshToken: rt }).catch(() => {});
    await tokens.clear();
    disconnectSocket();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, completeAuth, signOut }), [user, loading, completeAuth, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
