import ActionCard from "@/components/ActionCard";
import { AreaHeaderTitleContext } from "@/components/AreaHeaderBackContext";
import AreaPage from "@/components/AreaPage";
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
    title: "All Stores Contacts",
    image: require("../../../../assets/images/icons/dashboard/store.svg"),
    screen: "stores",
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
    >
      <View style={styles.grid}>
        {HOME_CARDS.map((card) => (
          <View key={card.screen} style={styles.cell}>
            <ActionCard
              title={card.title}
              icon="dashboard"
              homeImage={card.image}
              onPress={() => setActiveScreen(card.screen)}
            />
          </View>
        ))}
      </View>
    </AreaPage>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
});
