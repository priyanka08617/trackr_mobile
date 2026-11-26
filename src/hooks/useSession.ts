import {
  getInitialSessionSnapshot,
  getSessionSnapshot,
  subscribeSession,
} from "@/services/sessionService";
import { useSyncExternalStore } from "react";

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getInitialSessionSnapshot);
}
