import { getSavedCompany } from "@/storage/companyStorage";
import {
  clearAuthSession,
  clearLegacyAuthTokens,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from "@/storage/authStorage";
import { clearUser } from "@/storage/userStorage";
import { fetchWithoutRedirect, getCompanyRequestUrl, getTrustedCompanyApiBase } from "./apiUrlPolicy";
import type { Company } from "./companyService";

interface TokenPair {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
}

const EXPIRED_MESSAGE = "Session expired. Please log in again.";
const TOKEN = /^[a-f0-9]{64}$/;
const expiryListeners = new Set<() => void>();
let version = 0;
let invalidated = false;
let previousAccessToken: string | undefined;
let sessionWork: Promise<unknown> = Promise.resolve();
let renewal: { version: number; token: string; result: Promise<AuthSession> } | undefined;
let logoutWork: Promise<void> | undefined;

function serializeSession<T>(work: () => Promise<T>): Promise<T> {
  const next = sessionWork.then(work);
  sessionWork = next.catch(() => undefined);
  return next;
}

export function onSessionExpired(listener: () => void): () => void {
  expiryListeners.add(listener);
  return () => { expiryListeners.delete(listener); };
}

export function getSessionVersion() {
  return version;
}

export async function hasActiveSession() {
  if (invalidated) return false;
  const session = await readAuthSession();
  const company = await getSavedCompany();
  return !invalidated && !!session && matchesCompany(session, company);
}

type SessionCompany = Pick<AuthSession, "companyId" | "apiBase">;

function matchesCompany(session: SessionCompany, company: Company | null) {
  return !!company && session.companyId === String(company.company_id) &&
    session.apiBase === company.api_url;
}

function parseTokenPair(tokens: TokenPair | undefined, company: SessionCompany): AuthSession {
  if (
    typeof tokens?.access_token !== "string" || !TOKEN.test(tokens.access_token) ||
    typeof tokens.refresh_token !== "string" || !TOKEN.test(tokens.refresh_token) ||
    typeof tokens.expires_in !== "number" || !Number.isSafeInteger(tokens.expires_in) ||
    tokens.expires_in <= 0
  ) {
    throw new Error("Invalid session response.");
  }
  return {
    companyId: company.companyId,
    apiBase: company.apiBase,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

export function startSession(tokens: TokenPair, company: Company): Promise<void> {
  return serializeSession(async () => {
    const session = parseTokenPair(tokens, {
      companyId: String(company.company_id),
      apiBase: getTrustedCompanyApiBase(company.api_url),
    });
    if (!matchesCompany(session, await getSavedCompany())) {
      await postSessionAction("logout", session).catch(() => undefined);
      throw new Error("The selected company changed. Please sign in again.");
    }
    version += 1;
    previousAccessToken = undefined;
    try {
      await saveAuthSession(session);
    } catch {
      await postSessionAction("logout", session).catch(() => undefined);
      throw new Error("Unable to save the login session.");
    }
    invalidated = false;
    await clearLegacyAuthTokens().catch(() => undefined);
  });
}

async function invalidateSession(notify: boolean) {
  invalidated = true;
  version += 1;
  previousAccessToken = undefined;
  const cleared = await Promise.allSettled([clearAuthSession(), clearUser()]);
  if (notify) expiryListeners.forEach((listener) => listener());
  if (cleared.some((result) => result.status === "rejected")) {
    throw new Error("Unable to clear local login details.");
  }
}

async function postSessionAction(action: "refresh" | "logout", session: AuthSession) {
  const apiBase = getTrustedCompanyApiBase(session.apiBase);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchWithoutRedirect(`${apiBase}/auth/${action}.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
      signal: controller.signal,
    });
    if (action === "refresh" && response.status === 401) return { status: 401 };
    if (!response.ok) throw new Error("Unable to update the login session. Please try again.");
    const result: { success?: boolean; data?: TokenPair } = await response.json();
    if (result?.success !== true) throw new Error("Invalid session response.");
    return { status: response.status, data: result.data };
  } finally {
    clearTimeout(timeout);
  }
}

export function endSession(): Promise<void> {
  if (logoutWork) return logoutWork;
  logoutWork = serializeSession(async () => {
    const session = invalidated ? null : await readAuthSession();
    if (session) await postSessionAction("logout", session);
    await invalidateSession(false);
  }).finally(() => {
    logoutWork = undefined;
  });
  return logoutWork;
}

async function requireSession(expectedVersion: number): Promise<AuthSession> {
  const session = invalidated ? null : await readAuthSession();
  const company = await getSavedCompany();
  if (version !== expectedVersion || invalidated || !session || !matchesCompany(session, company)) {
    throw new Error(EXPIRED_MESSAGE);
  }
  return session;
}

function renewSession(expectedVersion: number, attemptedToken: string) {
  if (renewal?.version === expectedVersion && renewal.token === attemptedToken) {
    return renewal.result;
  }
  const result = serializeSession(async () => {
    const session = await requireSession(expectedVersion);
    if (session.accessToken !== attemptedToken) return session;

    const result = await postSessionAction("refresh", session);
    if (result.status === 401) {
      await invalidateSession(true);
      throw new Error(EXPIRED_MESSAGE);
    }

    const updated = parseTokenPair(result.data, session);
    try {
      await saveAuthSession(updated);
    } catch {
      await postSessionAction("logout", updated).catch(() => undefined);
      await invalidateSession(true);
      throw new Error("Unable to save the renewed session.");
    }
    previousAccessToken = session.accessToken;
    return updated;
  }).finally(() => {
    if (renewal?.result === result) renewal = undefined;
  });
  renewal = { version: expectedVersion, token: attemptedToken, result };
  return result;
}

export async function fetchWithSession(url: string, init: RequestInit): Promise<Response> {
  const requestVersion = version;
  const headers = new Headers(init.headers);
  const suppliedToken = headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
    ?? headers.get("X-Access-Token");
  let session = await requireSession(requestVersion);
  const requestUrl = getCompanyRequestUrl(url, session.apiBase);
  if (suppliedToken && suppliedToken !== session.accessToken && suppliedToken !== previousAccessToken) {
    throw new Error(EXPIRED_MESSAGE);
  }

  if (session.expiresAt - Date.now() <= 30000) {
    session = await renewSession(requestVersion, session.accessToken);
  }

  const send = (token: string) => {
    if (version !== requestVersion || invalidated || logoutWork) throw new Error(EXPIRED_MESSAGE);
    headers.set("Authorization", `Bearer ${token}`);
    if (headers.has("X-Access-Token")) headers.set("X-Access-Token", token);
    return fetchWithoutRedirect(requestUrl, { ...init, headers });
  };

  const response = await send(session.accessToken);
  if (version !== requestVersion || invalidated) throw new Error(EXPIRED_MESSAGE);
  if (response.status !== 401 || init.signal?.aborted) return response;

  // These PHP routes reject an invalid token before processing the request body.
  const renewed = await renewSession(requestVersion, session.accessToken);
  if (init.body != null && typeof init.body !== "string") return response;
  void response.body?.cancel().catch(() => undefined);
  const retry = await send(renewed.accessToken);
  if (version !== requestVersion || invalidated) throw new Error(EXPIRED_MESSAGE);
  if (retry.status === 401 && !init.signal?.aborted) {
    await serializeSession(async () => {
      const current = await requireSession(requestVersion);
      if (current.accessToken === renewed.accessToken) await invalidateSession(true);
    });
    throw new Error(EXPIRED_MESSAGE);
  }
  return retry;
}
