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
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to view store contacts.");
  }

  // The company API URL already ends in /api/v1.
  const endpoint = `${baseUrl}/common/all_stores.php`;

  let response: Response;
  let body: string;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    body = await response.text();
  } catch {
    throw new Error("Could not reach the Store Contacts API.");
  }

  if (response.status === 401) {
    throw new Error(
      "Your login token has expired or is invalid. Please log in again.",
    );
  }

  let payload: StoresResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    throw new Error(
      `The Store Contacts API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (response.status === 403) {
    throw new Error(
      message || "You are not authorized to view store contacts.",
    );
  }

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.stores)
  ) {
    throw new Error(
      message || `Unable to load store contacts (HTTP ${response.status}).`,
    );
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
//   console.log("Escalation service started");
//   // STEP 1: Get selected company
//   const company = await getSavedCompany();

//   if (!company?.api_url) {
//     throw new Error("Company API URL not found. Please select a company.");
//   }

//   // STEP 2: Get access token
//   const token = await getAuthToken();
//   console.log("Token available:", Boolean(token));
//   if (!token) {
//     throw new Error("Login session not found. Please log in again.");
//   }

//   // STEP 3: Build company-specific endpoint
//   // Company api_url already ends in /api/v1
//   const baseUrl = company.api_url.replace(/\/+$/, "");
//   const endpoint = `${baseUrl}/all_stores.php`;

//   console.log("API URL:", endpoint);

//   // After getting the token

//   // STEP 4: Call PHP API
//   let response: Response;
// }
