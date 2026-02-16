import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  InputAdornment,
  Fade,
  useTheme,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Save,
  ArrowBack,
  Delete,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import axios from "axios";

function OpportunityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isEditMode = id !== "new" && id !== undefined;
  const params = new URLSearchParams(location.search);
  const fromLeadId = params.get("fromLead");
  const user = JSON.parse(localStorage.getItem("user"));

  // Main opportunity form state
  const [formData, setFormData] = useState({
    customer: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    type: "Product",
    detailedDescription: "",
    assignedTo: user.role === "admin" ? "" : user.id,
    oem: "",
    expectedRevenue: "",
    expectedMargin: "",
    stage: "New",
    currentStatus: "",
    closureMonth: "",
    remark: "",
    expectedClosureDate: null,
    probability: 0,
    // address will be set when creating from a lead (no UI fields)
    address: null,
  });

  // State for the comprehensive new lead creation dialog
  const [newLeadFormData, setNewLeadFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    industry: "",
    source: "Website",
    productInterest: "",
    rating: "Warm",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
    tags: [],
    followUpDate: "",
    remarks: "",
    stage: "Initial Contact",
    assignedTo: user.role === "admin" ? "" : user.id,
    notes: "",
  });

  // General component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [salespersons, setSalespersons] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dialog-specific state
  const [createLeadDialogOpen, setCreateLeadDialogOpen] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [leadCreationError, setLeadCreationError] = useState("");

  useEffect(() => {
    const fetchPrerequisites = async () => {
      if (user.role === "admin") {
        try {
          const res = await axios.get("/api/users", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          setSalespersons(res.data.filter((u) => u.role === "salesperson"));
        } catch (err) {
          console.error("Failed to fetch salespersons", err);
        }
      }
      try {
        setLeadsLoading(true);
        const { data } = await axios.get("/api/leads", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setLeads(data);
      } catch (err) {
        console.error("Failed to fetch leads", err);
      } finally {
        setLeadsLoading(false);
      }
    };
    fetchPrerequisites();
  }, [user.role]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (isEditMode) {
        setLoading(true);
        try {
          const { data } = await axios.get(`/api/deals/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          setFormData({
            customer: data.customer || "",
            contactName: data.contactName || "",
            contactEmail: data.contactEmail || "",
            contactPhone: data.contactPhone || "",
            type: data.type || "Product",
            detailedDescription: data.detailedDescription || "",
            oem: data.oem || "",
            expectedRevenue: data.expectedRevenue || "",
            expectedMargin: data.expectedMargin || "",
            stage: data.stage || "New",
            currentStatus: data.currentStatus || "",
            closureMonth: data.closureMonth || "",
            remark: data.remark || "",
            assignedTo:
              data.assignedTo?._id || (user.role === "admin" ? "" : user.id),
            expectedClosureDate: data.expectedClosureDate
              ? new Date(data.expectedClosureDate)
              : null,
            probability: data.probability || 0,
            address: data.address || null, // <-- preserve existing address when editing
          });
        } catch (err) {
          setError("Failed to load opportunity data.");
        } finally {
          setLoading(false);
        }
      } else if (fromLeadId) {
        setLoading(true);
        try {
          const { data: lead } = await axios.get(`/api/leads/${fromLeadId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          // Normalize and copy lead.address into opportunity formData (no UI)
          const leadAddress = lead?.address
            ? {
                street: lead.address.street || "",
                city: lead.address.city || "",
                state: lead.address.state || "",
                postalCode:
                  lead.address.postalCode || lead.address.postal || "",
                country: lead.address.country || "",
              }
            : null;

          setFormData((prev) => ({
            ...prev,
            customer: lead.company || "",
            contactName: lead.fullName || "",
            contactEmail: lead.email || "",
            contactPhone: lead.phone || "",
            address: leadAddress, // <-- COPY ADDRESS FROM LEAD
          }));
        } catch (err) {
          setError("Failed to load lead data.");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchInitialData();
  }, [id, isEditMode, fromLeadId, user.id, user.role]);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value),
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, expectedClosureDate: date }));
  };

  const handleNewLeadChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setNewLeadFormData((prev) => ({
        ...prev,
        [parent]: { ...(prev[parent] || {}), [child]: value },
      }));
    } else if (name === "tags") {
      setNewLeadFormData((prev) => ({
        ...prev,
        tags: value.split(",").map((tag) => tag.trim()),
      }));
    } else {
      setNewLeadFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomerChange = (event, value) => {
    if (!value) {
      setFormData((prev) => ({
        ...prev,
        customer: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        address: null,
      }));
      return;
    }
    if (typeof value === "string") {
      setFormData((prev) => ({ ...prev, customer: value }));
      return;
    }
    if (value.isNew) {
      setNewLeadFormData((prev) => ({ ...prev, company: value.company }));
      setCreateLeadDialogOpen(true);
    } else {
      const selectedLead = leads.find((lead) => lead._id === value.id);
      if (selectedLead) {
        const leadAddress = selectedLead?.address
          ? {
              street: selectedLead.address.street || "",
              city: selectedLead.address.city || "",
              state: selectedLead.address.state || "",
              postalCode:
                selectedLead.address.postalCode ||
                selectedLead.address.postal ||
                "",
              country: selectedLead.address.country || "",
            }
          : null;

        setFormData((prev) => ({
          ...prev,
          customer: selectedLead.company,
          contactName: selectedLead.fullName,
          contactEmail: selectedLead.email,
          contactPhone: selectedLead.phone,
          address: leadAddress, // <-- COPY ADDRESS WHEN SELECTING LEAD
        }));
      }
    }
  };

  const handleCreateLeadSubmit = async () => {
    const { fullName, email, phone, company } = newLeadFormData;
    if (!fullName || !email || !phone || !company) {
      setLeadCreationError(
        "Please fill all required basic information fields."
      );
      return;
    }
    setCreatingLead(true);
    setLeadCreationError("");
    try {
      const payload = { ...newLeadFormData, createdBy: user.id };
      const { data: createdLead } = await axios.post("/api/leads", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setLeads((prev) => [createdLead, ...prev]);
      const leadAddress = createdLead?.address
        ? {
            street: createdLead.address.street || "",
            city: createdLead.address.city || "",
            state: createdLead.address.state || "",
            postalCode:
              createdLead.address.postalCode ||
              createdLead.address.postal ||
              "",
            country: createdLead.address.country || "",
          }
        : null;

      setFormData((prev) => ({
        ...prev,
        customer: createdLead.company,
        contactName: createdLead.fullName,
        contactEmail: createdLead.email,
        contactPhone: createdLead.phone,
        address: leadAddress, // <-- COPY ADDRESS AFTER CREATING NEW LEAD
      }));
      setCreateLeadDialogOpen(false);
      setNewLeadFormData({
        fullName: "",
        email: "",
        phone: "",
        company: "",
        industry: "",
        source: "Website",
        productInterest: "",
        rating: "Warm",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        tags: [],
        followUpDate: "",
        remarks: "",
        stage: "Initial Contact",
        assignedTo: user.role === "admin" ? "" : user.id,
        notes: "",
      });
    } catch (err) {
      setLeadCreationError(
        err.response?.data?.error || "Failed to create lead."
      );
    } finally {
      setCreatingLead(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = isEditMode
        ? await axios.put(`/api/deals/${id}`, formData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
        : await axios.post("/api/deals", formData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
      toast.success(
        isEditMode
          ? "Opportunity updated successfully!"
          : "Opportunity created successfully!"
      );
      navigate(`/opportunity/${data._id}/view`);
    } catch (error) {
      setError(error.response?.data?.error || "An unexpected error occurred.");
      toast.error(error.response?.data?.error || "Failed to save opportunity.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/deals/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Opportunity deleted successfully!");
      setDeleteDialogOpen(false);
      navigate(
        user.role === "admin" ? "/admin/opportunities" : "/sales/opportunities",
        { replace: true }
      );
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed");
      toast.error(err.response?.data?.error || "Failed to delete opportunity.");
      setDeleteLoading(false);
    }
  };

  const leadOptions = leads.map((l) => ({
    label: `${l.company} (${l.fullName})`,
    id: l._id,
    company: l.company,
  }));

  return (
    <Container>
      <Box py={2}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h4" mt={2}>
            {isEditMode ? "Edit Opportunity" : "New Opportunity"}
          </Typography>
          <Button
            onClick={() => navigate(-1)}
            color="inherit"
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
        </Box>
        {isEditMode && (
          <Button
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
            startIcon={<Delete />}
          >
            Delete
          </Button>
        )}
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          autoComplete="off"
          sx={{ mt: 3 }}
        >
          <Grid container spacing={3}>
            {/* Customer and Contact Info */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                sx={{ minWidth: 200 }}
                freeSolo
                value={formData.customer}
                options={leadOptions}
                getOptionLabel={(option) => option.label || option}
                onInputChange={(e, newInputValue) =>
                  setFormData((prev) => ({ ...prev, customer: newInputValue }))
                }
                onChange={handleCustomerChange}
                renderInput={(params) => (
                  <TextField {...params} label="Customer *" required />
                )}
                filterOptions={(options, params) => {
                  const filtered = options.filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes(params.inputValue.toLowerCase())
                  );
                  const isExisting = options.some(
                    (option) =>
                      option.company.toLowerCase() ===
                      params.inputValue.toLowerCase()
                  );
                  if (params.inputValue !== "" && !isExisting) {
                    filtered.unshift({
                      label: `+ Create new: "${params.inputValue}"`,
                      id: `new-${params.inputValue}`,
                      company: params.inputValue,
                      isNew: true,
                    });
                  }
                  return filtered;
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Name *"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Email"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Phone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            {/* Opportunity Details */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label="Type"
                  onChange={handleChange}
                >
                  <MenuItem value="Product">Product</MenuItem>
                  <MenuItem value="Services">Services</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="OEM"
                name="oem"
                value={formData.oem}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Detailed Description"
                name="detailedDescription"
                value={formData.detailedDescription}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>

            {/* Financials */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expected Revenue (₹) *"
                name="expectedRevenue"
                type="number"
                value={formData.expectedRevenue}
                onChange={handleNumberChange}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expected Margin"
                name="expectedMargin"
                type="number"
                value={formData.expectedMargin}
                onChange={handleNumberChange}
                fullWidth
              />
            </Grid>

            {/* Status & Timeline */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Stage</InputLabel>
                <Select
                  name="stage"
                  value={formData.stage}
                  label="Stage"
                  onChange={handleChange}
                >
                  {["New", "Qualified", "Proposition", "Won", "Lost"].map(
                    (s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Current Status"
                name="currentStatus"
                value={formData.currentStatus}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Expected Closure Date *"
                  value={formData.expectedClosureDate}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} required fullWidth />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ minWidth: 200 }}>
                <InputLabel>Closure Month</InputLabel>
                <Select
                  name="closureMonth"
                  value={formData.closureMonth}
                  label="Closure Month"
                  onChange={handleChange}
                >
                  {months.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Probability (%)"
                name="probability"
                type="number"
                value={formData.probability}
                onChange={handleNumberChange}
                fullWidth
              />
            </Grid>
            {user.role === "admin" && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ minWidth: 200 }}>
                  <InputLabel>Assigned To</InputLabel>
                  <Select
                    label="Assigned To"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {salespersons.map((sp) => (
                      <MenuItem key={sp._id} value={sp._id}>
                        {sp.firstName || sp.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Remark"
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>

            {/* show address info if present (read-only) */}
            {formData.address && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Address copied from Lead:{" "}
                  {[
                    formData.address.street,
                    formData.address.city,
                    formData.address.state,
                    formData.address.postalCode,
                    formData.address.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Box display="flex" alignItems="center" gap={2} mt={4}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            >
              {isEditMode ? "Save Changes" : "Create Opportunity"}
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="outlined"
              color="inherit"
              disabled={loading}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Box>

      {/* FULL Create Lead Dialog */}
      <Dialog
        open={createLeadDialogOpen}
        onClose={() => setCreateLeadDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{ sx: { borderRadius: 3, p: 2, background: "#f8fafc" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Lead</DialogTitle>
        <DialogContent dividers sx={{ background: "#fff", borderRadius: 2 }}>
          {leadCreationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {leadCreationError}
            </Alert>
          )}
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Basic Information
              </Typography>
              <Divider />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="company"
                label="Company Name"
                fullWidth
                value={newLeadFormData.company}
                onChange={handleNewLeadChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="fullName"
                label="Full Name"
                fullWidth
                value={newLeadFormData.fullName}
                onChange={handleNewLeadChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="email"
                label="Email"
                fullWidth
                type="email"
                value={newLeadFormData.email}
                onChange={handleNewLeadChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="phone"
                label="Phone"
                fullWidth
                value={newLeadFormData.phone}
                onChange={handleNewLeadChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="industry"
                label="Industry"
                fullWidth
                value={newLeadFormData.industry}
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="productInterest"
                label="Product Interest"
                fullWidth
                value={newLeadFormData.productInterest}
                onChange={handleNewLeadChange}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Status & Classification
              </Typography>
              <Divider />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  name="source"
                  value={newLeadFormData.source}
                  label="Source"
                  onChange={handleNewLeadChange}
                >
                  <MenuItem value="Website">Website</MenuItem>
                  <MenuItem value="Referral">Referral</MenuItem>
                  <MenuItem value="Campaign">Campaign</MenuItem>
                  <MenuItem value="Cold Call">Cold Call</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Rating</InputLabel>
                <Select
                  name="rating"
                  value={newLeadFormData.rating}
                  label="Rating"
                  onChange={handleNewLeadChange}
                >
                  <MenuItem value="Hot">Hot</MenuItem>
                  <MenuItem value="Warm">Warm</MenuItem>
                  <MenuItem value="Cold">Cold</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {user.role === "admin" && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Assigned To</InputLabel>
                  <Select
                    name="assignedTo"
                    value={newLeadFormData.assignedTo}
                    label="Assigned To"
                    onChange={handleNewLeadChange}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {salespersons.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Address Information
              </Typography>
              <Divider />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                name="address.street"
                label="Street"
                fullWidth
                value={newLeadFormData.address.street}
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="address.city"
                label="City"
                fullWidth
                value={newLeadFormData.address.city}
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="address.state"
                label="State"
                fullWidth
                value={newLeadFormData.address.state}
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="address.postalCode"
                label="Postal Code"
                fullWidth
                value={newLeadFormData.address.postalCode}
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                name="address.country"
                label="Country"
                fullWidth
                value={newLeadFormData.address.country}
                onChange={handleNewLeadChange}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Additional Details
              </Typography>
              <Divider />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="tags"
                label="Tags (comma separated)"
                fullWidth
                value={
                  Array.isArray(newLeadFormData.tags)
                    ? newLeadFormData.tags.join(", ")
                    : ""
                }
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="followUpDate"
                label="Follow Up Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newLeadFormData.followUpDate}
                onChange={handleNewLeadChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes / Remarks"
                fullWidth
                multiline
                minRows={3}
                value={newLeadFormData.notes}
                onChange={handleNewLeadChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCreateLeadDialogOpen(false)}
            disabled={creatingLead}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateLeadSubmit}
            disabled={creatingLead}
          >
            {creatingLead ? <CircularProgress size={24} /> : "Create Lead"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this opportunity?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default OpportunityFormPage;
