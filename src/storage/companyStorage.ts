import AsyncStorage from "@react-native-async-storage/async-storage";
import { validateCompany, type Company } from "../services/companyService";

const STORAGE_KEY = "trackr_selected_company";
let company: Company | null | undefined;
let pending: Promise<Company | null> | undefined;

export async function saveCompany(next: Company): Promise<void> {
  const validated = validateCompany(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  company = validated;
}

async function readCompany(): Promise<Company | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);

  if (!data) return null;

  try {
    return validateCompany(JSON.parse(data));
  } catch {
    return null;
  }
}

export function getSavedCompany(): Promise<Company | null> {
  if (company !== undefined) return Promise.resolve(company);
  pending ??= readCompany().then((stored) => {
    if (company === undefined) company = stored;
    return company;
  }).finally(() => { pending = undefined; });
  return pending;
}

export async function clearCompany(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  company = null;
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
