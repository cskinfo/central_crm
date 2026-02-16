import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { ArrowBack, Edit, Save, Close } from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import axios from "axios";
// Ensure we use the shared Auth utility for consistency
import { getAuthHeader } from "./Auth";

export default function SalespersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [salesperson, setSalesperson] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    empId: "",
    zone: "",
    doj: null,
    role: "", // <--- ADDED ROLE TO STATE
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // --- FETCH LOGIC ---
  useEffect(() => {
    const fetchSalesperson = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/users/${id}`, {
          headers: getAuthHeader(),
        });
        setSalesperson(data);
        setFormData({
          ...data,
          doj: data.doj ? new Date(data.doj) : null,
          role: data.role || "salesperson", // <--- ENSURE ROLE IS SET
        });
        setError("");
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(
          err.response?.data?.message || "Failed to load salesperson details."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchSalesperson();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (newDate) => {
    setFormData({ ...formData, doj: newDate });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.put(`/api/users/${id}`, formData, {
        headers: getAuthHeader(),
      });
      setSuccess("Profile updated successfully");
      setIsEditing(false);
      // Refresh local data to ensure sync
      const { data } = await axios.get(`/api/users/${id}`, {
        headers: getAuthHeader(),
      });
      setSalesperson(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update details.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI COMPONENTS ---
  const SectionHeader = ({ title }) => (
    <Box sx={{ mb: 2, mt: 1 }}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: "primary.main",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Typography>
      <Divider sx={{ mt: 0.5 }} />
    </Box>
  );

  if (loading && !salesperson) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F9FAFB",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "#F9FAFB", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Navigation */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              onClick={() => navigate("/admin/salesperson-list")}
              sx={{
                mr: 2,
                bgcolor: "white",
                boxShadow: 1,
                "&:hover": { bgcolor: "#f3f4f6" },
              }}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                {salesperson?.firstName} {salesperson?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Salesperson Profile & Settings
              </Typography>
            </Box>
          </Box>

          {!isEditing && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: 0,
              }}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        {/* Feedback Messages */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          {error && (
            <Alert
              severity="error"
              onClose={() => setError("")}
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert
              severity="success"
              onClose={() => setSuccess("")}
              sx={{ borderRadius: 2 }}
            >
              {success}
            </Alert>
          )}
        </Stack>

        {/* Main Content Card */}
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
            <Box component="form" onSubmit={handleUpdate} noValidate>
              <Grid container spacing={4}>
                {/* LEFT COLUMN: Personal Info */}
                <Grid item xs={12} md={6}>
                  <SectionHeader title="Personal Information" />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="First Name"
                        name="firstName"
                        value={formData.firstName || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Email Address"
                        name="email"
                        value={formData.email || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Phone Number"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* RIGHT COLUMN: Employment Details */}
                <Grid item xs={12} md={6}>
                  <SectionHeader title="Employment Details" />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Employee ID"
                        name="empId"
                        value={formData.empId || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Username"
                        name="username"
                        value={formData.username || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant="filled"
                      />
                    </Grid>

                    {/* --- NEW ROLE DROPDOWN --- */}
                    <Grid item xs={12} sm={6}>
                      <FormControl
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      >
                        <InputLabel>Role</InputLabel>
                        <Select
                          label="Role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                        >
                          <MenuItem value="salesperson">Salesperson</MenuItem>
                          <MenuItem value="sub-admin">Sub-Admin</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {/* ------------------------- */}

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Zone / Region"
                        name="zone"
                        value={formData.zone || ""}
                        onChange={handleChange}
                        fullWidth
                        disabled={!isEditing}
                        variant={isEditing ? "outlined" : "filled"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Date of Joining"
                        value={formData.doj}
                        onChange={handleDateChange}
                        disabled={!isEditing}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            variant={isEditing ? "outlined" : "filled"}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* ACTION BUTTONS (Only visible when editing) */}
              {isEditing && (
                <Box
                  sx={{
                    mt: 5,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    pt: 2,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        ...salesperson,
                        doj: salesperson.doj ? new Date(salesperson.doj) : null,
                      }); // Reset changes
                    }}
                    startIcon={<Close />}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                  >
                    Cancel Changes
                  </Button>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={loading}
                    startIcon={
                      loading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Save />
                      )
                    }
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      boxShadow: 2,
                      px: 4,
                    }}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </Box>
              )}
            </Box>
          </LocalizationProvider>
        </Paper>
      </Container>
    </Box>
  );
}
