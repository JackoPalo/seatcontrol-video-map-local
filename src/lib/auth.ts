// Single hardcoded user (AUTH_USER / AUTH_PASSWORD, set as env vars — never
// committed). No user table, no per-session storage: the session cookie is
// just a hash proving the holder once supplied the right password, so it can
// be verified statelessly from both the Edge middleware and route handlers.
export const SESSION_COOKIE = "sc_session";

const SALT = "seatcontrol-video-map-session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sessionToken(): Promise<string> {
  return sha256Hex(SALT + (process.env.AUTH_PASSWORD ?? ""));
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await sessionToken());
}

export function checkCredentials(username: string, password: string): boolean {
  return (
    username === process.env.AUTH_USER && password === process.env.AUTH_PASSWORD
  );
}
