import {
  AreaHeaderBackContext,
  AreaHeaderBackVisibleContext,
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
  const backHandler = useContext(AreaHeaderBackContext);
  const setBackVisible = useContext(AreaHeaderBackVisibleContext);
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/common/monthly_lp_global_count");
  }, []);

  useEffect(() => {
    if (backHandler) backHandler.current = goBack;
    setBackVisible(true);
    return () => {
      if (backHandler) backHandler.current = null;
      setBackVisible(false);
    };
  }, [backHandler, goBack, setBackVisible]);

  return <TrackerReport tracker={MONTHLY_REPORT} />;
}
