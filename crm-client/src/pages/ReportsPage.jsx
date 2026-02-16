import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Alert,
  AlertTitle,
  Snackbar,
  Tooltip,
  IconButton,
  Popover,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  FilterList,
  Refresh,
  Download,
  Clear,
  Search,
  FilterListOff,
} from "@mui/icons-material";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// Helper to format user name
const getDisplayName = (user) => {
  if (!user) return "Unassigned";
  // Check if firstName or lastName exists
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  // Fallback to username if names are missing
  return user.username || "Unassigned";
};

function ReportsPage() {
  const getUserData = () => {
    try {
      // Check if your key is 'user' or 'userInfo' in Application -> Local Storage
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  };

  const currentUser = getUserData();
  const userRole = currentUser?.role || "salesperson"; // Default to salesperson
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: "all",
    fromDate: null,
    toDate: null,
    user: "all",
    stage: "all",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    customer: "",
    contactName: "",
    type: "",
    stage: "",
    revenue: "",
    closureDate: "",
    assignedTo: "",
  });

  // State for the filter popover
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentFilterColumn, setCurrentFilterColumn] = useState(null);

  useEffect(() => {
    if (userRole === "admin") fetchUsers();
    fetchOpportunities();
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showError("Failed to load user list");
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        dateRange: filters.dateRange,
        stage: filters.stage !== "all" ? filters.stage : undefined,
        search: filters.search || undefined,
        userId: filters.user !== "all" ? filters.user : undefined,
      };
      if (
        filters.dateRange === "custom" &&
        filters.fromDate &&
        filters.toDate
      ) {
        params.fromDate = format(filters.fromDate, "yyyy-MM-dd");
        params.toDate = format(filters.toDate, "yyyy-MM-dd");
      }
      const { data } = await axios.get("/api/deals/report", {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpportunities(data || []);
    } catch (err) {
      handleApiError(err);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "An unexpected error occurred.";
    showError(message);
  };

  const showError = (message) => {
    setError(message);
    setSnackbarOpen(true);
  };
  const handleFilterChange = (name, value) =>
    setFilters((prev) => ({ ...prev, [name]: value }));
  const handleColumnFilterChange = (column, value) =>
    setColumnFilters((prev) => ({ ...prev, [column]: value }));

  const clearColumnFilters = () => {
    setColumnFilters({
      customer: "",
      contactName: "",
      type: "",
      stage: "",
      revenue: "",
      closureDate: "",
      assignedTo: "",
    });
  };
  const resetFilters = () => {
    setFilters({
      dateRange: "all",
      fromDate: null,
      toDate: null,
      user: "all",
      stage: "all",
      search: "",
    });
    clearColumnFilters();
    fetchOpportunities();
  };

  const exportToExcel = () => {
    try {
      const dataToExport = filteredOpportunities.map((opp) => ({
        "Opportunity ID": opp.opportunityId,
        Customer: opp.customer,
        "Contact Name": opp.contactName,
        "Contact Email": opp.contactEmail,
        "Contact Phone": opp.contactPhone,
        Type: opp.type,
        Stage: opp.stage,
        "Expected Revenue (₹)": opp.expectedRevenue,
        "Expected Margin (%)": opp.expectedMargin,
        "Probability (%)": opp.probability,
        "Expected Closure Date": opp.expectedClosureDate
          ? format(parseISO(opp.expectedClosureDate), "yyyy-MM-dd")
          : "N/A",
        "Closure Month": opp.closureMonth,
        "Current Status": opp.currentStatus,
        OEM: opp.oem,
        "Detailed Description": opp.detailedDescription,
        Remark: opp.remark,
        "Created At": opp.createdAt
          ? format(parseISO(opp.createdAt), "yyyy-MM-dd HH:mm")
          : "N/A",
        "Assigned To": getDisplayName(opp.assignedTo),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      saveAs(
        new Blob([excelBuffer]),
        `opportunities_report_${format(new Date(), "yyyyMMdd")}.xlsx`
      );
    } catch (err) {
      console.error("Export Error:", err);
      showError("Failed to export data. Check console for details.");
    }
  };

  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter((opp) =>
        Object.keys(columnFilters).every((key) => {
          const filterValue = columnFilters[key].toLowerCase();
          if (!filterValue) return true;
          let cellValue;
          switch (key) {
            case "assignedTo":
              cellValue = getDisplayName(opp.assignedTo).toLowerCase();
              break;
            case "closureDate":
              cellValue = opp.expectedClosureDate
                ? format(
                    parseISO(opp.expectedClosureDate),
                    "MMM dd, yyyy"
                  ).toLowerCase()
                : "n/a";
              break;
            case "revenue":
              cellValue = (opp.expectedRevenue || "0")
                .toLocaleString()
                .toLowerCase();
              break;
            default:
              cellValue = (opp[key] || "").toString().toLowerCase();
          }
          return cellValue.includes(filterValue);
        })
      ),
    [opportunities, columnFilters]
  );

  const handleFilterIconClick = (event, columnName) => {
    setAnchorEl(event.currentTarget);
    setCurrentFilterColumn(columnName);
  };
  const handleClosePopover = () => setAnchorEl(null);

  const TableHeaderCell = ({ children, columnKey }) => (
    <TableCell sx={{ fontWeight: "bold" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {children}
        <Tooltip title={`Filter by ${children}`}>
          <IconButton
            size="small"
            onClick={(e) => handleFilterIconClick(e, columnKey)}
          >
            <FilterList
              fontSize="inherit"
              color={columnFilters[columnKey] ? "primary" : "action"}
            />
          </IconButton>
        </Tooltip>
      </Box>
    </TableCell>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {" "}
          Opportunities Report{" "}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={exportToExcel}
            disabled={filteredOpportunities.length === 0 || loading}
          >
            Export
          </Button>
        </Box>
      </Box>

      {showFilters && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) =>
                    handleFilterChange("dateRange", e.target.value)
                  }
                  label="Date Range"
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="quarter">This Quarter</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {filters.dateRange === "custom" && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="From"
                      value={filters.fromDate}
                      onChange={(d) => handleFilterChange("fromDate", d)}
                      renderInput={(p) => <TextField {...p} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="To"
                      value={filters.toDate}
                      onChange={(d) => handleFilterChange("toDate", d)}
                      renderInput={(p) => <TextField {...p} fullWidth />}
                      minDate={filters.fromDate}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
            {userRole === "admin" && (
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel>Sales Person</InputLabel>
                  <Select
                    value={filters.user}
                    onChange={(e) => handleFilterChange("user", e.target.value)}
                    label="User"
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    {users
                      .filter((u) => u.role === "salesperson")
                      .map((u) => (
                        <MenuItem key={u._id} value={u._id}>
                          {getDisplayName(u)}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Stage</InputLabel>
                <Select
                  value={filters.stage}
                  onChange={(e) => handleFilterChange("stage", e.target.value)}
                  label="Stage"
                >
                  <MenuItem value="all">All Stages</MenuItem>
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Qualified">Qualified</MenuItem>
                  <MenuItem value="Proposition">Proposition</MenuItem>
                  <MenuItem value="Won">Won</MenuItem>
                  <MenuItem value="Lost">Lost</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Global Search"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search records..."
              />
            </Grid>
            <Grid
              item
              xs={12}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 2,
              }}
            >
              <Button
                variant="text"
                startIcon={<FilterListOff />}
                onClick={clearColumnFilters}
              >
                {" "}
                Clear Column Filters{" "}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={resetFilters}
              >
                {" "}
                Clear All Filters{" "}
              </Button>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={fetchOpportunities}
                disabled={loading}
              >
                {" "}
                Apply & Refresh{" "}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error && !opportunities.length ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error Loading Report</AlertTitle> {error}{" "}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableHeaderCell columnKey="customer">Customer</TableHeaderCell>
                <TableHeaderCell columnKey="contactName">
                  Contact
                </TableHeaderCell>
                <TableHeaderCell columnKey="type">Type</TableHeaderCell>
                <TableHeaderCell columnKey="stage">Stage</TableHeaderCell>
                <TableHeaderCell columnKey="revenue">Revenue</TableHeaderCell>
                <TableHeaderCell columnKey="closureDate">
                  Closure Date
                </TableHeaderCell>
                {userRole === "admin" && (
                  <TableHeaderCell columnKey="assignedTo">
                    Assigned To
                  </TableHeaderCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp) => (
                  <TableRow key={opp._id} hover>
                    <TableCell>{opp.customer}</TableCell>
                    <TableCell>{opp.contactName}</TableCell>
                    <TableCell>{opp.type}</TableCell>
                    <TableCell>
                      <Chip
                        label={opp.stage}
                        size="small"
                        color={
                          opp.stage === "Won"
                            ? "success"
                            : opp.stage === "Lost"
                            ? "error"
                            : opp.stage === "Proposition"
                            ? "warning"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      ₹{opp.expectedRevenue?.toLocaleString() || "0"}
                    </TableCell>
                    <TableCell>
                      {opp.expectedClosureDate
                        ? format(
                            parseISO(opp.expectedClosureDate),
                            "MMM dd, yyyy"
                          )
                        : "N/A"}
                    </TableCell>
                    {userRole === "admin" && (
                      <TableCell>
                        {getDisplayName(opp.assignedTo)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={userRole === "admin" ? 7 : 6}
                    align="center"
                    sx={{ py: 4 }}
                  >
                    <Typography>No matching opportunities found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption">
            Filter by {currentFilterColumn}
          </Typography>
          <TextField
            autoFocus
            variant="standard"
            value={columnFilters[currentFilterColumn] || ""}
            onChange={(e) =>
              handleColumnFilterChange(currentFilterColumn, e.target.value)
            }
            onKeyDown={(e) => e.key === "Enter" && handleClosePopover()}
          />
          <Button size="small" onClick={handleClosePopover} sx={{ mt: 1 }}>
            Close
          </Button>
        </Box>
      </Popover>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {" "}
          {error}{" "}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ReportsPage; 