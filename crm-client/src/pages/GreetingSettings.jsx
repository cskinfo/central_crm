import React, { useState, useEffect } from "react";
import { Box, TextField, Switch, Button, Typography, Paper, FormControlLabel } from "@mui/material";
import axios from "axios"; // Assuming you use axios
import { toast } from "react-toastify";

const GreetingSettings = () => {
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState({
    text: "",
    isEnabled: false,
    gradientStart: "#B8860B",
    gradientEnd: "#FFD700"
  });

  // Fetch current settings on load
  useEffect(() => {
    // Replace with your actual API URL
    axios.get("http://43.205.210.227:5000/api/settings/greeting")
      .then((res) => setGreeting(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // You might need headers for auth tokens here
      await axios.put("http://localhost:5000/api/settings/greeting", greeting);
      toast.success("Greeting updated successfully!");
      // Optional: Force reload to see changes immediately or use Context API
      setTimeout(() => window.location.reload(), 1000); 
    } catch (error) {
      toast.error("Failed to update greeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: "auto", mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        🎄 Festive Greeting Configuration
      </Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={greeting.isEnabled}
            onChange={(e) => setGreeting({ ...greeting, isEnabled: e.target.checked })}
          />
        }
        label="Enable Greeting in Navbar"
      />

      {greeting.isEnabled && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Greeting Text"
            fullWidth
            value={greeting.text}
            onChange={(e) => setGreeting({ ...greeting, text: e.target.value })}
            placeholder="e.g., Happy New Year 2026 🥂"
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
             <TextField
              label="Start Color (Hex)"
              value={greeting.gradientStart}
              onChange={(e) => setGreeting({ ...greeting, gradientStart: e.target.value })}
              type="color"
              fullWidth
            />
             <TextField
              label="End Color (Hex)"
              value={greeting.gradientEnd}
              onChange={(e) => setGreeting({ ...greeting, gradientEnd: e.target.value })}
              type="color"
              fullWidth
            />
          </Box>

          {/* Preview */}
          <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 1, textAlign: "center" }}>
            <Typography variant="caption">Preview:</Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                background: `linear-gradient(45deg, ${greeting.gradientStart} 30%, ${greeting.gradientEnd} 90%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {greeting.text}
            </Typography>
          </Box>
        </Box>
      )}

      <Button 
        variant="contained" 
        fullWidth 
        sx={{ mt: 3 }} 
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </Paper>
  );
};

export default GreetingSettings;