import { useState, useEffect, useMemo } from "react";
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
  Chip,
  CircularProgress,
  Alert,
  Container,
  MenuItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Checkbox,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Popover,
  FormControl,
  InputLabel,
  Select,
  Stack,
  TablePagination,
} from "@mui/material";
import {
  Add,
  FileDownload,
  FileUpload,
  MoreVert,
  Delete,
  Search,
  FilterList,
  FilterListOff,
  Close,
} from "@mui/icons-material";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { parse, unparse } from "papaparse";
import { toast } from "react-toastify";

import { getAuthHeader, getUserId } from "./Auth";
import QuotationForm from "../Components/QuotationForm";

// --- HELPER COMPONENTS & FUNCTIONS ---

// Helper to format user name
const getDisplayName = (user) => {
  if (!user) return "Unassigned";
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  return user.username || "Unassigned";
};

// Helper to map Import Data to Backend Schema
const processImportData = (jsonData) => {
  return jsonData.map((row) => {
    // Map "Friendly Headers" (from CSV/Excel) to "Backend Keys"
    // We check both the Friendly Name (Export format) and the camelCase name (if they re-imported raw JSON)
    return {
      customer: row["Customer"] || row["customer"],
      contactName: row["Contact Name"] || row["contactName"],
      type: row["Type"] || row["type"],
      expectedRevenue: Number(
        row["Expected Revenue (₹)"] || row["expectedRevenue"] || 0,
      ),
      expectedMargin: Number(
        row["Expected Margin"] || row["expectedMargin"] || 0,
      ),
      stage: row["Stage"] || row["stage"] || "New",
      probability: Number(row["Probability"] || row["probability"] || 0),
      expectedClosureDate:
        row["Expected Closure Date"] || row["expectedClosureDate"],
      detailedDescription:
        row["Detailed Description"] || row["detailedDescription"],
      oem: row["OEM"] || row["oem"],
      currentStatus: row["Current Status"] || row["currentStatus"],
      closureMonth: row["Closure Month"] || row["closureMonth"],
      remark: row["Remark"] || row["remark"],
      // Note: 'assignedTo' is handled by the backend (defaults to creator) unless specified here
    };
  });
};

