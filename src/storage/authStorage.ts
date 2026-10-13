import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(APP_CONFIG.storageKeys.refreshToken);
  }
  return SecureStore.getItemAsync(APP_CONFIG.storageKeys.refreshToken);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(APP_CONFIG.storageKeys.refreshToken, token);
    return;
  }
  await SecureStore.setItemAsync(APP_CONFIG.storageKeys.refreshToken, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
    return;
  }
  await SecureStore.deleteItemAsync(APP_CONFIG.storageKeys.refreshToken);
}
