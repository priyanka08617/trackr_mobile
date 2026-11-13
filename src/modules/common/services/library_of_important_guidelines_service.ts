import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { trackerPlainText } from "./trackerText";

export interface GuidelineDocument {
  id: number;
  name: string;
  function_name: string;
  reference_number: string;
  url: string;
}

interface GuidelineRecord {
  id: number | string;
  name?: string | null;
  function_name?: string | null;
  reference_number?: string | null;
  url?: string | null;
}

interface GuidelinesResponse {
  success: boolean;
  message?: string;
  documents?: GuidelineRecord[];
}

function resolveDocumentUrl(value: string | null | undefined, origin: string) {
  const path = value?.trim();
  if (!path) return "";

  try {
    const url = new URL(path, `${origin}/`);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    // An invalid link should not prevent the other guidelines from loading.
  }

  return "";
}

export async function loadImportantGuidelines(): Promise<GuidelineDocument[]> {
  const company = await getSavedCompany();
  const baseUrl = company?.api_url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to view Important Guidelines.");
  }

  // The company API URL already ends in /api/v1.
  const endpoint = `${baseUrl}/common/important_guidelines.php`;
  const origin = new URL(baseUrl).origin;

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
    throw new Error("Could not reach the Important Guidelines API.");
  }

  if (response.status === 401) {
    throw new Error(
      "Your login token has expired or is invalid. Please log in again.",
    );
  }

  let payload: GuidelinesResponse;

  try {
    const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid response.");
    }

    payload = parsed;
  } catch {
    throw new Error(
      `Important Guidelines API returned invalid JSON (HTTP ${response.status}).`,
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
      message ||
        `Unable to load Important Guidelines (HTTP ${response.status}).`,
    );
  }

  return payload.documents.map((document) => ({
    id: Number(document.id),
    name: trackerPlainText(document.name ?? "") || "Untitled guideline",
    function_name: trackerPlainText(document.function_name ?? ""),
    reference_number: trackerPlainText(document.reference_number ?? ""),
    url: resolveDocumentUrl(document.url, origin),
  }));
}
