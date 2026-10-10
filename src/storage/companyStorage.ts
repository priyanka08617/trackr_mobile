import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Company } from "../services/companyService";

const STORAGE_KEY = "trackr_selected_company";

export async function saveCompany(company: Company): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(company));
}

export async function getSavedCompany(): Promise<Company | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);

  if (!data) return null;

  try {
    return JSON.parse(data) as Company;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function clearCompany(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// import AsyncStorage from "@react-native-async-storage/async-storage";

// import { APP_CONFIG } from "@/constants/config";

// export async function getCompany<T = unknown>(): Promise<T | null> {
//   const value = await AsyncStorage.getItem(APP_CONFIG.storageKeys.company);
//   return value === null ? null : (JSON.parse(value) as T);
// }

// export async function setCompany<T>(company: T): Promise<void> {
//   await AsyncStorage.setItem(
//     APP_CONFIG.storageKeys.company,
//     JSON.stringify(company),
//   );
// }

// export async function clearCompany(): Promise<void> {
//   await AsyncStorage.removeItem(APP_CONFIG.storageKeys.company);
// }
