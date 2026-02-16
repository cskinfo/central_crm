// src/pages/LeadDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  Badge,
  Fade,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  Note as NoteIcon,
  Label as LabelIcon,
  Timeline as TimelineIcon,
  AssignmentInd as AssignmentIcon,
  Public as SourceIcon,
  CheckCircle as StatusIcon,
  MonetizationOn as ProbabilityIcon,
} from "@mui/icons-material";
import { getAuthHeader, getUserRole } from "./Auth";
import {
  TableHead,
  TableBody,
  Table, // <-- ADD THIS LINE
  TableRow,
  TableCell,
} from "@mui/material";
function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [opportunities, setOpportunities] = useState([]);
  const userRole = getUserRole();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    type: null,
    summary: "",
    details: "",
  });

  useEffect(() => {
    if (lead?._id) {
      fetch(`/api/deals/by-lead/${lead._id}`, { headers: getAuthHeader() })
        .then((res) => res.json())
        .then(setOpportunities)
        .catch(() => setOpportunities([]));
    }
  }, [lead]);
  // All existing useEffect and handler functions remain unchanged
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/leads/${id}`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch lead");
        }

        const data = await response.json();
        setLead(data);
        setFormData({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          company: data.company,
          industry: data.industry || "",
          source: data.source || "Website",

          productInterest: data.productInterest || "",
          rating: data.rating || "Warm",
          address: data.address || {
            street: "",
            city: "",
            state: "",
            postalCode: "",
            country: "",
          },
          tags: data.tags || [],
          followUpDate: data.followUpDate || "",
          remarks: data.remarks || "",
          stage: data.stage || "Initial Contact",
          assignedTo: data.assignedTo?._id || "",
          leadOwner: data.leadOwner?._id || "",
          notes: data.notes || "",
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      if (userRole === "admin") {
        try {
          const response = await fetch("/api/users", {
            headers: getAuthHeader(),
          });
          const data = await response.json();
          const salespersons = data.filter(
            (user) => user.role === "salesperson"
          );
          setUsers(salespersons);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
    };

    fetchLead();
    fetchUsers();
  }, [id, userRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: value,
        },
      }));
    } else if (name === "tags") {
      const tags = value.split(",").map((tag) => tag.trim());
      setFormData((prev) => ({ ...prev, tags }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleActionOpen = (type) => {
    setActionDialog({
      open: true,
      type,
      summary: `${type} with ${lead.fullName}`,
      details: "",
    });
  };

  const handleActionClose = () => {
    setActionDialog({
      open: false,
      type: null,
      summary: "",
      details: "",
    });
  };

  const handleActionSubmit = async () => {
    try {
      const response = await fetch(`/api/leads/${id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          actionType: actionDialog.type,
          details: {
            summary: actionDialog.summary,
            details: actionDialog.details,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log action");
      }

      const updatedLead = await response.json();
      setLead(updatedLead);
      handleActionClose();
    } catch (error) {
      console.error("Action error:", error);
      setError(error.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const requiredFields = ["fullName", "email", "phone", "company"];
      const missingFields = requiredFields.filter(
        (field) => !formData[field] || formData[field].trim() === ""
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const payload = {
        ...formData,
        followUpDate: formData.followUpDate
          ? new Date(formData.followUpDate).toISOString()
          : undefined,
        leadOwner: formData.leadOwner || undefined,
        assignedTo: formData.assignedTo || undefined,
      };

      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined && v !== "")
      );

      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(cleanPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update lead");
      }

      const updatedLead = await response.json();
      setLead(updatedLead);
      setEditMode(false);
    } catch (error) {
      console.error("Update error:", error);
      setError(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete lead");
      }

      navigate(userRole === "admin" ? "/admin/leads" : "/sales/leads");
    } catch (error) {
      console.error("Error deleting lead:", error);
      setError(error.message);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const getRatingColor = (rating) => {
    const ratingColors = {
      Hot: "error",
      Warm: "warning",
      Cold: "info",
    };
    return ratingColors[rating] || "default";
  };

  if (loading)
    return (
      <Box className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LinearProgress className="w-64" />
      </Box>
    );

  if (error)
    return (
      <Box className="min-h-screen bg-gray-50 p-6">
        <Fade in={!!error}>
          <Alert severity="error" className="max-w-2xl mx-auto rounded-lg">
            {error}
          </Alert>
        </Fade>
      </Box>
    );

  if (!lead)
    return (
      <Box className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Typography variant="h6" className="text-gray-600">
          Lead not found
        </Typography>
      </Box>
    );

  return (
    <Box className="min-h-screen bg-gray-50">
      {/* Modern Header Section */}
      <Box className="bg-white shadow-sm border-b border-gray-200">
        <Box className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:bg-gray-100 rounded-lg"
              sx={{
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              Back to Leads
            </Button>

            <div className="flex items-center space-x-3">
              <Tooltip title="Edit Lead" arrow>
                <IconButton
                  onClick={() => setEditMode(true)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 shadow-sm"
                  sx={{ borderRadius: "12px" }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Lead" arrow>
                <IconButton
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 shadow-sm"
                  sx={{ borderRadius: "12px" }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                color="primary"
                onClick={() =>
                  navigate(`/opportunity/new?fromLead=${lead._id}`)
                }
              >
                Create Opportunity
              </Button>
            </div>
          </div>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lead Header Card with Gradient */}
        <Card className="mb-8 shadow-lg rounded-2xl overflow-hidden border-0">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center space-x-6">
                <Avatar
                  className="w-20 h-20 bg-white text-blue-600 text-3xl font-bold shadow-lg"
                  sx={{ fontSize: "2rem" }}
                >
                  {lead.fullName.charAt(0).toUpperCase()}
                </Avatar>
                <div className="text-white">
                  <Typography variant="h3" className="font-bold mb-2">
                    {lead.fullName}
                  </Typography>
                  <Typography
                    variant="h6"
                    className="text-blue-100 flex items-center"
                  >
                    <BusinessIcon className="mr-2" />
                    {lead.company}
                  </Typography>
                  <Typography variant="body1" className="text-blue-200 mt-1">
                    {lead.industry && `${lead.industry} • `}
                    Created {new Date(lead.createdAt).toLocaleDateString()}
                  </Typography>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Chip
                  label={lead.rating}
                  color={getRatingColor(lead.rating)}
                  size="large"
                  icon={<StarIcon />}
                  className="bg-white text-gray-800 font-semibold shadow-md"
                  sx={{
                    borderRadius: "12px",
                    "& .MuiChip-icon": { fontSize: "1.2rem" },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <CardContent className="bg-white p-0">
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              className="border-b border-gray-200"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  minHeight: "64px",
                  paddingX: 4,
                },
                "& .Mui-selected": {
                  color: "#2563eb",
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#2563eb",
                  height: "3px",
                  borderRadius: "2px",
                },
              }}
            >
              <Tab label="Overview" />
              <Tab label="Details" />
              <Tab label="Activity" />
              {userRole === "admin" && <Tab label="Administration" />}
            </Tabs>
          </CardContent>
        </Card>

        {editMode ? (
          // Edit Dialog with Enhanced Styling
          <Dialog
            open={editMode}
            onClose={() => setEditMode(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ className: "rounded-2xl", sx: { maxHeight: "90vh" } }}
          >
            <DialogTitle>Edit Lead Information</DialogTitle>
            <DialogContent dividers>
              {/* --- Section: Basic Info --- */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="fullName"
                    label="Full Name"
                    value={formData.fullName || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="email"
                    label="Email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    type="email"
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="phone"
                    label="Phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="company"
                    label="Company"
                    value={formData.company || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="industry"
                    label="Industry"
                    value={formData.industry || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Source</InputLabel>
                    <Select
                      name="source"
                      value={formData.source || "Website"}
                      onChange={handleChange}
                      label="Source"
                    >
                      <MenuItem value="Website">Website</MenuItem>
                      <MenuItem value="Referral">Referral</MenuItem>
                      <MenuItem value="Campaign">Campaign</MenuItem>
                      <MenuItem value="Cold Call">Cold Call</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="productInterest"
                    label="Product Interest"
                    value={formData.productInterest || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Rating</InputLabel>
                    <Select
                      name="rating"
                      value={formData.rating || "Warm"}
                      onChange={handleChange}
                      label="Rating"
                    >
                      <MenuItem value="Hot">Hot</MenuItem>
                      <MenuItem value="Warm">Warm</MenuItem>
                      <MenuItem value="Cold">Cold</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* --- Section: Address --- */}
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Address
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="address.street"
                    label="Street"
                    value={formData.address?.street || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="address.city"
                    label="City"
                    value={formData.address?.city || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    name="address.state"
                    label="State"
                    value={formData.address?.state || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    name="address.postalCode"
                    label="Postal Code"
                    value={formData.address?.postalCode || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="address.country"
                    label="Country"
                    value={formData.address?.country || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="dense"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* --- Section: Assignment and Classification (admin only) --- */}
              {userRole === "admin" && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel fullWidth sx={{ minWidth: 200 }}>
                        Assigned To
                      </InputLabel>
                      <Select
                        fullWidth
                        sx={{ minWidth: 200 }}
                        name="assignedTo"
                        value={formData.assignedTo || ""}
                        onChange={handleChange}
                        label="Assigned To"
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {users.map((user) => (
                          <MenuItem key={user._id} value={user._id}>
                            {user.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Lead Owner</InputLabel>
                      <Select
                        fullWidth
                        sx={{ minWidth: 200 }}
                        name="leadOwner"
                        value={formData.leadOwner || ""}
                        onChange={handleChange}
                        label="Lead Owner"
                      >
                        <MenuItem value="">None</MenuItem>
                        {users.map((user) => (
                          <MenuItem key={user._id} value={user._id}>
                            {user.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              <Divider sx={{ my: 3 }} />

              {/* --- Section: Status/Progress --- */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="stage"
                    label="Stage"
                    value={formData.stage || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="followUpDate"
                    label="Follow Up Date"
                    type="date"
                    value={
                      formData.followUpDate
                        ? formData.followUpDate.split("T")[0]
                        : ""
                    }
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* --- Section: Additional --- */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="tags"
                    label="Tags (comma separated)"
                    value={
                      Array.isArray(formData.tags)
                        ? formData.tags.join(", ")
                        : ""
                    }
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="remarks"
                    label="Sales Remarks"
                    value={formData.remarks || ""}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="notes"
                    label="Internal Notes"
                    value={formData.notes || ""}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    minRows={2}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => setEditMode(false)}
                className="text-gray-600 hover:bg-gray-100 rounded-xl px-6 py-3"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Save Changes
              </Button>
            </DialogActions>
          </Dialog>
        ) : (
          // Main Content Layout
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-8 space-y-8">
              {activeTab === 0 && (
                <>
                  {/* Contact Information Card */}
                  <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                    <CardHeader
                      title="Contact Information"
                      className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200"
                      titleTypographyProps={{
                        variant: "h6",
                        className: "font-bold text-gray-800",
                      }}
                      avatar={
                        <Avatar className="bg-blue-100 text-blue-600">
                          <PersonIcon />
                        </Avatar>
                      }
                    />
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-4">
                          <div className="bg-blue-100 p-3 rounded-xl">
                            <EmailIcon className="text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <Typography
                              variant="subtitle2"
                              className="text-gray-500 font-medium mb-1"
                            >
                              Email Address
                            </Typography>
                            <Typography className="text-gray-900 font-medium text-lg">
                              {lead.email}
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-start space-x-4">
                          <div className="bg-green-100 p-3 rounded-xl">
                            <PhoneIcon className="text-green-600" />
                          </div>
                          <div className="flex-1">
                            <Typography
                              variant="subtitle2"
                              className="text-gray-500 font-medium mb-1"
                            >
                              Phone Number
                            </Typography>
                            <Typography className="text-gray-900 font-medium text-lg">
                              {lead.phone}
                            </Typography>
                          </div>
                        </div>

                        <div className="flex items-start space-x-4">
                          <div className="bg-purple-100 p-3 rounded-xl">
                            <BusinessIcon className="text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <Typography
                              variant="subtitle2"
                              className="text-gray-500 font-medium mb-1"
                            >
                              Company
                            </Typography>
                            <Typography className="text-gray-900 font-medium text-lg">
                              {lead.company}
                            </Typography>
                          </div>
                        </div>

                        {lead.industry && (
                          <div className="flex items-start space-x-4">
                            <div className="bg-orange-100 p-3 rounded-xl">
                              <WorkIcon className="text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <Typography
                                variant="subtitle2"
                                className="text-gray-500 font-medium mb-1"
                              >
                                Industry
                              </Typography>
                              <Typography className="text-gray-900 font-medium text-lg">
                                {lead.industry}
                              </Typography>
                            </div>
                          </div>
                        )}

                        {lead.address &&
                          (lead.address.street || lead.address.city) && (
                            <div className="flex items-start space-x-4 md:col-span-2">
                              <div className="bg-red-100 p-3 rounded-xl">
                                <LocationIcon className="text-red-600" />
                              </div>
                              <div className="flex-1">
                                <Typography
                                  variant="subtitle2"
                                  className="text-gray-500 font-medium mb-1"
                                >
                                  Address
                                </Typography>
                                <Typography className="text-gray-900 font-medium text-lg">
                                  {[
                                    lead.address.street,
                                    lead.address.city,
                                    lead.address.state &&
                                    lead.address.postalCode
                                      ? `${lead.address.state} ${lead.address.postalCode}`
                                      : lead.address.state ||
                                        lead.address.postalCode,
                                    lead.address.country,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </Typography>
                              </div>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lead Status Card */}
                  <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                    <CardHeader
                      title="Lead Status & Classification"
                      className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-200"
                      titleTypographyProps={{
                        variant: "h6",
                        className: "font-bold text-gray-800",
                      }}
                      avatar={
                        <Avatar className="bg-green-100 text-green-600">
                          <StatusIcon />
                        </Avatar>
                      }
                    />
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-blue-50 rounded-2xl">
                          <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-4">
                            <SourceIcon className="text-blue-600 text-2xl" />
                          </div>
                          <Typography
                            variant="subtitle2"
                            className="text-gray-500 font-medium mb-2"
                          >
                            Lead Source
                          </Typography>
                          <Typography className="text-gray-900 font-bold text-xl">
                            {lead.source}
                          </Typography>
                        </div>

                        <div className="text-center p-6 bg-yellow-50 rounded-2xl">
                          <div className="bg-yellow-100 p-4 rounded-full w-fit mx-auto mb-4">
                            <StarIcon className="text-yellow-600 text-2xl" />
                          </div>
                          <Typography
                            variant="subtitle2"
                            className="text-gray-500 font-medium mb-2"
                          >
                            Lead Rating
                          </Typography>
                          <Chip
                            label={lead.rating}
                            color={getRatingColor(lead.rating)}
                            size="large"
                            className="font-bold text-lg"
                            sx={{ borderRadius: "12px", fontSize: "1rem" }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Opportunities from this Lead ({opportunities.length})
                    </Typography>
                    {opportunities.length === 0 ? (
                      <Typography>
                        No opportunities yet from this lead.
                      </Typography>
                    ) : (
                      <Table size="small" aria-label="Opportunities from lead">
                        <TableHead>
                          <TableRow>
                            <TableCell>Opportunity ID</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Contact Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Expected Revenue (₹)</TableCell>
                            <TableCell>Stage</TableCell>
                            <TableCell>Expected Closure Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {opportunities.map((opp) => (
                            <TableRow
                              key={opp._id}
                              hover
                              sx={{ cursor: "pointer" }}
                              onClick={() =>
                                navigate(`/opportunity/${opp._id}/view`)
                              } // navigate on row click
                            >
                              <TableCell>
                                {opp.opportunityId || "N/A"}
                              </TableCell>
                              <TableCell>{opp.customer || "N/A"}</TableCell>
                              <TableCell>{opp.contactName || "N/A"}</TableCell>
                              <TableCell>{opp.type || "N/A"}</TableCell>
                              <TableCell>
                                {opp.expectedRevenue?.toLocaleString() || "0"}
                              </TableCell>
                              <TableCell>{opp.stage || "N/A"}</TableCell>
                              <TableCell>
                                {opp.expectedClosureDate
                                  ? new Date(
                                      opp.expectedClosureDate
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </>
              )}

              {activeTab === 1 && (
                <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                  <CardHeader
                    title="Detailed Information"
                    className="bg-gradient-to-r from-gray-50 to-indigo-50 border-b border-gray-200"
                    titleTypographyProps={{
                      variant: "h6",
                      className: "font-bold text-gray-800",
                    }}
                    avatar={
                      <Avatar className="bg-indigo-100 text-indigo-600">
                        <TimelineIcon />
                      </Avatar>
                    }
                  />
                  <CardContent className="p-8">
                    <div className="space-y-8">
                      {/* Product Interest Section */}
                      <div className="bg-blue-50 p-6 rounded-2xl">
                        <Typography
                          variant="h6"
                          className="font-bold text-gray-800 mb-4 flex items-center"
                        >
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <WorkIcon className="text-blue-600" />
                          </div>
                          Product Interest
                        </Typography>
                        {/* Alignment box for bullet list */}
                        <Box sx={{ marginLeft: "56px" }}>
                          {" "}
                          {/* 56px = icon (40px) + icon margin (16px) */}
                          {lead.productInterest &&
                          lead.productInterest.trim() !== "" ? (
                            <ul className="list-disc font-bold pl-5 m-0 text-gray-700 text-lg leading-relaxed">
                              {lead.productInterest
                                .split(",")
                                .map((product) => product.trim())
                                .filter(Boolean)
                                .map((product, idx) => (
                                  <li key={idx}>{product}</li>
                                ))}
                            </ul>
                          ) : (
                            <Typography className="text-gray-700 text-lg leading-relaxed">
                              No specific product interest mentioned
                            </Typography>
                          )}
                        </Box>
                      </div>

                      <Divider className="border-gray-200" />

                      {/* Timeline Information */}
                      <div className="bg-green-50 p-6 rounded-2xl">
                        <Typography
                          variant="h6"
                          className="font-bold text-gray-800 mb-6 flex items-center"
                        >
                          <div className="bg-green-100 p-2 rounded-lg mr-3">
                            <TimelineIcon className="text-green-600" />
                          </div>
                          Timeline & Progress
                        </Typography>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex items-start space-x-4">
                            <div className="bg-green-100 p-3 rounded-xl">
                              <TimelineIcon className="text-green-600" />
                            </div>
                            <div>
                              <Typography
                                variant="subtitle2"
                                className="text-gray-500 font-medium mb-1"
                              >
                                Current Stage
                              </Typography>
                              <Typography className="text-gray-900 font-semibold text-lg">
                                {lead.stage || "Initial Contact"}
                              </Typography>
                            </div>
                          </div>

                          <div className="flex items-start space-x-4">
                            <div className="bg-purple-100 p-3 rounded-xl">
                              <CalendarIcon className="text-purple-600" />
                            </div>
                            <div>
                              <Typography
                                variant="subtitle2"
                                className="text-gray-500 font-medium mb-1"
                              >
                                Follow-Up Date
                              </Typography>
                              <Typography className="text-gray-900 font-semibold text-lg">
                                {lead.followUpDate
                                  ? new Date(
                                      lead.followUpDate
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "No follow-up scheduled"}
                              </Typography>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Divider className="border-gray-200" />

                      {/* Assignment Information */}
                      <div className="bg-purple-50 p-6 rounded-2xl">
                        <Typography
                          variant="h6"
                          className="font-bold text-gray-800 mb-4 flex items-center"
                        >
                          <div className="bg-purple-100 p-2 rounded-lg mr-3">
                            <AssignmentIcon className="text-purple-600" />
                          </div>
                          Assignment Details
                        </Typography>
                        <div className="flex items-center space-x-4">
                          {lead.assignedTo ? (
                            <>
                              <Avatar className="bg-purple-100 text-purple-600 w-12 h-12">
                                {lead.assignedTo.username
                                  .charAt(0)
                                  .toUpperCase()}
                              </Avatar>
                              <div>
                                <Typography className="text-gray-900 font-semibold text-lg">
                                  {lead.assignedTo.username}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  className="text-gray-600"
                                >
                                  Sales Representative
                                </Typography>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center space-x-4">
                              <Avatar className="bg-gray-100 text-gray-400 w-12 h-12">
                                <AssignmentIcon />
                              </Avatar>
                              <div>
                                <Typography className="text-gray-500 text-lg">
                                  Unassigned
                                </Typography>
                                <Typography
                                  variant="body2"
                                  className="text-gray-400"
                                >
                                  No sales representative assigned
                                </Typography>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 2 && (
                <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                  <CardHeader
                    title="Activity Timeline"
                    className="bg-gradient-to-r from-gray-50 to-amber-50 border-b border-gray-200"
                    titleTypographyProps={{
                      variant: "h6",
                      className: "font-bold text-gray-800",
                    }}
                    avatar={
                      <Avatar className="bg-amber-100 text-amber-600">
                        <TimelineIcon />
                      </Avatar>
                    }
                  />
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {lead.communicationHistory?.length > 0 ? (
                        <div className="relative">
                          {/* Timeline Line */}
                          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                          {lead.communicationHistory.map((activity, index) => (
                            <div
                              key={index}
                              className="relative flex items-start space-x-6 pb-8 last:pb-0"
                            >
                              {/* Timeline Dot */}
                              <div
                                className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full ${
                                  activity.type === "Email"
                                    ? "bg-green-100"
                                    : activity.type === "Call"
                                    ? "bg-blue-100"
                                    : activity.type === "Meeting"
                                    ? "bg-purple-100"
                                    : "bg-amber-100"
                                }`}
                              >
                                {activity.type === "Email" && (
                                  <EmailIcon className="text-green-600 text-xl" />
                                )}
                                {activity.type === "Call" && (
                                  <PhoneIcon className="text-blue-600 text-xl" />
                                )}
                                {activity.type === "Meeting" && (
                                  <CalendarIcon className="text-purple-600 text-xl" />
                                )}
                                {activity.type === "Note" && (
                                  <NoteIcon className="text-amber-600 text-xl" />
                                )}
                              </div>

                              {/* Activity Content */}
                              <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <Typography className="text-gray-900 font-bold text-lg mb-1">
                                      {activity.summary}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      className="text-gray-500 flex items-center"
                                    >
                                      <span
                                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                          activity.type === "Email"
                                            ? "bg-green-500"
                                            : activity.type === "Call"
                                            ? "bg-blue-500"
                                            : activity.type === "Meeting"
                                            ? "bg-purple-500"
                                            : "bg-amber-500"
                                        }`}
                                      ></span>
                                      {activity.type} •{" "}
                                      {new Date(activity.date).toLocaleString()}
                                    </Typography>
                                  </div>
                                </div>

                                {activity.details && (
                                  <Typography
                                    variant="body1"
                                    className="text-gray-700 leading-relaxed mb-3"
                                  >
                                    {activity.details}
                                  </Typography>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                  <Typography
                                    variant="body2"
                                    className="text-gray-500"
                                  >
                                    Performed by{" "}
                                    {typeof activity.performedBy === "object"
                                      ? activity.performedBy.username
                                      : "System User"}
                                  </Typography>
                                  <Chip
                                    label={activity.type}
                                    size="small"
                                    className={
                                      activity.type === "Email"
                                        ? "bg-green-100 text-green-700"
                                        : activity.type === "Call"
                                        ? "bg-blue-100 text-blue-700"
                                        : activity.type === "Meeting"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-amber-100 text-amber-700"
                                    }
                                    sx={{ borderRadius: "8px" }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="bg-gray-100 p-8 rounded-2xl">
                            <TimelineIcon className="text-gray-400 text-6xl mb-4" />
                            <Typography
                              variant="h6"
                              className="text-gray-500 mb-2"
                            >
                              No Activity Recorded
                            </Typography>
                            <Typography
                              variant="body2"
                              className="text-gray-400"
                            >
                              Start engaging with this lead to see activity
                              history here
                            </Typography>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 3 && userRole === "admin" && (
                <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                  <CardHeader
                    title="Administration Details"
                    className="bg-gradient-to-r from-gray-50 to-red-50 border-b border-gray-200"
                    titleTypographyProps={{
                      variant: "h6",
                      className: "font-bold text-gray-800",
                    }}
                    avatar={
                      <Avatar className="bg-red-100 text-red-600">
                        <AssignmentIcon />
                      </Avatar>
                    }
                  />
                  <CardContent className="p-8">
                    <div className="space-y-8">
                      {/* Tags Section */}
                      <div className="bg-blue-50 p-6 rounded-2xl">
                        <Typography
                          variant="h6"
                          className="font-bold text-gray-800 mb-4 flex items-center"
                        >
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <LabelIcon className="text-blue-600" />
                          </div>
                          Tags & Labels
                        </Typography>
                        <div className="flex flex-wrap gap-3">
                          {lead.tags?.length > 0 ? (
                            lead.tags.map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                className="bg-white text-gray-700 shadow-sm border border-gray-200"
                                icon={<LabelIcon className="text-gray-500" />}
                                sx={{
                                  borderRadius: "12px",
                                  fontSize: "0.9rem",
                                  fontWeight: 500,
                                }}
                              />
                            ))
                          ) : (
                            <div className="text-center w-full py-4">
                              <LabelIcon className="text-gray-300 text-4xl mb-2" />
                              <Typography
                                variant="body1"
                                className="text-gray-500"
                              >
                                No tags assigned to this lead
                              </Typography>
                            </div>
                          )}
                        </div>
                      </div>

                      <Divider className="border-gray-200" />

                      {/* Notes Section */}
                      <div className="bg-green-50 p-6 rounded-2xl">
                        <Typography
                          variant="h6"
                          className="font-bold text-gray-800 mb-4 flex items-center"
                        >
                          <div className="bg-green-100 p-2 rounded-lg mr-3">
                            <NoteIcon className="text-green-600" />
                          </div>
                          Internal Notes
                        </Typography>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 min-h-24">
                          <Typography className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                            {lead.notes ||
                              "No internal notes available for this lead"}
                          </Typography>
                        </div>
                      </div>

                      <Divider className="border-gray-200" />

                      {/* Remarks Section */}
                      <div className="bg-yellow-50 p-6 rounded-2xl">
                        <Typography
                          variant="h6"
                          className="font-bold text-gray-800 mb-4 flex items-center"
                        >
                          <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                            <NoteIcon className="text-yellow-600" />
                          </div>
                          Sales Remarks
                        </Typography>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 min-h-24">
                          <Typography className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                            {lead.remarks ||
                              "No sales remarks available for this lead"}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Actions Card */}
              <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                <CardHeader
                  title="Quick Actions"
                  className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200"
                  titleTypographyProps={{
                    variant: "h6",
                    className: "font-bold text-gray-800",
                  }}
                  avatar={
                    <Avatar className="bg-blue-100 text-blue-600">
                      <CalendarIcon />
                    </Avatar>
                  }
                />
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-4">
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<EmailIcon />}
                      onClick={() => handleActionOpen("Email")}
                      className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 rounded-xl py-4 justify-start"
                      sx={{
                        textTransform: "none",
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      Send Email
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<PhoneIcon />}
                      onClick={() => handleActionOpen("Call")}
                      className="border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 rounded-xl py-4 justify-start"
                      sx={{
                        textTransform: "none",
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      Make Call
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<CalendarIcon />}
                      onClick={() => handleActionOpen("Meeting")}
                      className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 rounded-xl py-4 justify-start"
                      sx={{
                        textTransform: "none",
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      Schedule Meeting
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<NoteIcon />}
                      onClick={() => handleActionOpen("Note")}
                      className="border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 rounded-xl py-4 justify-start"
                      sx={{
                        textTransform: "none",
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Card */}
              <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                <CardHeader
                  title="Assignment"
                  className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200"
                  titleTypographyProps={{
                    variant: "h6",
                    className: "font-bold text-gray-800",
                  }}
                  avatar={
                    <Avatar className="bg-purple-100 text-purple-600">
                      <AssignmentIcon />
                    </Avatar>
                  }
                />
                <CardContent className="p-6">
                  {lead.assignedTo ? (
                    <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl">
                      <Avatar className="bg-purple-600 text-white w-14 h-14 text-xl font-bold">
                        {lead.assignedTo.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="flex-1">
                        <Typography className="font-bold text-gray-900 text-lg">
                          {lead.assignedTo.username}
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          Sales Representative
                        </Typography>
                        <Typography
                          variant="body2"
                          className="text-purple-600 font-medium mt-1"
                        >
                          Active Assignment
                        </Typography>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-xl">
                      <Avatar className="bg-gray-200 text-gray-500 w-16 h-16 mx-auto mb-3">
                        <AssignmentIcon className="text-2xl" />
                      </Avatar>
                      <Typography
                        variant="body1"
                        className="text-gray-600 font-medium"
                      >
                        Unassigned Lead
                      </Typography>
                      <Typography
                        variant="body2"
                        className="text-gray-500 mt-1"
                      >
                        No sales representative assigned
                      </Typography>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity Summary */}
              <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
                <CardHeader
                  title="Recent Activity"
                  className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-200"
                  titleTypographyProps={{
                    variant: "h6",
                    className: "font-bold text-gray-800",
                  }}
                  avatar={
                    <Avatar className="bg-green-100 text-green-600">
                      <TimelineIcon />
                    </Avatar>
                  }
                />
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {lead.communicationHistory?.length > 0 ? (
                      lead.communicationHistory
                        .slice(0, 3)
                        .map((activity, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl"
                          >
                            <div
                              className={`p-2 rounded-lg ${
                                activity.type === "Email"
                                  ? "bg-green-100"
                                  : activity.type === "Call"
                                  ? "bg-blue-100"
                                  : activity.type === "Meeting"
                                  ? "bg-purple-100"
                                  : "bg-amber-100"
                              }`}
                            >
                              {activity.type === "Email" && (
                                <EmailIcon
                                  className={`text-green-600 text-lg`}
                                />
                              )}
                              {activity.type === "Call" && (
                                <PhoneIcon
                                  className={`text-blue-600 text-lg`}
                                />
                              )}
                              {activity.type === "Meeting" && (
                                <CalendarIcon
                                  className={`text-purple-600 text-lg`}
                                />
                              )}
                              {activity.type === "Note" && (
                                <NoteIcon
                                  className={`text-amber-600 text-lg`}
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <Typography className="text-gray-900 font-semibold text-sm">
                                {activity.summary}
                              </Typography>
                              <Typography
                                variant="body2"
                                className="text-gray-500 mt-1"
                              >
                                {new Date(activity.date).toLocaleDateString()} •{" "}
                                {activity.type}
                              </Typography>
                              {activity.details && (
                                <Typography
                                  variant="body2"
                                  className="text-gray-600 mt-2 line-clamp-2"
                                >
                                  {activity.details}
                                </Typography>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8">
                        <TimelineIcon className="text-gray-300 text-4xl mb-3" />
                        <Typography variant="body1" className="text-gray-500">
                          No recent activity
                        </Typography>
                        <Typography
                          variant="body2"
                          className="text-gray-400 mt-1"
                        >
                          Activity will appear here
                        </Typography>
                      </div>
                    )}
                  </div>

                  {lead.communicationHistory?.length > 3 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <Button
                        fullWidth
                        onClick={() => setActiveTab(2)}
                        className="text-blue-600 hover:bg-blue-50 rounded-lg"
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        View All Activity ({lead.communicationHistory.length})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Box>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "16px" },
        }}
      >
        <DialogTitle className="text-center pt-8">
          <Avatar className="bg-red-100 text-red-600 w-16 h-16 mx-auto mb-4">
            <DeleteIcon className="text-2xl" />
          </Avatar>
          <Typography variant="h5" className="font-bold text-gray-900">
            Confirm Deletion
          </Typography>
        </DialogTitle>
        <DialogContent className="text-center pb-4">
          <Typography className="text-gray-600 text-lg">
            Are you sure you want to delete <strong>{lead.fullName}</strong>?
          </Typography>
          <Typography variant="body2" className="text-gray-500 mt-2">
            This action cannot be undone and will permanently remove all
            associated data.
          </Typography>
        </DialogContent>
        <DialogActions className="p-6 pt-2">
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            className="text-gray-600 hover:bg-gray-100 rounded-xl px-6 py-3 flex-1"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            className="bg-red-600 hover:bg-red-700 rounded-xl px-6 py-3 flex-1 ml-3"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Delete Lead
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={handleActionClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "16px" },
        }}
      >
        <DialogTitle className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center space-x-3">
            <Avatar className="bg-white text-blue-600">
              {actionDialog.type === "Email" && <EmailIcon />}
              {actionDialog.type === "Call" && <PhoneIcon />}
              {actionDialog.type === "Meeting" && <CalendarIcon />}
              {actionDialog.type === "Note" && <NoteIcon />}
            </Avatar>
            <div>
              <Typography variant="h6" className="font-bold text-white">
                {actionDialog.type === "Email" && "Log Email Communication"}
                {actionDialog.type === "Call" && "Log Phone Call"}
                {actionDialog.type === "Meeting" && "Schedule Meeting"}
                {actionDialog.type === "Note" && "Add Internal Note"}
              </Typography>
              <Typography variant="body2" className="text-blue-100">
                Record interaction with {lead.fullName}
              </Typography>
            </div>
          </div>
        </DialogTitle>
        <DialogContent className="p-8 bg-gray-50">
          <div className="space-y-6">
            <TextField
              fullWidth
              label="Summary"
              placeholder="Brief description of the interaction"
              value={actionDialog.summary}
              onChange={(e) =>
                setActionDialog({ ...actionDialog, summary: e.target.value })
              }
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  backgroundColor: "white",
                },
              }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Details"
              placeholder="Provide detailed information about this interaction"
              value={actionDialog.details}
              onChange={(e) =>
                setActionDialog({ ...actionDialog, details: e.target.value })
              }
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  backgroundColor: "white",
                },
              }}
            />
          </div>
        </DialogContent>
        <DialogActions className="bg-white border-t border-gray-200 p-6">
          <Button
            onClick={handleActionClose}
            className="text-gray-600 hover:bg-gray-100 rounded-xl px-6 py-3"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleActionSubmit}
            variant="contained"
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl px-8 py-3 shadow-lg ml-3"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Save Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LeadDetails;