// Filter Header Component
const FilterableHeader = ({
  label,
  columnKey,
  width,
  columnFilters,
  onFilterClick,
  align = "left",
}) => (
  <TableCell width={width} align={align} sx={{ fontWeight: 600 }}>
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

const INITIAL_FILTERS = {
  opportunityId: "",
  customer: "",
  contactName: "",
  accountManager: "all",
  type: "all",
  revenue: "",
  stage: "all",
};

function OpportunitiesPage({ userRole }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // -- Filter & Search State --
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState(INITIAL_FILTERS);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);

  // -- Pagination State --
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // -- Action States --
  const [anchorEl, setAnchorEl] = useState(null);

  // -- Import States --
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]); // Stores first 5 rows
  const [parsedImportData, setParsedImportData] = useState([]); // Stores ALL parsed data
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [existingQuotation, setExistingQuotation] = useState(null);

  const navigate = useNavigate();
  const userId = getUserId();

  // --- DATA FETCHING ---
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = {};
      const response = await axios.get("/api/deals", {
        params,
        headers: getAuthHeader(),
      });
      setOpportunities(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load opportunities");
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [userRole, userId]);

  // --- FILTER LOGIC ---
  const accountManagers = useMemo(() => {
    const managers = new Set();
    opportunities.forEach((opp) => {
      managers.add(getDisplayName(opp.assignedTo));
    });
    return Array.from(managers).sort();
  }, [opportunities]);

  const stages = useMemo(() => {
    const s = new Set();
    opportunities.forEach((opp) => {
      if (opp.stage) s.add(opp.stage);
    });
    return Array.from(s).sort();
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const oppId = (opp.opportunityId || "").toLowerCase();
      const cust = (opp.customer || "").toLowerCase();
      const contact = (opp.contactName || "").toLowerCase();
      const manager = getDisplayName(opp.assignedTo).toLowerCase();
      const type = (opp.type || "").toLowerCase();
      const stage = (opp.stage || "").toLowerCase();
      const revenue = (opp.expectedRevenue || 0).toString();

      const term = searchTerm.toLowerCase();
      const matchesGlobal =
        oppId.includes(term) ||
        cust.includes(term) ||
        contact.includes(term) ||
        manager.includes(term);

      if (!matchesGlobal) return false;

      if (
        columnFilters.opportunityId &&
        !oppId.includes(columnFilters.opportunityId.toLowerCase())
      )
        return false;
      if (
        columnFilters.customer &&
        !cust.includes(columnFilters.customer.toLowerCase())
      )
        return false;
      if (
        columnFilters.contactName &&
        !contact.includes(columnFilters.contactName.toLowerCase())
      )
        return false;

      if (columnFilters.accountManager !== "all") {
        if (getDisplayName(opp.assignedTo) !== columnFilters.accountManager)
          return false;
      }
      if (columnFilters.type !== "all") {
        if (opp.type !== columnFilters.type) return false;
      }
      if (columnFilters.stage !== "all") {
        if (opp.stage !== columnFilters.stage) return false;
      }
      if (columnFilters.revenue && !revenue.includes(columnFilters.revenue))
        return false;

      return true;
    });
  }, [opportunities, searchTerm, columnFilters]);

  const recentActivityData = useMemo(() => {
    return [...opportunities]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt),
      )
      .slice(0, 5)
      .map((opp) => {
        let action = "Updated opportunity";
        if (opp.quotationStatus === "Pending") {
          action = "Quotation requested";
        } else if (opp.stage) {
          action = `Stage moved to ${opp.stage}`;
        }
        return {
          id: opp._id,
          title: opp.opportunityId,
          customer: opp.customer,
          action,
          date: opp.updatedAt || opp.createdAt,
        };
      });
  }, [opportunities]);

  const paginatedOpportunities = filteredOpportunities.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const isFilterActive = useMemo(() => {
    return (
      searchTerm.trim() !== "" ||
      JSON.stringify(columnFilters) !== JSON.stringify(INITIAL_FILTERS)
    );
  }, [searchTerm, columnFilters]);

  // --- HANDLERS ---

  const handleFilterClick = (event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setActiveFilterColumn(column);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setActiveFilterColumn(null);
  };

  const handleFilterChange = (value) => {
    setColumnFilters((prev) => ({
      ...prev,
      [activeFilterColumn]: value,
    }));
    setPage(0);
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setColumnFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (id) => {
    navigate(`/opportunity/${id}/view`);
  };

  const handleCreateNew = () => {
    navigate("/opportunity/new");
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = filteredOpportunities.map((n) => n._id);
      setSelectedRows(newSelecteds);
      return;
    }
    setSelectedRows([]);
  };

  const handleSelectRow = (id, event) => {
    event.stopPropagation();
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRows.slice(1));
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelected = newSelected.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1),
      );
    }
    setSelectedRows(newSelected);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // --- EXPORT ---
  const handleExport = (format = "csv") => {
    try {
      let dataToExport =
        selectedRows.length > 0
          ? opportunities.filter((opp) => selectedRows.includes(opp._id))
          : [...filteredOpportunities];

      const exportData = dataToExport.map((opp) => ({
        "Opportunity ID": opp.opportunityId,
        Customer: opp.customer,
        "Contact Name": opp.contactName,
        "Account Manager": getDisplayName(opp.assignedTo),
        Type: opp.type,
        "Detailed Description": opp.detailedDescription,
        OEM: opp.oem,
        "Expected Revenue (₹)": opp.expectedRevenue,
        "Expected Margin": opp.expectedMargin,
        Stage: opp.stage,
        "Current Status": opp.currentStatus,
        "Closure Month": opp.closureMonth,
        Remark: opp.remark,
        "Expected Closure Date": opp.expectedClosureDate
          ? new Date(opp.expectedClosureDate).toISOString().split("T")[0]
          : "",
        Probability: opp.probability,
        "Created At": opp.createdAt
          ? new Date(opp.createdAt).toISOString()
          : "",
      }));

      if (format === "csv") {
        const csv = unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        saveAs(
          blob,
          `opportunities_${new Date().toISOString().split("T")[0]}.csv`,
        );
      } else {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities");
        XLSX.writeFile(
          workbook,
          `opportunities_${new Date().toISOString().split("T")[0]}.xlsx`,
        );
      }

      setSnackbarMessage(
        `Exported ${exportData.length} opportunities as ${format.toUpperCase()}`,
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      handleMenuClose();
    } catch (err) {
      setError("Failed to export data");
    }
  };

  const handleDownloadExample = (format) => {
    const exampleData = [
      {
        Customer: "Innovate Corp",
        "Contact Name": "Priya Sharma",
        Type: "Product",
        "Expected Revenue (₹)": 500000,
        "Expected Closure Date": "2025-10-31",
        "Detailed Description": "Initial quote for 100 units of Model X",
        OEM: "Techtronics",
        "Expected Margin (%)": 20,
        Stage: "Qualified",
        "Current Status": "Awaiting customer feedback",
        "Closure Month": "October",
        Remark: "Follow up next week.",
        "Probability (%)": 75,
      },
    ];
    if (format === "csv") {
      const csv = unparse(exampleData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "opportunities_example.csv");
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities");
      XLSX.writeFile(workbook, "opportunities_example.xlsx");
    }
  };

  // --- IMPORT LOGIC ---

  const handleImportClick = () => {
    setImportDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setParsedImportData([]);
    setImportError("");
  };

  // UPDATED: Reads file immediately, parses it, and sets up preview
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportFile(file);
    setImportError("");
    setImportPreview([]);
    setParsedImportData([]);

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target.result;
      let parsed = [];
      try {
        if (file.name.endsWith(".csv")) {
          // Use Papaparse directly on the text string for CSV
          const result = parse(data, { header: true, skipEmptyLines: true });
          if (result.errors && result.errors.length > 0) {
            // Sometimes Papa returns errors but also data, use data if available, else throw
            if (!result.data || result.data.length === 0) {
              throw new Error(`CSV Error: ${result.errors[0].message}`);
            }
          }
          parsed = result.data;
        } else if (file.name.match(/\.xlsx?$/)) {
          // Use XLSX for Excel files
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          parsed = XLSX.utils.sheet_to_json(sheet);
        } else {
          throw new Error(
            "Unsupported file format. Please use .csv, .xlsx, or .xls",
          );
        }

        if (parsed.length === 0) {
          throw new Error(
            "The file appears to be empty or could not be parsed.",
          );
        }

        setParsedImportData(parsed);
        setImportPreview(parsed.slice(0, 5)); // Grab first 5 rows for preview
      } catch (err) {
        console.error("Parse error:", err);
        setImportError(err.message || "Failed to parse file.");
      }
    };

    reader.onerror = () => {
      setImportError("Failed to read file.");
    };

    // Use readAsText for CSV to avoid encoding issues, ArrayBuffer for Excel
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!parsedImportData || parsedImportData.length === 0) {
      setImportError("No data to import. Please check your file.");
      return;
    }

    setImporting(true);
    setImportError("");

    try {
      // Use the data we already parsed in handleFileChange
      const formattedData = processImportData(parsedImportData);

      const response = await axios.post("/api/deals/bulk", formattedData, {
        headers: getAuthHeader(),
      });

      setSnackbarMessage(
        `Successfully imported ${response.data.length} opportunities!`,
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      handleCloseImportDialog();
      fetchOpportunities();
    } catch (err) {
      console.error("Import error:", err);
      setImportError(
        "Server error during import: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setImporting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await axios.delete("/api/deals/bulk-delete", {
        headers: getAuthHeader(),
        data: { ids: selectedRows },
      });
      setSnackbarMessage(response.data.message);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      toast.success("Selected opportunities deleted.");
      setSelectedRows([]);
      fetchOpportunities();
    } catch (err) {
      toast.error("Failed to delete opportunities");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  const handleRequestQuotationClick = async (opportunity, event) => {
    event.stopPropagation();
    setSelectedOpportunity(opportunity);
    setExistingQuotation(null);
    if (opportunity.quotationStatus === "Pending") {
      try {
        const res = await axios.get(`/api/quotations/deal/${opportunity._id}`, {
          headers: getAuthHeader(),
        });
        const pendingQuote = res.data.find((q) => q.status === "Pending");
        if (pendingQuote) {
          setExistingQuotation(pendingQuote);
        }
      } catch (err) {
        toast.error("Could not load existing request details.");
      }
    }
    setQuotationModalOpen(true);
  };

  const handleCloseQuotationModal = () => {
    setQuotationModalOpen(false);
    setSelectedOpportunity(null);
  };

  const onQuotationRequested = () => {
    handleCloseQuotationModal();
    fetchOpportunities();
  };

  // --- RENDER FILTER POPOVER ---
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
            {accountManagers.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (activeFilterColumn === "stage") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Select Stage</InputLabel>
          <Select
            value={columnFilters.stage}
            label="Select Stage"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="all">All Stages</MenuItem>
            {stages.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (activeFilterColumn === "type") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Select Type</InputLabel>
          <Select
            value={columnFilters.type}
            label="Select Type"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Product">Product</MenuItem>
            <MenuItem value="Services">Services</MenuItem>
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

  return (
    <Container maxWidth="lg" className="py-8">
      <Paper elevation={2} className="p-6">
        {/* HEADER SECTION */}
        <Box className="flex items-center justify-between mb-6">
          <Typography variant="h5" fontWeight={600}>
            Opportunities
          </Typography>
          <Box className="flex gap-2">
            {selectedRows.length > 0 && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete ({selectedRows.length})
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<MoreVert />}
              onClick={handleMenuClick}
              disabled={loading}
            >
              Import/Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateNew}
              color="primary"
              className="rounded-lg"
              disableElevation
            >
              New Opportunity
            </Button>
          </Box>
        </Box>

        {/* SEARCH AND FILTER BAR */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            sx={{ flexGrow: 1 }}
            variant="outlined"
            placeholder="Global Search (ID, Customer, Contact, Manager)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
            size="small"
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
        </Box>

        {/* MENU FOR IMPORT/EXPORT */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleExport("csv")}>
            <FileDownload fontSize="small" sx={{ mr: 1 }} />
            Export as CSV
          </MenuItem>
          <MenuItem onClick={() => handleExport("excel")}>
            <FileDownload fontSize="small" sx={{ mr: 1 }} />
            Export as Excel
          </MenuItem>
          <MenuItem onClick={handleImportClick}>
            <FileUpload fontSize="small" sx={{ mr: 1 }} />
            Import from File
          </MenuItem>
        </Menu>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box className="flex justify-center py-14">
            <CircularProgress />
          </Box>
        ) : opportunities.length === 0 ? (
          <Typography className="text-center py-10 text-gray-500">
            No opportunities found.
          </Typography>
        ) : (
          <>
            {/* DATA TABLE */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedRows.length > 0 &&
                          selectedRows.length < filteredOpportunities.length
                        }
                        checked={
                          filteredOpportunities.length > 0 &&
                          selectedRows.length === filteredOpportunities.length
                        }
                        onChange={handleSelectAllClick}
                        inputProps={{
                          "aria-label": "select all opportunities",
                        }}
                      />
                    </TableCell>
                    <FilterableHeader
                      label="ID"
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
                      label="Contact"
                      columnKey="contactName"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                    />
                    <FilterableHeader
                      label="Assigned To"
                      columnKey="accountManager"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                    />
                    <FilterableHeader
                      label="Type"
                      columnKey="type"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                    />
                    <FilterableHeader
                      label="Revenue (₹)"
                      columnKey="revenue"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                    />
                    <FilterableHeader
                      label="Stage"
                      columnKey="stage"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                    />
                    <TableCell sx={{ fontWeight: 600 }}>Closure</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                        No opportunities match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOpportunities.map((opp) => {
                      const isItemSelected =
                        selectedRows.indexOf(opp._id) !== -1;
                      return (
                        <TableRow
                          key={opp._id}
                          hover
                          onClick={() => handleRowClick(opp._id)}
                          role="checkbox"
                          aria-checked={isItemSelected}
                          tabIndex={-1}
                          selected={isItemSelected}
                          sx={{
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                        >
                          <TableCell
                            padding="checkbox"
                            onClick={(e) => handleSelectRow(opp._id, e)}
                          >
                            <Checkbox
                              checked={isItemSelected}
                              inputProps={{
                                "aria-labelledby": `opportunity-checkbox-${opp._id}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>{opp.opportunityId || "N/A"}</TableCell>
                          <TableCell>{opp.customer || "N/A"}</TableCell>
                          <TableCell>{opp.contactName || "N/A"}</TableCell>
                          <TableCell>
                            {getDisplayName(opp.assignedTo)}
                          </TableCell>
                          <TableCell>{opp.type || "N/A"}</TableCell>
                          <TableCell>
                            ₹{opp.expectedRevenue?.toLocaleString() || "0"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={opp.stage || "N/A"}
                              color={
                                {
                                  New: "default",
                                  Qualified: "info",
                                  Proposition: "warning",
                                  Won: "success",
                                  Lost: "error",
                                }[opp.stage] || "default"
                              }
                              size="small"
                              variant="outlined"
                              className="font-medium"
                            />
                          </TableCell>
                          <TableCell>
                            {opp.expectedClosureDate
                              ? new Date(
                                  opp.expectedClosureDate,
                                ).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {opp.stage === "Qualified" && (
                              <Chip
                                label={
                                  opp.quotationStatus === "Pending"
                                    ? "Edit Quotation"
                                    : "Request Quotation"
                                }
                                clickable
                                onClick={(e) =>
                                  handleRequestQuotationClick(opp, e)
                                }
                                size="small"
                                variant="outlined"
                                color={
                                  opp.quotationStatus === "Pending"
                                    ? "warning"
                                    : "primary"
                                }
                                sx={{ fontWeight: 500, cursor: "pointer" }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* PAGINATION */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredOpportunities.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
      <Paper elevation={1} sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Recent Activity
        </Typography>

        {recentActivityData.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No recent activity available.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {recentActivityData.map((activity) => (
              <Box
                key={activity.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #eee",
                  pb: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={500}>{activity.action}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activity.title} • {activity.customer}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(activity.date).toLocaleDateString()}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {/* FILTER POPOVER */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
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

      {/* QUOTATION DIALOG */}
      <Dialog
        open={quotationModalOpen}
        onClose={handleCloseQuotationModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {existingQuotation ? "Edit Quotation Request" : "Request Quotation"} -{" "}
          {selectedOpportunity?.opportunityId}
        </DialogTitle>
        <DialogContent>
          {selectedOpportunity && (
            <QuotationForm
              dealId={selectedOpportunity._id}
              existingQuotation={existingQuotation}
              onQuotationRequested={onQuotationRequested}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuotationModal}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selectedRows.length} selected
            opportunit{selectedRows.length > 1 ? "ies" : "y"}? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMPORT DIALOG (Updated with Preview) */}
      <Dialog
        open={importDialogOpen}
        onClose={handleCloseImportDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Import Opportunities</DialogTitle>
        <DialogContent>
          <Typography sx={{ p: 1 }}>
            Select a CSV or Excel file. The file should match the export format.
          </Typography>

          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}

          <Box sx={{ my: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<FileUpload />}
              disabled={importing}
            >
              Select File
              <input
                type="file"
                hidden
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
            </Button>

            {importFile && (
              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                Selected: {importFile.name}
              </Typography>
            )}

            <Button
              variant="outlined"
              size="small"
              onClick={() => handleDownloadExample("csv")}
              sx={{ ml: "auto" }}
            >
              Download Template
            </Button>
          </Box>

          {/* PREVIEW TABLE */}
          {importPreview.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Preview (First 5 rows):
              </Typography>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ maxHeight: 300 }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(importPreview[0]).map((key) => (
                        <TableCell
                          key={key}
                          sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}
                        >
                          {key}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((val, i) => (
                          <TableCell
                            key={i}
                            sx={{
                              whiteSpace: "nowrap",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {val !== null && val !== undefined
                              ? String(val)
                              : ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 1, color: "text.secondary" }}
              >
                Total records found: {parsedImportData.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImportSubmit}
            color="primary"
            variant="contained"
            disabled={!importFile || parsedImportData.length === 0 || importing}
          >
            {importing ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Import"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default OpportunitiesPage;
