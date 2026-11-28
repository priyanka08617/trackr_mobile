import { getSavedCompany } from "@/storage/companyStorage";
import { fetchWithoutRedirect } from "./apiUrlPolicy";
import type { Company } from "./companyService";
import { getSessionSnapshot, subscribeSession } from "./sessionService";

// =============================================
// LOGIN RESPONSE
// =============================================

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
      user_login_folder_path: string;
    };
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

// =============================================
// LOGIN
// =============================================

export async function loginUser(
  username: string,
  password: string,
): Promise<LoginResponse & { company: Company }> {
  const company = await getSavedCompany();

  if (!company) {
    throw new Error("Please select a company first.");
  }

  const apiUrl = company.api_url.replace(/\/+$/, "");

  const response = await fetchWithoutRedirect(`${apiUrl}/auth/login.php`, {
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

  return { ...result, company };
}

// =============================================
// PASSWORD RECOVERY
// =============================================

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  data?: {
    reset_token?: string;
  };
}

let recoveryEmail = "";
let recoveryToken = "";
subscribeSession(clearPasswordRecovery);

export function getPasswordRecoveryEmail() {
  return recoveryEmail;
}

export function clearPasswordRecovery() {
  recoveryEmail = "";
  recoveryToken = "";
}

export function hasPasswordResetToken() {
  return Boolean(recoveryEmail && recoveryToken);
}

// =============================================
// COMMON PASSWORD RECOVERY API
// =============================================

async function passwordRecoveryRequest(
  endpoint: string,
  payload: object,
): Promise<PasswordResetResponse> {
  const scope = getSessionSnapshot();
  const company = await getSavedCompany();

  if (!company) {
    throw new Error("Please select a company first.");
  }

  const apiUrl = company.api_url.replace(/\/+$/, "");

  if (scope !== getSessionSnapshot()) throw new Error("The selected company changed. Please restart recovery.");

  const response = await fetchWithoutRedirect(`${apiUrl}/auth/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result: PasswordResetResponse = await response.json();
  if (scope !== getSessionSnapshot()) throw new Error("The selected company changed. Please restart recovery.");

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

// =============================================
// REQUEST OTP
// =============================================

export async function requestPasswordReset(email: string) {
  clearPasswordRecovery();

  const result = await passwordRecoveryRequest("forgot_password.php", {
    email,
  });

  recoveryEmail = email;

  return result;
}

// =============================================
// VERIFY OTP
// =============================================

export async function verifyOtp(email: string, otp: string) {
  if (!recoveryEmail || recoveryEmail !== email) {
    throw new Error("Please request a new OTP.");
  }

  recoveryToken = "";

  const result = await passwordRecoveryRequest("verify_otp.php", {
    email,
    otp,
  });

  const token = result.data?.reset_token;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    throw new Error("Invalid reset token.");
  }

  recoveryToken = token;

  return result;
}

// =============================================
// RESET PASSWORD
// =============================================

export async function resetPassword(
  newPassword: string,
  confirmPassword: string,
) {
  if (!hasPasswordResetToken()) {
    throw new Error("Please verify your OTP first.");
  }

  const result = await passwordRecoveryRequest("reset_password.php", {
    email: recoveryEmail,
    reset_token: recoveryToken,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });

  clearPasswordRecovery();

  return result;
}

// ===========================================================================================

// import { getSavedCompany } from "@/storage/companyStorage";

// export interface LoginResponse {
//   success: boolean;
//   message: string;
//   data?: {
//     user: {
//       id: number;
//       username: string;
//       store_id: number;
//       user_category_id: number;
//       user_category: string;
//       user_login_folder_path: string;
//     };
//     access_token: string;
//     refresh_token: string;
//     token_type: string;
//     expires_in: number;
//   };
// }

// export async function loginUser(
//   username: string,
//   password: string,
// ): Promise<LoginResponse> {
//   const company = await getSavedCompany();

//   if (!company) {
//     throw new Error("Please select a company first.");
//   }

//   const apiUrl = company.api_url.replace(/\/+$/, "");

//   const response = await fetch(`${apiUrl}/auth/login.php`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       username,
//       password,
//     }),
//   });

//   const result: LoginResponse = await response.json();

//   if (response.status === 401) {
//     throw new Error("Incorrect username or password.");
//   }

//   if (!response.ok || !result.success) {
//     throw new Error(result.message || "Login failed.");
//   }

//   if (!result.data?.access_token || !result.data?.user) {
//     throw new Error("Invalid login response.");
//   }

//   return result;
// }
