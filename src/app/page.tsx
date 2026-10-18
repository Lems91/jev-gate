import { loadDashboardData } from "@/server/dashboard-data";
import { Dashboard } from "./_components/Dashboard";

export default function Home() {
  return (
    <main className="page">
      <Dashboard data={loadDashboardData()} />
    </main>
  );
}
