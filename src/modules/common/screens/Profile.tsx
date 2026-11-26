import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import AreaPage from "@/components/AreaPage";
import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { router } from "expo-router";

import { getUserProfile, type UserProfile } from "../services/profileService";

import { useCallback, useContext, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ==========================================
// THEME COLOR
// ==========================================

const themeColors = COLORS as unknown as Record<string, string>;

const PRIMARY_COLOR = themeColors.primary ?? themeColors.PRIMARY ?? "#1759A8";

// Replace these with your existing navbar image
// URLs, if available. Empty values use fallbacks.


// ==========================================
// PROFILE FIELD
// ==========================================

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <Text style={styles.fieldValue}>
        {value === undefined || value === null || value === ""
          ? "Not provided"
          : String(value)}
      </Text>
    </View>
  );
}

// ==========================================
// PROFILE SCREEN
// ==========================================

export default function Profile() {
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const goToDashboard = useCallback(
    () => router.replace("/common/home"),
    [],
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Header title

  useEffect(() => {
    setHeaderTitle("My Profile");

    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = goToDashboard;
    setBackVisible(true);
    return () => {
      if (backHandlerRef?.current === goToDashboard)
        backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, goToDashboard, setBackVisible]);

  // ==========================================
  // FETCH PROFILE FROM SERVICE
  // ==========================================

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getUserProfile();

        if (!active) return;

        setProfile(data.profile);
        setUsername(data.username ?? "");
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error ? err.message : "Unable to load profile.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [retryCount]);

  // ==========================================
  // PROFILE DETAILS
  // ==========================================

  const profileName = profile?.name || profile?.store_name || "User";

  const employeeCode = profile?.employee_code || profile?.store_code || "N/A";

  const categoryName = profile?.user_category_name || "N/A";

  const designation = profile?.designation || "N/A";

  const emailUsername = profile?.email || username || "N/A";

  const status =
    profile?.status === 1
      ? "Active"
      : profile?.status === 0
        ? "Inactive"
        : "Not provided";


  // ==========================================
  // SCREEN DESIGN
  // ==========================================

  return (
    <AreaPage title="My Profile" compact>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />

          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={[styles.retryButton, { backgroundColor: PRIMARY_COLOR }]}
            onPress={() => setRetryCount((prev) => prev + 1)}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SINGLE PROFILE CARD */}

          <View style={styles.profileCard}>
            {/* TOP HALF - THEME COLOR */}

            <View
              style={[styles.topSection, { backgroundColor: PRIMARY_COLOR }]}
            >
              {/* COMPANY LOGO */}

              {/* FOX + TRACKR LOGOS SIDE BY SIDE */}
              <View style={styles.logoContainer}>
                <Image
                  style={styles.foxLogo}
                  source={require("../../../../assets/images/logo/fox.svg")}
                  resizeMode="contain"
                />

                <Image
                  style={styles.trackrLogo}
                  source={require("../../../../assets/images/logo/logo.svg")}
                  resizeMode="contain"
                />
              </View>

              {/* <Text style={styles.headerSubtitle}>Employee Profile</Text> */}
            </View>
            {/* ==================================TEST BY PK ======================================== */}

            {/* <View style={styles.logoContainer}>
                {LOGO_URI ? (
                  // <Image
                  //   source={{ uri: LOGO_URI }}
                  //   style={styles.logo}
                  //   resizeMode="contain"
                  // />

                  <Image
                    accessible
                    accessibilityLabel="Fox"
                    style={styles.logo}
                    source={require("../../../../assets/images/logo/fox.svg")}
                  />
                ) : (
                  <Text style={styles.logoText}>TrackR</Text>
                )}
              </View>

            

              <View style={styles.avatarContainer}>
                {PROFILE_IMAGE_URI ? (
                  // <Image
                  //   source={{ uri: PROFILE_IMAGE_URI }}
                  //   style={styles.avatarImage}
                  //   resizeMode="cover"
                  // />

                  <Image
                    accessible
                    accessibilityLabel="TrackR"
                    source={require("../../../../assets/images/logo/logo.svg")}
                  />
                ) : (
                  <Text style={[styles.avatarLetter, { color: PRIMARY_COLOR }]}>
                    {avatarLetter}
                  </Text>
                )}
              </View>

              <Text style={styles.headerSubtitle}>Employee Profile</Text>
            </View> */}

            {/* BOTTOM HALF - WHITE */}
            {/* ==================================TEST BY PK ======================================== */}

            <View style={styles.bottomSection}>
              {/* ROW 1 */}

              <View style={styles.dataRow}>
                <View style={styles.column}>
                  <ProfileField label="Name" value={profileName} />
                </View>

                <View style={styles.column}>
                  <ProfileField label="Employee Code" value={employeeCode} />
                </View>
              </View>

              <View style={styles.divider} />

              {/* ROW 2 */}

              <View style={styles.dataRow}>
                <View style={styles.column}>
                  <ProfileField label="User Category" value={categoryName} />
                </View>

                <View style={styles.column}>
                  <ProfileField label="Designation" value={designation} />
                </View>
              </View>

              <View style={styles.divider} />

              {/* ROW 3 */}

              <View style={styles.dataRow}>
                <View style={styles.column}>
                  <ProfileField
                    label="Email / Username"
                    value={emailUsername}
                  />
                </View>

                <View style={styles.column}>
                  <ProfileField label="Status" value={status} />
                </View>
              </View>

              <View style={styles.divider} />

              {/* ROW 4 */}

              <View style={styles.dataRow}>
                <View style={styles.column}>
                  <ProfileField label="Mobile No" value={profile.mobile_no} />
                </View>

                <View style={styles.column}>
                  <ProfileField label="Status" value={status} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.centerContainer}>
          <Text>No profile information available.</Text>
        </View>
      )}
    </AreaPage>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  profileCard: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 3,
  },

  logo: {
    width: 150,
    height: 50,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },

  avatarContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#DCEAFE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarLetter: {
    fontSize: 36,
    fontWeight: "700",
  },

  // headerSubtitle: {
  //   marginTop: 12,
  //   fontSize: 14,
  //   fontWeight: "600",
  //   color: "#FFFFFF",
  // },

  // WHITE SECTION

  bottomSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  dataRow: {
    flexDirection: "row",
    gap: 16,
  },

  column: {
    flex: 1,
    minWidth: 0,
  },

  field: {
    paddingVertical: 8,
  },

  fieldLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 7,
  },

  fieldValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    flexWrap: "wrap",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },

  // LOADING / ERROR

  centerContainer: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
  },

  errorText: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // ===============================================================================
  topSection: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 25,
    paddingHorizontal: 16,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 15,
  },

  foxLogo: {
    width: 65,
    height: 65,
  },

  trackrLogo: {
    width: 160,
    height: 65,
  },

  headerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
