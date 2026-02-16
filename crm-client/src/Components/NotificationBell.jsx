import { useState, useEffect } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Notifications, CheckCircle } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getAuthHeader } from "../pages/Auth"; // Adjust path if needed

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  // Fetch notifications on mount and every 30 seconds
  const fetchNotifications = async () => {
    try {
      // Use the new route created in quotations.js
      const { data } = await axios.get("/api/quotations/stats/notifications", {
        headers: getAuthHeader(),
      });
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      // 1. Mark as Read in Backend
      await axios.put(
        "/api/quotations/stats/mark-read",
        { ids: [notification._id] },
        { headers: getAuthHeader() }
      );

      // 2. Remove from local list immediately
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );
      handleMenuClose();

      // 3. Navigate to the Deal View
      if (notification.deal && notification.deal._id) {
        navigate(`/opportunity/${notification.deal._id}/view`);
      }
    } catch (err) {
      console.error("Error handling notification click", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const ids = notifications.map((n) => n._id);
      await axios.put(
        "/api/quotations/stats/mark-read",
        { ids },
        { headers: getAuthHeader() }
      );
      setNotifications([]);
      handleMenuClose();
    } catch (err) {
      console.error("Error marking all read", err);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleMenuOpen}>
        <Badge badgeContent={notifications.length} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Notifications
          </Typography>
          {notifications.length > 0 && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Typography>
          )}
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <MenuItem
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                <CheckCircle color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" noWrap>
                    Quotation Approved
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      {n.deal?.opportunityId || "Unknown ID"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {n.deal?.customer || "Customer"}
                    </Typography>
                  </>
                }
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
