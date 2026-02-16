import { useState, useEffect, useMemo } from "react";
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
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  TextField,
  TablePagination,
  InputAdornment,
  Button,
  Popover,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Edit, 
  Search, 
  Circle, 
  FilterList, 
  Download, 
  Close,
  FilterListOff
} from "@mui/icons-material";
import { getAuthHeader } from "./Auth";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Helper to format user name
const getDisplayName = (user) => {
  if (!user) return "-";
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  return user.username || "-";
};

// Initial state for filters
const INITIAL_FILTERS = {
  status: "all",
  opportunityId: "",
  customer: "",
  accountManager: "all",
  description: "",
  orderValue: "",
  updatedAt: ""
};

// --- COMPONENT DEFINED OUTSIDE TO PREVENT RE-RENDER ISSUES ---
const FilterableHeader = ({ label, columnKey, width, columnFilters, onFilterClick }) => (
  <TableCell width={width}>
    <Box display="flex" alignItems="center" gap={0.5}>
      <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
      <IconButton 
        size="small" 
        onClick={(e) => onFilterClick(e, columnKey)}
        color={columnFilters[columnKey] && columnFilters[columnKey] !== "all" ? "primary" : "default"}
      >
        <FilterList fontSize="small" />
      </IconButton>
    </Box>
  </TableCell>
);

