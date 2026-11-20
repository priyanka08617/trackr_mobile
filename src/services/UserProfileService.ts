import { getSavedCompany } from "@/storage/companyStorage";

export async function getUserProfile(accessToken: string) {
  const company = await getSavedCompany();

  if (!company) {
    throw new Error("Company not selected.");
  }

  const apiUrl = company.api_url.replace(/\/+$/, "");
  const url = `${apiUrl}/check.php`;

  console.log("Profile API URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  // Read raw response first for debugging
  const responseText = await response.text();

  console.log("Profile HTTP Status:", response.status);
  console.log("Profile Raw Response:", responseText);

  if (!responseText.trim()) {
    throw new Error(
      `Profile API returned an empty response. HTTP Status: ${response.status}`,
    );
  }

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Invalid JSON response from profile API. HTTP Status: ${response.status}`,
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load user profile.");
  }

  return result.data;
}
