import { AppButton } from "@/components/AppButton";
import AreaIcon, { type AreaIconName } from "@/components/AreaIcon";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ActionCard({
  title,
  icon,
  onPress,
  filled = false,
  homeStyle = false,
  homeImage,
  compactHome = false,
  cardHeight,
  centeredContent = false,
}: {
  title: string;
  icon: AreaIconName;
  onPress: () => void;
  filled?: boolean;
  homeStyle?: boolean;
  homeImage?: number;
  compactHome?: boolean;
  cardHeight?: number;
  centeredContent?: boolean;
}) {
  return (
    <View
      style={[
        styles.wrapper,
        (homeStyle || Boolean(homeImage)) && styles.homeWrapper,
        compactHome && styles.compactHomeWrapper,
      ]}
    >
      {(homeStyle || homeImage) && (
        // =====================================================
        <Image
          accessible={false}
          pointerEvents="none"
          source={require("../../assets/images/icons/home-card-gradient.svg")}
          contentFit="fill"
          style={styles.gradient}
        />
      )}
      {homeImage && (
        <Image
          accessible={false}
          source={homeImage}
          contentFit="contain"
          // style={styles.homeImage}
          style={[styles.homeImage, compactHome && styles.compactHomeImage]}
        />
      )}
      {centeredContent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          style={({ pressed }) => [
            styles.card,
            filled && styles.filled,
            styles.centeredContentCard,
            cardHeight ? { height: cardHeight } : undefined,
            pressed && styles.pressedCard,
          ]}
        >
          <View style={[styles.icon, filled && styles.filledIcon]}>
            <AreaIcon
              name={icon}
              color={filled ? COLORS.white : COLORS.primary}
              size={25}
            />
          </View>
          <Text style={[styles.label, filled && styles.filledLabel]}>
            {title}
          </Text>
        </Pressable>
      ) : (
        <AppButton
          title={title}
          accessibilityLabel={title}
          onPress={onPress}
          style={[
            styles.card,
            filled && styles.filled,
            Boolean(homeStyle || homeImage) && styles.homeCard,
            Boolean(homeImage) && styles.imageCard,
            homeStyle && styles.imageCard,
            compactHome && styles.compactHomeCard,
          ]}
          textStyle={[
            styles.label,
            filled && styles.filledLabel,
            Boolean(homeStyle || homeImage) && styles.homeLabel,
            Boolean(homeImage) && styles.imageLabel,
          ]}
        />
      )}
      {!homeImage && !centeredContent && (
        <View
          pointerEvents="none"
          style={[styles.iconPosition, homeStyle && styles.homeIconPosition]}
        >
          <View
            style={[
              styles.icon,
              filled && styles.filledIcon,
              homeStyle && styles.homeIcon,
            ]}
          >
            <AreaIcon
              name={icon}
              color={
                homeStyle ? "#3d3d3d" : filled ? COLORS.white : COLORS.primary
              }
              size={25}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: {
    minHeight: 80,
    borderRadius: 16,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 68,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  filled: { backgroundColor: "#91171f", borderColor: "#91171f" },
  label: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "center",
    lineHeight: 23,
  },
  filledLabel: { color: COLORS.white },
  iconPosition: {
    position: "absolute",
    top: SPACING.md,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  homeIconPosition: { top: 38 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filledIcon: { backgroundColor: "rgba(255,255,255,0.12)" },
  homeWrapper: {
    position: "relative",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 120,
  },
  homeImage: {
    position: "absolute",
    top: 12,
    left: "10%",
    width: "80%",
    height: 112,
  },
  imageCard: {
    minHeight: 190,
    justifyContent: "flex-end",
    paddingTop: 128,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.transparent,
    borderColor: COLORS.transparent,
  },
  imageLabel: {
    color: "#3d3d3d",
    fontWeight: FONT_WEIGHT.bold,
    width: "100%",
    flexShrink: 1,
  },
  gradient: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  homeCard: {
    backgroundColor: COLORS.transparent,
    borderColor: COLORS.transparent,
  },
  homeLabel: { color: "#3d3d3d", fontWeight: FONT_WEIGHT.bold },
  homeIcon: { backgroundColor: COLORS.transparent },
  centeredContentCard: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  pressedCard: {
    opacity: 0.8,
  },
  compactHomeCard: {
    // minHeight: 100,
    // paddingTop: 55,
    // paddingBottom: 15,
    // // paddingHorizontal: 5,

    minHeight: 80,
    paddingTop: 85,
    paddingBottom: 8,
    paddingHorizontal: 5,
  },

  compactHomeWrapper: {
    minHeight: 90,
    borderRadius: 10,
  },

  compactHomeImage: {
    position: "absolute",
    top: 5,
    left: "5%",
    width: "90%",
    height: 70,
  },
});

// ============================================================================================
// import { AppButton } from "@/components/AppButton";
// import AreaIcon, { type AreaIconName } from "@/components/AreaIcon";
// import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from "@/constants/theme";
// import { Image } from "expo-image";
// import { Pressable, StyleSheet, Text, View } from "react-native";

// export default function ActionCard({
//   title,
//   icon,
//   onPress,
//   filled = false,
//   homeStyle = false,
//   homeImage,
// <<<<<<< HEAD
// =======
//   compactHome = false,
//   cardHeight,
//   centeredContent = false,
// >>>>>>> origin/soumitra-dashboard-update
// }: {
//   title: string;
//   icon: AreaIconName;
//   onPress: () => void;
//   filled?: boolean;
//   homeStyle?: boolean;
//   homeImage?: number;
// <<<<<<< HEAD
// =======
//   compactHome?: boolean;
//   cardHeight?: number;
//   centeredContent?: boolean;
// >>>>>>> origin/soumitra-dashboard-update
// }) {
//   return (
//     <View
//       style={[
//         styles.wrapper,
//         (homeStyle || Boolean(homeImage)) && styles.homeWrapper,
//       ]}
//     >
//       {(homeStyle || homeImage) && (
//         // =====================================================
//         <Image
//           accessible={false}
//           pointerEvents="none"
//           source={require("../../assets/images/icons/home-card-gradient.svg")}
//           contentFit="fill"
//           style={styles.gradient}
//         />

//         // ==================================================
//         //         <Image
//         //           accessible={false}
//         //           pointerEvents="none"
//         // <<<<<<< HEAD
//         // =======
//         //           // source={require("../../../../assets/images/icons/home-card-gradient.svg")}
//         // >>>>>>> origin/soumitra-dashboard-update
//         //           source={require("../../assets/images/icons/home-card-gradient.svg")}
//         //           contentFit="fill"
//         //           style={styles.gradient}
//         //         />
//       )}
//       {homeImage && (
//         <Image
//           accessible={false}
//           source={homeImage}
//           contentFit="contain"
//           style={styles.homeImage}
//         />
//       )}
// <<<<<<< HEAD
//       <AppButton
//         title={title}
//         accessibilityLabel={title}
//         onPress={onPress}
//         style={[
//           styles.card,
//           filled && styles.filled,
//           Boolean(homeStyle || homeImage) && styles.homeCard,
//           Boolean(homeImage) && styles.imageCard,
//           homeStyle && styles.imageCard,
//         ]}
//         textStyle={[
//           styles.label,
//           filled && styles.filledLabel,
//           Boolean(homeStyle || homeImage) && styles.homeLabel,
//           Boolean(homeImage) && styles.imageLabel,
//         ]}
//       />
//       {!homeImage && (
// =======
//       {centeredContent ? (
//         <Pressable
//           accessibilityRole="button"
//           accessibilityLabel={title}
//           onPress={onPress}
//           style={({ pressed }) => [
//             styles.card,
//             filled && styles.filled,
//             styles.centeredContentCard,
//             cardHeight ? { height: cardHeight } : undefined,
//             pressed && styles.pressedCard,
//           ]}
//         >
//           <View style={[styles.icon, filled && styles.filledIcon]}>
//             <AreaIcon
//               name={icon}
//               color={filled ? COLORS.white : COLORS.primary}
//               size={25}
//             />
//           </View>
//           <Text style={[styles.label, filled && styles.filledLabel]}>
//             {title}
//           </Text>
//         </Pressable>
//       ) : (
//         <AppButton
//           title={title}
//           accessibilityLabel={title}
//           onPress={onPress}
//           style={[
//             styles.card,
//             filled && styles.filled,
//             Boolean(homeStyle || homeImage) && styles.homeCard,
//             Boolean(homeImage) && styles.imageCard,
//             homeStyle && styles.imageCard,
//             compactHome && styles.compactHomeCard,
//           ]}
//           textStyle={[
//             styles.label,
//             filled && styles.filledLabel,
//             Boolean(homeStyle || homeImage) && styles.homeLabel,
//             Boolean(homeImage) && styles.imageLabel,
//           ]}
//         />
//       )}
//       {!homeImage && !centeredContent && (
// >>>>>>> origin/soumitra-dashboard-update
//         <View
//           pointerEvents="none"
//           style={[styles.iconPosition, homeStyle && styles.homeIconPosition]}
//         >
//           <View
//             style={[
//               styles.icon,
//               filled && styles.filledIcon,
//               homeStyle && styles.homeIcon,
//             ]}
//           >
//             <AreaIcon
//               name={icon}
//               color={
//                 homeStyle ? "#3d3d3d" : filled ? COLORS.white : COLORS.primary
//               }
//               size={25}
//             />
//           </View>
//         </View>
//       )}
//     </View>

//   );
// }

// const styles = StyleSheet.create({
//   wrapper: { flex: 1 },
//   card: {
//     minHeight: 136,
//     borderRadius: 16,
//     borderColor: COLORS.border,
//     backgroundColor: COLORS.white,
//     alignItems: "center",
//     justifyContent: "flex-end",
//     paddingTop: 68,
//     paddingBottom: SPACING.md,
//     paddingHorizontal: SPACING.sm,
//   },
//   filled: { backgroundColor: "#91171f", borderColor: "#91171f" },
//   label: {
//     color: COLORS.text,
//     fontSize: FONT_SIZE.md,
//     fontWeight: FONT_WEIGHT.semibold,
//     textAlign: "center",
//     lineHeight: 23,
//   },
//   filledLabel: { color: COLORS.white },
//   iconPosition: {
//     position: "absolute",
//     top: SPACING.md,
//     left: 0,
//     right: 0,
//     alignItems: "center",
//   },
//   homeIconPosition: { top: 38 },
//   icon: {
//     width: 40,
//     height: 40,
//     borderRadius: 13,
//     backgroundColor: COLORS.surface,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   filledIcon: { backgroundColor: "rgba(255,255,255,0.12)" },
//   homeWrapper: {
//     position: "relative",
//     backgroundColor: COLORS.white,
//     borderRadius: 18,
//     overflow: "hidden",
//     minHeight: 190,
//   },
//   homeImage: {
//     position: "absolute",
//     top: 12,
//     left: "10%",
//     width: "80%",
//     height: 112,
//   },
//   imageCard: {
//     minHeight: 190,
//     justifyContent: "flex-end",
//     paddingTop: 128,
//     paddingBottom: SPACING.md,
//     backgroundColor: COLORS.transparent,
//     borderColor: COLORS.transparent,
//   },
//   imageLabel: {
//     color: "#3d3d3d",
//     fontWeight: FONT_WEIGHT.bold,
//     width: "100%",
//     flexShrink: 1,
//   },
//   gradient: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
//   homeCard: {
//     backgroundColor: COLORS.transparent,
//     borderColor: COLORS.transparent,
//   },
//   homeLabel: { color: "#3d3d3d", fontWeight: FONT_WEIGHT.bold },
//   homeIcon: { backgroundColor: COLORS.transparent },
// <<<<<<< HEAD
// =======
//   centeredContentCard: {
//     flex: 1,
//     flexDirection: "column",
//     justifyContent: "center",
//     gap: SPACING.sm,
//     paddingTop: SPACING.md,
//     paddingBottom: SPACING.md,
//   },
//   pressedCard: {
//     opacity: 0.8,
//   },
//   compactHomeCard: {
//     // minHeight: 100,
//     // paddingTop: 55,
//     // paddingBottom: 15,
//     // // paddingHorizontal: 5,

//     minHeight: 80,
//     paddingTop: 85,
//     paddingBottom: 8,
//     paddingHorizontal: 5,
//   },

//   compactHomeWrapper: {
//     minHeight: 90,
//     borderRadius: 10,
//   },

//   compactHomeImage: {
//     position: "absolute",
//     top: 5,
//     left: "5%",
//     width: "90%",
//     height: 70,
//   },
// >>>>>>> origin/soumitra-dashboard-update
// });
