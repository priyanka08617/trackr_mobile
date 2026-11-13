import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { prepareReportCsv } from "../../report/services/reportCsv";
import { isPickerCancellation } from "../../report/services/trackerText";
import { exportAreaReport } from "../services/ReportDownloadService";
import Reports from "./Reports";

async function downloadReport(
  report: string,
  fromDate: string,
  toDate: string,
) {
  const { csv, filename } = await exportAreaReport(report, fromDate, toDate);
  if (Platform.OS === "web") {
    const blob = new Blob([prepareReportCsv(csv)], {
      type: "text/csv;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return;
  }

  let file: File;
  if (Platform.OS === "android") {
    let destination: Directory;
    try {
      destination = await Directory.pickDirectoryAsync();
    } catch (cause) {
      if (isPickerCancellation(cause)) return;
      throw cause;
    }
    if (!destination) return;
    file = destination.createFile(filename, "text/comma-separated-values");
  } else {
    file = new File(Paths.document, filename);
    file.create({ overwrite: true });
  }

  file.write(prepareReportCsv(csv));
  if (!file.exists) throw new Error("The CSV file was not created.");
}

export default function ReportRoute() {
  return <Reports onDownload={downloadReport} />;
}
