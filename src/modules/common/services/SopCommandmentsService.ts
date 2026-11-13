import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export const SOP_LANGUAGES = [
  "Hindi",
  "Odiya",
  "Kannada",
  "English",
  "Tamil",
  "Bengali",
  "Telugu",
  "Malayalam",
  "Assamese",
] as const;

export type SopLanguage = (typeof SOP_LANGUAGES)[number];

export interface SopDocument {
  name: string;
  url: string;
}

interface SopResponse {
  success?: boolean;
  message?: string;
  documents?: unknown[];
}

export async function loadSopDocuments(
  language: SopLanguage,
): Promise<SopDocument[]> {
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to view SOP documents.");
  }

  // The saved company API URL already ends in /api/v1.
  const endpoint = new URL(`${baseUrl}/common/sop_10_commandments.php`);
  endpoint.searchParams.set("language", language);

  let response: Response;
  let body: string;

  try {
    response = await fetch(endpoint.toString(), {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    body = await response.text();
  } catch {
    throw new Error("Could not reach the SOP documents API.");
  }

  if (response.status === 401) {
    throw new Error(
      "Your login token is invalid or expired. Please log in again.",
    );
  }

  let payload: SopResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    throw new Error(
      `The SOP documents API returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.documents)
  ) {
    throw new Error(
      message || `Unable to load SOP documents (HTTP ${response.status}).`,
    );
  }

  const documents: SopDocument[] = [];

  for (const item of payload.documents) {
    if (!item || typeof item !== "object") continue;

    const document = item as { name?: unknown; url?: unknown };
    const path = typeof document.url === "string" ? document.url.trim() : "";

    if (!path) continue;

    try {
      const url = new URL(path, `${endpoint.origin}/`);

      if (url.protocol !== "https:" && url.protocol !== "http:") continue;

      documents.push({
        name:
          (typeof document.name === "string" && document.name.trim()) ||
          "Untitled SOP",
        url: url.toString(),
      });
    } catch {
      // Skip malformed PDF links so the remaining documents can load.
    }
  }

  return documents;
}
