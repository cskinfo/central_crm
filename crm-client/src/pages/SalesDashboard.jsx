import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Grid,
  Paper,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import SharedDashboardLayout from "../pages/SharedDashboardLayout";
import axios from "axios";
import { getAuthHeader } from "./Auth";
import { useNavigate } from "react-router-dom";

// Reusing the compact MetricCard for consistency
const MetricCard = ({ title, value, color = "text.primary", subValue }) => (
  <Paper
    elevation={1}
    sx={{
      p: 1.5,
      textAlign: "center",
      borderRadius: 2,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      bgcolor: "background.paper",
    }}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      fontWeight={600}
      textTransform="uppercase"
      letterSpacing={0.5}
    >
      {title}
    </Typography>
    <Typography
      variant="h6"
      color={color}
      fontWeight={700}
      lineHeight={1.2}
      mt={0.5}
    >
      {value}
    </Typography>
    {subValue && subValue}
  </Paper>
);

function SalesDashboard() {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const fetchDealsAndStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [dealsRes, statsRes] = await Promise.all([
        axios.get("/api/deals", { headers: getAuthHeader() }),
        axios.get("/api/deals/stats", { headers: getAuthHeader() }),
      ]);
      setDeals(
        dealsRes.data.filter(
          (deal) =>
            deal.salespersonId === user.id ||
            (deal.assignedTo && deal.assignedTo._id === user.id)
        )
      );
      setStats(statsRes.data);
    } catch (err) {
      setError("Failed to load salesperson dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealsAndStats();
  }, [user?.id]);

  // KPI Calculations
  const totalLeads =
    stats?.reduce((acc, stage) => acc + (stage.count || 0), 0) ?? 0;
  const wonCount = stats?.find((x) => x.stage === "Won")?.count || 0;
  const inProgressCount =
    (stats?.find((x) => x.stage === "New")?.count || 0) +
    (stats?.find((x) => x.stage === "Qualified")?.count || 0) +
    (stats?.find((x) => x.stage === "Proposition")?.count || 0);

  const salesTarget =
    ["New", "Qualified", "Proposition"].reduce((acc, stage) => {
      const stageData = stats?.find((x) => x.stage === stage);
      return acc + (stageData?.expectedRevenue || 0);
    }, 0) || 0;

  const revenueGenerated = deals
    .filter((deal) => deal.stage === "Won")
    .reduce((sum, deal) => sum + (deal.expectedRevenue || 0), 0);

  const marginExpected = deals
    .filter((deal) => ["New", "Qualified", "Proposition"].includes(deal.stage))
    .reduce((sum, deal) => sum + (deal.expectedMargin || 0), 0);

  const marginEarned = deals
    .filter((deal) => deal.stage === "Won")
    .reduce((sum, deal) => sum + (deal.expectedMargin || 0), 0);

  const updateLocalDealStage = (dealId, newStage) => {
    setDeals((prevDeals) =>
      prevDeals.map((deal) =>
        deal._id === dealId ? { ...deal, stage: newStage } : deal
      )
    );
  };

  const onDragEnd = useCallback(
    async (result) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      const newStage = destination.droppableId;
      try {
        updateLocalDealStage(draggableId, newStage);
        await axios.patch(
          `/api/deals/${draggableId}/stage`,
          { stage: newStage },
          { headers: getAuthHeader() }
        );
        const statsRes = await axios.get("/api/deals/stats", {
          headers: getAuthHeader(),
        });
        setStats(statsRes.data);
      } catch (err) {
        setError("Failed to update stage.");
        fetchDealsAndStats();
      }
    },
    [getAuthHeader]
  );

  // --- FIXED: Switch to localStorage ---
  const handleSelectOpportunity = (id) => {
    localStorage.setItem("lastViewedDealId", id);
    navigate(`/sales/opportunities/${id}/view`);
  };

  return (
    <Box p={2} maxWidth="100%">
      <Typography variant="h5" fontWeight={700} color="#1a237e" mb={1.5}>
        Sales Overview
      </Typography>

      {loading ? (
        <Box mt={5} textAlign="center">
          <CircularProgress size={30} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Grid container spacing={1.5} mb={2}>
            <Grid item xs={6} md={2}>
              <MetricCard title="Total Opps" value={deals.length} />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Status"
                value={
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    <span style={{ color: "#2e7d32" }}>{wonCount} Won</span> /{" "}
                    <span style={{ color: "#ed6c02" }}>
                      {inProgressCount} Active
                    </span>
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Exp. Revenue"
                value={`₹${salesTarget.toLocaleString()}`}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Revenue Gen."
                value={`₹${revenueGenerated.toLocaleString()}`}
                color="text.secondary"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Exp. Margin"
                value={`₹${marginExpected.toLocaleString()}`}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Margin Earned"
                value={`₹${marginEarned.toLocaleString()}`}
                color="success.main"
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              borderTop: "1px solid #e0e0e0",
              pt: 2,
              height: "calc(100vh - 200px)",
              minHeight: "500px",
            }}
          >
            <SharedDashboardLayout
              title="My Pipeline"
              userRole="salesperson"
              deals={deals}
              loading={loading}
              onDragEnd={onDragEnd}
              onEditDeal={() => {}}
              onSelectOpportunity={handleSelectOpportunity}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

export default SalesDashboard;
