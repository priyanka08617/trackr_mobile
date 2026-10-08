import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { APP_CONFIG } from "@/constants/config";

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(APP_CONFIG.storageKeys.authToken);
  }
  return SecureStore.getItemAsync(APP_CONFIG.storageKeys.authToken);
}

export async function setAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(APP_CONFIG.storageKeys.authToken, token);
    return;
  }
  await SecureStore.setItemAsync(APP_CONFIG.storageKeys.authToken, token);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    return;
  }
  await SecureStore.deleteItemAsync(APP_CONFIG.storageKeys.authToken);
}
