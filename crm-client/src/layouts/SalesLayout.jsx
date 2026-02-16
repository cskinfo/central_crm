import { Outlet } from "react-router-dom";
import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Components/DashboardLayout";

function SalesLayout() {
  return (
    <ProtectedRoute allowedRoles={["salesperson", "admin"]}>
      <DashboardLayout userRole="salesperson">
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default SalesLayout;
