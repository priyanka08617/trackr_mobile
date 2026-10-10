// import { Redirect } from "expo-router";

// export default function Index() {
//   return <Redirect href="/company" />;
// }

import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { getSavedCompany } from "../storage/companyStorage";

export default function Index() {
  const [destination, setDestination] = useState<"/company" | "/login" | null>(
    null,
  );

  useEffect(() => {
    getSavedCompany()
      .then((company) => setDestination(company ? "/login" : "/company"))
      .catch(() => setDestination("/company"));
  }, []);

  if (!destination) return <ActivityIndicator size="large" />;

  return <Redirect href={destination} />;
}
