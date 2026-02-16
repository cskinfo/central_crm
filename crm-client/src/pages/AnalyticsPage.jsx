import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  useTheme,
  Alert,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, Timeline as TimelineIcon } from "@mui/icons-material";
import axios from "axios";
import { getAuthHeader, getUserId } from "./Auth";

// A more vibrant and modern color palette for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

// A reusable card component for consistent styling
function AnalyticsCard({ title, icon, children }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 4,
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.09)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        {icon}
        <Typography variant="h6" fontWeight={600} sx={{ ml: 1.5 }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, width: '100%', height: 400 }}>
        {children}
      </Box>
    </Paper>
  );
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper elevation={4} sx={{ p: 2, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(5px)', borderRadius: 2 }}>
          <Typography fontWeight="bold" sx={{ mb: 1 }}>{label}</Typography>
          {payload.map((pld, index) => (
            <Typography key={index} sx={{ color: pld.color }}>
              {`${pld.name}: ${pld.value.toLocaleString()}`}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
};


function AnalyticsPage({ userRole }) {
  const [deals, setDeals] = useState([]);
  const [timeRange, setTimeRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const userId = getUserId();

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        const params = {};
        if (userRole === "salesperson") params.salespersonId = userId;
        const response = await axios.get("/api/deals", {
          params,
          headers: getAuthHeader(),
        });
        setDeals(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to load analytics data. Please try again later.");
        setDeals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, [userRole, userId]);

  const processStageData = () => {
    const stageCounts = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stageCounts).map(([name, value]) => ({ name, value }));
  };

  const processRevenueData = () => {
    const revenueByStage = deals.reduce((acc, deal) => {
        if (deal.expectedRevenue) {
            acc[deal.stage] = (acc[deal.stage] || 0) + deal.expectedRevenue;
        }
        return acc;
    }, {});
    return Object.entries(revenueByStage).map(([name, revenue]) => ({
      name,
      Revenue: Math.round(revenue),
    }));
  };

  const processTimeSeriesData = () => {
    const dateGroups = {};
    const now = new Date();
    
    deals.forEach((deal) => {
        if (!deal.createdAt) return;
        const dealDate = new Date(deal.createdAt);
        let key;

        if (timeRange === 'week' && (now - dealDate) < 7 * 24 * 60 * 60 * 1000) {
            key = dealDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateGroups[key] = (dateGroups[key] || 0) + 1;
        }
        else if (timeRange === 'month' && (now - dealDate) < 30 * 24 * 60 * 60 * 1000) {
            const weekStart = new Date(dealDate);
            weekStart.setDate(dealDate.getDate() - dealDate.getDay());
            key = `Wk of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            dateGroups[key] = (dateGroups[key] || 0) + 1;
        }
        else if (timeRange === 'year' && (now - dealDate) < 365 * 24 * 60 * 60 * 1000) {
            key = dealDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            dateGroups[key] = (dateGroups[key] || 0) + 1;
        }
    });

    return Object.entries(dateGroups).map(([name, count]) => ({ name, Deals: count }));
  };
  
  const stageData = processStageData();
  const revenueData = processRevenueData();
  const timeSeriesData = processTimeSeriesData();

  if (loading) {
    return <Box minHeight="80vh" display="flex" alignItems="center" justifyContent="center"><CircularProgress /></Box>;
  }
  
  if (error) {
    return <Container sx={{py: 5}}><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Typography variant="h4" fontWeight={700}>
          Sales Analytics
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={5}>
          <AnalyticsCard title="Deal Stage Distribution" icon={<PieChartIcon color="primary" />}>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stageData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <Box display="flex" alignItems="center" justifyContent="center" height="100%"><Typography color="text.secondary">Not enough data to display</Typography></Box>}
          </AnalyticsCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <AnalyticsCard  title="Expected Revenue by Stage" icon={<BarChartIcon color="primary" />}>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Revenue" name="Revenue (₹)" radius={[8, 8, 0, 0]}>
                    {revenueData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Box display="flex" alignItems="center" justifyContent="center" height="100%"><Typography color="text.secondary">Not enough data to display</Typography></Box>}
          </AnalyticsCard>
        </Grid>

        <Grid item xs={12}>
          <AnalyticsCard title="New Deals Over Time" icon={<TimelineIcon color="primary" />}>
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="Deals" fill={theme.palette.primary.main} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Box display="flex" alignItems="center" justifyContent="center" height="100%"><Typography color="text.secondary">Not enough data to display</Typography></Box>}
          </AnalyticsCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AnalyticsPage;
