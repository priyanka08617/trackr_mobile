import ActionCard from "@/components/ActionCard";
import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import AreaPage from "@/components/AreaPage";
import { getAuthToken } from "@/storage/authStorage";
import { useCallback, useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import RegisterReportScreen, {
  type RegisterReportId,
} from "./RegisterReportScreen";
const REGISTER_ITEMS = [
  { id: "alteration", title: "Alteration Report", icon: "setting" },
  { id: "footfall", title: "Footfall Report", icon: "clock" },
  { id: "exchange", title: "Exchange Report", icon: "report" },
  { id: "electricity", title: "Electricity Report", icon: "dashboard" },
  { id: "generator", title: "Generator Report", icon: "setting" },
  { id: "hk_sg", title: "HK Attendance Report", icon: "check" },
  { id: "lost_found", title: "Lost & Found Report", icon: "faq" },
  { id: "scrap", title: "Scrap Report", icon: "ban" },
  { id: "global_count", title: "Global Count Report", icon: "plan" },
  { id: "pi", title: "PI Report", icon: "globe" },
  { id: "key_movement", title: "Key Movement Report", icon: "setting" },
  { id: "fmcg_price_mismatch", title: "FMCG Price Mismatch", icon: "report" },
] as const;

export default function AllRegister({ onBack }: { onBack?: () => void }) {
  const [selectedReport, setSelectedReport] = useState<RegisterReportId>();

  // ======================================FOR TESTING=============================================================================
  const [apiDebug, setApiDebug] = useState("Waiting for API...");
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        console.log("All Register Page Loaded");
        setApiDebug("Loading user profile...");

        const token = await getAuthToken();

        if (!token) {
          console.log("Access token not found");
          setApiDebug("Access token not found");
          return;
        }

        // const apiUrl = process.env.EXPO_PUBLIC_MASTER_API_URL;

        // if (!apiUrl) {
        //   setApiDebug("API Base URL missing");
        //   return;
        // }

        // const url = `${apiUrl.replace(/\/$/, "")}/common/profile.php`;
        // Profile API URL - Only for AllRegister page
        const url = "https://trackr.net.in/track_r/api/v1/common/profile.php";

        console.log("Calling Profile API:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        console.log("Profile API Status:", response.status);
        console.log("Profile API Response:", result);

        if (!response.ok || !result.success) {
          setApiDebug(result.message || "Unable to fetch profile");
          return;
        }

        const profile = result.data.profile;

        console.log("Employee Name:", profile.name);
        console.log("Employee Code:", profile.employee_code);
        console.log("Designation:", profile.designation);
        console.log("Email:", profile.email);
        console.log("User Category:", result.data.user_category_id);

        setApiDebug(
          `Employee Name: ${profile.name ?? "N/A"}\n` +
            `Employee Code: ${profile.employee_code ?? "N/A"}\n` +
            `Designation: ${profile.designation ?? "N/A"}\n` +
            `Email: ${profile.email ?? "N/A"}\n` +
            `User Category: ${result.data.user_category_id}`,
        );
      } catch (error) {
        console.error("Profile API Error:", error);

        setApiDebug(
          `API Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    };

    fetchUserDetails();
  }, []);

  // =================================================================================
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  useEffect(() => {
    setHeaderTitle(
      REGISTER_ITEMS.find((item) => item.id === selectedReport)?.title ??
        "All Register",
    );
    return () => setHeaderTitle(null);
  }, [selectedReport, setHeaderTitle]);
  const headerBackHandlerRef = useContext(AreaHeaderBackContext);
  const setHeaderBackVisible = useContext(AreaHeaderBackVisibleContext);
  const backToRegisters = useCallback(() => setSelectedReport(undefined), []);

  useEffect(() => {
    const backAction = selectedReport ? backToRegisters : onBack;
    if (headerBackHandlerRef) headerBackHandlerRef.current = backAction ?? null;
    setHeaderBackVisible(Boolean(backAction));
    return () => {
      if (headerBackHandlerRef) headerBackHandlerRef.current = null;
      setHeaderBackVisible(false);
    };
  }, [
    backToRegisters,
    headerBackHandlerRef,
    onBack,
    selectedReport,
    setHeaderBackVisible,
  ]);

  if (selectedReport) return <RegisterReportScreen reportId={selectedReport} />;

  return (
    <AreaPage
      title="All Register"
      subtitle="Access all store registers and daily reports."
      compact
    >
      <View style={styles.grid}>
        {REGISTER_ITEMS.map((item) => (
          <View key={item.title} style={styles.cell}>
            <ActionCard
              filled
              title={item.title}
              icon={item.icon}
              onPress={() => setSelectedReport(item.id)}
            />
          </View>
        ))}
      </View>

      <View
        style={{
          padding: 15,
          marginBottom: 15,
          backgroundColor: "#f1f5f9",
          borderRadius: 8,
        }}
      >
        <Text selectable style={{ fontSize: 13, color: "#000" }}>
          {apiDebug}
        </Text>
      </View>
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
});
