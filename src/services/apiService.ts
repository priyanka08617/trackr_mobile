import { APP_CONFIG } from "@/constants/config";
import { getAuthToken } from "@/storage/authStorage";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  authenticated?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getApiUrl(path: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL must be set before making API requests.",
    );
  }

  const normalizedPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${APP_CONFIG.apiVersion}/${normalizedPath}`;
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers, authenticated = true } = options;
  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = await getAuthToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    APP_CONFIG.requestTimeout,
  );

  try {
    const response = await fetch(getApiUrl(path), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await readResponse(response);

    if (!response.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
          ? data.message
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, data);
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiService = { request };
export default apiService;
