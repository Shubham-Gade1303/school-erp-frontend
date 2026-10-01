import { getDashboardMockData } from "./dashboardMockData";
import type { DashboardData, UserRole } from "../types/api";

export async function loadDashboardData(role: UserRole): Promise<DashboardData> {
  return getDashboardMockData(role);
}