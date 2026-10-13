import { getSavedCompany } from "@/storage/companyStorage";

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      username: string;
      store_id: number;
      user_category_id: number;
      user_category: string;
    };
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

export async function loginUser(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const company = await getSavedCompany();

  if (!company) {
    throw new Error("Please select a company first.");
  }

  const apiUrl = company.api_url.replace(/\/+$/, "");

  const response = await fetch(`${apiUrl}/auth/login.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const result: LoginResponse = await response.json();

  if (response.status === 401) {
    throw new Error("Incorrect username or password.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Login failed.");
  }

  if (!result.data?.access_token || !result.data?.user) {
    throw new Error("Invalid login response.");
  }

  return result;
}
