// src/Components/DashboardLayout.jsx

import { useState } from "react";
import { Box } from "@mui/material";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));
  const userRole = user?.role || "salesperson";

  return (
    <Box sx={{ display: "flex" }}>
      <Navbar open={sidebarOpen} setOpen={setSidebarOpen} userRole={userRole} />
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        userRole={userRole}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2.5, // <--- CHANGED: Reduced padding (was 3) to fix gap
          marginTop: "40px",
          // <--- CHANGED: Margin set to exactly 200px
          marginLeft: sidebarOpen ? "190px" : "0px",
          transition: "margin-left 0.3s",
          width: "100%",
          overflowX: "hidden",
         
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default DashboardLayout;
