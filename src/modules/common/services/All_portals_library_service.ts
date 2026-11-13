import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { trackerPlainText } from "./trackerText";

export interface PortalItem {
  id: number;
  name: string;
  url: string;
  logo_url: string;
}

interface PortalsResponse {
  success: boolean;
  message?: string;
  portals?: PortalItem[];
}

export async function loadAllPortals(): Promise<PortalItem[]> {
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
  const endpoint = `${baseUrl}/common/all_portals.php`;

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

  let payload: PortalsResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    throw new Error(
      `All Portals API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (response.status === 403) {
    throw new Error(
      message || "You are not authorized to view All Portals API.",
    );
  }

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.portals)
  ) {
    throw new Error(
      message || `Unable to load all portals (HTTP ${response.status}).`,
    );
  }

  // return payload.portals.map((portal) => ({
  //   id: portal.id,
  //   name: trackerPlainText(portal.name),
  //   url: portal.url,
  //   logo_url: portal.logo_url,
  // }));

  const companyOrigin = new URL(baseUrl).origin;

  return payload.portals.map((portal) => {
    const logoPath = String(portal.logo_url ?? "").trim();
    let logoUrl = "";

    if (logoPath) {
      try {
        const resolvedUrl = new URL(logoPath, `${companyOrigin}/`);

        if (
          resolvedUrl.protocol === "https:" ||
          resolvedUrl.protocol === "http:"
        ) {
          logoUrl = resolvedUrl.toString();
        }
      } catch {
        // The screen shows its fallback icon when the logo URL is invalid.
      }
    }

    return {
      id: portal.id,
      name: trackerPlainText(portal.name),
      url: portal.url,
      logo_url: logoUrl,
    };
  });
}
