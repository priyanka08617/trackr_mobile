import { APP_CONFIG } from "@/constants/config";
import { fetchWithSession, getSessionSnapshot, subscribeSession } from "@/services/sessionService";
import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { trackerPlainText } from "./trackerText";

// ============================================
// PROFILE API URL
// ============================================

// Profile API is currently on a separate path.
// Do not change the company API URL or .env.

// ============================================
// PROFILE INTERFACES
// ============================================

export interface UserProfile {
  id: number;
  user_category_id: number;
  user_category_name?: string;
  employee_code?: string;
  name?: string;
  designation?: string;
  category?: string;
  email?: string;
  mobile_no?: string;
  status?: number;

  // Optional store details
  store_name?: string;
  store_code?: string;
}

export interface ProfileData {
  user_id?: number;
  username?: string;
  user_category_id: number;
  profile: UserProfile;
}

interface ProfileApiResponse {
  success: boolean;
  message?: string;
  data?: ProfileData;
}

// ============================================
// LOAD PROFILE
// ============================================

async function fetchUserProfile(scope: ReturnType<typeof getSessionSnapshot>): Promise<ProfileData> {
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to view your profile.");
  }
  if (scope !== getSessionSnapshot()) throw new Error("Login session changed. Please try again.");

  // The company API URL already ends in /api/v1.
  const endpoint = `${baseUrl}/common/profile.php`;

  let response: Response;
  let body: string;

  // ==========================================
  // API REQUEST
  // ==========================================

  const controller = new AbortController();
  const unsubscribe = subscribeSession(() => controller.abort());
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeout);
  try {
    response = await fetchWithSession(endpoint, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    body = await response.text();
  } catch {
    throw new Error("Could not reach the Profile API.");
  } finally {
    clearTimeout(timeout);
    unsubscribe();
  }

  // ==========================================
  // HTTP STATUS CHECK
  // ==========================================

  if (response.status === 401) {
    throw new Error(
      "Your login token has expired or is invalid. Please log in again.",
    );
  }

  if (response.status === 404) {
    // A 404 can mean the endpoint or profile record
    // was not found. Check the JSON response below.
  }

  // ==========================================
  // JSON RESPONSE VALIDATION
  // ==========================================

  let payload: ProfileApiResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed as ProfileApiResponse;
  } catch {
    throw new Error(
      `Profile API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  if (response.status === 403) {
    throw new Error(message || "You are not authorized to view this profile.");
  }

  if (response.status === 404) {
    throw new Error(message || "Profile record not found.");
  }

  if (!response.ok || payload.success !== true || !payload.data?.profile) {
    throw new Error(
      message || `Unable to load profile (HTTP ${response.status}).`,
    );
  }

  // ==========================================
  // FORMAT PROFILE DATA
  // ==========================================

  const data = payload.data;
  const profile = data.profile;

  return {
    user_id: data.user_id === undefined ? undefined : Number(data.user_id),

    username: trackerPlainText(data.username ?? ""),

    user_category_id: Number(data.user_category_id),

    profile: {
      id: Number(profile.id),

      user_category_id: Number(
        profile.user_category_id ?? data.user_category_id,
      ),

      employee_code: trackerPlainText(profile.employee_code ?? ""),
      name: trackerPlainText(profile.name ?? ""),
      user_category_name: trackerPlainText(profile.user_category_name ?? ""),
      designation: trackerPlainText(profile.designation ?? ""),
      category: trackerPlainText(profile.category ?? ""),
      email: trackerPlainText(profile.email ?? ""),
      mobile_no: trackerPlainText(profile.mobile_no ?? ""),

      status: profile.status === undefined ? undefined : Number(profile.status),

      store_name: trackerPlainText(profile.store_name ?? ""),
      store_code: trackerPlainText(profile.store_code ?? ""),
    },
  };
}

let pendingProfile: Promise<ProfileData> | undefined;
subscribeSession(() => { pendingProfile = undefined; });

export function getUserProfile(): Promise<ProfileData> {
  const scope = getSessionSnapshot();
  if (!scope.identity) return Promise.reject(new Error("Please log in to view your profile."));
  pendingProfile ??= fetchUserProfile(scope).then((profile) => {
    if (scope !== getSessionSnapshot()) throw new Error("Login session changed. Please try again.");
    return profile;
  }).finally(() => {
    if (scope === getSessionSnapshot()) pendingProfile = undefined;
  });
  return pendingProfile;
}
