import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

export interface EscalationDocument {
  id: number;
  name: string;
  function_name: string;
  reference_number: string;
  url: string;
}

interface EscalationResponse {
  success: boolean;
  message?: string;
  documents?: EscalationDocument[];
}

// Convert HTML content into readable plain text
function trackerPlainText(value: string): string {
  return String(value ?? "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
}

export async function loadEscalationDocuments(): Promise<EscalationDocument[]> {
  console.log("Escalation service started");
  // STEP 1: Get selected company
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // STEP 2: Get access token
  const token = await getAuthToken();
  console.log("Token available:", Boolean(token));
  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  // STEP 3: Build company-specific endpoint
  // Company api_url already ends in /api/v1
  const baseUrl = company.api_url.replace(/\/+$/, "");
  const endpoint = `${baseUrl}/common/escalation_matrix.php`;

  console.log("API URL:", endpoint);

  // After getting the token

  // STEP 4: Call PHP API
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("HTTP status:", response.status);
  } catch {
    throw new Error("Could not reach the Escalation Matrix API.");
  }

  // STEP 5: Read response once
  const body = await response.text();

  let payload: EscalationResponse;

  try {
    payload = JSON.parse(body.replace(/^\uFEFF/, "")) as EscalationResponse;
  } catch {
    throw new Error(
      "Escalation Matrix API returned invalid JSON. Check PHP API response.",
    );
  }

  // STEP 6: Validate authentication and response
  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  // if (response.status === 401) {
  //   console.log("Escalation authentication failed:", {
  //     status: response.status,
  //     message: payload.message ?? "No message returned",
  //   });

  //   throw new Error(payload.message || "Authentication failed (HTTP 401).");
  // }

  // if (response.status === 403) {
  //   throw new Error("You are not authorized to access Escalation Matrix.");
  // }

  if (response.status === 403) {
    console.log("Escalation API 403:", {
      status: response.status,
      message: payload.message,
    });

    throw new Error(
      payload.message || "You are not authorized to access Escalation Matrix.",
    );
  }

  if (
    !response.ok ||
    payload.success !== true ||
    !Array.isArray(payload.documents)
  ) {
    throw new Error(
      payload.message ||
        `Unable to load Escalation Matrix (HTTP ${response.status}).`,
    );
  }

  // STEP 7: Prepare document data
  const apiOrigin = new URL(baseUrl).origin;

  return payload.documents.map((document) => ({
    id: Number(document.id),

    name: trackerPlainText(document.name || "Untitled escalation"),

    function_name: trackerPlainText(document.function_name || ""),

    reference_number: trackerPlainText(document.reference_number || ""),

    url: document.url ? new URL(document.url, `${apiOrigin}/`).toString() : "",
  }));
}
