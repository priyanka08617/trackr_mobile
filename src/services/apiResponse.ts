export async function readApiJson(
  response: Response,
  requestName: string,
): Promise<unknown> {
  const body = await response.text();

  try {
    return body ? JSON.parse(body) : null;
  } catch {
    const isLoginHtml =
      response.redirected ||
      response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("text/html") ||
      /<!doctype\s+html|<html\b/i.test(body);

    if (isLoginHtml) {
      throw new Error(
        `${requestName} returned an HTML page instead of JSON. Check the API endpoint and server authentication configuration.`,
      );
    }

    throw new Error(`${requestName} returned invalid JSON.`);
  }
}
