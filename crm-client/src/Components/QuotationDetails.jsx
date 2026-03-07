import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box, Typography, Paper, CircularProgress, Alert, Grid, Divider, Button,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  TextField, MenuItem, Select, FormControl, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import { Edit, Save, Download } from "@mui/icons-material";
import { format } from "date-fns";
import { toast } from "react-toastify";

/* ----------------------------------------------
   DOWNLOAD PDF (BASE64 SAFE TRANSFER)
---------------------------------------------- */
async function downloadPdf(quotationId, withGst = true, templateId = "") {
  try {
    const token = localStorage.getItem("token");
    
    // Standard JSON request (no blob or arraybuffer needed!)
    const res = await axios.get(
      `http://localhost:5000/api/quotation-pdf/${quotationId}/pdf?gst=${withGst}&templateId=${templateId}`,
      { headers: { Authorization: `Bearer ${token}` } } 
    );

    if (!res.data || !res.data.pdfBase64) {
      toast.error("Server did not return PDF data.");
      return;
    }

    // Translate the safe Base64 string back into pure PDF binary
    const byteCharacters = atob(res.data.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });

    // Download the rebuilt PDF
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.data.filename || `Quotation_${quotationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
  } catch (err) {
    console.error("PDF Download Error", err);
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
    toast.error("Failed to download PDF: " + errorMsg);
  }
}

/* ----------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */
const QuotationDetails = ({ dealId, onEdit }) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const [marginInputs, setMarginInputs] = useState({});
  const [savingMargin, setSavingMargin] = useState(false);
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const { data } = await axios.get(`http://localhost:5000/api/quotations/deal/${dealId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuotations(data || []);

      try {
        const settingsRes = await axios.get('http://localhost:5000/api/settings');
        if (settingsRes.data && settingsRes.data.templates) {
          setTemplates(settingsRes.data.templates);
          if (settingsRes.data.templates.length > 0) {
            setSelectedTemplateId(settingsRes.data.templates[0]._id);
          }
        }
      } catch (templateErr) {
        console.error("Failed to load templates", templateErr);
      }

      const initialMargins = {};
      (data || []).forEach((q) => {
        initialMargins[q._id] = {
          type: q.marginType || "percentage",
          value: q.marginValue || 0,
          savedType: q.marginType || "percentage",
          savedValue: q.marginValue || 0,
        };
      });
      setMarginInputs(initialMargins);
    } catch (err) {
      setError("Failed to load quotation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) fetchQuotations();
  }, [dealId]);

  const handleMarginChange = (qId, field, val) => {
    setMarginInputs((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [field]: field === "value" ? (val === "" ? "" : Number(val)) : val,
      },
    }));
  };

  const saveMargin = async (qId) => {
    const input = marginInputs[qId];
    setSavingMargin(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/quotations/${qId}/margin`, {
        marginType: input.type,
        marginValue: input.value,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Margin updated successfully");
      fetchQuotations(); 
    } catch (err) {
      toast.error("Failed to save margin");
    } finally {
      setSavingMargin(false);
    }
  };

  const isMarginDirty = (qId) => {
    const input = marginInputs[qId];
    if (!input) return false;
    return input.type !== input.savedType || input.value !== input.savedValue;
  };

  const calculateTotalsWithMargin = (q, mType, mValue) => {
    const items = Array.isArray(q.items) && q.items.length ? q.items : Array.isArray(q.products) ? q.products : [];
    let itemsBase = 0, itemsGst = 0, itemsTotal = 0;

    items.forEach((it) => {
      const qty = Number(it.qty ?? it.quantity ?? 0);
      const vendorPrice = Number(it.unitPrice ?? it.price ?? 0);
      let clientPrice = vendorPrice;
      if (Number(mValue) > 0) {
        if (mType === "percentage") clientPrice = vendorPrice + (vendorPrice * Number(mValue)) / 100;
        else clientPrice = vendorPrice + Number(mValue);
      }
      const base = qty * clientPrice;
      const gstRate = Number(it.gstRate ?? it.gst ?? 0);
      const gstAmt = (base * gstRate) / 100;

      itemsBase += base; itemsGst += gstAmt; itemsTotal += base + gstAmt;
    });

    const freight = Number(q.freightCharges || 0);
    const freightGstRate = Number(q.freightGstRate || 0);
    const freightGstAmt = (freight * freightGstRate) / 100;
    const installation = Number(q.installationCharges || 0);
    const installationGstRate = Number(q.installationGstRate || 0);
    const installationGstAmt = (installation * installationGstRate) / 100;

    return {
      itemsBase, itemsGst, itemsTotal, freight, freightGstRate, freightGstAmt,
      installation, installationGstRate, installationGstAmt,
      grandTotal: itemsTotal + freight + freightGstAmt + installation + installationGstAmt,
    };
  };

  const renderItemsTable = (q, mType, mValue) => {
    const items = Array.isArray(q.items) && q.items.length ? q.items : Array.isArray(q.products) ? q.products : null;
    if (!items) return <Typography>No items</Typography>;
    const totals = calculateTotalsWithMargin(q, mType, mValue);

    return (
      <>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sr.</TableCell><TableCell>Product</TableCell>
                <TableCell align="right">Qty</TableCell><TableCell align="right">Vendor Price</TableCell>
                <TableCell align="right">Margin</TableCell><TableCell align="right">Client Price</TableCell>
                <TableCell align="right">GST</TableCell><TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => {
                const qty = Number(it.qty ?? it.quantity ?? 0);
                const vendorPrice = Number(it.unitPrice ?? it.price ?? 0);
                let clientPrice = vendorPrice;
                if (Number(mValue) > 0) {
                  if (mType === "percentage") clientPrice = vendorPrice + (vendorPrice * Number(mValue)) / 100;
                  else clientPrice = vendorPrice + Number(mValue);
                }
                const base = qty * clientPrice;
                const gstRate = Number(it.gstRate ?? it.gst ?? 0);
                const gstAmt = (base * gstRate) / 100;
                return (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: "pre-wrap" }}>
                      {it.productName || it.product || it.description || "—"}
                      {it.description && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{it.description}</div>}
                    </TableCell>
                    <TableCell align="right">{qty}</TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>₹{vendorPrice.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: "green", fontSize: 12 }}>
                      {Number(mValue) > 0 ? (mType === "percentage" ? `${mValue}%` : `+₹${mValue}`) : "-"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>₹{clientPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="right">{gstRate}% (₹{gstAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })})</TableCell>
                    <TableCell align="right">₹{(base + gstAmt).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2 }}>
          <Typography>Items Base Total: ₹ {totals.itemsBase.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
          <Typography>Items GST Total: ₹ {totals.itemsGst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
          <Typography>Items Total (incl. GST): ₹ {totals.itemsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
          {totals.freight > 0 && <Typography>Freight Charges & GST: ₹ {(totals.freight + totals.freightGstAmt).toLocaleString()}</Typography>}
          {totals.installation > 0 && <Typography>Installation & GST: ₹ {(totals.installation + totals.installationGstAmt).toLocaleString()}</Typography>}
          <Typography variant="h6" sx={{ mt: 1, color: "primary.main" }}>Grand Total: ₹ {totals.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
        </Box>
      </>
    );
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>Quotation History</Typography>
      {quotations.length === 0 ? <Typography>No quotations requested yet.</Typography> : quotations.map((q) => {
        const status = (q.status || "").toLowerCase();
        const inputState = marginInputs[q._id] || { type: "percentage", value: 0, savedValue: 0 };
        const dirty = isMarginDirty(q._id);
        const hasSavedMargin = inputState.savedValue > 0;

        return (
          <Paper key={q._id} variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Typography sx={{ fontWeight: "bold", color: status === "approved" ? "success.main" : status === "rejected" ? "error.main" : "warning.main" }}>
                    {q.status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Requested on {format(new Date(q.createdAt), "PPpp")}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6} display="flex" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
                {status === "approved" && (
                  <Paper elevation={0} variant="outlined" sx={{ p: 0.75, display: "flex", gap: 1, alignItems: "center", bgcolor: "#f8fafc", borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", ml: 1 }}>Margin:</Typography>
                    <ToggleButtonGroup
                      value={inputState.type} exclusive size="small" sx={{ height: 32 }}
                      onChange={(e, newType) => { if (newType !== null) handleMarginChange(q._id, "type", newType); }}
                    >
                      <ToggleButton value="percentage" sx={{ px: 1.5 }}>%</ToggleButton>
                      <ToggleButton value="amount" sx={{ px: 1.5 }}>₹</ToggleButton>
                    </ToggleButtonGroup>
                    <TextField
                      size="small" type="number" value={inputState.value} sx={{ width: 85 }}
                      onChange={(e) => handleMarginChange(q._id, "value", e.target.value)}
                      InputProps={{ sx: { height: 32, fontSize: 14, bgcolor: "white" } }}
                    />
                    <Button
                      variant="contained" size="small" onClick={() => saveMargin(q._id)} disabled={!dirty || savingMargin}
                      startIcon={savingMargin ? <CircularProgress size={12} color="inherit" /> : <Save fontSize="small" />}
                      sx={{ height: 32, textTransform: "none", boxShadow: "none", px: 2, bgcolor: dirty ? "primary.main" : "action.disabledBackground" }}
                    >
                      Save
                    </Button>
                  </Paper>
                )}
              </Grid>

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Requested Items</Typography>
                <Box sx={{ mt: 1 }}>{renderItemsTable(q, inputState.type, inputState.value)}</Box>
              </Grid>
              
              {q.remarksForSalesperson && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Remarks from Approver</Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>{q.remarksForSalesperson}</Typography>
                </Grid>
              )}
            </Grid>

            <Box sx={{ mt: 2, textAlign: "right", display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 1 }}>
              {status === "pending" && onEdit && <Button variant="outlined" color="warning" startIcon={<Edit />} onClick={() => onEdit(q)}>Edit Request</Button>}
              
              {status === "approved" ? (
                <Box display="flex" alignItems="center" flexWrap="wrap" gap={2}>
                  {templates.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <Select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                        {templates.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}
                  <Button
                    variant="contained"
                    disabled={dirty || downloadingId === q._id || !hasSavedMargin}
                    startIcon={downloadingId === `${q._id}_gst` ? <CircularProgress size={16} color="inherit" /> : <Download />}
                    onClick={async () => {
                      setDownloadingId(`${q._id}_gst`);
                      await downloadPdf(q._id, true, selectedTemplateId);
                      setDownloadingId(null);
                    }}
                  >
                    Download (With GST)
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={dirty || downloadingId === q._id || !hasSavedMargin}
                    startIcon={downloadingId === `${q._id}_nogst` ? <CircularProgress size={16} color="inherit" /> : <Download />}
                    onClick={async () => {
                      setDownloadingId(`${q._id}_nogst`);
                      await downloadPdf(q._id, false, selectedTemplateId);
                      setDownloadingId(null);
                    }}
                  >
                    Download (No GST)
                  </Button>
                </Box>
              ) : (
                status !== "pending" && <Button variant="outlined" disabled>{status === "rejected" ? "Rejected" : "Available after approval"}</Button>
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
};

export default QuotationDetails;