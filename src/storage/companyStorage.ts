import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_CONFIG } from "@/constants/config";

export async function getCompany<T = unknown>(): Promise<T | null> {
  const value = await AsyncStorage.getItem(APP_CONFIG.storageKeys.company);
  return value === null ? null : (JSON.parse(value) as T);
}

export async function setCompany<T>(company: T): Promise<void> {
  await AsyncStorage.setItem(
    APP_CONFIG.storageKeys.company,
    JSON.stringify(company),
  );
}

export async function clearCompany(): Promise<void> {
  await AsyncStorage.removeItem(APP_CONFIG.storageKeys.company);
}
