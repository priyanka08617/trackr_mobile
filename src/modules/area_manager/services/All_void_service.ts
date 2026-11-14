import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export interface VoidModule {
  table: string;
  name: string;
  category: number;
  pending: number;
  voided: number;
}

export interface VoidRecord {
  id: string;
  store_name: string;
  region: string;
  zone: string;
  requested_by: string;
  requested_on: string | null;
  reason: string | null;
  remark: string | null;
  approved_by: string;
  approved_on: string | null;
  product_count: number;
  fields: {
    label: string;
    value: string | number | null;
  }[];
}

export interface VoidFilters {
  table: string;
  status: "pending" | "voided";
  from: string;
  to: string;
  search: string;
  page: number;
}

interface VoidResponse {
  success?: boolean;
  message?: string;
  modules?: VoidModule[];
  regions?: string[];
  records?: VoidRecord[];
  total?: number | string | null;
  page?: number | string | null;
  approved?: number | string | null;
}

// ==============================================
// COMMON API REQUEST
// ==============================================

async function requestVoid(
  action: "options" | "list" | "approve",
  params: URLSearchParams = new URLSearchParams(),
  postData?: unknown,
): Promise<VoidResponse> {
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token?.trim()) {
    throw new Error("Please log in to access Void Requests.");
  }

  // Saved company API URL already ends in /api/v1
  const endpoint = `${baseUrl}/area_manager/controllers/void_api.php`;

  params.set("action", action);

  const url = `${endpoint}?${params.toString()}`;

  let response: Response;
  let body: string;

  try {
    response = await fetch(url, {
      method: postData === undefined ? "GET" : "POST",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.trim()}`,
        ...(postData === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(postData === undefined ? {} : { body: JSON.stringify(postData) }),
    });

    body = await response.text();
  } catch {
    throw new Error(`Could not reach the Void ${action} API.`);
  }

  // ==============================================
  // HTTP STATUS HANDLING
  // ==============================================

  if (response.status === 401) {
    throw new Error(
      "Your login token is invalid or expired. Please log in again.",
    );
  }

  if (response.status === 404) {
    throw new Error(`Void ${action} endpoint not found (HTTP 404).`);
  }

  // ==============================================
  // JSON RESPONSE
  // ==============================================

  let payload: VoidResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    throw new Error(
      `Void ${action} API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || payload.success !== true) {
    const message =
      typeof payload.message === "string" ? payload.message.trim() : "";

    throw new Error(
      message ||
        `Unable to process Void ${action} request (HTTP ${response.status}).`,
    );
  }

  return payload;
}

// ==============================================
// LOAD VOID MODULES AND REGIONS
// ==============================================

export async function loadVoidOptions(): Promise<{
  modules: VoidModule[];
  regions: string[];
}> {
  const payload = await requestVoid("options");

  return {
    modules: Array.isArray(payload.modules) ? payload.modules : [],
    regions: Array.isArray(payload.regions) ? payload.regions : [],
  };
}

// ==============================================
// LOAD VOID RECORDS
// ==============================================

export async function loadVoidRecords(filters: VoidFilters): Promise<{
  records: VoidRecord[];
  total: number;
  page: number;
}> {
  const params = new URLSearchParams({
    table: filters.table,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    search: filters.search,
    page: String(filters.page),
  });

  const payload = await requestVoid("list", params);

  if (!Array.isArray(payload.records)) {
    throw new Error("Void list API did not return valid records.");
  }

  return {
    records: payload.records,
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? filters.page),
  };
}

// ==============================================
// APPROVE VOID RECORDS
// ==============================================

export async function approveVoidRecords(
  table: string,
  ids: string[],
): Promise<{
  message: string;
  approved: number;
}> {
  if (!table.trim()) {
    throw new Error("Please select a module.");
  }

  if (!ids.length) {
    throw new Error("Please select records to approve.");
  }

  const payload = await requestVoid("approve", new URLSearchParams(), {
    table,
    ids,
  });

  return {
    message: payload.message || "Void records approved successfully.",
    approved: Number(payload.approved ?? 0),
  };
}

// =====================================================================================

// import { getAuthToken } from "@/storage/authStorage";
// import { getSavedCompany } from "@/storage/companyStorage";

// export interface VoidModule {
//   table: string;
//   name: string;
//   category: number;
//   pending: number;
//   voided: number;
// }

// export interface VoidRecord {
//   id: string;
//   store_name: string;
//   region: string;
//   zone: string;
//   requested_by: string;
//   requested_on: string | null;
//   reason: string | null;
//   remark: string | null;
//   approved_by: string;
//   approved_on: string | null;
//   product_count: number;
//   fields: { label: string; value: string | number | null }[];
// }

// export interface VoidFilters {
//   table: string;
//   status: "pending" | "voided";
//   from: string;
//   to: string;
//   search: string;
//   page: number;
// }

