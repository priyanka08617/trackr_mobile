import { getAuthToken } from "@/storage/authStorage";
import { getSavedCompany } from "@/storage/companyStorage";
import { trackerPlainText } from "../../report/services/trackerText";
import type {
  ChecklistAnswer,
  ChecklistStatus,
  FestiveQuestion,
  FestiveSubmission,
} from "../screens/FestiveChecklist";

// ==============================================
// COMPANY BASE URL + TOKEN (same pattern as all_stores.php / import.ts)
// ==============================================

async function getFestiveBaseUrl(): Promise<string> {
  const company = await getSavedCompany();

  if (!company?.api_url) {
    throw new Error("Company API URL not found. Please select a company.");
  }

  // company.api_url already ends in /api/v1
  return `${company.api_url.replace(/\/+$/, "")}/area_manager/controllers`;
}

async function getFestiveToken(): Promise<string> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Login session not found. Please log in again.");
  }

  return token;
}

// ==============================================
// TYPES
// ==============================================

interface ApiEnvelope {
  success: boolean;
  message?: string;
}

interface ChecklistRow extends Record<string, unknown> {
  id: string | number;
  store_name?: string;
  register_name?: string;
  festive_date?: string;
  status?: number | string;
  s1?: string;
  s1_created_on?: string;
  s2?: string;
  s2_created_on?: string;
}

interface ListResponse {
  records: ChecklistRow[];
  total: number;
}

interface AnswerRow extends Record<string, unknown> {
  answer_id: string | number;
  subcategory?: string | null;
  question?: string | null;
  answer?: number | string;
}

interface DetailResponse {
  checklist: ChecklistRow;
  answers: AnswerRow[];
}

// ==============================================
// HELPERS — safe field extraction
// ==============================================

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const str = String(value);
    if (
      str.length > 0 &&
      str !== "0000-00-00" &&
      str !== "0000-00-00 00:00:00"
    ) {
      return str;
    }
  }
  return "";
}

function safeTimestamp(value: unknown): string {
  const raw = firstNonEmpty(value);
  return raw === "" ? "\u2014" : raw;
}

// ==============================================
// REQUEST — Bearer token, 401 retry, timeout
// ==============================================

async function request<T>(
  file: string,
  options: {
    method?: "GET" | "POST";
    query?: Record<string, string>;
    body?: unknown;
  } = {},
): Promise<T> {
  const BASE = await getFestiveBaseUrl();
  let token = await getFestiveToken();

  const url = new URL(`${BASE}/${file}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }

  // Cache-buster for GETs (same as import.ts)
  if (options.body === undefined) {
    url.searchParams.set(
      "_request",
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: options.method ?? "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
          signal: controller.signal,
        });
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error("Festive checklist request timed out. Please retry.");
        }
        throw new Error("Could not reach the festive checklist API.");
      }

      const text = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        if (response.redirected || /<html\b|<!doctype\s+html/i.test(text)) {
          throw new Error(
            "Sign in to your area manager account and try again.",
          );
        }
        throw new Error(
          response.status === 404
            ? `Festive checklist endpoint not found: ${url.toString()}`
            : `Festive checklist API did not return JSON (HTTP ${response.status}).`,
        );
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new Error(
          "The festive checklist API returned an invalid response.",
        );
      }

      const envelope = payload as ApiEnvelope;

      // Retry once on 401 with a fresh token (same as all_stores.php)
      if (
        response.status === 401 &&
        attempt === 0 &&
        /access token/i.test(envelope.message ?? "")
      ) {
        const refreshed = await getAuthToken();
        if (refreshed) token = refreshed;
        continue;
      }

      if (!response.ok || envelope.success !== true) {
        throw new Error(
          typeof envelope.message === "string" && envelope.message
            ? envelope.message
            : `Festive checklist request failed (${response.status}).`,
        );
      }

      return payload as T;
    }

    throw new Error(
      "Unable to authenticate the festive checklist request. Sign in again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ==============================================
// MAPPERS
// ==============================================

function statusValue(value: unknown): ChecklistStatus {
  const status = Number(value);
  return status === 2 || status === 3 ? status : 1;
}

function baseSubmission(row: ChecklistRow): FestiveSubmission {
  return {
    id: String(row.id),
    store: trackerPlainText(firstNonEmpty(row.store_name, row.store, "Store")),
    festiveDate: firstNonEmpty(row.festive_date, row.date, row.report_date),
    category: trackerPlainText(
      firstNonEmpty(row.register_name, row.category, "Festive Checklist"),
    ),
    createdBy: trackerPlainText(
      firstNonEmpty(row.created_by_name, row.s1_name, row.s1, "\u2014"),
    ),
    createdOn: safeTimestamp(row.s1_created_on),
    reviewedBy: firstNonEmpty(row.s2)
      ? trackerPlainText(
          firstNonEmpty(row.reviewed_by_name, row.s2_name, "\u2014"),
        )
      : undefined,
    reviewedOn: firstNonEmpty(row.s2_created_on) || undefined,
    status: statusValue(row.status),
    questions: [],
  };
}

function answerValue(value: unknown): ChecklistAnswer {
  const answer = Number(value);
  return answer === 2 || answer === 3 ? answer : 1;
}

// ==============================================
// PUBLIC API
// ==============================================

export async function loadFestiveSubmissions(): Promise<FestiveSubmission[]> {
  const result = await request<ListResponse>("festive_checklist_list.php", {
    query: { limit: "500", offset: "0" },
  });
  return (result.records ?? []).map(baseSubmission);
}

export async function loadFestiveSubmissionDetails(
  id: string,
): Promise<FestiveSubmission> {
  const result = await request<DetailResponse>("festive_checklist_view.php", {
    query: { id },
  });
  const submission = baseSubmission(result.checklist);
  const questions: FestiveQuestion[] = (result.answers ?? []).map((answer) => ({
    id: String(answer.answer_id),
    subcategory: trackerPlainText(firstNonEmpty(answer.subcategory, "Other")),
    question: trackerPlainText(
      firstNonEmpty(answer.question, "Question unavailable"),
    ),
    answer: answerValue(answer.answer),
  }));
  return { ...submission, questions };
}

export async function reviewFestiveSubmission(
  id: string,
  status: 2 | 3,
): Promise<void> {
  await request("festive_checklist_approval.php", {
    method: "POST",
    body: { id, status },
  });
}

export async function updateFestiveAnswer(
  submissionId: string,
  answerId: string,
  answer: ChecklistAnswer,
): Promise<void> {
  await request("festive_checklist_edit.php", {
    method: "POST",
    body: { festive_view_id: submissionId, answer_id: answerId, answer },
  });
}
