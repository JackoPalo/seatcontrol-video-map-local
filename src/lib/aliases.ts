import { get, put } from "@vercel/blob";

// Human-friendly names for devices ("Camioneta demo" instead of the Android
// ID), set from the site and applied at read time to every clip of that
// device — past and future. One small JSON in the same private Blob store:
//   demo/aliases.json   { "<deviceId>": "<alias>", ... }
// Unlike the write-once clip metadata this file IS overwritten, so it's
// always read with useCache: false (straight from storage, not the CDN).

const PATH = "demo/aliases.json";
const CACHE_TTL_MS = 15_000;
export const MAX_ALIAS_LENGTH = 40;

export type Aliases = Record<string, string>;

let cache: { aliases: Aliases; expiresAt: number } | null = null;

export function isAliasStoreConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readAliases(): Promise<Aliases> {
  const res = await get(PATH, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return {};
  const parsed: unknown = JSON.parse(await new Response(res.stream).text());
  return parsed && typeof parsed === "object" ? (parsed as Aliases) : {};
}

export async function getAliases(): Promise<Aliases> {
  if (!isAliasStoreConfigured()) return {};
  if (cache && cache.expiresAt > Date.now()) return cache.aliases;
  try {
    const aliases = await readAliases();
    cache = { aliases, expiresAt: Date.now() + CACHE_TTL_MS };
    return aliases;
  } catch (e) {
    // Aliases are cosmetic: never break the map over them.
    console.error("aliases read failed", e);
    return cache?.aliases ?? {};
  }
}

// Empty alias = remove it (the device goes back to showing its ID).
export async function setAlias(deviceId: string, alias: string): Promise<Aliases> {
  const aliases = await readAliases();
  const clean = alias.trim().slice(0, MAX_ALIAS_LENGTH);
  if (clean) aliases[deviceId] = clean;
  else delete aliases[deviceId];

  await put(PATH, JSON.stringify(aliases), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  cache = { aliases, expiresAt: Date.now() + CACHE_TTL_MS };
  return aliases;
}
