import { Directory, File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { Platform } from "react-native";

import { prepareReportCsv } from "./reportCsv";
import { isPickerCancellation } from "./trackerText";

export async function saveNativeReportCsv(csv: string, requestedName: string): Promise<string | null> {
  const filename = requestedName.trim().replace(/[<>:"/\\|?*\p{Cc}]/gu, "_").replace(/^\.+/, "") || "report.csv";
  const content = prepareReportCsv(csv);

  if (Platform.OS === "android") {
    let destination: Directory;
    try {
      destination = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (isPickerCancellation(error)) return null;
      throw error;
    }
    if (!destination) return null;
    const file = destination.createFile(filename, "text/csv");
    try {
      file.write(content);
      if (!file.exists) throw new Error("The CSV file was not created.");
    } catch (error) {
      try { file.delete(); } catch { /* Preserve the original write error. */ }
      throw error;
    }
    return "Saved CSV to the selected folder.";
  }

  if (Platform.OS !== "ios" || !(await isAvailableAsync())) {
    throw new Error("CSV sharing is unavailable on this device.");
  }
  const directory = new Directory(Paths.cache, `csv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  directory.create();
  try {
    const file = new File(directory, filename);
    file.create();
    file.write(content);
    await shareAsync(file.uri, { UTI: "public.comma-separated-values-text" });
    return null;
  } finally {
    try { directory.delete(); } catch { /* Cache cleanup is best-effort. */ }
  }
}
