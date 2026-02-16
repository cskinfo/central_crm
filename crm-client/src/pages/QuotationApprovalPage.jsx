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
import { Add, Delete, Check, Close } from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { toast } from "react-toastify";

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

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // --- UPDATED OPEN DIALOG LOGIC ---
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

      // LOGIC FIX:
      // If status is Pending, the value in 'unitPrice' is actually the Salesperson's request.
      // We must move it to 'targetPrice' UI field and clear 'unitPrice' UI field for Admin.
      if (quotation.status === "Pending") {
        // If dbTargetPrice exists (from a re-edit), use it. Otherwise use the unitPrice as target.
        uiTargetPrice = dbTargetPrice > 0 ? dbTargetPrice : dbUnitPrice;
        uiVendorPrice = 0; // Reset to 0 so Admin fills it
      } else {
        // If Approved/Rejected, the unitPrice is the final Vendor Price.
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

    setItems(
      normalized.length
        ? normalized
        : [
            {
              productName: "",
              description: "",
              brand: "",
              model: "",
              qty: 1,
              unitPrice: 0,
              targetPrice: 0,
              gstRate: 0,
            },
          ]
    );

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
    if (
      field === "qty" ||
      field === "unitPrice" ||
      field === "targetPrice" ||
      field === "gstRate"
    ) {
      copy[index][field] = value === "" ? "" : Number(value);
    } else {
      copy[index][field] = value;
    }
    setItems(copy);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        description: "",
        brand: "",
        model: "",
        qty: 1,
        unitPrice: 0,
        targetPrice: 0,
        gstRate: 0,
      },
    ]);
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

    const freightGstAmount =
      (Number(freightCharges || 0) * Number(freightGstRate || 0)) / 100;
    const freightTotalWithGst = Number(freightCharges || 0) + freightGstAmount;

    const instCharge = Number(installationCharges || 0);
    const instGstRate = Number(installationGstRate || 0);
    const installationGstAmount = (instCharge * instGstRate) / 100;
    const installationTotalWithGst = instCharge + installationGstAmount;

    const grandTotal =
      itemsTotal + freightTotalWithGst + installationTotalWithGst;

    return {
      itemsBaseTotal,
      itemsGstTotal,
      itemsTotal,
      freightGstAmount,
      freightTotalWithGst,
      installationGstAmount,
      installationTotalWithGst,
      grandTotal,
    };
  }, [
    items,
    freightCharges,
    freightGstRate,
    installationCharges,
    installationGstRate,
  ]);

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
          unitPrice: Number(it.unitPrice || 0), // Vendor Price (Final)
          targetPrice: Number(it.targetPrice || 0), // Target Price (Saved back to DB)
          gstRate: Number(it.gstRate || 0),
        })),
        remarksForSalesperson: remarksForSalesperson,
        internalRemarks: internalRemarks,
        freightCharges: Number(freightCharges || 0),
        freightGstRate: Number(freightGstRate || 0),
        installationCharges: Number(installationCharges || 0),
        installationGstRate: Number(installationGstRate || 0),
        validUntil: validUntil ? validUntil.toISOString() : null,
      };

      const headers = getAuthHeaders();
      const res = await axios.post(
        `/api/quotations/${selectedQuotation._id}/approve`,
        payload,
        { headers }
      );

      toast.success(res.data?.message || "Quotation approved");
      closeDialog();
      await loadQuotations();
    } catch (err) {
      console.error("Approve error:", err);
      const msg = err?.response?.data?.message || "Failed to approve quotation";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleReject = async (quotationId) => {
    if (!window.confirm("Are you sure you want to reject this quotation?"))
      return;
    setActionInProgress(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `/api/quotations/${quotationId}/reject`,
        {},
        { headers }
      );
      toast.info("Quotation rejected");
      await loadQuotations();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Failed to reject quotation");
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quotation Approvals
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
            <MenuItem value="All">All</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={loadQuotations}
          disabled={loadingList}
        >
          Refresh
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

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
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No quotations found.
                  </TableCell>
                </TableRow>
              ) : (
                quotations
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((q) => {
                    const productsPreview = (
                      Array.isArray(q.items) && q.items.length
                        ? q.items
                        : Array.isArray(q.products)
                        ? q.products
                        : []
                    )
                      .slice(0, 3)
                      .map(
                        (it) => it.productName || it.product || it.description
                      )
                      .join(", ");
                    return (
                      <TableRow key={q._id}>
                        <TableCell>{q.deal?.opportunityId || "-"}</TableCell>
                        <TableCell>
                          {q.deal?.customer || q.recipientName || "-"}
                        </TableCell>
                        <TableCell>
                          {q.requestedBy?.username ||
                            q.requestedBy?.firstName ||
                            "-"}
                        </TableCell>
                        <TableCell
                          style={{
                            maxWidth: 300,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {productsPreview ||
                            (typeof q.products === "string" ? q.products : "-")}
                        </TableCell>
                        <TableCell>{q.status}</TableCell>
                        <TableCell align="right">
                          {q.amount
                            ? `₹ ${Number(q.amount).toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                          >
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => openApproveDialog(q)}
                              disabled={q.status !== "Pending"}
                            >
                              Review
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => handleReject(q._id)}
                              disabled={
                                q.status !== "Pending" || actionInProgress
                              }
                            >
                              Reject
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={quotations.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* APPROVAL DIALOG */}
      <Dialog
        open={openDialog}
        onClose={closeDialog}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>Approve Quotation</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Edit Products (admin can edit any field)
          </Typography>

          {items.map((it, idx) => {
            const base = Number(it.qty || 0) * Number(it.unitPrice || 0);
            const gstAmount = (base * Number(it.gstRate || 0)) / 100;
            const rowTotal = base + gstAmount;

            return (
              <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label={`Product ${idx + 1} - Name`}
                      value={it.productName}
                      onChange={(e) =>
                        handleItemChange(idx, "productName", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Brand"
                      value={it.brand}
                      onChange={(e) =>
                        handleItemChange(idx, "brand", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Model"
                      value={it.model}
                      onChange={(e) =>
                        handleItemChange(idx, "model", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item xs={6} sm={1}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Qty"
                      value={it.qty}
                      onChange={(e) =>
                        handleItemChange(idx, "qty", e.target.value)
                      }
                    />
                  </Grid>

                  {/* --- UPDATED: TARGET PRICE & VENDOR PRICE --- */}
                  <Grid item xs={6} sm={1}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Target Price"
                      value={it.targetPrice}
                      disabled // Salesperson set this, Admin just views it
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      sx={{ bgcolor: "#f5f5f5" }}
                    />
                  </Grid>

                  <Grid item xs={6} sm={1}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Vendor Price"
                      value={it.unitPrice}
                      onChange={(e) =>
                        handleItemChange(idx, "unitPrice", e.target.value)
                      }
                    />
                  </Grid>
                  {/* ------------------------------------------- */}

                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth>
                      <InputLabel>GST (%)</InputLabel>
                      <Select
                        value={it.gstRate}
                        label="GST (%)"
                        onChange={(e) =>
                          handleItemChange(idx, "gstRate", e.target.value)
                        }
                      >
                        {GST_SLABS.map((r) => (
                          <MenuItem key={r} value={r}>
                            {r}%
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={2}
                      value={it.description}
                      onChange={(e) =>
                        handleItemChange(idx, "description", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={12} sx={{ textAlign: "right" }}>
                    <Typography variant="body2">
                      Row total: <strong>₹ {rowTotal.toLocaleString()}</strong>
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={12} sx={{ textAlign: "right" }}>
                    {items.length > 1 && (
                      <IconButton color="error" onClick={() => removeItem(idx)}>
                        <Delete />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            );
          })}

          <Box sx={{ mb: 2 }}>
            <Button startIcon={<Add />} onClick={addItem} variant="outlined">
              Add Product
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6">Freight</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Freight Charges (₹)"
                fullWidth
                type="number"
                value={freightCharges}
                onChange={(e) =>
                  setFreightCharges(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth sx={{ minWidth: 150 }}>
                <InputLabel>Freight GST (%)</InputLabel>
                <Select
                  value={freightGstRate}
                  label="Freight GST (%)"
                  onChange={(e) =>
                    setFreightGstRate(Number(e.target.value || 0))
                  }
                >
                  {GST_SLABS.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}%
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              item
              xs={12}
              sm={4}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Typography>
                Freight GST Amount:{" "}
                <strong>
                  ₹{" "}
                  {(
                    (Number(freightCharges || 0) *
                      Number(freightGstRate || 0)) /
                    100
                  ).toLocaleString()}
                </strong>
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6">Installation</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Installation Charges (₹)"
                fullWidth
                type="number"
                value={installationCharges}
                onChange={(e) =>
                  setInstallationCharges(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth sx={{ minWidth: 150 }}>
                <InputLabel>Installation GST (%)</InputLabel>
                <Select
                  value={installationGstRate}
                  label="Installation GST (%)"
                  onChange={(e) =>
                    setInstallationGstRate(Number(e.target.value || 0))
                  }
                >
                  {GST_SLABS.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}%
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              item
              xs={12}
              sm={4}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Typography>
                Inst. GST Amount:{" "}
                <strong>
                  ₹ {totals.installationGstAmount.toLocaleString()}
                </strong>
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Valid Until"
                  value={validUntil}
                  onChange={(v) => setValidUntil(v)}
                  renderInput={(params) => <TextField fullWidth {...params} />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Remarks for Salesperson"
                fullWidth
                multiline
                rows={2}
                value={remarksForSalesperson}
                onChange={(e) => setRemarksForSalesperson(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Internal Remarks (not visible to customer)"
                fullWidth
                multiline
                rows={3}
                value={internalRemarks}
                onChange={(e) => setInternalRemarks(e.target.value)}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, border: "1px solid #eee", borderRadius: 1 }}>
            <Typography>
              Items Base Total: ₹ {totals.itemsBaseTotal.toLocaleString()}
            </Typography>
            <Typography>
              Items GST Total: ₹ {totals.itemsGstTotal.toLocaleString()}
            </Typography>
            <Typography sx={{ mb: 1 }}>
              Items Total (incl. GST):{" "}
              <strong>₹ {totals.itemsTotal.toLocaleString()}</strong>
            </Typography>

            <Divider sx={{ my: 1 }} />

            <Typography>
              Freight Charges: ₹ {Number(freightCharges || 0).toLocaleString()}
            </Typography>
            <Typography>
              Freight GST: ₹ {totals.freightGstAmount.toLocaleString()}
            </Typography>

            <Typography>
              Installation Charges: ₹{" "}
              {Number(installationCharges || 0).toLocaleString()}
            </Typography>
            <Typography>
              Installation GST: ₹{" "}
              {totals.installationGstAmount.toLocaleString()}
            </Typography>

            <Divider sx={{ my: 1 }} />

            <Typography variant="h6" color="primary">
              Grand Total: ₹ {totals.grandTotal.toLocaleString()}
            </Typography>
          </Box>

          {errorMsg && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} startIcon={<Close />}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (selectedQuotation) handleReject(selectedQuotation._id);
            }}
            disabled={actionInProgress}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            startIcon={<Check />}
            onClick={handleApprove}
            disabled={submittingApprove}
          >
            {submittingApprove ? (
              <CircularProgress size={20} />
            ) : (
              "Submit & Save"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
