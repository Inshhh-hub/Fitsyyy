"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { Appearance, BodyInfo, GenerateResponse, Outfit, Preferences, Product } from "@/types";
import { getSupabase } from "@/lib/database/supabase-browser";
import * as remote from "@/lib/database/remote";

const KEY = "fitsy:v1";

export interface HistoryEntry {
  at: string;
  occasions: string[];
  budget: number;
  count: number;
  engine: string;
}

interface Persisted {
  body?: BodyInfo;
  appearance?: Appearance;
  preferences?: Preferences;
  result?: GenerateResponse;
  round: number;
  saved: Outfit[];
  wishlist: Product[];
  history: HistoryEntry[];
}

const EMPTY: Persisted = { round: 0, saved: [], wishlist: [], history: [] };

interface StyleCtx extends Persisted {
  hydrated: boolean;
  user: User | null;
  authEnabled: boolean;
  setBody(b: BodyInfo): void;
  setAppearance(a: Appearance | undefined): void;
  setPreferences(p: Preferences): void;
  setResult(r: GenerateResponse, round: number): void;
  updateOutfit(o: Outfit): void;
  toggleSaved(o: Outfit): boolean;
  toggleWishlist(p: Product): boolean;
  clearLocal(): void;
  deleteEverything(): Promise<void>;
}

const Ctx = createContext<StyleCtx | null>(null);

export function StyleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const sb = useMemo(() => getSupabase(), []);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const stateRef = useRef<Persisted>(state);
  stateRef.current = state;

  // Load guest data from this browser. Photos are never persisted — only derived attributes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) });
    } catch {
      /* corrupted storage: start fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked */
    }
  }, [state, hydrated]);

  // Auth session
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  // On sign-in: merge remote data with local data (union), then push local-only items up.
  useEffect(() => {
    if (!sb || !user || !hydrated) return;
    let cancelled = false;
    (async () => {
      const data = await remote.pullAll(sb, user.id);
      if (cancelled) return;
      const history = await remote.pullHistory(sb, user.id);
      const s = stateRef.current;
      const savedIds = new Set(s.saved.map((o) => o.id));
      const wishIds = new Set(s.wishlist.map((p) => p.id));
      const remoteSaved = new Set(data.outfits.map((o) => o.id));
      const remoteWish = new Set(data.wishlist.map((p) => p.id));
      s.saved.filter((o) => !remoteSaved.has(o.id)).forEach((o) => void remote.pushOutfit(sb, user.id, o));
      s.wishlist.filter((p) => !remoteWish.has(p.id)).forEach((p) => void remote.pushWishlist(sb, user.id, p));
      if (!data.profile && (s.body || s.appearance || s.preferences)) void remote.pushProfile(sb, user.id, { body: s.body, appearance: s.appearance, preferences: s.preferences });
      setState((cur) => ({
        ...cur,
        body: cur.body ?? data.profile?.body,
        appearance: cur.appearance ?? data.profile?.appearance,
        preferences: cur.preferences ?? data.profile?.preferences,
        saved: [...cur.saved, ...data.outfits.filter((o) => !cur.saved.some((x) => x.id === o.id) && !savedIds.has(o.id))],
        wishlist: [...cur.wishlist, ...data.wishlist.filter((p) => !cur.wishlist.some((x) => x.id === p.id) && !wishIds.has(p.id))],
        history: cur.history.length ? cur.history : history.map((h) => ({ at: h.created_at, occasions: h.occasions, budget: h.budget, count: h.outfit_count, engine: h.engine })),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [sb, user, hydrated]);

  const syncProfile = useCallback(
    (p: Persisted) => {
      const u = userRef.current;
      if (sb && u) void remote.pushProfile(sb, u.id, { body: p.body, appearance: p.appearance, preferences: p.preferences });
    },
    [sb],
  );

  const patch = useCallback(
    (change: Partial<Persisted>) => {
      const next = { ...stateRef.current, ...change };
      stateRef.current = next;
      syncProfile(next);
      setState((s) => ({ ...s, ...change }));
    },
    [syncProfile],
  );
  const setBody = useCallback((body: BodyInfo) => patch({ body }), [patch]);
  const setAppearance = useCallback((appearance: Appearance | undefined) => patch({ appearance }), [patch]);
  const setPreferences = useCallback((preferences: Preferences) => patch({ preferences }), [patch]);

  const setResult = useCallback(
    (result: GenerateResponse, round: number) => {
      const entry: HistoryEntry = { at: new Date().toISOString(), occasions: result.occasions, budget: stateRef.current.body?.budget ?? 0, count: result.recommendations.length, engine: result.engine };
      const u = userRef.current;
      if (sb && u) void remote.pushHistory(sb, u.id, entry);
      setState((s) => ({ ...s, result, round, history: [entry, ...s.history].slice(0, 10) }));
    },
    [sb],
  );

  const updateOutfit = useCallback(
    (o: Outfit) => {
      const u = userRef.current;
      if (sb && u && stateRef.current.saved.some((x) => x.id === o.id)) void remote.pushOutfit(sb, u.id, o);
      setState((s) => ({
        ...s,
        result: s.result ? { ...s.result, recommendations: s.result.recommendations.map((x) => (x.id === o.id ? o : x)) } : s.result,
        saved: s.saved.map((x) => (x.id === o.id ? o : x)),
      }));
    },
    [sb],
  );

  const toggleSaved = useCallback(
    (o: Outfit) => {
      const u = userRef.current;
      const exists = stateRef.current.saved.some((x) => x.id === o.id);
      if (sb && u) void (exists ? remote.removeOutfit(sb, u.id, o.id) : remote.pushOutfit(sb, u.id, o));
      setState((s) => ({ ...s, saved: exists ? s.saved.filter((x) => x.id !== o.id) : s.saved.some((x) => x.id === o.id) ? s.saved : [o, ...s.saved] }));
      return !exists;
    },
    [sb],
  );

  const toggleWishlist = useCallback(
    (p: Product) => {
      const u = userRef.current;
      const exists = stateRef.current.wishlist.some((x) => x.id === p.id);
      if (sb && u) void (exists ? remote.removeWishlist(sb, u.id, p.id) : remote.pushWishlist(sb, u.id, p));
      setState((s) => ({ ...s, wishlist: exists ? s.wishlist.filter((x) => x.id !== p.id) : s.wishlist.some((x) => x.id === p.id) ? s.wishlist : [p, ...s.wishlist] }));
      return !exists;
    },
    [sb],
  );

  const clearLocal = useCallback(() => {
    setState(EMPTY);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const deleteEverything = useCallback(async () => {
    const u = userRef.current;
    if (sb && u) await remote.deleteAllUserData(sb, u.id);
    clearLocal();
  }, [sb, clearLocal]);

  const value: StyleCtx = {
    ...state,
    hydrated,
    user,
    authEnabled: Boolean(sb),
    setBody,
    setAppearance,
    setPreferences,
    setResult,
    updateOutfit,
    toggleSaved,
    toggleWishlist,
    clearLocal,
    deleteEverything,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStyle(): StyleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStyle must be used inside <StyleProvider>");
  return v;
}
