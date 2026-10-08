import { request } from "@/services/apiService";
import { clearAuthToken, setAuthToken } from "@/storage/authStorage";
import { clearUser, setUser } from "@/storage/userStorage";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse<User = unknown> {
  accessToken: string;
  user?: User;
}

export async function login<User = unknown>(
  credentials: LoginCredentials,
): Promise<AuthResponse<User>> {
  const result = await request<AuthResponse<User>>("/auth/login", {
    method: "POST",
    body: credentials,
    authenticated: false,
  });

  if (!result.accessToken) {
    throw new Error("The login response did not include an access token.");
  }

  await setAuthToken(result.accessToken);
  if (result.user !== undefined) {
    await setUser(result.user);
  }
  return result;
}

export async function logout(): Promise<void> {
  try {
    await request<unknown>("/auth/logout", { method: "POST" });
  } finally {
    await Promise.all([clearAuthToken(), clearUser()]);
  }
}

export function getCurrentUser<User = unknown>(): Promise<User> {
  return request<User>("/auth/me");
}

export const authService = { login, logout, getCurrentUser };
export default authService;
