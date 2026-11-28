import { saveNativeReportCsv } from "@/modules/report/services/saveNativeReportCsv";
import { Platform } from "react-native";
import { prepareReportCsv } from "../../report/services/reportCsv";
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

  await saveNativeReportCsv(csv, filename);
}

export default function ReportRoute() {
  return <Reports onDownload={downloadReport} />;
}
