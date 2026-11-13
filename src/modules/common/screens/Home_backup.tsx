// import ActionCard from "@/components/ActionCard";
// import { AreaHeaderTitleContext } from "@/components/AreaHeaderBackContext";
// import AreaPage from "@/components/AreaPage";
// import { useCallback, useContext, useEffect, useState } from "react";
// import { StyleSheet, View } from "react-native";
// import All_stores_contacts from "./All_stores_contacts";
// import EscalationMatrix from "./EscalationMatrix";

// const HOME_CARDS = [
//   {
//     title: "All Register",
//     image: require("../../../../assets/images/icons/dashboard/allregisters.svg"),
//   },
//   // {
//   //   title: "All Tracker",
//   //   image: require("../../../../assets/images/icons/dashboard/trackers.svg"),
//   // },
//   // {
//   //   title: "Festive Checklist",
//   //   // href: "/areamanger/festive-report",
//   //   image: require("../../../../assets/images/icons/dashboard/festivechecklist.svg"),
//   // },
//   // {
//   //   title: "SOP 10 commandments",
//   //   image: require("../../../../assets/images/icons/dashboard/tenc.svg"),
//   // },
//   {
//     title: "Escalation Matrix",
//     // image: require("./assets/dashboard/escalation.svg"),
//     image: require("../../../../assets/images/icons/dashboard/escalation.svg"),
//     enabled: true,
//   },
//   // {
//   //   title: "All Portals Library",
//   //   href: "/areamanger/all-portals",
//   //   image: require("./assets/dashboard/allP2.svg"),
//   // },
//   {
//     title: "All Stores Contacts",
//     // image: require("./assets/dashboard/store.svg"),
//     image: require("../../../../assets/images/icons/dashboard/store.svg"),
//     screen: "stores",
//   },
//   // {
//   //   title: "Retail Communications",
//   //   // image: require("./assets/dashboard/retailComm.svg"),
//   //   image: require("../../../../assets/images/icons/dashboard/retailComm.svg"),
//   // },
//   // {
//   //   title: "Library of Important Guidelines",
//   //   image: require("./assets/dashboard/library_of_guideline.png"),
//   // },
//   // {
//   //   title: "Reports Bank",
//   //   icon: "bank" as const,
//   //   href: "/areamanger/report-bank",
//   // },
//   // {
//   //   title: "Pending Omni Return Tracker",
//   //   image: require("./assets/dashboard/online_return_trackr.png"),
//   // },
// ] as const;

// export default function Home() {
//   const [activeScreen, setActiveScreen] = useState<
//     "escalation" | "stores" | null
//   >(null);

//   const setHeaderTitle = useContext(AreaHeaderTitleContext);

//   const headerTitle =
//     activeScreen === "escalation"
//       ? "Escalation Matrix"
//       : activeScreen === "stores"
//         ? "All Stores Contacts"
//         : "Home";

//   useEffect(() => {
//     setHeaderTitle(headerTitle);
//     return () => setHeaderTitle(null);
//   }, [headerTitle, setHeaderTitle]);

//   const goBackHome = useCallback(() => setActiveScreen(null), []);

//   if (activeScreen === "escalation") {
//     return <EscalationMatrix onBack={goBackHome} />;
//   }

//   if (activeScreen === "stores") {
//     return <All_stores_contacts onBack={goBackHome} />;
//   }

//   return (
//     <AreaPage
//       title="Home"
//       subtitle="Resources for your everyday store operations."
//     >
//       <View style={styles.grid}>
//         {HOME_CARDS.map((card) => {
//           const screen = "screen" in card ? card.screen : undefined;

//           return (
//             <View
//               key={card.title}
//               style={[styles.cell, !screen && styles.disabledCard]}
//             >
//               <ActionCard
//                 title={card.title}
//                 icon="dashboard"
//                 homeImage={card.image}
//                 onPress={() => {
//                   if (screen) setActiveScreen(screen);
//                 }}
//               />
//             </View>
//           );
//         })}
//       </View>
//     </AreaPage>
//   );
// }

// // export default function Home() {
// //   const [showEscalationMatrix, setShowEscalationMatrix] = useState(false);
// //   const setHeaderTitle = useContext(AreaHeaderTitleContext);

// //   useEffect(() => {
// //     setHeaderTitle(showEscalationMatrix ? "Escalation Matrix" : "Home");
// //     return () => setHeaderTitle(null);
// //   }, [setHeaderTitle, showEscalationMatrix]);

// //   const closeEscalationMatrix = useCallback(
// //     () => setShowEscalationMatrix(false),
// //     [],
// //   );

// //   if (showEscalationMatrix) {
// //     return <EscalationMatrix onBack={closeEscalationMatrix} />;
// //   }

// //   return (
// //     <AreaPage
// //       title="Home"
// //       subtitle="Resources for your everyday store operations."
// //     >
// //       <View style={styles.grid}>
// //         {HOME_CARDS.map((card) => {
// //           const enabled = "enabled" in card && card.enabled === true;

// //           return (
// //             <View
// //               key={card.title}
// //               style={[styles.cell, !enabled && styles.disabledCard]}
// //             >
// //               <ActionCard
// //                 title={card.title}
// //                 // icon={"icon" in card ? card.icon : "dashboard"}
// //                 icon="dashboard"
// //                 homeImage={"image" in card ? card.image : undefined}
// //                 homeStyle={!("image" in card)}
// //                 onPress={() => {
// //                   if (enabled) {
// //                     setShowEscalationMatrix(true);
// //                   }
// //                 }}
// //               />

// //             </View>
// //           );
// //         })}
// //       </View>
// //     </AreaPage>
// //   );
// // }

// const styles = StyleSheet.create({
//   grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
//   cell: { flexGrow: 1, flexBasis: "45%", minWidth: 0 },
//   disabledCard: { opacity: 0.4 },
// });
