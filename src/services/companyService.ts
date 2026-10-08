import { request } from "@/services/apiService";

export type Company = Record<string, unknown>;

export function getCompanies<T extends Company = Company>(): Promise<T[]> {
  return request<T[]>("/companies");
}

export function getCompany<T extends Company = Company>(
  companyId: string | number,
): Promise<T> {
  return request<T>(`/companies/${encodeURIComponent(String(companyId))}`);
}

export function createCompany<T extends Company = Company>(
  company: Omit<T, "id">,
): Promise<T> {
  return request<T>("/companies", { method: "POST", body: company });
}

export function updateCompany<T extends Company = Company>(
  companyId: string | number,
  updates: Partial<T>,
): Promise<T> {
  return request<T>(
    `/companies/${encodeURIComponent(String(companyId))}`,
    { method: "PATCH", body: updates },
  );
}

export function deleteCompany(companyId: string | number): Promise<void> {
  return request<void>(
    `/companies/${encodeURIComponent(String(companyId))}`,
    { method: "DELETE" },
  );
}

export const companyService = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
};
export default companyService;
