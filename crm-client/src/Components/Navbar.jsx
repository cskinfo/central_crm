import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Logout from "@mui/icons-material/Logout";
import Settings from "@mui/icons-material/Settings";
import Person from "@mui/icons-material/Person";
import { useState, useEffect } from "react"; 
import { Link } from "react-router-dom";
import axios from "axios"; 
import yourLogo from "../assets/logo.png";
import NotificationBell from "../Components/NotificationBell";

function Navbar({ open, setOpen, userRole }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const [greeting, setGreeting] = useState({
    text: "",
    isEnabled: false,
    gradientStart: "#B8860B",
    gradientEnd: "#FFD700"
  });

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        // CORRECTION: Removed http://localhost:5000
        const response = await axios.get("/api/settings/greeting");
        if (response.data) {
          setGreeting(response.data);
        }
      } catch (error) {
        console.error("Could not fetch greeting settings:", error);
      }
    };
    fetchGreeting();
  }, []);

  let user;
  try {
    user = JSON.parse(localStorage.getItem("user")) || {};
  } catch (e) {
    user = {};
  }

  const currentUser = {
    username: user.username || (userRole === "admin" ? "Admin" : "Sales User"),
    email:
      user.email ||
      (userRole === "admin" ? "admin@example.com" : "sales@example.com"),
    role: user.role || userRole,
    lastLogin: user.lastLogin || new Date().toLocaleString(),
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const avatarText = currentUser.username
    ? currentUser.username.charAt(0).toUpperCase()
    : userRole === "admin"
    ? "A"
    : "S";

  const getNavbarDetails = () => {
    switch (userRole) {
      case "admin":
        return { path: "/admin", title: "Admin Panel" };
      case "sub-admin":
        return { path: "/sub-admin", title: "Sub-Admin Dashboard" };
      case "salesperson":
        return { path: "/sales", title: "Sales Dashboard" };
      default:
        return { path: "/", title: "CRM" };
    }
  };
  const { path: dashboardPath, title: navbarTitle } = getNavbarDetails();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: "white",
        color: "black",
        boxShadow: "none",
        borderBottom: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={() => setOpen(!open)}
          edge="start"
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          <Box
            component={Link}
            to={dashboardPath}
            sx={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Box
              component="img"
              sx={{ height: 40, mr: 1.5 }}
              alt="Your Company Logo"
              src={yourLogo}
            />
          </Box>
          <Typography variant="h6" noWrap component="div">
            {navbarTitle}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          
          {/* ✨ DYNAMIC GREETING SECTION ✨ */}
          {greeting.isEnabled && (
            <Box sx={{ display: { xs: "none", md: "block" }, textAlign: 'right' }}>
              <Typography
                variant="caption"
                display="block"
                sx={{ color: "text.secondary", fontSize: "0.7rem", lineHeight: 1 }}
              >
                Season's Greetings
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "bold",
                  background: `linear-gradient(45deg, ${greeting.gradientStart} 30%, ${greeting.gradientEnd} 90%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textFillColor: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                {greeting.text}
              </Typography>
            </Box>
          )}

          {userRole === "salesperson" && <NotificationBell />}

          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
            <Avatar
              alt={currentUser.username}
              src=""
              sx={{
                bgcolor:
                  userRole === "admin"
                    ? "#3f51b5"
                    : userRole === "sub-admin"
                    ? "#673ab7"
                    : "#4caf50",
              }}
            >
              {avatarText}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                "& .MuiAvatar-root": { width: 32, height: 32, ml: -0.5, mr: 1 },
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {currentUser.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Role: {currentUser.role}
              </Typography>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                Last login: {currentUser.lastLogin}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;