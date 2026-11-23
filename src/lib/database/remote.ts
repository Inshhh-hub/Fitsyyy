import type { SupabaseClient } from "@supabase/supabase-js";
import type { Outfit, Product, StyleProfile } from "@/types";

/** All calls rely on RLS (see supabase/migrations). Errors are logged, never thrown into the UI. */
function log(scope: string, error: { message: string } | null) {
  if (error) console.error(`[supabase:${scope}]`, error.message);
}

export interface RemoteData {
  profile: StyleProfile | null;
  outfits: Outfit[];
  wishlist: Product[];
}

export async function pullAll(sb: SupabaseClient, userId: string): Promise<RemoteData> {
  const [p, o, w] = await Promise.all([
    sb.from("style_profiles").select("body, appearance, preferences").eq("user_id", userId).maybeSingle(),
    sb.from("saved_outfits").select("outfit").eq("user_id", userId),
    sb.from("wishlist_items").select("product").eq("user_id", userId),
  ]);
  log("pull-profile", p.error);
  log("pull-outfits", o.error);
  log("pull-wishlist", w.error);
  const row = p.data as { body: StyleProfile["body"]; appearance: StyleProfile["appearance"]; preferences: StyleProfile["preferences"] } | null;
  return {
    profile: row ? { body: nonEmpty(row.body), appearance: nonEmpty(row.appearance), preferences: nonEmpty(row.preferences) } : null,
    outfits: ((o.data ?? []) as Array<{ outfit: Outfit }>).map((r) => r.outfit),
    wishlist: ((w.data ?? []) as Array<{ product: Product }>).map((r) => r.product),
  };
}

function nonEmpty<T extends object>(v: T | undefined): T | undefined {
  return v && Object.keys(v).length ? v : undefined;
}

export async function pushProfile(sb: SupabaseClient, userId: string, profile: StyleProfile) {
  const { error } = await sb.from("style_profiles").upsert(
    { user_id: userId, body: profile.body ?? {}, appearance: profile.appearance ?? {}, preferences: profile.preferences ?? {}, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  log("push-profile", error);
}

export async function pushOutfit(sb: SupabaseClient, userId: string, outfit: Outfit) {
  const { error } = await sb.from("saved_outfits").upsert({ user_id: userId, outfit_key: outfit.id, outfit }, { onConflict: "user_id,outfit_key" });
  log("push-outfit", error);
}

export async function removeOutfit(sb: SupabaseClient, userId: string, outfitId: string) {
  const { error } = await sb.from("saved_outfits").delete().eq("user_id", userId).eq("outfit_key", outfitId);
  log("remove-outfit", error);
}

export async function pushWishlist(sb: SupabaseClient, userId: string, product: Product) {
  const { error } = await sb.from("wishlist_items").upsert({ user_id: userId, product_key: product.id, product }, { onConflict: "user_id,product_key" });
  log("push-wishlist", error);
}

export async function removeWishlist(sb: SupabaseClient, userId: string, productId: string) {
  const { error } = await sb.from("wishlist_items").delete().eq("user_id", userId).eq("product_key", productId);
  log("remove-wishlist", error);
}

export async function pushHistory(sb: SupabaseClient, userId: string, entry: { occasions: string[]; budget: number; count: number; engine: string }) {
  const { error } = await sb.from("recommendation_history").insert({ user_id: userId, occasions: entry.occasions, budget: entry.budget, outfit_count: entry.count, engine: entry.engine });
  log("push-history", error);
}

export async function pullHistory(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.from("recommendation_history").select("occasions, budget, outfit_count, engine, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
  log("pull-history", error);
  return (data ?? []) as Array<{ occasions: string[]; budget: number; outfit_count: number; engine: string; created_at: string }>;
}

/** Deletes every row the user owns (profile, outfits, wishlist, history) and any stored photos. */
export async function deleteAllUserData(sb: SupabaseClient, userId: string) {
  const results = await Promise.all([
    sb.from("style_profiles").delete().eq("user_id", userId),
    sb.from("saved_outfits").delete().eq("user_id", userId),
    sb.from("wishlist_items").delete().eq("user_id", userId),
    sb.from("recommendation_history").delete().eq("user_id", userId),
  ]);
  results.forEach((r, i) => log(`delete-${i}`, r.error));
  const files = await sb.storage.from("user-photos").list(userId);
  if (files.data?.length) await sb.storage.from("user-photos").remove(files.data.map((f) => `${userId}/${f.name}`));
}
