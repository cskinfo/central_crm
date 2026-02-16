import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Stack,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { toast } from "react-toastify";
import { AddCircleOutline, Delete, Save } from "@mui/icons-material";

const GST_OPTIONS = [0, 5, 12, 18, 28];
const VALIDITY_PRESETS = [3, 7, 10, 12, 15];

const QuotationForm = ({ dealId, onQuotationRequested, existingQuotation }) => {
  const [items, setItems] = useState([
    {
      productName: "",
      description: "",
      qty: 1,
      unitPrice: 0,
      gstRate: 0,
    },
  ]);

  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(null);
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- NEW: Populate form if editing ---
  useEffect(() => {
    if (existingQuotation) {
      // Map existing items
      const loadedItems = (existingQuotation.items || []).map((it) => ({
        productName: it.productName || "",
        description: it.description || "",
        qty: it.qty || 1,
        unitPrice: it.unitPrice || 0,
        gstRate: it.gstRate || 0,
      }));

      if (loadedItems.length > 0) setItems(loadedItems);

      // Map other fields
      if (existingQuotation.validUntil) {
        setRequiredDeliveryDate(new Date(existingQuotation.validUntil));
      }
      if (existingQuotation.remarksForAdmin) {
        setSpecialRequirements(existingQuotation.remarksForAdmin);
      }
    }
  }, [existingQuotation]);
  // -------------------------------------

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === "qty" || field === "unitPrice" || field === "gstRate") {
      newItems[index][field] = value === "" ? "" : Number(value);
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addRow = () => {
    setItems([
      ...items,
      { productName: "", description: "", qty: 1, unitPrice: 0, gstRate: 0 },
    ]);
  };

  const removeRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // --- NEW: Handle Preset Date Selection ---
  const handlePresetDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setRequiredDeliveryDate(date);
  };

  const isPresetSelected = (days) => {
    if (!requiredDeliveryDate) return false;
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + days);
    return testDate.toDateString() === requiredDeliveryDate.toDateString();
  };
  // ----------------------------------------

  const validateItems = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    return arr.some(
      (it) =>
        (it.productName && it.productName.trim()) ||
        (it.description && it.description.trim())
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateItems(items)) {
      setError("Please add at least one product with a name or description.");
      return;
    }

    const payload = {
      dealId,
      items: items.map((it) => ({
        productName: (it.productName || "").trim(),
        description: (it.description || "").trim(),
        qty: Number(it.qty || 1),
        unitPrice: Number(it.unitPrice || 0),
        gstRate: Number(it.gstRate || 0),
      })),
      validUntil: requiredDeliveryDate
        ? requiredDeliveryDate.toISOString()
        : null,
      specialRequirements,
    };

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (existingQuotation) {
        // --- UPDATE LOGIC ---
        await axios.put(`/api/quotations/${existingQuotation._id}`, payload, {
          headers,
        });
        toast.success("Quotation request updated successfully");
      } else {
        // --- CREATE LOGIC ---
        await axios.post("/api/quotations/request", payload, { headers });
        toast.success("Quotation requested successfully");
      }

      onQuotationRequested && onQuotationRequested();
    } catch (err) {
      console.error("Quotation submit error:", err);
      setError(err.response?.data?.message || "Failed to submit quotation.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num) =>
    Number.isFinite(Number(num)) ? Number(num).toLocaleString("en-IN") : "0";

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Helper text to show mode */}
        <Typography
          variant="subtitle2"
          color="primary"
          sx={{ mb: 2, fontWeight: "bold" }}
        >
          {existingQuotation
            ? "Editing Pending Request"
            : "New Quotation Request"}
        </Typography>

        <Typography variant="h6" gutterBottom>
          Products / Items
        </Typography>

        {items.map((item, idx) => {
          const baseAmount =
            Number(item.qty || 0) * Number(item.unitPrice || 0);
          const gstAmount = (baseAmount * Number(item.gstRate || 0)) / 100;
          const total = baseAmount + gstAmount;

          return (
            <Grid
              container
              spacing={2}
              key={idx}
              sx={{
                mb: 2,
                p: 2,
                border: "1px solid #eee",
                borderRadius: 1,
                alignItems: "center",
                bgcolor: "#fafafa",
              }}
            >
              <Grid item xs={12}>
                <Typography variant="subtitle2">Item {idx + 1}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Product Name"
                  fullWidth
                  size="small"
                  value={item.productName}
                  onChange={(e) =>
                    handleItemChange(idx, "productName", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Description"
                  fullWidth
                  size="small"
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(idx, "description", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  label="Qty"
                  type="number"
                  size="small"
                  inputProps={{ min: 1 }}
                  fullWidth
                  value={item.qty}
                  onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Target Price (₹)"
                  type="number"
                  size="small"
                  inputProps={{ min: 0 }}
                  fullWidth
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleItemChange(idx, "unitPrice", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id={`gst-label-${idx}`}>GST (%)</InputLabel>
                  <Select
                    labelId={`gst-label-${idx}`}
                    value={item.gstRate}
                    label="GST (%)"
                    onChange={(e) =>
                      handleItemChange(idx, "gstRate", e.target.value)
                    }
                  >
                    {GST_OPTIONS.map((g) => (
                      <MenuItem key={g} value={g}>
                        {g}%
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid
                item
                xs={12}
                sm={3}
                sx={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Amt: ₹{formatCurrency(total)}
                </Typography>
              </Grid>
              <Grid item xs={12} sx={{ textAlign: "right" }}>
                {items.length > 1 && (
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => removeRow(idx)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          );
        })}

        <Button
          startIcon={<AddCircleOutline />}
          onClick={addRow}
          size="small"
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Add Item
        </Button>

        <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
          Other Details
        </Typography>
        <Grid container spacing={2}>
          {/* --- NEW: Date Selection UI --- */}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Validity Period (Select Days)
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1 }}
            >
              {VALIDITY_PRESETS.map((d) => (
                <Chip
                  key={d}
                  label={`${d} Days`}
                  onClick={() => handlePresetDate(d)}
                  size="small"
                  color="primary"
                  variant={isPresetSelected(d) ? "filled" : "outlined"}
                  clickable
                />
              ))}
            </Stack>
            <DatePicker
              label="Selected / Custom Date"
              value={requiredDeliveryDate}
              onChange={(v) => setRequiredDeliveryDate(v)}
              renderInput={(params) => (
                <TextField {...params} fullWidth size="small" />
              )}
            />
          </Grid>
          {/* ----------------------------- */}

          <Grid item xs={12}>
            <TextField
              label="Special Requirements / Notes for Admin"
              fullWidth
              multiline
              rows={2}
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {loading
              ? "Processing..."
              : existingQuotation
              ? "Update Request"
              : "Submit Request"}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default QuotationForm;
