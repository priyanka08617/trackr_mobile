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

let cached: { stores: AreaStore[]; time: number } | undefined;
let pending: Promise<AreaStore[]> | undefined;
export async function loadLocationFilterOptions(region = "", zone = "") {
  if (!cached || Date.now() - cached.time > 60_000) {
    pending ??= loadAreaStores();
    try {
      cached = { stores: await pending, time: Date.now() };
    } finally {
      pending = undefined;
    }
  }
  return storeLocationOptions(cached.stores, region, zone);
}
