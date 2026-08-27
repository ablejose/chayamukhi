import AdminDashboard from "@/components/admin/AdminDashboard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export default function AdminPage() {
  return <AdminDashboard />;
}