// async function getVoidEndpoint(): Promise<string> {
//   const company = await getSavedCompany();

//   const apiUrl = company?.api_url?.trim();

//   if (!apiUrl) {
//     throw new Error("Company API URL not found. Please select a company.");
//   }

//   return `${apiUrl.replace(/\/+$/, "")}/area_manager/controllers/void_api.php`;
// }

// async function getVoidToken(): Promise<string> {
//   const token = await getAuthToken();

//   if (!token?.trim()) {
//     throw new Error("Login session not found. Please log in again.");
//   }

//   return token.trim();
// }

// // async function getVoidEndpoint(): Promise<string> {
// //   const company = await getSavedCompany();

// //   if (!company?.api_url) {
// //     throw new Error("Company API URL not found. Please select a company.");
// //   }

// //   // company.api_url already ends in /api/v1
// //   return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers/void_api.php`;
// // }

// // async function getVoidToken(): Promise<string> {
// //   const token = await getAuthToken();

// //   if (!token) {
// //     throw new Error("Login session not found. Please log in again.");
// //   }

// //   return token;
// // }

// // ==============================================
// // REQUEST — Bearer token, 401 retry, timeout
// // ==============================================

// async function request<T>(
//   action: "options" | "list" | "approve",
//   query: Record<string, string> = {},
//   body?: unknown,
// ): Promise<T> {
//   const ENDPOINT = await getVoidEndpoint();
//   let token = await getVoidToken();

//   const url = new URL(ENDPOINT);
//   url.searchParams.set("action", action);
//   Object.entries(query).forEach(([key, value]) =>
//     url.searchParams.set(key, value),
//   );

//   // Cache-buster for GETs
//   if (body === undefined) {
//     url.searchParams.set(
//       "_request",
//       `${Date.now()}-${Math.random().toString(36).slice(2)}`,
//     );
//   }

//   const controller = new AbortController();
//   const timer = setTimeout(() => controller.abort(), 30_000);

//   try {
//     for (let attempt = 0; attempt < 2; attempt++) {
//       let response: Response;
//       try {
//         response = await fetch(url.toString(), {
//           method: body === undefined ? "GET" : "POST",
//           cache: "no-store",
//           signal: controller.signal,
//           headers: {
//             Accept: "application/json",
//             Authorization: `Bearer ${token}`,
//             ...(body === undefined
//               ? {}
//               : { "Content-Type": "application/json" }),
//           },
//           body: body === undefined ? undefined : JSON.stringify(body),
//         });
//       } catch (cause) {
//         if (cause instanceof Error && cause.name === "AbortError") {
//           throw new Error(
//             "Void request timed out. Refresh before trying again.",
//           );
//         }
//         throw new Error("Could not reach the void API.");
//       }

//       const text = await response.text();
//       let result: { success?: boolean; message?: string } & Record<
//         string,
//         unknown
//       >;
//       try {
//         result = JSON.parse(text.replace(/^\uFEFF/, ""));
//       } catch {
//         // Retry once on 401 with fresh token
//         if (response.status === 401 && attempt === 0) {
//           const refreshed = await getAuthToken();
//           if (refreshed) token = refreshed;
//           continue;
//         }
//         if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
//           throw new Error(
//             "Sign in to your area manager account and try again.",
//           );
//         }
//         throw new Error(
//           `Void API did not return JSON (HTTP ${response.status}). Check deployment or sign in again.`,
//         );
//       }

//       if (
//         typeof result !== "object" ||
//         result === null ||
//         Array.isArray(result)
//       ) {
//         throw new Error("Void API returned an invalid response.");
//       }

//       // Retry once on 401 with fresh token
//       if (
//         response.status === 401 &&
//         attempt === 0 &&
//         /access token/i.test(result.message ?? "")
//       ) {
//         const refreshed = await getAuthToken();
//         if (refreshed) token = refreshed;
//         continue;
//       }

//       if (!response.ok || result.success !== true) {
//         throw new Error(result.message || "Unable to load void requests.");
//       }

//       return result as T;
//     }

//     throw new Error("Unable to authenticate the void request. Sign in again.");
//   } catch (error) {
//     if (error instanceof Error && error.name === "AbortError") {
//       throw new Error("Void request timed out. Refresh before trying again.");
//     }
//     throw error;
//   } finally {
//     clearTimeout(timer);
//   }
// }

// // ==============================================
// // PUBLIC API
// // ==============================================

// export const loadVoidOptions = () =>
//   request<{ modules: VoidModule[]; regions: string[] }>("options");

// export const loadVoidRecords = (filters: VoidFilters) =>
//   request<{ records: VoidRecord[]; total: number; page: number }>(
//     "list",
//     Object.fromEntries(
//       Object.entries(filters).map(([key, value]) => [key, String(value)]),
//     ),
//   );

// export const approveVoidRecords = (table: string, ids: string[]) =>
//   request<{ message: string; approved: number }>("approve", {}, { table, ids });
