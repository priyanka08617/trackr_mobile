import { loadStoreDirectory, type AreaStore } from "../../common/services/All_stores_contacts";
export type { AreaStore } from "../../common/services/All_stores_contacts";

const decodeHtmlAmpersand = (value: unknown) => String(value ?? "").replace(/&amp;/gi, "&");

export async function loadAreaStores(): Promise<AreaStore[]> {
  const { payload, html, ok, status } = await loadStoreDirectory();
  if (!payload) {
    throw new Error(html
      ? "Sign in to your area manager account and try again."
      : "The stores API returned an invalid response.");
  }
  if (!ok || payload.success !== true || !Array.isArray(payload.stores)) {
    throw new Error(payload.message || "Unable to load stores (" + status + ").");
  }
  return payload.stores.map((store) => ({
    id: String(store.id),
    name: String(store.store_name ?? "Unnamed store"),
    region: decodeHtmlAmpersand(store.region),
    zone: decodeHtmlAmpersand(store.zone),
    mobileNo: String(store.mobile_no ?? store.store_mobile_number ?? ""),
    email: String(store.store_mail_id ?? store.rm_mail_id ?? ""),
  }));
}
