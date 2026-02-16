import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { getAuthHeader } from "../pages/Auth"; // Adjust path if needed
import { toast } from "react-toastify";

const GreetingSettings = () => {
  const [greeting, setGreeting] = useState({
    text: "Welcome to CRM",
    isEnabled: false,
    gradientStart: "#B8860B", // Default Gold
    gradientEnd: "#FFD700", // Default Yellow
  });
  const [loading, setLoading] = useState(false);

  // Fetch on Load
  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const { data } = await axios.get("/api/settings/greeting", {
          headers: getAuthHeader(),
        });
        if (data) setGreeting(data);
      } catch (err) {
        console.error("Failed to load greeting settings");
      }
    };
    fetchGreeting();
  }, []);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setGreeting((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post("/api/settings/greeting", greeting, {
        headers: getAuthHeader(),
      });
      toast.success("Greeting settings saved successfully!");
      // Optional: Force a page refresh or context update if the navbar doesn't update immediately
      // window.location.reload();
    } catch (err) {
      toast.error("Failed to save greeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 4, borderRadius: 3 }} elevation={2}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Navbar Greeting Banner
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={greeting.isEnabled}
                onChange={handleChange}
                name="isEnabled"
                color="primary"
              />
            }
            label="Enable Greeting Banner"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Greeting Text"
            fullWidth
            name="text"
            value={greeting.text}
            onChange={handleChange}
            placeholder="e.g., Happy Diwali!"
            disabled={!greeting.isEnabled}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <TextField
            label="Gradient Start Color"
            fullWidth
            type="color"
            name="gradientStart"
            value={greeting.gradientStart}
            onChange={handleChange}
            disabled={!greeting.isEnabled}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField
            label="Gradient End Color"
            fullWidth
            type="color"
            name="gradientEnd"
            value={greeting.gradientEnd}
            onChange={handleChange}
            disabled={!greeting.isEnabled}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {/* Preview Section */}
      <Box sx={{ mt: 3, p: 2, border: "1px dashed #ccc", borderRadius: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Preview:
        </Typography>
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: 1,
            background: greeting.isEnabled
              ? `linear-gradient(90deg, ${greeting.gradientStart}, ${greeting.gradientEnd})`
              : "#eee",
            color: greeting.isEnabled ? "#fff" : "#999",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {greeting.text || "Greeting Text"}
        </Box>
      </Box>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          Save Greeting
        </Button>
      </Box>
    </Paper>
  );
};

export default GreetingSettings;
