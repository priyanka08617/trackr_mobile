import { clearCompany, getSavedCompany, saveCompany } from "@/storage/companyStorage";
import {
  clearAuthSession,
  clearLegacyAuthTokens,
  clearPersistedWebSession,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from "@/storage/authStorage";
import { clearUser } from "@/storage/userStorage";
import { fetchWithoutRedirect, getCompanyRequestUrl, getTrustedCompanyApiBase } from "./apiUrlPolicy";
import type { Company } from "./companyService";
import { parseSessionIdentity, type SessionIdentity } from "./sessionNavigation";

interface TokenPair {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  user?: { id?: unknown; user_category_id?: unknown; user_login_folder_path?: unknown };
}

const EXPIRED_MESSAGE = "Session expired. Please log in again.";
const TOKEN = /^[a-f0-9]{64}$/;
interface SessionSnapshot {
  ready: boolean;
  identity: SessionIdentity | null;
  companyId: string | null;
  version: number;
}

const initialSnapshot: SessionSnapshot = { ready: false, identity: null, companyId: null, version: 0 };
let snapshot = initialSnapshot;
const listeners = new Set<() => void>();
let bootstrap: Promise<void> | undefined;
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

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getSessionSnapshot() {
  return snapshot;
}

export function getInitialSessionSnapshot() {
  return initialSnapshot;
}

function publishSession(session: AuthSession | null) {
  snapshot = {
    ready: true,
    identity: session?.identity ?? null,
    companyId: session?.identity ? session.companyId : null,
    version,
  };
  listeners.forEach((listener) => listener());
}

export function initializeSession(): Promise<void> {
  bootstrap ??= serializeSession(async () => {
    let restored: AuthSession | null = null;
    try {
      await clearPersistedWebSession();
      const [session, company] = await Promise.all([readAuthSession(), getSavedCompany()]);
      if (session && matchesCompany(session, company)) restored = session;
    } finally {
      publishSession(restored);
    }
  });
  return bootstrap;
}

type SessionCompany = Pick<AuthSession, "companyId" | "apiBase">;

function matchesCompany(session: SessionCompany, company: Company | null) {
  return !!company && session.companyId === String(company.company_id) &&
    session.apiBase === company.api_url;
}

function parseTokenPair(
  tokens: TokenPair | undefined,
  company: SessionCompany,
  identity: SessionIdentity | null,
): AuthSession {
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
    identity,
  };
}

export function startSession(tokens: TokenPair, company: Company): Promise<void> {
  return serializeSession(async () => {
    const identity = parseSessionIdentity(
      tokens.user?.id,
      tokens.user?.user_category_id,
      tokens.user?.user_login_folder_path,
    );
    const session = parseTokenPair(tokens, {
      companyId: String(company.company_id),
      apiBase: getTrustedCompanyApiBase(company.api_url),
    }, identity);
    if (!identity) {
      await postSessionAction("logout", session).catch(() => undefined);
      throw new Error("This user category does not have a supported mobile dashboard.");
    }
    if (!matchesCompany(session, await getSavedCompany())) {
      await postSessionAction("logout", session).catch(() => undefined);
      throw new Error("The selected company changed. Please sign in again.");
    }
    try {
      await clearUser();
      await saveAuthSession(session);
    } catch {
      await postSessionAction("logout", session).catch(() => undefined);
      throw new Error("Unable to save the login session.");
    }
    version += 1;
    previousAccessToken = undefined;
    invalidated = false;
    publishSession(session);
    await clearLegacyAuthTokens().catch(() => undefined);
  });
}

async function invalidateSession() {
  invalidated = true;
  version += 1;
  previousAccessToken = undefined;
  publishSession(null);
  const cleared = await Promise.allSettled([clearAuthSession(), clearUser()]);
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

function finishSession(changeCompany?: () => Promise<void>): Promise<void> {
  if (logoutWork) return logoutWork;
  logoutWork = serializeSession(async () => {
    const session = invalidated ? null : await readAuthSession();
    if (session) await postSessionAction("logout", session);
    await invalidateSession();
    await changeCompany?.();
  }).finally(() => {
    logoutWork = undefined;
  });
  return logoutWork;
}

export function endSession(): Promise<void> {
  return finishSession();
}

export function switchCompany(company?: Company): Promise<void> {
  if (logoutWork) return logoutWork.then(() => switchCompany(company));
  return finishSession(() => company ? saveCompany(company) : clearCompany());
}

async function requireSession(expectedVersion: number): Promise<AuthSession> {
  const session = invalidated ? null : await readAuthSession();
  const company = await getSavedCompany();
  if (
    version !== expectedVersion ||
    invalidated ||
    !session?.identity ||
    snapshot.identity?.userId !== session.identity.userId ||
    snapshot.identity.categoryId !== session.identity.categoryId ||
    snapshot.companyId !== session.companyId ||
    !matchesCompany(session, company)
  ) {
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
      await invalidateSession();
      throw new Error(EXPIRED_MESSAGE);
    }

    const updated = parseTokenPair(result.data, session, session.identity);
    try {
      await saveAuthSession(updated);
    } catch {
      await postSessionAction("logout", updated).catch(() => undefined);
      await invalidateSession();
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
      if (current.accessToken === renewed.accessToken) await invalidateSession();
    });
    throw new Error(EXPIRED_MESSAGE);
  }
  return retry;
}
