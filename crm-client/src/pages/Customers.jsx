import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  Alert,
  Stack,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddCustomerIcon,
  Refresh as RefreshIcon,
  ArrowRightAlt as ViewIcon,
  FilterList,
  FilterListOff,
  Close,
} from "@mui/icons-material";

import { getAuthHeader, getUserRole, getUserId } from "./Auth";
import { format } from "date-fns";

// --- Initial Filters State ---
const INITIAL_FILTERS = {
  customer: "",
  contactName: "",
  opportunityId: "",
  revenue: "",
  createdAt: "",
  salesperson: "all",
};

// --- Filterable Header Component (Pure Component) ---
const FilterableHeader = ({
  label,
  columnKey,
  width,
  columnFilters,
  onFilterClick,
  align = "left",
}) => (
  <TableCell width={width} align={align} sx={{ fontWeight: "bold" }}>
    <Box
      display="flex"
      alignItems="center"
      justifyContent={align === "right" ? "flex-end" : "flex-start"}
      gap={0.5}
    >
      {label}
      <IconButton
        size="small"
        onClick={(e) => onFilterClick(e, columnKey)}
        color={
          columnFilters[columnKey] && columnFilters[columnKey] !== "all"
            ? "primary"
            : "default"
        }
      >
        <FilterList fontSize="small" />
      </IconButton>
    </Box>
  </TableCell>
);

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, newThisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  // --- Filter & Pagination State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState(INITIAL_FILTERS);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const userRole = getUserRole();
  const userId = getUserId();
  const navigate = useNavigate();

  // --- 1. OPTIMIZED DATA FETCHING ---
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [customersRes, statsRes] = await Promise.all([
        fetch("/api/customers", { headers: getAuthHeader() }),
        fetch("/api/customers/stats", { headers: getAuthHeader() }),
      ]);

      if (!customersRes.ok) throw new Error("Failed to fetch customers");
      if (!statsRes.ok) throw new Error("Failed to fetch customer stats");

      const customersData = await customersRes.json();
      const statsData = await statsRes.json();

      setCustomers(customersData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array as it uses no external reactive variables

  const fetchUsers = useCallback(async () => {
    if (userRole !== "admin") return;
    try {
      const res = await fetch("/api/users", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      // Fail silently
    }
  }, [userRole]);

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, [fetchCustomers, fetchUsers]);

  const handleRefresh = useCallback(() => {
    fetchCustomers();
    fetchUsers();
  }, [fetchCustomers, fetchUsers]);

  // --- 2. OPTIMIZATION: Salesperson Map (O(1) Lookup) ---
  const userMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      let name = u.username;
      if (u.firstName || u.lastName) {
        name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      }
      map[String(u._id)] = name;
    });
    return map;
  }, [users]);

  // --- Derived List for Salesperson Filter ---
  const salespersonList = useMemo(() => {
    if (userRole !== "admin") return [];
    // Use Set to get unique names from the map values
    const names = new Set(Object.values(userMap));
    return Array.from(names).sort();
  }, [userMap, userRole]);

  // --- Main Filtering Logic ---
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const name = (customer.customer || "").toLowerCase();
      const contact = (customer.contactName || "").toLowerCase();
      const oppId = (customer.opportunityId || "").toLowerCase();
      const revenue = (customer.expectedRevenue || 0).toString();
      const createdDate = customer.createdAt
        ? format(new Date(customer.createdAt), "MMM dd, yyyy").toLowerCase()
        : "";

      // Optimized Lookup
      const spName =
        userRole === "admin"
          ? userMap[String(customer.salespersonId)] || "Unassigned"
          : "";

      // 1. Global Search
      const term = searchTerm.toLowerCase();
      const matchesGlobal =
        name.includes(term) || contact.includes(term) || oppId.includes(term);

      if (!matchesGlobal) return false;

      // 2. Column Filters
      if (
        columnFilters.customer &&
        !name.includes(columnFilters.customer.toLowerCase())
      )
        return false;
      if (
        columnFilters.contactName &&
        !contact.includes(columnFilters.contactName.toLowerCase())
      )
        return false;
      if (
        columnFilters.opportunityId &&
        !oppId.includes(columnFilters.opportunityId.toLowerCase())
      )
        return false;
      if (columnFilters.revenue && !revenue.includes(columnFilters.revenue))
        return false;
      if (
        columnFilters.createdAt &&
        !createdDate.includes(columnFilters.createdAt.toLowerCase())
      )
        return false;

      if (columnFilters.salesperson !== "all") {
        if (spName !== columnFilters.salesperson) return false;
      }

      return true;
    });
  }, [customers, searchTerm, columnFilters, userMap, userRole]);

  // --- Pagination Logic ---
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredCustomers, page, rowsPerPage]);

  const isFilterActive = useMemo(() => {
    const isSearchActive = searchTerm.trim() !== "";
    const isColumnFilterActive =
      JSON.stringify(columnFilters) !== JSON.stringify(INITIAL_FILTERS);
    return isSearchActive || isColumnFilterActive;
  }, [searchTerm, columnFilters]);

  // --- Handlers (Memoized) ---
  const handleChangePage = useCallback(
    (event, newPage) => setPage(newPage),
    []
  );

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleFilterClick = useCallback((event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setActiveFilterColumn(column);
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterAnchorEl(null);
    setActiveFilterColumn(null);
  }, []);

  const handleFilterChange = useCallback(
    (value) => {
      setColumnFilters((prev) => ({
        ...prev,
        [activeFilterColumn]: value,
      }));
      setPage(0);
    },
    [activeFilterColumn]
  );

  const handleClearAllFilters = useCallback(() => {
    setSearchTerm("");
    setColumnFilters(INITIAL_FILTERS);
    setPage(0);
  }, []);

  const handleRowClick = useCallback(
    (customer) => {
      navigate(
        userRole === "admin"
          ? `/admin/opportunities/${customer._id}/view`
          : `/sales/opportunities/${customer._id}/view`
      );
    },
    [navigate, userRole]
  );

  // --- Filter Popover Content ---
  const renderFilterContent = () => {
    if (!activeFilterColumn) return null;

    if (activeFilterColumn === "salesperson") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Select Salesperson</InputLabel>
          <Select
            value={columnFilters.salesperson}
            label="Select Salesperson"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {salespersonList.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          placeholder={`Filter ${activeFilterColumn}...`}
          value={columnFilters[activeFilterColumn]}
          onChange={(e) => handleFilterChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFilterClose()}
          variant="standard"
          fullWidth
        />
      </Box>
    );
  };

  if (loading)
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <Typography>Loading...</Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: "bold" }}>
          Customers
        </Typography>
        {userRole === "admin" && (
          <Button
            variant="contained"
            startIcon={<AddCustomerIcon />}
            onClick={() =>
              navigate(
                userRole === "admin"
                  ? "/admin/opportunities"
                  : "/sales/opportunities"
              )
            }
            sx={{ mr: 2 }}
          >
            Add Customer
          </Button>
        )}
        <IconButton onClick={handleRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Total Customers
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalCustomers}
              </Typography>
              <Typography color="textSecondary" variant="body2">
                {stats.newThisWeek} new this week
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search & Filter Bar */}
      <Paper
        elevation={1}
        sx={{ p: 2, mb: 3, display: "flex", gap: 2, alignItems: "center" }}
      >
        <TextField
          sx={{ flexGrow: 1 }}
          variant="outlined"
          placeholder="Global Search (Customer, Contact, Opp ID)..."
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<FilterListOff />}
          onClick={handleClearAllFilters}
          disabled={!isFilterActive}
          sx={{ height: 40 }}
        >
          Clear Filters
        </Button>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Customers Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <FilterableHeader
                  label="Customer"
                  columnKey="customer"
                  columnFilters={columnFilters}
                  onFilterClick={handleFilterClick}
                />
                <FilterableHeader
                  label="Contact"
                  columnKey="contactName"
                  columnFilters={columnFilters}
                  onFilterClick={handleFilterClick}
                />
                <FilterableHeader
                  label="Opp ID"
                  columnKey="opportunityId"
                  columnFilters={columnFilters}
                  onFilterClick={handleFilterClick}
                />
                <FilterableHeader
                  label="Revenue"
                  columnKey="revenue"
                  columnFilters={columnFilters}
                  onFilterClick={handleFilterClick}
                />
                <FilterableHeader
                  label="Created"
                  columnKey="createdAt"
                  columnFilters={columnFilters}
                  onFilterClick={handleFilterClick}
                />
                {userRole === "admin" && (
                  <FilterableHeader
                    label="Salesperson"
                    columnKey="salesperson"
                    columnFilters={columnFilters}
                    onFilterClick={handleFilterClick}
                  />
                )}
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => (
                  <TableRow
                    key={customer._id}
                    onClick={() => handleRowClick(customer)}
                    sx={{
                      cursor: "pointer",
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar
                          sx={{
                            mr: 1,
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            bgcolor: "primary.main",
                          }}
                        >
                          {customer.customer?.charAt(0) || "C"}
                        </Avatar>{" "}
                        {customer.customer || "N/A"}
                      </Box>
                    </TableCell>
                    <TableCell>{customer.contactName || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        label={customer.opportunityId || "N/A"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      ₹{customer.expectedRevenue?.toLocaleString() || "0"}
                    </TableCell>
                    <TableCell>
                      {customer.createdAt
                        ? format(new Date(customer.createdAt), "MMM dd, yyyy")
                        : "N/A"}
                    </TableCell>
                    {userRole === "admin" && (
                      <TableCell>
                        {userMap[String(customer.salespersonId)] ||
                          "Unassigned"}
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(customer);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={userRole === "admin" ? 7 : 6}
                    align="center"
                    sx={{ py: 4 }}
                  >
                    <Typography color="textSecondary" gutterBottom>
                      No customers match your criteria.
                    </Typography>
                    {customers.length === 0 && (
                      <Button
                        sx={{ mt: 1 }}
                        variant="contained"
                        color="primary"
                        onClick={() =>
                          navigate(
                            userRole === "admin"
                              ? "/admin/opportunities"
                              : "/sales/opportunities"
                          )
                        }
                      >
                        Go to Opportunities
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            pt={2}
          >
            <Typography variant="caption" fontWeight="bold">
              Filter by {activeFilterColumn}
            </Typography>
            <IconButton size="small" onClick={handleFilterClose}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
          {renderFilterContent()}
        </Box>
      </Popover>
    </Box>
  );
}

export default Customers;
