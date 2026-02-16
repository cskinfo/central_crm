import { Outlet } from "react-router-dom";
import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Components/DashboardLayout";

function OpportunityLayout() {
  return (
    <ProtectedRoute allowedRoles={["salesperson", "admin"]}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default OpportunityLayout;
