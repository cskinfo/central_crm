// src/layouts/SubAdminLayout.jsx
import { Outlet } from "react-router-dom";
import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Components/DashboardLayout";

function SubAdminLayout() {
  return (
    <ProtectedRoute allowedRoles={["sub-admin"]}>
      <DashboardLayout userRole="sub-admin">
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default SubAdminLayout;