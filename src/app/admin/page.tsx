import {
  getKeyMetrics,
  getCostOverTime,
  getButtonClicks,
  getAvgTimeOnPage,
  getVisitAnalytics,
} from "@/app/actions/admin-stats";
import { AdminDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, costOverTime, buttonClicks, pageTime, visitAnalytics] = await Promise.all([
    getKeyMetrics(),
    getCostOverTime(),
    getButtonClicks(),
    getAvgTimeOnPage(),
    getVisitAnalytics(),
  ]);

  return (
    <AdminDashboardClient
      metrics={metrics}
      costOverTime={costOverTime}
      buttonClicks={buttonClicks}
      pageTime={pageTime}
      visitAnalytics={visitAnalytics}
    />
  );
}
