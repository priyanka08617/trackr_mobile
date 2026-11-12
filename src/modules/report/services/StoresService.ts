import { getAuthToken } from "@/storage/authStorage";
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

export async function loadAreaStores(): Promise<AreaStore[]> {
  // STEP 1: Get selected company and build company-specific API base
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const companyBaseUrl = company.api_url.replace(/\/+$/, ""); // already ends in /api/v1
  const API_BASE = `${companyBaseUrl}/area_manager/controllers`;

  // STEP 2: Get access token
  let token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/all_stores.php`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new Error("Could not reach the stores API.");
    }

    const text = await response.text();
    let payload: StoresResponse;
    try {
      payload = JSON.parse(text.replace(/^\uFEFF/, "")) as StoresResponse;
    } catch {
      if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
        throw new Error("Sign in to your area manager account and try again.");
      }
      throw new Error("The stores API returned an invalid response.");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("The stores API returned an invalid response.");
    }
    if (
      response.status === 401 &&
      attempt === 0 &&
      /access token/i.test(payload.message ?? "")
    ) {
      // Re-read the stored token on first 401, then retry once
      const refreshedToken = await getAuthToken();

      if (refreshedToken) {
        token = refreshedToken;
      }

      continue;
    }
    if (
      !response.ok ||
      payload.success !== true ||
      !Array.isArray(payload.stores)
    ) {
      throw new Error(
        payload.message || `Unable to load stores (${response.status}).`,
      );
    }

    return payload.stores.map((store) => ({
      id: String(store.id),
      name: String(store.store_name ?? "Unnamed store"),
      region: String(store.region ?? ""),
      zone: String(store.zone ?? ""),
      mobileNo: String(store.mobile_no ?? store.store_mobile_number ?? ""),
      email: String(store.store_mail_id ?? store.rm_mail_id ?? ""),
    }));
  }

  throw new Error("Unable to authenticate the stores request. Sign in again.");
}