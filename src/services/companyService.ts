import { fetchWithoutRedirect, getMasterApiBase, getTrustedCompanyApiBase } from "./apiUrlPolicy";

export interface Company {
  company_id: number | string;
  company_name: string;
  company_code: string;
  domain: string;
  api_url: string;
}

export function validateCompany(value: unknown): Company {
  if (typeof value !== "object" || value === null) throw new Error("Invalid company response.");
  const data = value as Partial<Company>;
  const id = data.company_id;
  if (
    !((typeof id === "string" && id.trim()) || (typeof id === "number" && Number.isSafeInteger(id))) ||
    typeof data.company_name !== "string" || !data.company_name.trim()
  ) {
    throw new Error("Invalid company response.");
  }
  return {
    company_id: id,
    company_name: data.company_name,
    company_code: typeof data.company_code === "string" ? data.company_code : "",
    domain: typeof data.domain === "string" ? data.domain : "",
    api_url: getTrustedCompanyApiBase(data.api_url),
  };
}

export async function findCompany(companyName: string) {
  const baseUrl = getMasterApiBase();

  const response = await fetchWithoutRedirect(`${baseUrl}/company/find_company.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_name: companyName.trim(),
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Company not found");
  }

  return validateCompany(result.data);
}

// =================================================================

// import { request } from "@/services/apiService";

// export type Company = Record<string, unknown>;

// export function getCompanies<T extends Company = Company>(): Promise<T[]> {
//   return request<T[]>("/companies");
// }

// export function getCompany<T extends Company = Company>(
//   companyId: string | number,
// ): Promise<T> {
//   return request<T>(`/companies/${encodeURIComponent(String(companyId))}`);
// }

// export function createCompany<T extends Company = Company>(
//   company: Omit<T, "id">,
// ): Promise<T> {
//   return request<T>("/companies", { method: "POST", body: company });
// }

// export function updateCompany<T extends Company = Company>(
//   companyId: string | number,
//   updates: Partial<T>,
// ): Promise<T> {
//   return request<T>(
//     `/companies/${encodeURIComponent(String(companyId))}`,
//     { method: "PATCH", body: updates },
//   );
// }

// export function deleteCompany(companyId: string | number): Promise<void> {
//   return request<void>(
//     `/companies/${encodeURIComponent(String(companyId))}`,
//     { method: "DELETE" },
//   );
// }

// export const companyService = {
//   getCompanies,
//   getCompany,
//   createCompany,
//   updateCompany,
//   deleteCompany,
// };
// export default companyService;
