import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Stack,
  Alert,
} from "@mui/material";
import { Add, Delete, Check, Close, Download, Visibility } from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

// GST slabs
const GST_SLABS = [0, 5, 12, 18, 28];

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function QuotationApprovalPage() {
  // Listing state
  const [quotations, setQuotations] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Approve dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [freightCharges, setFreightCharges] = useState(0);
  const [freightGstRate, setFreightGstRate] = useState(0);
  const [remarksForSalesperson, setRemarksForSalesperson] = useState("");
  const [internalRemarks, setInternalRemarks] = useState("");
  const [validUntil, setValidUntil] = useState(null);
  const [submittingApprove, setSubmittingApprove] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [installationCharges, setInstallationCharges] = useState(0);
  const [installationGstRate, setInstallationGstRate] = useState(0);

  // Error / info
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadQuotations();
  }, [statusFilter]);

  async function loadQuotations() {
    setLoadingList(true);
    setErrorMsg("");
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(
        `/api/quotations?status=${statusFilter === "All" ? "" : statusFilter}`,
        { headers }
      );
      setQuotations(res.data || []);
    } catch (err) {
      console.error("Failed to load quotations:", err);
      setErrorMsg("Failed to load quotations. Check server logs.");
    } finally {
      setLoadingList(false);
    }
  }

  // Filter Logic for Table and Export
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const opportunityId = (q.deal?.opportunityId || "").toLowerCase();
      const customer = (q.deal?.customer || q.recipientName || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = opportunityId.includes(search) || customer.includes(search);

      const createdAt = new Date(q.createdAt);
      const matchesStart = !startDate || createdAt >= new Date(startDate.setHours(0, 0, 0, 0));
      const matchesEnd = !endDate || createdAt <= new Date(endDate.setHours(23, 59, 59, 999));

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [quotations, searchTerm, startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredQuotations.length === 0) {
      toast.warn("No data available to export with current filters.");
      return;
    }

    const exportData = filteredQuotations.map((q) => ({
      "Opportunity ID": q.deal?.opportunityId || "-",
      Customer: q.deal?.customer || q.recipientName || "-",
      "Requested By": q.requestedBy?.username || q.requestedBy?.firstName || "-",
      Status: q.status,
      Amount: q.amount || 0,
      "Valid Until": q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-",
      "Created At": new Date(q.createdAt).toLocaleDateString(),
      Products: (Array.isArray(q.items) ? q.items : [])
        .map((it) => `${it.productName} (Qty: ${it.qty})`)
        .join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");
    XLSX.writeFile(workbook, `Quotations_${statusFilter}_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const openApproveDialog = (quotation) => {
    setSelectedQuotation(quotation);
    const raw =
      quotation.items && quotation.items.length
        ? quotation.items
        : quotation.products && Array.isArray(quotation.products)
        ? quotation.products
        : [];

    const normalized = (Array.isArray(raw) ? raw : [raw]).map((it) => {
      const dbUnitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const dbTargetPrice = Number(it.targetPrice ?? 0);
      let uiTargetPrice = 0;
      let uiVendorPrice = 0;

      if (quotation.status === "Pending") {
        uiTargetPrice = dbTargetPrice > 0 ? dbTargetPrice : dbUnitPrice;
        uiVendorPrice = 0;
      } else {
        uiTargetPrice = dbTargetPrice;
        uiVendorPrice = dbUnitPrice;
      }

      return {
        productName: it.productName || it.product || it.description || "",
        description: it.description || "",
        brand: it.brand || "",
        model: it.model || "",
        qty: Number(it.qty ?? it.quantity ?? 1),
        unitPrice: uiVendorPrice,
        targetPrice: uiTargetPrice,
        gstRate: Number(it.gstRate ?? it.gst ?? 0),
      };
    });

    setItems(normalized.length ? normalized : [{ productName: "", description: "", brand: "", model: "", qty: 1, unitPrice: 0, targetPrice: 0, gstRate: 0 }]);
    setFreightCharges(Number(quotation.freightCharges || 0));
    setFreightGstRate(Number(quotation.freightGstRate || 0));
    setInstallationCharges(Number(quotation.installationCharges || 0));
    setInstallationGstRate(Number(quotation.installationGstRate || 0));
    setRemarksForSalesperson(quotation.remarksForSalesperson || "");
    setInternalRemarks(quotation.internalRemarks || "");
    setValidUntil(quotation.validUntil ? new Date(quotation.validUntil) : null);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedQuotation(null);
    setItems([]);
    setFreightCharges(0);
    setFreightGstRate(0);
    setInstallationCharges(0);
    setInstallationGstRate(0);
    setRemarksForSalesperson("");
    setInternalRemarks("");
    setValidUntil(null);
    setSubmittingApprove(false);
    setErrorMsg("");
  };

  const handleItemChange = (index, field, value) => {
    const copy = items.slice();
    if (["qty", "unitPrice", "targetPrice", "gstRate"].includes(field)) {
      copy[index][field] = value === "" ? "" : Number(value);
    } else {
      copy[index][field] = value;
    }
    setItems(copy);
  };

  const addItem = () => {
    setItems([...items, { productName: "", description: "", brand: "", model: "", qty: 1, unitPrice: 0, targetPrice: 0, gstRate: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    let itemsBaseTotal = 0;
    let itemsGstTotal = 0;
    let itemsTotal = 0;

    items.forEach((it) => {
      const base = Number(it.qty || 0) * Number(it.unitPrice || 0);
      const gstAmt = (base * Number(it.gstRate || 0)) / 100;
      itemsBaseTotal += base;
      itemsGstTotal += gstAmt;
      itemsTotal += base + gstAmt;
    });

    const freightGstAmount = (Number(freightCharges || 0) * Number(freightGstRate || 0)) / 100;
    const freightTotalWithGst = Number(freightCharges || 0) + freightGstAmount;
    const installationGstAmount = (Number(installationCharges || 0) * Number(installationGstRate || 0)) / 100;
    const installationTotalWithGst = Number(installationCharges || 0) + installationGstAmount;

    return {
      itemsBaseTotal,
      itemsGstTotal,
      itemsTotal,
      freightGstAmount,
      freightTotalWithGst,
      installationGstAmount,
      installationTotalWithGst,
      grandTotal: itemsTotal + freightTotalWithGst + installationTotalWithGst,
    };
  }, [items, freightCharges, freightGstRate, installationCharges, installationGstRate]);

  const handleApprove = async () => {
    if (!selectedQuotation) return;
    setSubmittingApprove(true);
    setErrorMsg("");
    try {
      const payload = {
        items: items.map((it) => ({
          productName: it.productName,
          description: it.description,
          brand: it.brand,
          model: it.model,
          qty: Number(it.qty || 0),
          unitPrice: Number(it.unitPrice || 0),
          targetPrice: Number(it.targetPrice || 0),
          gstRate: Number(it.gstRate || 0),
        })),
        remarksForSalesperson,
        internalRemarks,
        freightCharges: Number(freightCharges || 0),
        freightGstRate: Number(freightGstRate || 0),
        installationCharges: Number(installationCharges || 0),
        installationGstRate: Number(installationGstRate || 0),
        validUntil: validUntil ? validUntil.toISOString() : null,
      };

      const res = await axios.post(`/api/quotations/${selectedQuotation._id}/approve`, payload, { headers: getAuthHeaders() });
      toast.success(res.data?.message || "Quotation approved");
      closeDialog();
      await loadQuotations();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to approve quotation";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleReject = async (quotationId) => {
    if (!window.confirm("Are you sure you want to reject this quotation?")) return;
    setActionInProgress(true);
    try {
      await axios.post(`/api/quotations/${quotationId}/reject`, {}, { headers: getAuthHeaders() });
      toast.info("Quotation rejected");
      await loadQuotations();
    } catch (err) {
      toast.error("Failed to reject quotation");
    } finally {
      setActionInProgress(false);
    }
  };

  // Check if dialog is in View Only mode
  const isReadOnly = selectedQuotation?.status !== "Pending";

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quotation Approvals
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
                <MenuItem value="All">All</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              size="small"
              fullWidth
              label="Search Opportunity / Customer"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={startDate}
                onChange={(v) => setStartDate(v)}
                renderInput={(params) => <TextField size="small" fullWidth {...params} />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="To Date"
                value={endDate}
                onChange={(v) => setEndDate(v)}
                renderInput={(params) => <TextField size="small" fullWidth {...params} />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={loadQuotations} disabled={loadingList} fullWidth>
                Refresh
              </Button>
              <Button variant="contained" color="success" startIcon={<Download />} onClick={handleExportExcel} fullWidth>
                Excel
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Opportunity</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Requested By</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingList ? (
                <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              ) : filteredQuotations.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">No quotations found.</TableCell></TableRow>
              ) : (
                filteredQuotations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((q) => (
                  <TableRow key={q._id}>
                    <TableCell>{q.deal?.opportunityId || "-"}</TableCell>
                    <TableCell>{q.deal?.customer || q.recipientName || "-"}</TableCell>
                    <TableCell>{q.requestedBy?.username || q.requestedBy?.firstName || "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {(Array.isArray(q.items) ? q.items : []).map((it) => it.productName || it.product).join(", ") || "-"}
                    </TableCell>
                    <TableCell>{q.status}</TableCell>
                    <TableCell align="right">{q.amount ? `₹ ${Number(q.amount).toLocaleString()}` : "-"}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {/* REPLACED BUTTON LOGIC: Review for pending, View for approved/rejected */}
                        <Button 
                          size="small" 
                          variant={q.status === "Pending" ? "contained" : "outlined"} 
                          color={q.status === "Pending" ? "primary" : "info"}
                          startIcon={q.status === "Pending" ? <Check /> : <Visibility />}
                          onClick={() => openApproveDialog(q)}
                        >
                          {q.status === "Pending" ? "Review" : "View"}
                        </Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => handleReject(q._id)} disabled={q.status !== "Pending" || actionInProgress}>Reject</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={filteredQuotations.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />
      </Paper>

      <Dialog open={openDialog} onClose={closeDialog} maxWidth="lg" fullWidth scroll="paper">
        <DialogTitle>{isReadOnly ? "View Quotation Details" : "Approve Quotation"}</DialogTitle>
        <DialogContent dividers>

          {/* ADDED: Status Alert Banner for View Mode */}
          {isReadOnly && selectedQuotation && (
            <Alert severity={selectedQuotation.status === "Approved" ? "success" : "error"} sx={{ mb: 3 }}>
              This quotation was <strong>{selectedQuotation.status}</strong> on {new Date(selectedQuotation.updatedAt || selectedQuotation.createdAt).toLocaleString()}.
            </Alert>
          )}

          <Typography variant="subtitle1" sx={{ mb: 2 }}>{isReadOnly ? "Products Overview" : "Edit Products (admin can edit any field)"}</Typography>
          {items.map((it, idx) => {
            const rowTotal = Number(it.qty || 0) * Number(it.unitPrice || 0) * (1 + Number(it.gstRate || 0) / 100);
            return (
              <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}><TextField fullWidth label="Product Name" disabled={isReadOnly} value={it.productName} onChange={(e) => handleItemChange(idx, "productName", e.target.value)} /></Grid>
                  <Grid item xs={12} sm={3}><TextField fullWidth label="Brand" disabled={isReadOnly} value={it.brand} onChange={(e) => handleItemChange(idx, "brand", e.target.value)} /></Grid>
                  <Grid item xs={12} sm={2}><TextField fullWidth label="Model" disabled={isReadOnly} value={it.model} onChange={(e) => handleItemChange(idx, "model", e.target.value)} /></Grid>
                  <Grid item xs={6} sm={1}><TextField fullWidth type="number" disabled={isReadOnly} label="Qty" value={it.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} /></Grid>
                  <Grid item xs={6} sm={1}><TextField fullWidth type="number" label="Target" value={it.targetPrice} disabled variant="filled" /></Grid>
                  <Grid item xs={6} sm={1}><TextField fullWidth type="number" disabled={isReadOnly} label="Vendor Price" value={it.unitPrice} onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)} /></Grid>
                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth disabled={isReadOnly}>
                      <InputLabel>GST (%)</InputLabel>
                      <Select value={it.gstRate} label="GST (%)" onChange={(e) => handleItemChange(idx, "gstRate", e.target.value)}>
                        {GST_SLABS.map((r) => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={12}><TextField fullWidth label="Description" disabled={isReadOnly} multiline rows={2} value={it.description} onChange={(e) => handleItemChange(idx, "description", e.target.value)} /></Grid>
                  <Grid item xs={12} sx={{ textAlign: "right" }}><Typography variant="body2">Row total: <strong>₹ {rowTotal.toLocaleString()}</strong></Typography></Grid>
                  <Grid item xs={12} sx={{ textAlign: "right" }}>
                    {items.length > 1 && !isReadOnly && <IconButton color="error" onClick={() => removeItem(idx)}><Delete /></IconButton>}
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
          
          {!isReadOnly && <Button startIcon={<Add />} onClick={addItem} variant="outlined" sx={{ mb: 2 }}>Add Product</Button>}
          
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Freight & Installation</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}><TextField label="Freight (₹)" disabled={isReadOnly} fullWidth type="number" value={freightCharges} onChange={(e) => setFreightCharges(Number(e.target.value))} /></Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}><InputLabel>Freight GST</InputLabel>
                <Select value={freightGstRate} onChange={(e) => setFreightGstRate(Number(e.target.value))}>
                  {GST_SLABS.map((r) => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}><TextField label="Installation (₹)" disabled={isReadOnly} fullWidth type="number" value={installationCharges} onChange={(e) => setInstallationCharges(Number(e.target.value))} /></Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}><InputLabel>Inst. GST</InputLabel>
                <Select value={installationGstRate} onChange={(e) => setInstallationGstRate(Number(e.target.value))}>
                  {GST_SLABS.map((r) => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, p: 2, bgcolor: "#f9f9f9", borderRadius: 1 }}>
            <Typography variant="h6" color="primary">Grand Total: ₹ {totals.grandTotal.toLocaleString()}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          {/* UPDATED: Contextual Buttons based on mode */}
          <Button onClick={closeDialog} startIcon={<Close />}>{isReadOnly ? "Close" : "Cancel"}</Button>
          {!isReadOnly && <Button color="error" onClick={() => selectedQuotation && handleReject(selectedQuotation._id)} disabled={actionInProgress}>Reject</Button>}
          {!isReadOnly && <Button variant="contained" startIcon={<Check />} onClick={handleApprove} disabled={submittingApprove}>{submittingApprove ? <CircularProgress size={20} /> : "Submit & Save"}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}