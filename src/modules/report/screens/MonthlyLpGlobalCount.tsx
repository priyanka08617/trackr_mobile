import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
  AreaHeaderTitleContext,
} from "@/components/AreaHeaderBackContext";
import { router } from "expo-router";
import { useCallback, useContext, useEffect } from "react";
import type { TrackerLink } from "../services/AllTrackersService";
import { TrackerReport } from "./AllTrackers";

const MONTHLY_REPORT: TrackerLink = {
  id: "monthly_lp_global_count",
  name: "Monthly LP Global Count",
};

export default function MonthlyLpGlobalCount() {
  const backHandlerRef = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const setHeaderTitle = useContext(AreaHeaderTitleContext);
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/area_manager/settings");
  }, []);

  useEffect(() => {
    setHeaderTitle("Monthly LP Global Count");
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = goBack;
    setBackVisible(true);
    return () => {
      if (backHandlerRef?.current === goBack) backHandlerRef.current = null;
      setBackVisible(false);
    };
  }, [backHandlerRef, goBack, setBackVisible]);

  return <TrackerReport tracker={MONTHLY_REPORT} />;
}
