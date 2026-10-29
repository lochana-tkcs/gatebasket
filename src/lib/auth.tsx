import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, flat:flats(id, block, number), society:societies(name)')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(s: Session | null, showSpinner: boolean) {
      if (cancelled) return;
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const p = await fetchProfile(s.user.id);
        if (!cancelled) setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }
      // Supabase advises against awaiting its calls inside this callback, so defer the fetch.
      setTimeout(() => load(s, event === 'INITIAL_SESSION' || event === 'SIGNED_IN'), 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const refreshProfile = useCallback(async () => {
    setProfile(userId ? await fetchProfile(userId) : null);
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** The signed-in user's profile. Only call from screens behind the auth guard. */
export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('No profile loaded');
  return profile;
}
