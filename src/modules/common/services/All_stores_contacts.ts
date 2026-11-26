import { APP_CONFIG } from "@/constants/config";
import { fetchWithSession, getSessionSnapshot, subscribeSession } from "@/services/sessionService";
import { getSavedCompany } from "@/storage/companyStorage";

export interface AreaStore {
  id: string;
  name: string;
  region: string;
  zone: string;
  mobileNo: string;
  email: string;
}

interface StoresResponse {
  success: boolean;
  message?: string;
  stores?: {
    id: string | number;
    store_name?: string;
    region?: string | null;
    zone?: string | null;
    mobile_no?: string | number | null;
    store_mobile_number?: string | number | null;
    store_mail_id?: string | null;
    rm_mail_id?: string | null;
  }[];
}

interface StoreDirectory {
  status: number;
  ok: boolean;
  html: boolean;
  payload: StoresResponse | null;
}

async function fetchStoreDirectory(scope: ReturnType<typeof getSessionSnapshot>): Promise<StoreDirectory> {
  const company = await getSavedCompany();
  if (!company) throw new Error("Company API URL not found. Please select a company.");
  if (scope !== getSessionSnapshot()) throw new Error("Login session changed. Please try again.");

  const controller = new AbortController();
  const unsubscribe = subscribeSession(() => controller.abort());
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeout);
  try {
    const response = await fetchWithSession(company.api_url + "/common/all_stores.php", {
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.text();
    let payload: StoresResponse | null = null;
    try {
      const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed;
    } catch {
      // Keep the view-specific error message for invalid responses.
    }
    return {
      status: response.status,
      ok: response.ok,
      payload,
      html: response.redirected || /<html\b|<!doctype\s+html/i.test(body),
    };
  } finally {
    clearTimeout(timeout);
    unsubscribe();
  }
}

let pending: Promise<StoreDirectory> | undefined;
subscribeSession(() => { pending = undefined; });

export function loadStoreDirectory(): Promise<StoreDirectory> {
  const scope = getSessionSnapshot();
  if (!scope.identity) return Promise.reject(new Error("Login session not found. Please log in again."));
  pending ??= fetchStoreDirectory(scope).then((result) => {
    if (scope !== getSessionSnapshot()) throw new Error("Login session changed. Please try again.");
    return result;
  }).finally(() => {
    if (scope === getSessionSnapshot()) pending = undefined;
  });
  return pending;
}

export async function loadAreaStores(): Promise<AreaStore[]> {
  const result = await loadStoreDirectory();
  const { payload, status } = result;
  if (!payload) throw new Error("The Store Contacts API returned invalid JSON (HTTP " + status + ").");
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (status === 403) throw new Error(message || "You are not authorized to view store contacts.");
  if (!result.ok || payload.success !== true || !Array.isArray(payload.stores)) {
    throw new Error(message || "Unable to load store contacts (HTTP " + status + ").");
  }

  return payload.stores.map((store) => ({
    id: String(store.id),
    name: String(store.store_name ?? "").trim() || "Unnamed store",
    region: String(store.region ?? "").trim(),
    zone: String(store.zone ?? "").trim(),
    mobileNo:
      String(store.mobile_no ?? "").trim() ||
      String(store.store_mobile_number ?? "").trim(),
    email:
      String(store.store_mail_id ?? "").trim() ||
      String(store.rm_mail_id ?? "").trim(),
  }));
}

// export async function loadAreaStores(): Promise<AreaStore[]> {
//   // STEP 1: Get selected company
//   const company = await getSavedCompany();

//   if (!company?.api_url) {
//     throw new Error("Company API URL not found. Please select a company.");
//   }

//   // STEP 2: Get access token
//   const token = await getAuthToken();
//   if (!token) {
//     throw new Error("Login session not found. Please log in again.");
//   }

//   // STEP 3: Build company-specific endpoint
//   // Company api_url already ends in /api/v1
//   const baseUrl = company.api_url.replace(/\/+$/, "");
//   const endpoint = `${baseUrl}/all_stores.php`;


//   // After getting the token

//   // STEP 4: Call PHP API
//   let response: Response;
// }
