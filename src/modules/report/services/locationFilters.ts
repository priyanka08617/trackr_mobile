import { getSessionVersion } from "@/services/sessionService";
import { loadAreaStores, type AreaStore } from "./StoresService";

export function uniqueLocationNames(values: readonly string[]): string[] {
  const names = new Map<string, string>();
  for (const value of values) {
    const name = value.trim();
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

export function storeLocationOptions(stores: readonly AreaStore[], region = "", zone = "") {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const regionStores = stores.filter((store) => !region || same(store.region, region));
  return {
    regions: uniqueLocationNames(stores.map((store) => store.region)),
    zones: uniqueLocationNames(regionStores.map((store) => store.zone)),
    stores: regionStores.filter((store) => !zone || same(store.zone, zone))
      .map((store) => ({ id: store.id, name: store.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

let cache: {
  sessionVersion: number;
  stores?: AreaStore[];
  time: number;
  pending?: Promise<AreaStore[]>;
} | undefined;

export async function loadLocationFilterOptions(region = "", zone = "") {
  const sessionVersion = getSessionVersion();
  if (cache?.sessionVersion !== sessionVersion) {
    cache = { sessionVersion, time: 0 };
  }
  const entry = cache;
  if (!entry.stores || Date.now() - entry.time > 60_000) {
    const pending = entry.pending ??= loadAreaStores();
    try {
      entry.stores = await pending;
      entry.time = Date.now();
    } finally {
      if (entry.pending === pending) entry.pending = undefined;
    }
  }
  if (getSessionVersion() !== sessionVersion) {
    throw new Error("Login session changed. Please try again.");
  }
  return storeLocationOptions(entry.stores, region, zone);
}
