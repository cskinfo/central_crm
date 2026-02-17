import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";

// Import your pages and components
import AdminDashboard from "./pages/AdminDashboard";
import SubAdminDashboard from "./pages/SubAdminDashboard"; 
import SalesDashboard from "./pages/SalesDashboard";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import LeadDetails from "./pages/LeadDetails";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityViewPage from "./pages/OpportunityViewPage";
import OpportunityFormPage from "./pages/OpportunityFormPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportsPage from "./pages/ReportsPage";
import CreateSalesperson from "./Components/CreateSalesPerson";
import SalespersonList from "./Components/SalespersonList";
import TodoPage from "./pages/TodoPage";
import BroadcastPage from "./pages/BroadcastPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SalespersonDetailPage from "./pages/SalespersonDetailPage";
import QuotationApprovals from "./pages/QuotationApprovalPage";
import CostSheetListPage from "./pages/CostSheetListPage";
import ProjectCostSheet from "./pages/ProjectCostSheet";
import ConfigPage from "./pages/ConfigPage";
import SSOCallback from "./pages/SSOCallback"; // <--- ADDED SSO CALLBACK IMPORT

// Import your layout components
import AdminLayout from "./layouts/AdminLayout";
import SalesLayout from "./layouts/SalesLayout";
import SubAdminLayout from "./layouts/SubAdminLayout";
import OpportunityLayout from "./layouts/OpportunityLayout";
import ChangePassword from "./Components/ChangePassword";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* 1. UPDATED PUBLIC ROUTE: Redirects to Central Login if no token exists */}
          <Route path="/" element={(() => {
            const token = localStorage.getItem("token");
            if (token) {
              return <Navigate to="/admin" />;
            } else {
              window.location.href = "http://localhost:3000"; // URL of your Central Login
              return null;
            }
          })()} />

          {/* 2. ADDED SSO CALLBACK ROUTE */}
          <Route path="/sso-login" element={<SSOCallback />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetails />} />
            <Route path="customers" element={<Customers />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="opportunities/:id/view" element={<OpportunityViewPage />} />
            <Route path="create-salesperson" element={<CreateSalesperson />} />
            <Route path="salesperson-list" element={<SalespersonList />} />
            <Route path="salesperson-list/:id" element={<SalespersonDetailPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="todos" element={<TodoPage />} />
            <Route path="broadcast" element={<BroadcastPage />} />
            <Route path="quotation-approvals" element={<QuotationApprovals />} />
            <Route path="config" element={<ConfigPage />} />
          </Route>

          <Route element={<AdminLayout />}>
            <Route path="/admin/cost-sheets" element={<CostSheetListPage />} />
            <Route path="/admin/cost-sheets/:id" element={<ProjectCostSheet />} />
          </Route>

          {/* Sub-Admin Routes */}
          <Route path="/sub-admin" element={<SubAdminLayout />}>
            <Route index element={<SubAdminDashboard />} />
            <Route path="dashboard" element={<SubAdminDashboard />} />
            <Route path="quotation-approvals" element={<QuotationApprovals />} />
          </Route>
          <Route element={<SubAdminLayout />}>
            <Route path="/sub-admin/cost-sheets" element={<CostSheetListPage />} />
            <Route path="/sub-admin/cost-sheets/:id" element={<ProjectCostSheet />} />
          </Route>

          {/* Salesperson Routes */}
          <Route path="/sales" element={<SalesLayout />}>
            <Route index element={<SalesDashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetails />} />
            <Route path="customers" element={<Customers />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="opportunities/:id/view" element={<OpportunityViewPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="todos" element={<TodoPage />} />
            <Route path="broadcast" element={<BroadcastPage />} />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
          <Route element={<SalesLayout />}>
            <Route path="/sales/cost-sheets" element={<CostSheetListPage />} />
            <Route path="/sales/cost-sheets/:id" element={<ProjectCostSheet />} />
          </Route>

          {/* Opportunity Routes */}
          <Route path="/opportunity" element={<OpportunityLayout />}>
            <Route path="new" element={<OpportunityFormPage />} />
            <Route path=":id/view" element={<OpportunityViewPage />} />
            <Route path=":id/edit" element={<OpportunityFormPage />} />
          </Route>

          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
        <ToastContainer position="top-center" autoClose={4000} />
      </BrowserRouter>
    </>
  );
}

export default App;