import {
  getKeyMetrics,
  getCostOverTime,
  getButtonClicks,
  getAvgTimeOnPage,
} from "@/app/actions/admin-stats";
import { AdminDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [metrics, costOverTime, buttonClicks, pageTime] = await Promise.all([
    getKeyMetrics(),
    getCostOverTime(),
    getButtonClicks(),
    getAvgTimeOnPage(),
  ]);

  return (
    <AdminDashboardClient
      metrics={metrics}
      costOverTime={costOverTime}
      buttonClicks={buttonClicks}
      pageTime={pageTime}
    />
  );
}
