import React, { useState, useEffect } from "react";
import GreetingSettings from "../Components/GreetingSettings";
import { 
  Box, Typography, Paper, Button, Grid, Divider, TextField, 
  List, ListItem, ListItemText, IconButton, CircularProgress 
} from "@mui/material";
import { CloudUpload, Save, Business, Label, Delete } from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";

const ConfigPage = () => {
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [companyName, setCompanyName] = useState(""); 
  const [headerFile, setHeaderFile] = useState(null);
  const [footerFile, setFooterFile] = useState(null);
  const [headerPreview, setHeaderPreview] = useState("");
  const [footerPreview, setFooterPreview] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/settings");
      if (data.templates) setTemplates(data.templates);
    } catch (err) {
      console.error("Failed to load settings");
    }
  };

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
    if(!templateName || !companyName) return toast.error("Template Name and Company Name are required");
    setLoading(true);
    const formData = new FormData();
    formData.append("templateName", templateName);
    formData.append("companyName", companyName);
    if (headerFile) formData.append("headerImage", headerFile);
    if (footerFile) formData.append("footerImage", footerFile);

    try {
      const { data } = await axios.post("http://localhost:5000/api/settings/update-branding", formData, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });
      toast.success("New Template added successfully!");
      setTemplates(data.settings.templates);
      
      // Reset Form
      setTemplateName(""); setCompanyName("");
      setHeaderPreview(""); setFooterPreview("");
      setHeaderFile(null); setFooterFile(null);
    } catch (err) {
      toast.error("Failed to add template.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      const { data } = await axios.delete(`http://localhost:5000/api/settings/templates/${id}`);
      setTemplates(data.settings.templates);
      toast.success("Template deleted");
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>System Configuration</Typography>
      
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }} elevation={2}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Create New PDF Template</Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField 
              fullWidth label="Template Name (e.g., Brand A)" 
              value={templateName} onChange={(e) => setTemplateName(e.target.value)} 
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField 
              fullWidth label="Company Name (Displayed on PDF)" 
              value={companyName} onChange={(e) => setCompanyName(e.target.value)} 
            />
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 120, border: "2px dashed #ccc", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", mb: 2 }}>
              {headerPreview ? <img src={headerPreview} alt="Header" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Typography color="text.secondary">No Header Set</Typography>}
            </Box>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth>
              Select Header <input type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, "header")} />
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ height: 120, border: "2px dashed #ccc", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", mb: 2 }}>
              {footerPreview ? <img src={footerPreview} alt="Footer" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Typography color="text.secondary">No Footer Set</Typography>}
            </Box>
            <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth>
              Select Footer <input type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, "footer")} />
            </Button>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button variant="contained" size="large" startIcon={loading ? <CircularProgress size={20} /> : <Save />} onClick={handleSaveBranding} disabled={loading}>
            Save New Template
          </Button>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Saved Templates</Typography>
        {templates.length === 0 ? <Typography color="text.secondary">No templates saved yet.</Typography> : (
          <List>
            {templates.map(t => (
              <ListItem key={t._id} secondaryAction={ <IconButton edge="end" color="error" onClick={() => handleDeleteTemplate(t._id)}><Delete /></IconButton> }>
                <ListItemText primary={t.name} secondary={`Company Name: ${t.companyName}`} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      <GreetingSettings />
    </Box>
  );
};
export default ConfigPage;