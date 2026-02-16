import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Collapse,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove"; // <--- Imported Remove Icon
import AssessmentIcon from "@mui/icons-material/Assessment";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import CampaignIcon from "@mui/icons-material/Campaign";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import CalculateIcon from "@mui/icons-material/Calculate";
import SettingsIcon from "@mui/icons-material/Settings";
import axios from "axios";
import { getAuthHeader } from "../pages/Auth";

function Sidebar({ open, setOpen, userRole }) {
  const location = useLocation();
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);

  // State for collapsible menus
  const [openSubmenus, setOpenSubmenus] = useState({});

  const handleSubmenuClick = (text) => {
    setOpenSubmenus((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  useEffect(() => {
    if (userRole === "salesperson") {
      const fetchUnread = async () => {
        try {
          const { data } = await axios.get("/api/broadcasts/unread-count", {
            headers: getAuthHeader(),
          });
          setUnreadBroadcasts(data.count);
        } catch (error) {}
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
    if (userRole === "admin" || userRole === "sub-admin") {
      const fetchPending = async () => {
        try {
          const { data } = await axios.get(
            "/api/quotations/stats/pending-count",
            { headers: getAuthHeader() },
          );
          setPendingQuotes(data.count);
        } catch (error) {}
      };
      fetchPending();
      const interval = setInterval(fetchPending, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole, location.pathname]);

  const adminMenuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/admin" },
    { text: "Leads", icon: <PeopleIcon />, path: "/admin/leads" },
    {
      text: "Opportunities",
      icon: <InsertChartIcon />,
      path: "/admin/opportunities",
    },
    { text: "Customers", icon: <PeopleIcon />, path: "/admin/customers" },

    {
      text: "Quotations",
      icon: (
        <Badge
          badgeContent={pendingQuotes}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.6rem",
              height: 16,
              minWidth: 16,
            },
          }}
        >
          <RequestQuoteIcon />
        </Badge>
      ),
      path: "/admin/quotation-approvals",
    },
    {
      text: "Cost Sheets",
      icon: <CalculateIcon />,
      path: "/admin/cost-sheets",
    },
    { text: "Reports", icon: <AssessmentIcon />, path: "/admin/reports" },

    { text: "Analytics", icon: <AssessmentIcon />, path: "/admin/analytics" },
    { text: "Broadcast", icon: <CampaignIcon />, path: "/admin/broadcast" },
    {
      text: "To-Do List",
      icon: <PlaylistAddCheckIcon />,
      path: "/admin/todos",
    },

    // -----------------------------------
    { text: "Config", icon: <SettingsIcon />, path: "/admin/config" },
    // --- COLLAPSIBLE USER MANAGEMENT ---
    {
      text: "User Management",
      icon: <GroupIcon />, // <--- Changed to GroupIcon (Main Icon)
      children: [
        {
          text: "Create User",
          icon: <PersonAddIcon />,
          path: "/admin/create-salesperson",
        },
        {
          text: "User List",
          icon: <GroupIcon />,
          path: "/admin/salesperson-list",
        },
      ],
    },
  ];

  const subAdminMenuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/sub-admin/dashboard",
    },
    {
      text: "Quotations",
      icon: (
        <Badge
          badgeContent={pendingQuotes}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.6rem",
              height: 16,
              minWidth: 16,
            },
          }}
        >
          <RequestQuoteIcon />
        </Badge>
      ),
      path: "/sub-admin/quotation-approvals",
    },
    {
      text: "Cost Sheets",
      icon: <CalculateIcon />,
      path: "/sub-admin/cost-sheets",
    },
  ];

  const salesMenuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/sales" },
    { text: "Leads", icon: <PeopleIcon />, path: "/sales/leads" },
    {
      text: "Opportunities",
      icon: <InsertChartIcon />,
      path: "/sales/opportunities",
    },
    { text: "Customers", icon: <ContactMailIcon />, path: "/sales/customers" },
    { text: "Reports", icon: <AssessmentIcon />, path: "/sales/reports" },
    {
      text: "To-Do List",
      icon: <PlaylistAddCheckIcon />,
      path: "/sales/todos",
    },
    {
      text: "Cost Sheets",
      icon: <CalculateIcon />,
      path: "/sales/cost-sheets",
    },
    {
      text: "Broadcast",
      icon: (
        <Badge
          badgeContent={unreadBroadcasts}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.6rem",
              height: 16,
              minWidth: 16,
            },
          }}
        >
          <CampaignIcon />
        </Badge>
      ),
      path: "/sales/broadcast",
    },
    { text: "Analytics", icon: <AssessmentIcon />, path: "/sales/analytics" },
    {
      text: "Change Password",
      icon: <VpnKeyIcon />,
      path: "/sales/change-password",
    },
  ];

  const getMenuItems = () => {
    switch (userRole) {
      case "admin":
        return adminMenuItems;
      case "sub-admin":
        return subAdminMenuItems;
      case "salesperson":
        return salesMenuItems;
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();
  const { title, path } =
    userRole === "admin"
      ? { title: "Admin Panel", path: "/admin" }
      : userRole === "sub-admin"
        ? { title: "Approval Panel", path: "/sub-admin" }
        : { title: "Sales Portal", path: "/sales" };

  return (
    <Box
      sx={{
        width: open ? 200 : 0, // FIXED WIDTH
        bgcolor: "#2c3e50",
        color: "white",
        height: "100vh",
        transition: "width 0.3s",
        overflowX: "hidden",
        overflowY: "auto",
        position: "fixed",
        zIndex: 1000,
        "&::-webkit-scrollbar": { width: "5px" },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: "10px",
        },
      }}
    >
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography
          variant="h6"
          component={Link}
          to={path}
          sx={{
            color: "white",
            textDecoration: "none",
            display: "block",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          {title}
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
      <Typography
        variant="caption"
        sx={{
          px: 2,
          py: 1.5,
          fontWeight: "bold",
          display: "block",
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: 1,
          fontSize: "0.7rem",
        }}
      >
        Menu
      </Typography>
      <List dense sx={{ pt: 0 }}>
        {menuItems.map((item) => (
          <Box key={item.text}>
            {/* PARENT ITEM */}
            <ListItem disablePadding sx={{ display: "block" }}>
              {item.children ? (
                // If it has children, make it collapsible
                <ListItemButton
                  onClick={() => handleSubmenuClick(item.text)}
                  sx={{
                    py: 0.75,
                    px: 2,
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: "white",
                      minWidth: 32,
                      "& svg": { fontSize: 20 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.85rem",
                      fontWeight: 400,
                    }}
                  />
                  {/* CHANGED: Uses Add (+) when closed, Remove (-) when open */}
                  {openSubmenus[item.text] ? <RemoveIcon /> : <AddIcon />}
                </ListItemButton>
              ) : (
                // Standard Link Item
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                  sx={{
                    py: 0.75,
                    px: 2,
                    "&.Mui-selected": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderLeft: "4px solid #3498db",
                      paddingLeft: "12px",
                    },
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: "white",
                      minWidth: 32,
                      "& svg": { fontSize: 20 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.85rem",
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              )}
            </ListItem>

            {/* CHILDREN ITEMS */}
            {item.children && (
              <Collapse
                in={openSubmenus[item.text]}
                timeout="auto"
                unmountOnExit
              >
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.text}
                      component={Link}
                      to={child.path}
                      selected={location.pathname === child.path}
                      sx={{
                        pl: 4, // Indent children
                        py: 0.75,
                        "&.Mui-selected": {
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          borderLeft: "4px solid #3498db",
                          paddingLeft: "28px", // Adjust padding for border
                        },
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: "white",
                          minWidth: 32,
                          "& svg": { fontSize: 18 },
                        }}
                      >
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={child.text}
                        primaryTypographyProps={{
                          fontSize: "0.8rem",
                          fontWeight:
                            location.pathname === child.path ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}
      </List>
    </Box>
  );
}
export default Sidebar;