export default function CostSheetListPage() {
  const [deals, setDeals] = useState([]);
  const [sheets, setSheets] = useState({}); // Map of dealId -> sheetData
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState(INITIAL_FILTERS);

  // Filter Popover State
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const rolePrefix =
    user.role === "admin"
      ? "/admin"
      : user.role === "sub-admin"
      ? "/sub-admin"
      : "/sales";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Deals
      const dealsRes = await axios.get("/api/deals", {
        headers: getAuthHeader(),
      });
      // Filter only Won deals
      const wonDeals = dealsRes.data.filter((d) => d.stage === "Won");
      const sheetMap = {};

      await Promise.all(
        wonDeals.map(async (deal) => {
          try {
            const sheetRes = await axios.get(
              `/api/project-cost/deal/${deal._id}`,
              { headers: getAuthHeader() }
            );
            if (!sheetRes.data.isNew) {
              sheetMap[deal._id] = sheetRes.data;
            }
          } catch (err) {
            console.warn(`Could not check sheet for ${deal._id}`);
          }
        })
      );

      setDeals(wonDeals);
      setSheets(sheetMap);
    } catch (err) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // --- Derived Data for Filters ---
  const accountManagers = useMemo(() => {
    const managers = new Set();
    deals.forEach(deal => {
      const name = getDisplayName(deal.assignedTo);
      if (name !== "-") managers.add(name);
    });
    return Array.from(managers).sort();
  }, [deals]);

  // --- Filtering Logic ---
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const sheet = sheets[deal._id];
      const hasSheet = !!sheet;
      const salespersonName = getDisplayName(deal.assignedTo);
      const description = deal.detailedDescription || deal.remark || "";
      const orderVal = deal.expectedRevenue ? deal.expectedRevenue.toString() : "";
      const lastUpdated = sheet && sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : "";

      // 1. Global Search
      const term = searchTerm.toLowerCase();
      const matchesGlobal = 
        (deal.opportunityId && deal.opportunityId.toLowerCase().includes(term)) ||
        (deal.customer && deal.customer.toLowerCase().includes(term)) ||
        (salespersonName.toLowerCase().includes(term));

      if (!matchesGlobal) return false;

      // 2. Column Filters
      if (columnFilters.status !== "all") {
        const status = hasSheet ? "created" : "pending";
        if (status !== columnFilters.status) return false;
      }

      if (columnFilters.accountManager !== "all") {
        if (salespersonName !== columnFilters.accountManager) return false;
      }

      if (columnFilters.opportunityId && !deal.opportunityId?.toLowerCase().includes(columnFilters.opportunityId.toLowerCase())) return false;
      if (columnFilters.customer && !deal.customer?.toLowerCase().includes(columnFilters.customer.toLowerCase())) return false;
      if (columnFilters.description && !description.toLowerCase().includes(columnFilters.description.toLowerCase())) return false;
      if (columnFilters.orderValue && !orderVal.includes(columnFilters.orderValue)) return false;
      if (columnFilters.updatedAt && !lastUpdated.includes(columnFilters.updatedAt)) return false;

      return true;
    });
  }, [deals, sheets, searchTerm, columnFilters]);

  // Check if any filter is active
  const isFilterActive = useMemo(() => {
    const isSearchActive = searchTerm.trim() !== "";
    const isColumnFilterActive = JSON.stringify(columnFilters) !== JSON.stringify(INITIAL_FILTERS);
    return isSearchActive || isColumnFilterActive;
  }, [searchTerm, columnFilters]);

  // --- Handlers ---
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterClick = (event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setActiveFilterColumn(column);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setActiveFilterColumn(null);
  };

  const handleFilterChange = (value) => {
    setColumnFilters(prev => ({
      ...prev,
      [activeFilterColumn]: value
    }));
    setPage(0);
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setColumnFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const handleExport = () => {
    try {
      const dataToExport = filteredDeals.map(deal => {
        const sheet = sheets[deal._id];
        return {
          "Status": !!sheet ? "Created" : "Pending",
          "Opportunity ID": deal.opportunityId,
          "Customer": deal.customer,
          "Account Manager": getDisplayName(deal.assignedTo),
          "Description": deal.detailedDescription || deal.remark || "-",
          "Order Value": deal.expectedRevenue || 0,
          "Last Updated": sheet && sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : "-"
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cost Sheets");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([excelBuffer]), `Cost_Sheets_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data");
    }
  };

  // Slice data for current page
  const paginatedDeals = filteredDeals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // --- Render Filter Popover Content ---
  const renderFilterContent = () => {
    if (!activeFilterColumn) return null;

    if (activeFilterColumn === "accountManager") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Select Manager</InputLabel>
          <Select
            value={columnFilters.accountManager}
            label="Select Manager"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="all">All Managers</MenuItem>
            {accountManagers.map(name => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (activeFilterColumn === "status") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={columnFilters.status}
            label="Status"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="created">Created</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>
      );
    }

    // Default Text Input
    return (
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          placeholder={`Filter ${activeFilterColumn}...`}
          value={columnFilters[activeFilterColumn]}
          onChange={(e) => handleFilterChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilterClose()}
          variant="standard"
          fullWidth
        />
      </Box>
    );
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header & Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Project Cost Sheets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage cost analysis for Won Opportunities.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<FilterListOff />}
            onClick={handleClearAllFilters}
            disabled={!isFilterActive}
          >
            Clear Filters
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<Download />} 
            onClick={handleExport}
          >
            Export Report
          </Button>
        </Stack>
      </Box>

      {/* Global Search Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Global Search (Opp ID, Customer, Manager)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment>,
          }}
          size="small"
        />
      </Paper>

      {/* Main Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                {/* We pass the props to the external component */}
                <FilterableHeader 
                  label="Status" 
                  columnKey="status" 
                  width="8%" 
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
                  label="Customer" 
                  columnKey="customer" 
                  columnFilters={columnFilters} 
                  onFilterClick={handleFilterClick} 
                />
                <FilterableHeader 
                  label="Account Manager" 
                  columnKey="accountManager" 
                  columnFilters={columnFilters} 
                  onFilterClick={handleFilterClick} 
                />
                <FilterableHeader 
                  label="Description" 
                  columnKey="description" 
                  width="20%" 
                  columnFilters={columnFilters} 
                  onFilterClick={handleFilterClick} 
                />
                <FilterableHeader 
                  label="Order Value" 
                  columnKey="orderValue" 
                  columnFilters={columnFilters} 
                  onFilterClick={handleFilterClick} 
                />
                <FilterableHeader 
                  label="Last Updated" 
                  columnKey="updatedAt" 
                  columnFilters={columnFilters} 
                  onFilterClick={handleFilterClick} 
                />
                <TableCell align="center"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDeals.map((deal) => {
                  const sheet = sheets[deal._id];
                  const hasSheet = !!sheet;
                  const description = deal.detailedDescription || deal.remark || "-";
                  const truncatedDesc = description.length > 50 ? description.substring(0, 50) + "..." : description;
                  const salespersonName = getDisplayName(deal.assignedTo);

                  return (
                    <TableRow key={deal._id} hover>
                      {/* STATUS */}
                      <TableCell align="center">
                        <Tooltip title={hasSheet ? "Created" : "Pending"}>
                          <Circle sx={{ fontSize: 14, color: hasSheet ? "#2e7d32" : "#d32f2f" }} />
                        </Tooltip>
                      </TableCell>

                      <TableCell>{deal.opportunityId}</TableCell>
                      <TableCell>{deal.customer}</TableCell>
                      <TableCell>{salespersonName}</TableCell>

                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={description} placement="top-start">
                          <Typography variant="body2" noWrap>{truncatedDesc}</Typography>
                        </Tooltip>
                      </TableCell>

                      <TableCell>₹ {deal.expectedRevenue?.toLocaleString()}</TableCell>
                      
                      <TableCell>
                        {hasSheet && sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : "-"}
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title={hasSheet ? "Edit Cost Sheet" : "Create Cost Sheet"}>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => navigate(`${rolePrefix}/cost-sheets/${deal._id}`)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredDeals.length}
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
          vertical: 'bottom',
          horizontal: 'center', // Centers nicely under the icon
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" px={2} pt={2}>
            <Typography variant="caption" fontWeight="bold">Filter by {activeFilterColumn}</Typography>  
            <IconButton size="small" onClick={handleFilterClose}><Close fontSize="small" /></IconButton>
          </Box>
          {renderFilterContent()}
        </Box>
      </Popover>
    </Box>
  );
}  