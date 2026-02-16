// src/layouts/AdminLayout.jsx
import { Outlet } from "react-router-dom";
import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Components/DashboardLayout";

function AdminLayout() {
  return (
    <ProtectedRoute allowedRoles={["admin", "sub-admin"]}>
      <DashboardLayout userRole="admin">
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default AdminLayout;