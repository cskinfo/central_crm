// src/pages/SubAdminDashboard.jsx
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Chip,
} from "@mui/material";
import { CheckCircleOutline, HighlightOff, HourglassEmpty } from "@mui/icons-material";
import axios from "axios";
import { getAuthHeader } from "./Auth";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';

function StatCard({ title, value, icon, color, onClick }) {
  return (
    <Paper
      elevation={3}
      sx={{ p: 3, display: "flex", alignItems: "center", borderRadius: 3, cursor: 'pointer' }}
      onClick={onClick}
    >
      <Box sx={{ color: color, fontSize: 40, mr: 2 }}>{icon}</Box>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography color="text.secondary">{title}</Typography>
      </Box>
    </Paper>
  );
}

function SubAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [allQuotations, setAllQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, quotationsRes] = await Promise.all([
          axios.get("/api/quotations/stats", { headers: getAuthHeader() }),
          axios.get("/api/quotations?status=all", { headers: getAuthHeader() })
        ]);
        setStats(statsRes.data);
        setAllQuotations(quotationsRes.data);
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Sub-Admin Dashboard
      </Typography>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Pending Approvals"
            value={stats?.pendingCount || 0}
            icon={<HourglassEmpty fontSize="inherit" />}
            color="warning.main"
            onClick={() => navigate('/sub-admin/quotation-approvals?status=Pending')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Approved"
            value={stats?.approvedCount || 0}
            icon={<CheckCircleOutline fontSize="inherit" />}
            color="success.main"
            onClick={() => navigate('/sub-admin/quotation-approvals?status=Approved')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Rejected"
            value={stats?.rejectedCount || 0}
            icon={<HighlightOff fontSize="inherit" />}
            color="error.main"
            onClick={() => navigate('/sub-admin/quotation-approvals?status=Rejected')}
          />
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
            Quotation History
            </Typography>
            <Button
                variant="outlined"
                onClick={() => navigate('/sub-admin/quotation-approvals')}
            >
                View All
            </Button>
        </Box>
        
        {allQuotations.length > 0 ? (
          <List>
            {allQuotations.map((q, index) => (
              <>
                <ListItem key={q._id}>
                  <ListItemText
                    primary={`OPP ID: ${q.deal?.opportunityId} (${q.deal?.customer})`}
                    secondary={`Requested by ${q.requestedBy?.username} on ${format(new Date(q.createdAt), 'PP')}`}
                  />
                  <Chip 
                    label={q.status} 
                    color={q.status === 'Approved' ? 'success' : q.status === 'Rejected' ? 'error' : 'warning'}
                  />
                </ListItem>
                {index < allQuotations.length - 1 && <Divider />}
              </>
            ))}
          </List>
        ) : (
          <Typography sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
            No quotation history found.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default SubAdminDashboard;