import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from "@mui/material";
import { Add, Edit, Delete, ArrowBack } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 3,
  borderRadius: 2,
  maxHeight: "90vh",
  overflowY: "auto",
};

function DealFormModal({ open, handleClose, deal, handleSubmit, handleDelete }) {
  const [formData, setFormData] = useState({
    customer: "",
    contactName: "",
    accountManager: "",
    type: "Product",
    detailedDescription: "",
    oem: "",
    expectedRevenue: "",
    expectedMargin: "",
    stage: "New",
    currentStatus: "",
    closureMonth: "",
    remark: "",
    expectedClosureDate: null,
    probability: 0,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (deal) {
      setFormData({
        customer: deal.customer || "",
        contactName: deal.contactName || "",
        accountManager: deal.accountManager || "",
        type: deal.type || "Product",
        detailedDescription: deal.detailedDescription || "",
        oem: deal.oem || "",
        expectedRevenue: deal.expectedRevenue || "",
        expectedMargin: deal.expectedMargin || "",
        stage: deal.stage || "New",
        currentStatus: deal.currentStatus || "",
        closureMonth: deal.closureMonth || "",
        remark: deal.remark || "",
        expectedClosureDate: deal.expectedClosureDate
          ? new Date(deal.expectedClosureDate)
          : null,
        probability: deal.probability || 0,
      });
    } else {
      // Reset form when creating new deal
      setFormData({
        customer: "",
        contactName: "",
        accountManager: "",
        type: "Product",
        detailedDescription: "",
        oem: "",
        expectedRevenue: "",
        expectedMargin: "",
        stage: "New",
        currentStatus: "",
        closureMonth: "",
        remark: "",
        expectedClosureDate: null,
        probability: 0,
      });
    }
  }, [deal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, expectedClosureDate: date });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.customer ||
      !formData.contactName ||
      !formData.expectedRevenue ||
      !formData.type ||
      !formData.expectedClosureDate
    ) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const formattedData = {
        ...formData,
        expectedClosureDate: formData.expectedClosureDate.toISOString(),
        salespersonId: user.id,
      };

      await handleSubmit(formattedData);
      handleClose();
    } catch (error) {
      console.error("Error saving deal:", error);
      setError("Failed to save opportunity");
    } finally {
      setLoading(false);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <IconButton onClick={handleClose} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" gutterBottom>
            {deal ? "Edit Opportunity" : "Add New Opportunity"}
          </Typography>
        </Box>
        <Divider sx={{ my: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box component="form" onSubmit={handleFormSubmit}>
            <Grid container spacing={2}>
              {deal?.opportunityId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1">
                    Opportunity ID: {deal.opportunityId}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type *</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    label="Type *"
                  >
                    <MenuItem value="Product">Product</MenuItem>
                    <MenuItem value="Services">Services</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer *"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Name *"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Account Manager"
                  name="accountManager"
                  value={formData.accountManager}
                  onChange={handleChange}
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Detailed Description"
                  name="detailedDescription"
                  value={formData.detailedDescription}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="OEM"
                  name="oem"
                  value={formData.oem}
                  onChange={handleChange}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Revenue (in Lacs) *"
                  name="expectedRevenue"
                  type="number"
                  value={formData.expectedRevenue}
                  onChange={handleChange}
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Margin"
                  name="expectedMargin"
                  type="number"
                  value={formData.expectedMargin}
                  onChange={handleChange}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stage</InputLabel>
                  <Select
                    name="stage"
                    value={formData.stage}
                    onChange={handleChange}
                    label="Stage"
                  >
                    <MenuItem value="New">New</MenuItem>
                    <MenuItem value="Qualified">Qualified</MenuItem>
                    <MenuItem value="Proposition">Proposition</MenuItem>
                    <MenuItem value="Won">Won</MenuItem>
                    <MenuItem value="Lost">Lost</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Status"
                  name="currentStatus"
                  value={formData.currentStatus}
                  onChange={handleChange}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Closure Month</InputLabel>
                  <Select
                    name="closureMonth"
                    value={formData.closureMonth}
                    onChange={handleChange}
                    label="Closure Month"
                  >
                    {months.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remark"
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Expected Closure Date *"
                  value={formData.expectedClosureDate}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" required />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Probability (%)"
                  name="probability"
                  type="number"
                  inputProps={{ min: 0, max: 100 }}
                  value={formData.probability}
                  onChange={handleChange}
                  size="small"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
              <Box>
                {deal && (
                  <Button
                    onClick={() => handleDelete(deal._id)}
                    color="error"
                    startIcon={<Delete />}
                    variant="outlined"
                    disabled={loading}
                  >
                    Delete
                  </Button>
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button 
                  onClick={handleClose} 
                  variant="outlined"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={deal ? <Edit /> : <Add />}
                  disabled={loading}
                >
                  {deal ? "Update" : "Add"}
                </Button>
              </Box>
            </Box>
          </Box>
        </LocalizationProvider>
      </Box>
    </Modal>
  );
}

export default DealFormModal;