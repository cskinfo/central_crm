import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Edit, ArrowBack } from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";
import QuotationForm from "../Components/QuotationForm"; // Added import
import QuotationDetails from "../Components/QuotationDetails"; // Added import

function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOpportunity = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/deals/${id}`);
      setOpportunity(response.data);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      toast.error("Failed to load opportunity details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunity();
  }, [id]);

  const handleEdit = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (opportunity?.stage === "Won" && user.role !== "admin") {
      toast.warn("You cannot edit a 'Won' opportunity.");
      return;
    }
    navigate(`/opportunity/${id}/edit`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!opportunity) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Opportunity not found.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* --- Existing Opportunity Details --- */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <IconButton onClick={() => navigate("/opportunity")}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ ml: 1, flexGrow: 1 }}>
            {opportunity.opportunityId}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            Edit
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Customer</Typography>
            <Typography>{opportunity.customer}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Contact Name</Typography>
            <Typography>{opportunity.contactName}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Expected Revenue</Typography>
            <Typography>₹{opportunity.expectedRevenue.toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Stage</Typography>
            <Chip
              label={opportunity.stage}
              color={
                opportunity.stage === "Won"
                  ? "success"
                  : opportunity.stage === "Lost"
                  ? "error"
                  : "default"
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Current Status</Typography>
            <Typography>{opportunity.currentStatus || "N/A"}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Closure Month</Typography>
            <Typography>{opportunity.closureMonth || "N/A"}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2">Remark</Typography>
            <Typography>{opportunity.remark || "N/A"}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Expected Closure Date</Typography>
            <Typography>
              {opportunity.expectedClosureDate
                ? new Date(opportunity.expectedClosureDate).toLocaleDateString()
                : "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Probability</Typography>
            <Typography>{opportunity.probability || "0"}%</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* --- New Purchase & Quotation Section --- */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Purchase & Quotation
        </Typography>
        
        {/* Show Quotation Request Form only in 'Qualified' stage */}
        {opportunity.stage === "Qualified" && (
          <QuotationForm dealId={opportunity._id} onQuotationRequested={fetchOpportunity} />
        )}

        {/* Show Quotation Details from 'Purchase' stage onwards */}
        {(opportunity.stage === "Purchase" ||
          opportunity.stage === "Proposition" ||
          opportunity.stage === "Won" ||
          opportunity.stage === "Lost") && (
          <QuotationDetails dealId={opportunity._id} />
        )}
        
        {/* Message for stages where no quotation action is available */}
        {opportunity.stage !== "Qualified" && opportunity.stage !== "Purchase" && opportunity.stage !== "Proposition" && opportunity.stage !== "Won" && opportunity.stage !== "Lost" && (
           <Typography variant="body2">No quotation actions available at this stage.</Typography>
        )}
      </Paper>
    </Box>
  );
}

export default OpportunityDetailPage;