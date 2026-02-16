import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isAfter,
  parseISO,
} from "date-fns";
import SharedDashboardLayout from "./SharedDashboardLayout";
import axios from "axios";
import { getAuthHeader } from "./Auth";
import { useNavigate, useSearchParams } from "react-router-dom";

// Compact Metric Block Component
const MetricCard = ({ title, value, subValue, color = "text.primary" }) => (
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
    {subValue && (
      <Typography
        variant="caption"
        color="text.secondary"
        lineHeight={1}
        mt={0.5}
      >
        {subValue}
      </Typography>
    )}
  </Paper>
);

function AdminDashboard() {
  const [allDeals, setAllDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    user: searchParams.get("user") || "all",
    dateRange: searchParams.get("dateRange") || "all",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [dealsRes, usersRes] = await Promise.all([
        axios.get("/api/deals", { headers: getAuthHeader() }),
        axios.get("/api/users", { headers: getAuthHeader() }),
      ]);
      setAllDeals(dealsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError("Failed to load dashboard data. Please refresh the page.");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSearchParams(filters);
  }, [filters, setSearchParams]);

  const filteredDeals = useMemo(() => {
    let dealsToFilter = [...allDeals];

    if (filters.user !== "all") {
      dealsToFilter = dealsToFilter.filter(
        (deal) => (deal.assignedTo?._id || deal.salespersonId) === filters.user
      );
    }

    if (filters.dateRange !== "all") {
      let startDate;
      const today = startOfToday();
      if (filters.dateRange === "today") startDate = today;
      if (filters.dateRange === "week")
        startDate = startOfWeek(today, { weekStartsOn: 1 });
      if (filters.dateRange === "month") startDate = startOfMonth(today);
      if (filters.dateRange === "year") startDate = startOfYear(today);

      if (startDate) {
        dealsToFilter = dealsToFilter.filter((deal) => {
          if (!deal.createdAt) return false;
          const dealDate = parseISO(deal.createdAt);
          return isAfter(dealDate, startDate);
        });
      }
    }
    return dealsToFilter;
  }, [allDeals, filters]);

  const kpiStats = useMemo(() => {
    const getSumByStages = (data, stages, field) =>
      data
        .filter((deal) => stages.includes(deal.stage))
        .reduce((sum, deal) => sum + (deal[field] || 0), 0);

    const getCount = (data, stages) =>
      data.filter((deal) => stages.includes(deal.stage)).length;

    const wonCount = getCount(filteredDeals, ["Won"]);
    const inProgressStages = ["New", "Qualified", "Proposition"];
    const inProgressCount = getCount(filteredDeals, inProgressStages);

    return {
      totalLeads: filteredDeals.length,
      wonCount,
      inProgressCount,
      salesTarget: getSumByStages(
        filteredDeals,
        inProgressStages,
        "expectedRevenue"
      ),
      revenueGenerated: getSumByStages(
        filteredDeals,
        ["Won"],
        "expectedRevenue"
      ),
      expectedMargin: getSumByStages(
        filteredDeals,
        inProgressStages,
        "expectedMargin"
      ),
      marginEarned: getSumByStages(filteredDeals, ["Won"], "expectedMargin"),
    };
  }, [filteredDeals]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ user: "all", dateRange: "all" });
  };

  // --- FIXED: Function to save ID to LocalStorage ---
  const handleSelectOpportunity = (id) => {
    localStorage.setItem("lastViewedDealId", id); // Changed to localStorage
    navigate(`/admin/opportunities/${id}/view`);
  };

  const onDragEnd = useCallback(
    async (result) => {
      const { source, destination, draggableId } = result;
      if (
        !destination ||
        (source.droppableId === destination.droppableId &&
          source.index === destination.index)
      ) {
        return;
      }
      const newStage = destination.droppableId;
      const originalDeals = [...allDeals];

      setAllDeals((prevDeals) =>
        prevDeals.map((deal) =>
          deal._id === draggableId ? { ...deal, stage: newStage } : deal
        )
      );

      try {
        await axios.patch(
          `/api/deals/${draggableId}/stage`,
          { stage: newStage },
          { headers: getAuthHeader() }
        );
        fetchData();
      } catch (err) {
        setError("Failed to update opportunity stage. Reverting changes.");
        setAllDeals(originalDeals);
      }
    },
    [allDeals, fetchData]
  );

  return (
    <Box p={2} maxWidth="100%">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1.5}
      >
        <Typography variant="h5" fontWeight={700} color="#1a237e">
          Admin Overview
        </Typography>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 0.5, display: "flex", gap: 1, bgcolor: "#f8f9fa" }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: "0.8rem", top: -3 }}>User</InputLabel>
            <Select
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              label="User"
              sx={{ height: 32, fontSize: "0.85rem" }}
            >
              <MenuItem value="all">All Users</MenuItem>
              {users.map((user) => (
                <MenuItem
                  key={user._id}
                  value={user._id}
                  sx={{ fontSize: "0.85rem" }}
                >
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: "0.8rem", top: -3 }}>Period</InputLabel>
            <Select
              name="dateRange"
              value={filters.dateRange}
              onChange={handleFilterChange}
              label="Period"
              sx={{ height: 32, fontSize: "0.85rem" }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="text"
            onClick={resetFilters}
            sx={{ height: 32, minWidth: "auto", px: 2 }}
          >
            Reset
          </Button>
        </Paper>
      </Box>

      {loading ? (
        <Box mt={5} textAlign="center">
          <CircularProgress size={30} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Grid container spacing={1.5} mb={2}>
            <Grid item xs={6} md={2}>
              <MetricCard title="Total Leads" value={kpiStats.totalLeads} />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Pipeline Status"
                value={
                  <>
                    <span style={{ color: "#2e7d32" }}>
                      {kpiStats.wonCount} Won
                    </span>{" "}
                    /{" "}
                    <span style={{ color: "#ed6c02" }}>
                      {kpiStats.inProgressCount} Active
                    </span>
                  </>
                }
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Exp. Revenue"
                value={`₹${kpiStats.salesTarget.toLocaleString()}`}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Rev. Generated"
                value={`₹${kpiStats.revenueGenerated.toLocaleString()}`}
                color="text.secondary"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Exp. Margin"
                value={`₹${kpiStats.expectedMargin.toLocaleString()}`}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <MetricCard
                title="Margin Earned"
                value={`₹${kpiStats.marginEarned.toLocaleString()}`}
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
            {/* FIXED: Passed the handleSelectOpportunity function reference */}
            <SharedDashboardLayout
              title="Pipeline Board"
              userRole="admin"
              deals={filteredDeals}
              loading={loading}
              onDragEnd={onDragEnd}
              onSelectOpportunity={handleSelectOpportunity}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

export default AdminDashboard;
