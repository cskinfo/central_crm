import { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import axios from "axios";
import { getAuthHeader } from "../pages/Auth";

export default function CreateSalesperson() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    empId: "",
    zone: "",
    doj: null,
    role: "salesperson",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (newDate) => {
    setFormData({ ...formData, doj: newDate });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await axios.post("/api/users", formData, { headers: getAuthHeader() });

      setSuccess(true);
      setFormData({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        empId: "",
        zone: "",
        doj: null,
        role: "salesperson",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // Reusable Section Header Component
  const FormSectionHeader = ({ title, subtitle }) => (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="h6"
        sx={{ fontSize: "1rem", fontWeight: 600, color: "text.primary" }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  return (
    // CHANGED: Removed Container, using Box with padding to fix left gap
    <Box sx={{ backgroundColor: "#F9FAFB", minHeight: "100vh", px: 4, py: 4 }}>
      {/* Wrapper to limit width on huge screens but keep it left-aligned.
         maxWidth can be increased to '1600px' or '100%' if you prefer full width.
      */}
      <Box sx={{ maxWidth: "1200px" }}>
        {/* 1. Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={700}
            sx={{ color: "#111827" }}
          >
            Create New User
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Onboard a new Admin, Sub-Admin, or Salesperson to the platform.
          </Typography>
        </Box>

        {/* 2. Feedback Area */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          {error && (
            <Alert severity="error" variant="filled">
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" variant="filled">
              User created successfully!
            </Alert>
          )}
        </Stack>

        {/* 3. Main Form Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <form onSubmit={handleSubmit} noValidate>
              {/* SECTION 1: Account Credentials */}
              <FormSectionHeader
                title="Account Access"
                subtitle="Set up login credentials and system role."
              />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    fullWidth
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    fullWidth
                    autoComplete="new-password"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Role</InputLabel>
                    <Select
                      name="role"
                      value={formData.role}
                      label="Role"
                      onChange={handleChange}
                    >
                      <MenuItem value="salesperson">Salesperson</MenuItem>
                      <MenuItem value="sub-admin">Sub-Admin</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              {/* SECTION 2: Personal Information */}
              <FormSectionHeader title="Personal Information" />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              {/* SECTION 3: Organization Details */}
              <FormSectionHeader title="Organization Details" />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Employee ID"
                    name="empId"
                    value={formData.empId}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Zone / Region"
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Date of Joining"
                    value={formData.doj}
                    onChange={handleDateChange}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth />
                    )}
                  />
                </Grid>
              </Grid>

              {/* ACTION FOOTER */}
              <Box sx={{ mt: 5, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: "none",
                    fontSize: "1rem",
                    boxShadow: "none",
                    "&:hover": {
                      boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Create User Account"
                  )}
                </Button>
              </Box>
            </form>
          </LocalizationProvider>
        </Paper>
      </Box>
    </Box>
  );
}
