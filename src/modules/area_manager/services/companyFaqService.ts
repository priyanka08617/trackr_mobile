import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";

import type { CompanyFaqItem } from "../types/companyFaq.types";

// Convert HTML content to plain text
function htmlToPlainText(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\u2022 ")
    .replace(/<\s*\/\s*(li|p|div|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\\u([0-9a-f]{4})/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
      (entity, code: string) => {
        const normalized = code.toLowerCase();

        if (normalized.startsWith("#x")) {
          return String.fromCodePoint(parseInt(normalized.slice(2), 16));
        }

        if (normalized.startsWith("#")) {
          return String.fromCodePoint(parseInt(normalized.slice(1), 10));
        }

        const entities: Record<string, string> = {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          apos: "'",
          nbsp: " ",
        };

        return entities[normalized] ?? entity;
      },
    )
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Fetch FAQs from the selected company server
export async function fetchCompanyFaqs(
  signal: AbortSignal,
): Promise<CompanyFaqItem[]> {
  // STEP 1: Get selected company
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not configured.");
  }

  // STEP 2: Get authentication token
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  // STEP 3: Prepare company-specific API URL
  const apiBaseUrl = company.api_url.replace(/\/+$/, "") + "/";

  const endpoint = new URL("common/company_faq.php", apiBaseUrl);

  if (endpoint.protocol !== "https:") {
    throw new Error("A secure HTTPS API URL is required.");
  }

  endpoint.searchParams.set("category", "all");

  // STEP 4: Call PHP API
  // const response = await fetch(endpoint.toString(), {
  //   method: "GET",
  //   headers: {
  //     Accept: "application/json",
  //     Authorization: `Bearer ${token}`,
  //   },
  //   signal,
  // });

  // for test 11-11-2026 strat

  //   const rawResponse = await response.text();

  // console.log("FAQ API URL:", endpoint.toString());
  // console.log("FAQ HTTP Status:", response.status);
  // console.log("FAQ Content Type:", response.headers.get("content-type"));
  // console.log("FAQ Raw Response:", rawResponse.substring(0, 1500));

  // let payload;

  // try {
  //   payload = JSON.parse(rawResponse.replace(/^\uFEFF/, ""));
  // } catch {
  //   throw new Error(
  //     `Company FAQ API returned invalid JSON. HTTP ${response.status}`
  //   );
  // }

  // // STEP 5: Read API response
  // const body = await response.text();

  // let result: Record<string, unknown>;

  // try {
  //   const parsed = JSON.parse(body.replace(/^\uFEFF/, ""));

  //   if (
  //     typeof parsed !== "object" ||
  //     parsed === null ||
  //     Array.isArray(parsed)
  //   ) {
  //     throw new Error("Invalid JSON structure.");
  //   }

  //   result = parsed as Record<string, unknown>;
  // } catch {
  //   throw new Error("Company FAQ API returned an invalid JSON response.");
  // }

  // STEP 4: Call PHP API
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  // STEP 5: Read API response only once
  const rawResponse = await response.text();

  console.log("FAQ API URL:", endpoint.toString());
  console.log("FAQ HTTP Status:", response.status);
  console.log("FAQ Content Type:", response.headers.get("content-type"));
  console.log("FAQ Raw Response:", rawResponse.substring(0, 1500));

  let result: Record<string, unknown>;

  try {
    const parsed = JSON.parse(rawResponse.replace(/^\uFEFF/, ""));

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("Invalid JSON structure.");
    }

    result = parsed as Record<string, unknown>;
  } catch {
    throw new Error(
      `Company FAQ API returned invalid JSON. HTTP ${response.status}`,
    );
  }

  // end

  // STEP 6: Validate authentication
  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("You are not authorized to access company FAQs.");
  }

  // STEP 7: Check API result
  if (!response.ok || result.success !== true) {
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : `Company FAQ request failed (${response.status}).`,
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error("Invalid Company FAQ response data.");
  }

  // STEP 8: Format FAQ data
  return result.data
    .filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null && !Array.isArray(row),
    )
    .map((row, index) => ({
      id: String(row.id ?? row.faq_id ?? index),
      category: String(row.category ?? "General"),
      question: htmlToPlainText(row.question),
      answer: htmlToPlainText(row.answer),
      sortOrder:
        row.sort_order != null && Number.isFinite(Number(row.sort_order))
          ? Number(row.sort_order)
          : 9999,
    }))
    .filter((faq) => faq.question.length > 0);
}
