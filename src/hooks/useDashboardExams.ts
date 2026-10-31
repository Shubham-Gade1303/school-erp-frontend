import { useContext } from "react";
import { DashboardExamsContext } from "../context/dashboardExamsContext";

export function useDashboardExams() {
  const context = useContext(DashboardExamsContext);
  if (!context) {
    throw new Error(
      "useDashboardExams must be used within DashboardExamsProvider.",
    );
  }
  return context;
}
