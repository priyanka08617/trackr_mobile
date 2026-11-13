import { getSavedCompany } from "@/storage/companyStorage";
import { getAuthToken } from "@/storage/authStorage";
import type {
  RmAnswer,
  RmChecklist,
  RmDetail,
  RmDraft,
  RmQuestion,
  RmStore,
} from "./model";
import { checklistApiDate } from "./model";


type Row = Record<string, unknown>;

export async function rmRequest<T>(
  file: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<T> {
  const company = await getSavedCompany();
  const token = await getAuthToken();
  if (!company?.api_url) throw new Error("Select a company before loading RM checklists.");
  if (!token) throw new Error("Please sign in again to load RM checklists.");
  const base = company.api_url.replace(/\/+$/, "");
  const url = new URL(`${base}/area_manager/controllers/${file}`);
  for (const [key, value] of Object.entries(query ?? {}))
    url.searchParams.set(key, value);
  // Native HTTP clients and intermediaries may retain a previously cached 404
  // even when fetch's cache option is set. Give reads a fresh cache key.
  if (body === undefined) {
    url.searchParams.set(
      "_request",
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url.toString(), {
      method: body === undefined ? "GET" : "POST",

      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (
      response.status === 404 &&
      !/application\/json/i.test(response.headers.get("content-type") ?? "")
    ) {
      const destination = response.url || url.toString();
      throw new Error(
        `RM checklist request returned HTTP 404: ${destination}. A fresh request also failed; check the server or network serving this device.`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      if (!response.ok)
        throw new Error(
          `RM checklist server error: ${file} (HTTP ${response.status}). Please try again later.`,
        );
      if (response.redirected || /<html\b|<!doctype/i.test(text))
        throw new Error("Please sign in again to access RM checklists.");
      throw new Error(
        "The RM checklist API did not return JSON. Check that the PHP API files are deployed.",
      );
    }
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    )
      throw new Error("The RM checklist API returned an invalid response.");
    const result = payload as Row;
    if (!response.ok || result.success !== true)
      throw new Error(
        typeof result.message === "string" && result.message
          ? result.message
          : `RM checklist request failed: ${file} (HTTP ${response.status}).`,
      );
    return payload as T;
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError")
      throw new Error("The RM checklist request timed out. Please retry.");
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

function rows(value: unknown, field: string): Row[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (row) => typeof row !== "object" || row === null || Array.isArray(row),
    )
  )
    throw new Error(`The RM checklist API returned invalid ${field}.`);
  return value as Row[];
}

function displayDate(value: unknown): string {
  const text = String(value ?? "");
  return text.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3-$2-$1");
}

function mapAnswer(row: Row): RmAnswer {
  return {
    questionId: String(row.question_id),
    rating: String(row.rating ?? ""),
    reason: String(row.reason ?? row.complied ?? ""),
    remark: String(row.remark ?? ""),
  };
}

export async function loadRmRecords(): Promise<RmChecklist[]> {
  const records: RmChecklist[] = [];
  let total = Infinity;
  while (records.length < total) {
    const result = await rmRequest<{ records: unknown; total: number }>(
      "rm_checklist_list.php",
      undefined,
      { limit: "500", offset: String(records.length) },
    );
    const page = rows(result.records, "records");
    total = Number(result.total);
    if (
      !Number.isFinite(total) ||
      total < 0 ||
      (!page.length && records.length < total)
    )
      throw new Error("The RM checklist API returned invalid pagination.");
    records.push(
      ...page.map(
        (row): RmChecklist => ({
          code: String(row.rm_checklist_code),
          date: displayDate(row.checklist_date),
          store: String(row.store_name ?? ""),
          manager: String(row.rm_name ?? ""),
          createdOn: String(row.row_created_on ?? ""),
          status: Number(row.status) === 2 ? 2 : 1,
          details: [],
        }),
      ),
    );
  }
  return records;
}

export async function loadRmQuestions(): Promise<RmQuestion[]> {
  const result = await rmRequest<{ questions: unknown }>(
    "rm_checklist_questions.php",
  );
  return rows(result.questions, "questions").map((row) => ({
    id: String(row.id),
    category: String(row.area_category ?? "Other"),
    text: String(row.question_text ?? ""),
    ratings: rows(row.ratings, "ratings").map((rating) => ({
      label: String(rating.label),
      mark: Number(rating.mark) || 0,
    })),
    reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [],
    chooseCompliance: String(row.choose_compliance ?? ""),
  }));
}

export async function loadRmStores(): Promise<RmStore[]> {
  const result = await rmRequest<{ stores: unknown }>(
    "rm_checklist_options.php",
  );
  return rows(result.stores, "stores").map((row) => ({
    id: String(row.id),
    name: String(row.store_name ?? ""),
    region: String(row.region ?? ""),
    zone: String(row.zone ?? ""),
  }));
}

export async function loadRmDraft(): Promise<RmDraft | undefined> {
  const result = await rmRequest<{
    draft: (Row & { answers: unknown }) | null;
  }>("rm_checklist_load_draft.php");
  if (!result.draft) return undefined;
  return {
    code: String(result.draft.checklist_code),
    storeId: String(result.draft.store_id),
    date: displayDate(result.draft.checklist_date),
    answers: rows(result.draft.answers, "draft answers").map(mapAnswer),
  };
}

export async function loadRmDetails(code: string): Promise<RmDetail[]> {
  const result = await rmRequest<{ answers: unknown }>(
    "rm_checklist_view.php",
    undefined,
    { checklist_code: code },
  );
  return rows(result.answers, "answers").map((row) => {
    const ratings: { label: string; mark: number }[] =
      typeof row.rating_json === "string" ? JSON.parse(row.rating_json) : [];
    return {
      ...mapAnswer(row),
      question: String(row.question_text ?? ""),
      category: String(row.area_category ?? "Other"),
      mark:
        Number(ratings.find((rating) => rating.label === row.rating)?.mark) ||
        0,
      pointStatus: String(row.point_status ?? ""),
      storeRemark: String(row.store_remark ?? ""),
    };
  });
}

// Save sequentially: the first answer returns the server-generated checklist code.
// Report each successful row so a retry reuses the same draft after a partial failure.
export async function saveRmDraft(
  draft: RmDraft,
  onProgress: (draft: RmDraft) => void,
): Promise<RmDraft> {
  let code = draft.code;
  const saved: RmAnswer[] = [];
  if (!draft.answers.length)
    throw new Error("Complete at least one check parameter.");
  const auditDate = checklistApiDate(draft.date);
  for (const answer of draft.answers) {
    const result = await rmRequest<{ checklist_code: string }>(
      "rm_checklist_save_as_draft.php",
      {
        checklist_code: code ?? "",
        store_id: draft.storeId,
        audit_date: auditDate,
        question_id: answer.questionId,
        rating: answer.rating,
        reason: answer.reason,
        remark: answer.remark,
      },
    );
    if (!result.checklist_code)
      throw new Error("The API did not return the saved checklist code.");
    code = String(result.checklist_code);
    saved.push(answer);
    onProgress({ ...draft, code, answers: [...saved] });
  }
  return { ...draft, code };
}
