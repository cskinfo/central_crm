import React, { useState, useEffect } from "react";
import GreetingSettings from "../Components/GreetingSettings";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  TextField,
} from "@mui/material";
import { CloudUpload, Save, Business } from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";

const ConfigPage = () => {
  const [companyName, setCompanyName] = useState(""); // <--- New State
  const [headerFile, setHeaderFile] = useState(null);
  const [footerFile, setFooterFile] = useState(null);
  const [headerPreview, setHeaderPreview] = useState("");
  const [footerPreview, setFooterPreview] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch existing settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axios.get("/api/settings");
        if (data.companyName) setCompanyName(data.companyName); // <--- Load Name
        if (data.headerImage) setHeaderPreview(data.headerImage);
        if (data.footerImage) setFooterPreview(data.footerImage);
      } catch (err) {
        console.error("Failed to load settings");
      }
    };
    fetchSettings();
  }, []);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === "header") {
        setHeaderFile(file);
        setHeaderPreview(URL.createObjectURL(file));
      } else {
        setFooterFile(file);
        setFooterPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSaveBranding = async () => {
    setLoading(true);
    const formData = new FormData();

    // Append Company Name
    formData.append("companyName", companyName);

    // Append Images if changed
    if (headerFile) formData.append("headerImage", headerFile);
    if (footerFile) formData.append("footerImage", footerFile);

    try {
      const { data } = await axios.post(
        "/api/settings/update-branding",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      toast.success("Branding updated successfully!");

      // Update local state with server response
      setCompanyName(data.settings.companyName);
      setHeaderPreview(data.settings.headerImage);
      setFooterPreview(data.settings.footerImage);
      setHeaderFile(null);
      setFooterFile(null);
    } catch (err) {
      toast.error("Failed to update branding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        System Configuration
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }} elevation={2}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Quotation PDF Branding
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Set your Company Name and upload Header/Footer images for PDFs.
        </Alert>

        {/* --- COMPANY NAME INPUT --- */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Company Name (Displayed in PDF)
          </Typography>
          <TextField
            fullWidth
            placeholder="e.g. Your Company Pvt Ltd"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            InputProps={{
              startAdornment: (
                <Business sx={{ color: "action.active", mr: 1, my: 0.5 }} />
              ),
            }}
          />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Header Image
            </Typography>
            <Box
              sx={{
                height: 120,
                border: "2px dashed #ccc",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                mb: 2,
                bgcolor: "#f9f9f9",
              }}
            >
              {headerPreview ? (
                <img
                  src={headerPreview}
                  alt="Header"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Typography color="text.secondary">No Header Set</Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
            >
              Select Header
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleFileChange(e, "header")}
              />
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Footer Image
            </Typography>
            <Box
              sx={{
                height: 120,
                border: "2px dashed #ccc",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                mb: 2,
                bgcolor: "#f9f9f9",
              }}
            >
              {footerPreview ? (
                <img
                  src={footerPreview}
                  alt="Footer"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Typography color="text.secondary">No Footer Set</Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
            >
              Select Footer
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleFileChange(e, "footer")}
              />
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Save />
              )
            }
            onClick={handleSaveBranding}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Branding Changes"}
          </Button>
        </Box>
      </Paper>

      <GreetingSettings />
    </Box>
  );
};

export default ConfigPage;
