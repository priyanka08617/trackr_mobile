import ActionCard from "@/components/ActionCard";
import { AreaHeaderTitleContext } from "@/components/AreaHeaderBackContext";
import AreaPage from "@/components/AreaPage";
import AllRegister from "@/modules/report/screens/AllRegister";
import AllTrackers from "@/modules/report/screens/AllTrackers";
import FestiveHomeRoute from "@/modules/report/screens/FestiveHomeRoute";

import { useCallback, useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import AllPortals from "./All_portals_library";
import All_stores_contacts from "./All_stores_contacts";
import EscalationMatrix from "./EscalationMatrix";
import Library_of_important_guidelines from "./Library_of_important_guidelines";
import AllOmniReturns from "./Omni_return";
import Report_bank from "./Report_bank";
import SopCommandments from "./SopCommandments";

const HOME_CARDS = [
  {
    title: "All Register",
    image: require("../../../../assets/images/icons/dashboard/allregisters.svg"),
    screen: "all_register",
  },
  {
    title: "All Tracker",
    image: require("../../../../assets/images/icons/dashboard/trackers.svg"),
    screen: "all_trackers",
  },

  {
    title: "Festive Checklist",
    // href: "/area_manager/FestiveChecklist",
    image: require("../../../../assets/images/icons/dashboard/festivechecklist.svg"),
    screen: "festive_checklist",
  },

  {
    title: "SOP 10 commandments",
    image: require("../../../../assets/images/icons/dashboard/tenc.svg"),
    screen: "sop_commandments",
  },
  {
    title: "Escalation Matrix",
    image: require("../../../../assets/images/icons/dashboard/escalation.svg"),
    screen: "escalation",
  },

  {
    title: "All Portals Library",
    image: require("../../../../assets/images/icons/dashboard/allP2.svg"),
    screen: "portals",
  },

  {
    title: "All Stores Contacts",
    image: require("../../../../assets/images/icons/dashboard/store.svg"),
    screen: "stores",
  },

  {
    title: "Report Bank",
    icon: "bank" as const,
    image: require("../../../../assets/images/icons/dashboard/store.svg"),
    href: "/common/Report_bank",
    screen: "report_bank",
  },

  {
    title: "Library of Important Guidelines",
    image: require("../../../../assets/images/icons/dashboard/library_of_guideline.png"),
    screen: "library_of_important_guidelines",
  },

  {
    title: "Pending Omni Return Tracker",
    image: require("../../../../assets/images/icons/dashboard/online_return_trackr.png"),
    screen: "pending_omni_return_tracker",
  },
] as const;

type HomeScreen = (typeof HOME_CARDS)[number]["screen"];

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<HomeScreen | null>(null);
  const setHeaderTitle = useContext(AreaHeaderTitleContext);

  const title =
    HOME_CARDS.find((card) => card.screen === activeScreen)?.title ?? "Home";

  useEffect(() => {
    setHeaderTitle(title);
    return () => setHeaderTitle(null);
  }, [setHeaderTitle, title]);

  const goBackHome = useCallback(() => {
    setActiveScreen(null);
  }, []);

  if (activeScreen === "all_register") {
    return <AllRegister onBack={goBackHome} />;
  }
  if (activeScreen === "all_trackers") {
    return <AllTrackers onBack={goBackHome} />;
  }
  if (activeScreen === "festive_checklist") {
    return <FestiveHomeRoute onBack={goBackHome} />;
  }

  if (activeScreen === "escalation") {
    return <EscalationMatrix onBack={goBackHome} />;
  }
  if (activeScreen === "portals") {
    return <AllPortals onBack={goBackHome} />;
  }

  if (activeScreen === "stores") {
    return <All_stores_contacts onBack={goBackHome} />;
  }

  if (activeScreen === "report_bank") {
    return <Report_bank onBack={goBackHome} />;
  }

  if (activeScreen === "library_of_important_guidelines") {
    return <Library_of_important_guidelines onBack={goBackHome} />;
  }

  if (activeScreen === "pending_omni_return_tracker") {
    return <AllOmniReturns onBack={goBackHome} />;
  }

  if (activeScreen === "sop_commandments") {
    return <SopCommandments onBack={goBackHome} />;
  }

  return (
    <AreaPage
      title="Home"
      subtitle="Resources for your everyday store operations."
      compact
    >
      <View style={styles.grid}>
        {HOME_CARDS.map((card) => (
          <View key={card.screen} style={styles.cell}>
            <ActionCard
              title={card.title}
              icon="dashboard"
              homeImage={card.image}
              compactHome
              onPress={() => setActiveScreen(card.screen)}
            />
          </View>
        ))}
      </View>
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 5,
    rowGap: 15,
    padding: 0,
    margin: 0,
  },

  cell: {
    width: "49%",
    minWidth: 0,
    padding: 0,
    margin: 0,
  },
});
// const styles = StyleSheet.create({
//   grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

//   cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
// });
