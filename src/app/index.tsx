import { useSession } from "@/hooks/useSession";
import { getSessionDashboard } from "@/services/sessionNavigation";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { getSavedCompany } from "../storage/companyStorage";

export default function Index() {
  const { identity } = useSession();
  const [destination, setDestination] = useState<"/company" | "/login" | null>(
    null,
  );

  useEffect(() => {
    getSavedCompany()
      .then((company) => setDestination(company ? "/login" : "/company"))
      .catch(() => setDestination("/company"));
  }, []);

  if (identity) return <Redirect href={getSessionDashboard(identity)} />;
  if (!destination) return <ActivityIndicator size="large" />;

  return <Redirect href={destination} />;
}
