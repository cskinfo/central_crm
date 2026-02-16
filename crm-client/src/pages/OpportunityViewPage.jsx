import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import { toast } from "react-toastify";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  Edit,
  ArrowBack,
  Business,
  Timeline,
  Info,
  RequestQuote,
} from "@mui/icons-material";
import axios from "axios";
import QuotationForm from "../Components/QuotationForm";
import QuotationDetails from "../Components/QuotationDetails";

function OpportunityViewPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const rolePrefix =
    user.role === "admin"
      ? "/admin"
      : user.role === "sub-admin"
      ? "/sub-admin"
      : "/sales";

  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);

  const [existingQuotation, setExistingQuotation] = useState(null); // <--- Add this

  // Stage color mapping
  const stageColor = {
    New: "default",
    Qualified: "info",
    Purchase: "secondary",
    Proposition: "warning",
    Won: "success",
    Lost: "error",
  };

  const fetchOpportunity = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/deals/${id}`);
      setOpportunity(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load opportunity details");
      setOpportunity(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  const handleCloseQuotationModal = () => {
    setQuotationModalOpen(false);
  };

  const onQuotationRequested = () => {
    handleCloseQuotationModal();
    fetchOpportunity(); // Refresh data after quotation is requested
  };

  // Add this function inside OpportunityViewPage
  const handleEditSpecificQuote = (quotationObj) => {
    // 1. Set the specific quotation data to pre-fill the form
    setExistingQuotation(quotationObj);
    // 2. Open the modal
    setQuotationModalOpen(true);
  };

  const handleOpenCostSheet = () => {
    if (opportunity.stage !== "Won") {
      toast.warn("Cost sheet can be created only for Won opportunities.");
      return;
    }

    navigate(`${rolePrefix}/cost-sheets/${opportunity._id}`);
  };

  // Check if edit button should be shown
  const showEditButton =
    user.role === "admin" ||
    (opportunity?.stage !== "Won" && opportunity?.stage !== "Lost");

  if (loading) {
    return (
      <Box className="flex justify-center py-32">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" className="py-16">
        <Alert severity="error" className="mb-10">
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack />}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  if (!opportunity) {
    return (
      <Container maxWidth="sm" className="py-16 text-center">
        <Typography variant="h6" className="mb-4 font-semibold">
          Opportunity not found
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack />}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  const handleOpenQuotationModal = async () => {
    setExistingQuotation(null); // Reset

    if (opportunity.quotationStatus === "Pending") {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/quotations/deal/${opportunity._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pendingQuote = res.data.find((q) => q.status === "Pending");
        if (pendingQuote) {
          setExistingQuotation(pendingQuote);
        }
      } catch (err) {
        console.error("Failed to fetch pending quote", err);
      }
    }
    setQuotationModalOpen(true);
  };

  return (
    <Container maxWidth="lg" className="pt-12 pb-12">
      {/* Hero Summary Card */}
      <Paper
        elevation={3}
        className="px-10 py-7 rounded-2xl mb-10 shadow-lg bg-white"
        sx={{ width: "100%" }}
      >
        <Box className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Box className="flex items-center gap-5 mb-4 md:mb-0">
            <Business sx={{ color: "primary.main", fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight={700} className="mb-1">
                {opportunity.customer || "N/A"}
              </Typography>
              <Typography className="text-gray-500" variant="subtitle2">
                ID:{" "}
                <span className="font-mono">
                  {opportunity.opportunityId || "N/A"}
                </span>
              </Typography>
            </Box>
          </Box>
          <Box className="flex flex-wrap items-center gap-4">
            {opportunity.stage === "Won" && (
              <Button
                variant="contained"
                color="success"
                startIcon={<ReceiptLongIcon />}
                onClick={handleOpenCostSheet}
                sx={{
                  borderRadius: "999px", // fully rounded pill
                  px: 3, // horizontal padding
                  py: 1, // vertical padding
                  textTransform: "none", // avoid ALL CAPS
                  fontWeight: 500,
                  boxShadow: "none",
                  "&:hover": {
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  },
                }}
              >
                Create Cost Sheet
              </Button>
            )}

            {/* --- UPDATED BUTTON LOGIC --- */}
            {opportunity.stage === "Qualified" &&
              (opportunity.quotationStatus === "Pending" ? (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleOpenQuotationModal} // Call the new handler
                  sx={{ minWidth: 180 }}
                >
                  Edit Request
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<RequestQuote />}
                  onClick={handleOpenQuotationModal} // Call the new handler
                >
                  Request Quotation
                </Button>
              ))}

            <Chip
              label={opportunity.stage}
              color={stageColor[opportunity.stage] || "default"}
              size="medium"
              className="font-semibold"
              sx={{ fontWeight: 500, fontSize: 17, px: 2.5, py: 1.5 }}
            />
            {showEditButton && (
              <Button
                startIcon={<Edit />}
                variant="contained"
                onClick={() => navigate(`/opportunity/${id}/edit`)}
                color="primary"
                className="rounded-lg"
                disableElevation
                sx={{ minWidth: 110 }}
              >
                Edit
              </Button>
            )}
            <Button
              startIcon={<ArrowBack />}
              variant="outlined"
              onClick={() => navigate(-1)}
              color="inherit"
              className="rounded-lg"
              sx={{ minWidth: 110, ml: 1 }}
            >
              Back
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Info Sections */}
      <Grid container spacing={8}>
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            className="p-10 rounded-2xl bg-gray-50 mb-8 border border-gray-200"
            sx={{ minHeight: 350 }}
          >
            <Box className="flex items-center gap-2 mb-6">
              <Info fontSize="medium" color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Contact & Account
              </Typography>
            </Box>
            <WideSection label="Contact Name">
              {opportunity.contactName}
            </WideSection>
            <WideSection label="Account Manager">
              {opportunity.accountManager}
            </WideSection>
            <WideSection label="Type">{opportunity.type}</WideSection>
            <WideSection label="OEM">{opportunity.oem}</WideSection>
            <WideSection label="Description">
              {opportunity.detailedDescription}
            </WideSection>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            className="p-10 rounded-2xl bg-gray-50 mb-8 border border-gray-200"
            sx={{ minHeight: 350 }}
          >
            <Box className="flex items-center gap-2 mb-6">
              <CurrencyRupeeIcon fontSize="medium" color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Value & Timeline
              </Typography>
            </Box>
            <WideSection label="Expected Revenue (₹)">
              <span className="font-semibold text-green-800">
                ₹{opportunity.expectedRevenue?.toLocaleString() || "0"}
              </span>
            </WideSection>
            <WideSection label="Expected Margin ">
              {opportunity.expectedMargin || "0"}
            </WideSection>
            <WideSection label="Probability">
              {opportunity.probability || "0"}%
            </WideSection>
            <WideSection label="Closure Month">
              {opportunity.closureMonth || "N/A"}
            </WideSection>
            <WideSection label="Expected Closure Date">
              {opportunity.expectedClosureDate
                ? new Date(opportunity.expectedClosureDate).toLocaleDateString()
                : "N/A"}
            </WideSection>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            className="p-10 rounded-2xl bg-gray-50 border border-gray-200"
          >
            <Box className="flex items-center gap-2 mb-6">
              <Timeline fontSize="medium" color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Status & Notes
              </Typography>
            </Box>
            <WideSection label="Current Status">
              {opportunity.currentStatus}
            </WideSection>
            <WideSection label="Remarks">{opportunity.remark}</WideSection>
          </Paper>
        </Grid>

        {/* --- MODIFIED: Quotation History Section --- */}
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            className="p-10 rounded-2xl bg-gray-50 border border-gray-200"
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Quotation History
            </Typography>

            {/* PASS THE PROP HERE */}
            <QuotationDetails
              dealId={opportunity._id}
              onEdit={handleEditSpecificQuote}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* --- NEW: Quotation Request Dialog --- */}
      <Dialog
        open={quotationModalOpen}
        onClose={handleCloseQuotationModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {existingQuotation ? "Edit Quotation Request" : "Request Quotation"} -{" "}
          {opportunity?.opportunityId}
        </DialogTitle>
        <DialogContent>
          <QuotationForm
            dealId={opportunity._id}
            existingQuotation={existingQuotation} // <--- Pass the prop
            onQuotationRequested={onQuotationRequested}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuotationModal}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function WideSection({ label, children }) {
  return (
    <Box className="mb-6">
      <Typography
        variant="body2"
        className="text-gray-500 mb-0.5 uppercase tracking-wide"
        style={{ letterSpacing: 1.5 }}
      >
        {label}
      </Typography>
      <Typography
        className="mb-1"
        fontWeight={500}
        sx={{ wordBreak: "break-all", fontSize: 20 }}
      >
        {children || <span className="text-gray-400">N/A</span>}
      </Typography>
    </Box>
  );
}

export default OpportunityViewPage;
