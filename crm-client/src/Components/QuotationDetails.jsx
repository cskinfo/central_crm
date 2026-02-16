import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Edit, Save, Download } from "@mui/icons-material";
import { format } from "date-fns";
import { toast } from "react-toastify";

/* ----------------------------------------------
   DOWNLOAD PDF (WITH / WITHOUT GST)
---------------------------------------------- */
async function downloadPdf(quotationId, withGst = true) {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `/api/quotation-pdf/${quotationId}/pdf?gst=${withGst}`,
      {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const contentType = res.headers["content-type"] || "";
    if (!contentType.includes("application/pdf")) {
      const text = new TextDecoder("utf-8").decode(new Uint8Array(res.data));
      console.error("Server returned non-PDF payload:\n", text);
      throw new Error("PDF generation failed (server returned text).");
    }

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quotation-${quotationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download PDF:", err);
    toast.error("Failed to download PDF. Please try again.");
    throw err;
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

  // State to manage margin inputs for each quotation
  const [marginInputs, setMarginInputs] = useState({});
  const [savingMargin, setSavingMargin] = useState(false);

  // FETCH QUOTATIONS
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const { data } = await axios.get(`/api/quotations/deal/${dealId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuotations(data || []);

      // Initialize margin inputs from DB
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
      console.error("Error fetching quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) fetchQuotations();
  }, [dealId]);

  // HANDLE MARGIN INPUT CHANGE
  const handleMarginChange = (qId, field, val) => {
    setMarginInputs((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [field]: field === "value" ? (val === "" ? "" : Number(val)) : val,
      },
    }));
  };

  // SAVE MARGIN TO BACKEND
  const saveMargin = async (qId) => {
    const input = marginInputs[qId];
    setSavingMargin(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/quotations/${qId}/margin`,
        {
          marginType: input.type,
          marginValue: input.value,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Margin updated successfully");
      fetchQuotations(); // Refresh to lock in values
    } catch (err) {
      console.error(err);
      toast.error("Failed to save margin");
    } finally {
      setSavingMargin(false);
    }
  };

  // CHECK IF DIRTY OR EMPTY (User changed value but hasn't saved OR value is 0)
  const isMarginDirty = (qId) => {
    const input = marginInputs[qId];
    if (!input) return false;
    return input.type !== input.savedType || input.value !== input.savedValue;
  };

  /* ----------------------------------------------
     CALCULATOR (GST + Freight + Margin)
  ---------------------------------------------- */
  const calculateTotalsWithMargin = (q, mType, mValue) => {
    const items =
      Array.isArray(q.items) && q.items.length
        ? q.items
        : Array.isArray(q.products)
        ? q.products
        : [];

    let itemsBase = 0;
    let itemsGst = 0;
    let itemsTotal = 0;

    items.forEach((it) => {
      const qty = Number(it.qty ?? it.quantity ?? 0);
      const vendorPrice = Number(it.unitPrice ?? it.price ?? 0);

      // Calculate Client Price based on Margin
      let clientPrice = vendorPrice;
      if (Number(mValue) > 0) {
        if (mType === "percentage") {
          clientPrice = vendorPrice + (vendorPrice * Number(mValue)) / 100;
        } else {
          clientPrice = vendorPrice + Number(mValue);
        }
      }

      const base = qty * clientPrice;
      const gstRate = Number(it.gstRate ?? it.gst ?? 0);
      const gstAmt = (base * gstRate) / 100;

      itemsBase += base;
      itemsGst += gstAmt;
      itemsTotal += base + gstAmt;
    });

    const freight = Number(q.freightCharges || 0);
    const freightGstRate = Number(q.freightGstRate || 0);
    const freightGstAmt = (freight * freightGstRate) / 100;

    const installation = Number(q.installationCharges || 0);
    const installationGstRate = Number(q.installationGstRate || 0);
    const installationGstAmt = (installation * installationGstRate) / 100;

    const grandTotal =
      itemsTotal + freight + freightGstAmt + installation + installationGstAmt;

    return {
      itemsBase,
      itemsGst,
      itemsTotal,
      freight,
      freightGstRate,
      freightGstAmt,
      installation,
      installationGstRate,
      installationGstAmt,
      grandTotal,
    };
  };

  /* ----------------------------------------------
     RENDER ITEMS TABLE
  ---------------------------------------------- */
  const renderItemsTable = (q, mType, mValue) => {
    const items =
      Array.isArray(q.items) && q.items.length
        ? q.items
        : Array.isArray(q.products)
        ? q.products
        : null;

    if (!items) {
      if (typeof q.products === "string") {
        return <Typography whiteSpace="pre-wrap">{q.products}</Typography>;
      }
      return <Typography>No items</Typography>;
    }

    const totals = calculateTotalsWithMargin(q, mType, mValue);

    return (
      <>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sr.</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Brand</TableCell>
                <TableCell>Model</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Target Price</TableCell>
                <TableCell align="right">Vendor Price</TableCell>
                <TableCell align="right">Margin</TableCell>
                <TableCell align="right">Client Price</TableCell>
                <TableCell align="right">GST</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((it, idx) => {
                const qty = Number(it.qty ?? it.quantity ?? 0);
                const vendorPrice = Number(it.unitPrice ?? it.price ?? 0);
                const targetPrice = Number(it.targetPrice ?? 0);

                // Calculate Client Price row-wise
                let clientPrice = vendorPrice;
                if (Number(mValue) > 0) {
                  if (mType === "percentage") {
                    clientPrice =
                      vendorPrice + (vendorPrice * Number(mValue)) / 100;
                  } else {
                    clientPrice = vendorPrice + Number(mValue);
                  }
                }

                const base = qty * clientPrice;
                const gstRate = Number(it.gstRate ?? it.gst ?? 0);
                const gstAmt = (base * gstRate) / 100;
                const total = base + gstAmt;

                return (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>

                    <TableCell sx={{ maxWidth: 220, whiteSpace: "pre-wrap" }}>
                      {it.productName || it.product || it.description || "—"}
                      {it.description && (
                        <div
                          style={{ fontSize: 12, color: "#666", marginTop: 4 }}
                        >
                          {it.description}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>{it.brand || "—"}</TableCell>
                    <TableCell>{it.model || "—"}</TableCell>

                    <TableCell align="right">{qty}</TableCell>

                    {/* TARGET PRICE */}
                    <TableCell align="right" sx={{ color: "text.secondary" }}>
                      {targetPrice > 0
                        ? `₹${targetPrice.toLocaleString()}`
                        : "-"}
                    </TableCell>

                    {/* VENDOR PRICE */}
                    <TableCell align="right" sx={{ color: "text.secondary" }}>
                      ₹{vendorPrice.toLocaleString()}
                    </TableCell>

                    {/* MARGIN DISPLAY */}
                    <TableCell
                      align="right"
                      sx={{ color: "green", fontSize: 12 }}
                    >
                      {Number(mValue) > 0
                        ? mType === "percentage"
                          ? `${mValue}%`
                          : `+₹${mValue}`
                        : "-"}
                    </TableCell>

                    {/* CLIENT PRICE (Calculated) */}
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      ₹
                      {clientPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell align="right">
                      {gstRate}% (₹
                      {gstAmt.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      )
                    </TableCell>

                    <TableCell align="right">
                      ₹
                      {total.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* SUMMARY ROWS */}
        <Box sx={{ mt: 2 }}>
          <Typography>
            Items Base Total: ₹{" "}
            {totals.itemsBase.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography>
            Items GST Total: ₹{" "}
            {totals.itemsGst.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography>
            Items Total (incl. GST): ₹{" "}
            {totals.itemsTotal.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </Typography>

          {totals.freight > 0 && (
            <>
              <Typography sx={{ mt: 1 }}>
                Freight Charges: ₹ {totals.freight.toLocaleString()}
              </Typography>
              <Typography>
                Freight GST ({totals.freightGstRate}%): ₹{" "}
                {totals.freightGstAmt.toLocaleString()}
              </Typography>
            </>
          )}

          {totals.installation > 0 && (
            <>
              <Typography sx={{ mt: 1 }}>
                Installation Charges: ₹ {totals.installation.toLocaleString()}
              </Typography>
              <Typography>
                Installation GST ({totals.installationGstRate}%): ₹{" "}
                {totals.installationGstAmt.toLocaleString()}
              </Typography>
            </>
          )}

          <Typography variant="h6" sx={{ mt: 1, color: "primary.main" }}>
            Grand Total (Client): ₹{" "}
            {totals.grandTotal.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
      </>
    );
  };

  /* ----------------------------------------------
     UI RENDER
  ---------------------------------------------- */

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Quotation History
      </Typography>

      {quotations.length === 0 ? (
        <Typography>No quotations requested yet.</Typography>
      ) : (
        quotations.map((q) => {
          const status = (q.status || "").toLowerCase();

          const inputState = marginInputs[q._id] || {
            type: "percentage",
            value: 0,
            savedValue: 0,
          };
          const dirty = isMarginDirty(q._id);
          const hasSavedMargin = inputState.savedValue > 0;

          const displayMarginType = inputState.type;
          const displayMarginValue = inputState.value;

          return (
            <Paper key={q._id} variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Grid container spacing={2}>
                {/* --- RESTORED: STATUS SECTION (LEFT SIDE) --- */}
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        color:
                          status === "approved"
                            ? "success.main"
                            : status === "rejected"
                            ? "error.main"
                            : "warning.main",
                      }}
                    >
                      {q.status}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Requested on {format(new Date(q.createdAt), "PPpp")}
                    </Typography>
                  </Box>
                </Grid>
                {/* --------------------------------------------- */}

                {/* --- MARGIN UI (RIGHT SIDE) --- */}
                <Grid
                  item
                  xs={12}
                  md={6}
                  display="flex"
                  justifyContent={{ xs: "flex-start", md: "flex-end" }}
                  alignItems="center"
                >
                  {status === "approved" && (
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        p: 0.75, // Compact padding
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        bgcolor: "#f8fafc", // Clean, light background
                        borderColor: "#e2e8f0",
                        borderRadius: 2, // Softer corners
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "text.secondary",
                          ml: 1,
                          mr: 0.5,
                        }}
                      >
                        Margin:
                      </Typography>

                      {/* Modern Toggle Switch for Type */}
                      <ToggleButtonGroup
                        value={inputState.type}
                        exclusive
                        onChange={(e, newType) => {
                          // Prevent unselecting (null)
                          if (newType !== null)
                            handleMarginChange(q._id, "type", newType);
                        }}
                        size="small"
                        sx={{ height: 32 }} // Align height with input
                      >
                        <ToggleButton
                          value="percentage"
                          aria-label="percentage"
                          sx={{ px: 1.5 }}
                        >
                          %
                        </ToggleButton>
                        <ToggleButton
                          value="amount"
                          aria-label="amount"
                          sx={{ px: 1.5 }}
                        >
                          ₹
                        </ToggleButton>
                      </ToggleButtonGroup>

                      {/* Clean Input Field */}
                      <TextField
                        size="small"
                        type="number"
                        placeholder="0"
                        value={inputState.value}
                        onChange={(e) =>
                          handleMarginChange(q._id, "value", e.target.value)
                        }
                        sx={{ width: 85 }}
                        InputProps={{
                          sx: {
                            height: 32,
                            fontSize: 14,
                            bgcolor: "white", // White bg makes input pop against grey container
                            "& input": { padding: "0 8px" },
                          },
                        }}
                      />

                      {/* Integrated Save Button */}
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => saveMargin(q._id)}
                        disabled={!dirty || savingMargin}
                        startIcon={
                          savingMargin ? (
                            <CircularProgress size={12} color="inherit" />
                          ) : (
                            <Save fontSize="small" />
                          )
                        }
                        sx={{
                          height: 32,
                          textTransform: "none",
                          boxShadow: "none",
                          minWidth: "unset",
                          px: 2,
                          bgcolor: dirty
                            ? "primary.main"
                            : "action.disabledBackground",
                          "&:hover": { boxShadow: "none" },
                        }}
                      >
                        Save
                      </Button>
                    </Paper>
                  )}
                </Grid>
                {/* ------------------------------ */}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                {/* ITEMS LIST */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Requested Items
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {renderItemsTable(q, displayMarginType, displayMarginValue)}
                  </Box>
                </Grid>

                {/* REMARKS */}
                {q.remarksForSalesperson && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Remarks from Approver
                    </Typography>
                    <Typography sx={{ whiteSpace: "pre-wrap" }}>
                      {q.remarksForSalesperson}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* ACTION BUTTONS */}
              <Box
                sx={{
                  mt: 2,
                  textAlign: "right",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                }}
              >
                {/* Edit Button (Pending only) */}
                {status === "pending" && onEdit && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<Edit />}
                    onClick={() => onEdit(q)}
                  >
                    Edit Request
                  </Button>
                )}

                {/* Approved Logic */}
                {status === "approved" ? (
                  <>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        setDownloadingId(q._id);
                        try {
                          await downloadPdf(q._id, true);
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                      // DISABLE if dirty OR downloading OR NO SAVED MARGIN
                      disabled={
                        dirty || downloadingId === q._id || !hasSavedMargin
                      }
                      startIcon={
                        downloadingId === q._id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Download />
                        )
                      }
                    >
                      {downloadingId === q._id
                        ? "Downloading..."
                        : "Download (With GST)"}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={async () => {
                        setDownloadingId(q._id);
                        try {
                          await downloadPdf(q._id, false);
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                      // DISABLE if dirty OR downloading OR NO SAVED MARGIN
                      disabled={
                        dirty || downloadingId === q._id || !hasSavedMargin
                      }
                      startIcon={
                        downloadingId === q._id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Download />
                        )
                      }
                    >
                      {downloadingId === q._id
                        ? "Downloading..."
                        : "Download (No GST)"}
                    </Button>
                  </>
                ) : (
                  // Fallback for Rejected or Pending (if no onEdit)
                  status !== "pending" && (
                    <Button variant="outlined" disabled>
                      {status === "rejected"
                        ? "Rejected"
                        : "Available after approval"}
                    </Button>
                  )
                )}
              </Box>
            </Paper>
          );
        })
      )}
    </Box>
  );
};

export default QuotationDetails;
