import { APP_CONFIG } from "@/constants/config";
import { fetch as expoFetch } from "expo/fetch";

const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i;
const HTTPS_BASE = /^https:\/\/[a-z0-9.-]+(?::443)?(?:\/[a-z0-9._~-]+)*\/*$/i;
const SAFE_PATH = /^(?:\/[a-z0-9._~-]+)+$/i;

function parseHttpsBase(value: unknown): URL {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!HTTPS_BASE.test(raw) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(raw)) {
    throw new Error("Invalid HTTPS API URL.");
  }
  const url = new URL(raw);
  if (!HOSTNAME.test(url.hostname)) throw new Error("Invalid API hostname.");
  return url;
}

export function getMasterApiBase(): string {
  return parseHttpsBase(process.env.EXPO_PUBLIC_MASTER_API_URL).href.replace(/\/+$/, "");
}

export function getTrustedCompanyApiBase(value: unknown): string {
  const url = parseHttpsBase(value);
  const configured = process.env.EXPO_PUBLIC_TRUSTED_COMPANY_API_HOSTS;
  const hosts = configured === undefined
    ? [new URL(getMasterApiBase()).hostname]
    : configured.split(",").map((host) => host.trim().toLowerCase());

  if (!hosts.every((host) => HOSTNAME.test(host)) || !hosts.includes(url.hostname)) {
    throw new Error("Company API hostname is not trusted.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/api/" + APP_CONFIG.apiVersion)) {
    throw new Error("Company API version is not supported.");
  }
  return url.origin + path;
}

export function getCompanyRequestUrl(value: string, apiBase: string): string {
  const target = new URL(value);
  const base = new URL(getTrustedCompanyApiBase(apiBase));
  if (
    target.origin !== base.origin || target.username || target.password || target.hash ||
    !target.pathname.startsWith(base.pathname + "/") || !SAFE_PATH.test(target.pathname)
  ) {
    throw new Error("Request URL is outside the selected company API.");
  }
  return target.href;
}

export function fetchWithoutRedirect(url: string, init: RequestInit): Promise<Response> {
  return expoFetch(url, { ...init, redirect: "error" });
}
