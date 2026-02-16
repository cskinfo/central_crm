import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import * as XLSX from "xlsx";
// --- ADD THESE MISSING IMPORTS ---
import axios from "axios"; // <--- ADD THIS
import { toast } from "react-toastify";
import { saveAs } from "file-saver";
import { FileDownload } from "@mui/icons-material";

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Grid,
  Chip,
  Avatar,
  Divider,
  InputAdornment,
  Fade,
  Popover,
  TablePagination,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  FilterList,
  FilterListOff,
  Close,
  Refresh as RefreshIcon,
  History,
  TrendingUp,
  Star,
} from "@mui/icons-material";

import { getAuthHeader, getUserRole, getUserId } from "./Auth";

// --- Initial Filters State ---
const INITIAL_FILTERS = {
  fullName: "",
  company: "",
  email: "",
  rating: "all",
  assignedTo: "all",
};

// --- Compact Filterable Header ---
const FilterableHeader = ({
  label,
  columnKey,
  width,
  columnFilters,
  onFilterClick,
  align = "left",
}) => (
  <TableCell
    width={width}
    align={align}
    sx={{
      padding: "6px 8px",
      fontWeight: 700,
      fontSize: "0.75rem",
      borderBottom: "1px solid #e0e0e0",
      whiteSpace: "nowrap",
    }}
  >
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
        sx={{ padding: 0.5 }}
      >
        <FilterList fontSize="small" sx={{ fontSize: "1rem" }} />
      </IconButton>
    </Box>
  </TableCell>
);

function Leads() {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Existing formData state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    industry: "",
    source: "Website",
    productInterest: "",
    rating: "Warm",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
    tags: [],
    followUpDate: "",
    remarks: "",
    stage: "Initial Contact",
    assignedTo: userRole === "admin" ? "" : userId,
    leadOwner: "",
    notes: "",
  });

  // --- DATA FETCHING ---
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/leads", { headers: getAuthHeader() });
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users", { headers: getAuthHeader() });
      const data = await response.json();
      setUsers(data.filter((user) => user.role === "salesperson"));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (userRole === "admin") fetchUsers();
  }, [fetchLeads, fetchUsers, userRole]);

  const handleRefresh = () => {
    fetchLeads();
    if (userRole === "admin") fetchUsers();
  };

  const handleExportLeads = () => {
    try {
      // Export what user is currently seeing (filtered)
      const dataToExport = filteredLeads.map((lead) => ({
        "Full Name": lead.fullName || "",
        Email: lead.email || "",
        Phone: lead.phone || "",
        Company: lead.company || "",
        Industry: lead.industry || "",
        Source: lead.source || "",
        "Product Interest": lead.productInterest || "",
        Rating: lead.rating || "",
        Stage: lead.stage || "",
        "Assigned To": lead.assignedTo?.username || "Unassigned",
        "Lead Owner": lead.leadOwner?.username || "",
        Tags: Array.isArray(lead.tags) ? lead.tags.join(", ") : "",
        "Follow Up Date": lead.followUpDate
          ? new Date(lead.followUpDate).toLocaleDateString()
          : "",
        Remarks: lead.remarks || "",
        Notes: lead.notes || "",
        "Created At": lead.createdAt
          ? new Date(lead.createdAt).toLocaleString()
          : "",
        "Updated At": lead.updatedAt
          ? new Date(lead.updatedAt).toLocaleString()
          : "",
      }));

      if (dataToExport.length === 0) {
        setError("No leads available to export.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `leads_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      setError("Failed to export leads.");
    }
  };

  // --- DERIVE RECENT ACTIVITY ---
  const recentActivityData = useMemo(() => {
    const sorted = [...leads].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    );
    return sorted.slice(0, 10).map((lead) => {
      let actionType = "UPDATE";
      let description = `Stage: ${lead.stage || "New"}`;
      if (lead.rating === "Hot") actionType = "HOT";
      if (!lead.updatedAt || lead.createdAt === lead.updatedAt) {
        actionType = "NEW";
        description = "New Lead Created";
      }
      return {
        id: lead._id,
        userName: lead.assignedTo?.username || "Unassigned",
        targetName: lead.fullName,
        company: lead.company,
        action: actionType,
        description: description,
        timestamp: lead.updatedAt || lead.createdAt,
      };
    });
  }, [leads]);

  const getActivityIcon = (action) => {
    switch (action) {
      case "HOT":
        return <Star color="error" sx={{ fontSize: 16 }} />;
      case "NEW":
        return <PersonIcon color="primary" sx={{ fontSize: 16 }} />;
      default:
        return <TrendingUp color="action" sx={{ fontSize: 16 }} />;
    }
  };

  // --- FILTERING ---
  const salespersonList = useMemo(
    () => Array.from(new Set(users.map((u) => u.username))).sort(),
    [users],
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const term = searchTerm.toLowerCase();
      const matchesGlobal =
        (lead.fullName || "").toLowerCase().includes(term) ||
        (lead.company || "").toLowerCase().includes(term) ||
        (lead.email || "").toLowerCase().includes(term) ||
        (lead.phone || "").toLowerCase().includes(term);

      if (!matchesGlobal) return false;
      if (
        columnFilters.fullName &&
        !lead.fullName
          ?.toLowerCase()
          .includes(columnFilters.fullName.toLowerCase())
      )
        return false;
      if (
        columnFilters.company &&
        !lead.company
          ?.toLowerCase()
          .includes(columnFilters.company.toLowerCase())
      )
        return false;
      if (
        columnFilters.email &&
        !lead.email?.toLowerCase().includes(columnFilters.email.toLowerCase())
      )
        return false;
      if (
        columnFilters.rating !== "all" &&
        lead.rating !== columnFilters.rating
      )
        return false;
      if (
        columnFilters.assignedTo !== "all" &&
        (lead.assignedTo?.username || "Unassigned") !== columnFilters.assignedTo
      )
        return false;
      return true;
    });
  }, [leads, searchTerm, columnFilters]);

  const paginatedLeads = useMemo(
    () =>
      filteredLeads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredLeads, page, rowsPerPage],
  );
  const isFilterActive = useMemo(
    () =>
      searchTerm.trim() !== "" ||
      JSON.stringify(columnFilters) !== JSON.stringify(INITIAL_FILTERS),
    [searchTerm, columnFilters],
  );

  // --- HANDLERS ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

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
  };
  const handleFilterChange = (value) => {
    setColumnFilters((prev) => ({ ...prev, [activeFilterColumn]: value }));
    setPage(0);
  };
  const handleClearAllFilters = () => {
    setSearchTerm("");
    setColumnFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const renderFilterContent = () => {
    if (!activeFilterColumn) return null;
    if (activeFilterColumn === "rating") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Rating</InputLabel>
          <Select
            value={columnFilters.rating}
            label="Rating"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="Hot">Hot</MenuItem>
            <MenuItem value="Warm">Warm</MenuItem>
            <MenuItem value="Cold">Cold</MenuItem>
          </Select>
        </FormControl>
      );
    }
    if (activeFilterColumn === "assignedTo") {
      return (
        <FormControl fullWidth sx={{ minWidth: 200, p: 2 }}>
          <InputLabel>Salesperson</InputLabel>
          <Select
            value={columnFilters.assignedTo}
            label="Salesperson"
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
          placeholder="Filter..."
          value={columnFilters[activeFilterColumn]}
          onChange={(e) => handleFilterChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFilterClose()}
          variant="standard"
          fullWidth
        />
      </Box>
    );
  };

  // --- CRUD HANDLERS ---
  const handleOpen = (lead = null) => {
    if (lead) {
      setCurrentLead(lead._id);
      setFormData({
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company || "",
        industry: lead.industry || "",
        source: lead.source || "Website",
        productInterest: lead.productInterest || "",
        rating: lead.rating || "Warm",
        address: lead.address || {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        tags: lead.tags || [],
        followUpDate: lead.followUpDate || "",
        remarks: lead.remarks || "",
        stage: lead.stage || "Initial Contact",
        assignedTo:
          lead.assignedTo?._id || (userRole === "admin" ? "" : userId),
        leadOwner: lead.leadOwner?._id || "",
        notes: lead.notes || "",
      });
    } else {
      setCurrentLead(null);
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        company: "",
        industry: "",
        source: "Website",
        productInterest: "",
        rating: "Warm",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        tags: [],
        followUpDate: "",
        remarks: "",
        stage: "Initial Contact",
        assignedTo: userRole === "admin" ? "" : userId,
        leadOwner: "",
        notes: "",
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...(prev[parent] || {}), [child]: value },
      }));
    } else if (name === "tags") {
      setFormData((prev) => ({
        ...prev,
        tags: value.split(",").map((tag) => tag.trim()),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    try {
      // 1. Validate Required Fields
      if (!formData.fullName || !formData.email || !formData.phone) {
        toast.error("Please fill in all required fields");
        return;
      }

      // 2. Prepare Payload (Fixing the Date Issue)
      const payload = {
        ...formData,
        // FIX: If date is empty string, send null. Mongoose accepts null, but crashes on ""
        followUpDate: formData.followUpDate ? formData.followUpDate : null,

        // Optional: Trim strings to avoid accidental whitespace
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
      };

      if (currentLead) {
        // Update Existing Lead
        const response = await axios.put(
          `/api/leads/${currentLead._id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        setLeads((prev) =>
          prev.map((l) => (l._id === currentLead._id ? response.data : l)),
        );
        toast.success("Lead updated successfully");
      } else {
        // Create New Lead
        const response = await axios.post("/api/leads", payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setLeads((prev) => [response.data, ...prev]);
        toast.success("Lead created successfully");
      }
      handleClose();
    } catch (error) {
      console.error("Error saving lead:", error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to save lead";
      toast.error(msg);
    }
  };

  const getRatingColor = (rating) =>
    ({ Hot: "error", Warm: "warning", Cold: "info" })[rating] || "default";

  return (
    <Box className="min-h-screen bg-gray-50" sx={{ px: 2, py: 4 }}>
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h5" fontWeight={600}>
          Leads
        </Typography>
        <Box display="flex" gap={1}>
          <IconButton
            onClick={handleRefresh}
            size="small"
            sx={{ bgcolor: "action.hover" }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownload />}
            onClick={handleExportLeads}
            disabled={filteredLeads.length === 0}
          >
            Export
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            disabled={loading}
          >
            New Lead
          </Button>
        </Box>
      </Box>

      {error && (
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        </Fade>
      )}

      <Grid container spacing={2}>
        {/* LEFT: LEADS TABLE (66% Width on laptops) */}
        <Grid item xs={12} lg={7}>
          <Paper elevation={2} className="p-3">
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  style: { fontSize: "0.85rem" },
                }}
              />
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<FilterListOff />}
                onClick={handleClearAllFilters}
                disabled={!isFilterActive}
              >
                Clear
              </Button>
            </Box>

            <TableContainer>
              <Table size="small" sx={{ tableLayout: "fixed", minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                    <FilterableHeader
                      label="Name"
                      columnKey="fullName"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                      width="160px"
                    />
                    <FilterableHeader
                      label="Company"
                      columnKey="company"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                      width="140px"
                    />
                    <FilterableHeader
                      label="Contact"
                      columnKey="email"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                      width="180px"
                    />
                    <FilterableHeader
                      label="Rating"
                      columnKey="rating"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                      width="90px"
                    />
                    <FilterableHeader
                      label="Assigned"
                      columnKey="assignedTo"
                      columnFilters={columnFilters}
                      onFilterClick={handleFilterClick}
                      width="110px"
                    />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLeads.length > 0 ? (
                    paginatedLeads.map((lead) => (
                      <TableRow
                        key={lead._id}
                        hover
                        onClick={() =>
                          navigate(
                            userRole === "admin"
                              ? `/admin/leads/${lead._id}`
                              : `/sales/leads/${lead._id}`,
                          )
                        }
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ padding: "6px 8px" }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                fontSize: "0.7rem",
                                bgcolor: "primary.light",
                              }}
                            >
                              {lead.fullName?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                              noWrap
                            >
                              {lead.fullName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ padding: "6px 8px" }}>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "0.75rem" }}
                            noWrap
                            title={lead.company}
                          >
                            {lead.company}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ padding: "6px 8px" }}>
                          <Box display="flex" flexDirection="column">
                            <Typography
                              variant="caption"
                              noWrap
                              title={lead.email}
                            >
                              {lead.email}
                            </Typography>
                            {lead.phone && (
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                {lead.phone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ padding: "6px 8px" }}>
                          <Chip
                            label={lead.rating}
                            color={getRatingColor(lead.rating)}
                            size="small"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        </TableCell>
                        <TableCell sx={{ padding: "6px 8px" }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.75rem",
                              color: "text.secondary",
                            }}
                            noWrap
                          >
                            {lead.assignedTo?.username || "Unassigned"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="textSecondary">
                          No leads found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredLeads.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ ".MuiTablePagination-toolbar": { minHeight: 40 } }}
            />
          </Paper>
          <Divider component="" sx={{ my: 2.5 }} />
          {/* RIGHT: RECENT ACTIVITY LOG (33% Width) */}
          <Grid item xs={12} lg={5}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                height: "100%",
                maxHeight: "50vh",
                overflowY: "auto",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <History color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Recent Activity
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              {recentActivityData.length === 0 ? (
                <Typography
                  align="center"
                  color="text.secondary"
                  variant="caption"
                >
                  No activity found.
                </Typography>
              ) : (
                <List disablePadding>
                  {recentActivityData.map((log) => (
                    <div key={log.id}>
                      <ListItem alignItems="flex-start" sx={{ px: 0, py: 0.5 }}>
                        <ListItemAvatar sx={{ minWidth: 32, mt: 0.5 }}>
                          <Avatar
                            sx={{
                              bgcolor: "transparent",
                              width: 24,
                              height: 24,
                            }}
                          >
                            {getActivityIcon(log.action)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              fontSize="0.75rem"
                              sx={{ lineHeight: 1.2 }}
                            >
                              {log.userName}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 0.5, fontSize: "0.7rem" }}
                              >
                                {log.action === "NEW" ? "created" : "updated"}
                              </Typography>
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography
                                variant="body2"
                                fontSize="0.7rem"
                                color="text.primary"
                                display="block"
                                noWrap
                                sx={{ mt: 0.5 }}
                              >
                                {log.targetName}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                                sx={{ lineHeight: 1.1, fontSize: "0.65rem" }}
                              >
                                {log.description}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                fontSize="0.65rem"
                              >
                                {formatDistanceToNow(new Date(log.timestamp), {
                                  addSuffix: true,
                                })}{" "}
                                ago
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      <Divider component="li" sx={{ my: 0.5 }} />
                    </div>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Grid>

      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Box>{renderFilterContent()}</Box>
      </Popover>

      {/* CREATE/EDIT MODAL - Structured Layout */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
          {currentLead ? "Edit Lead" : "Create New Lead"}
        </DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            {/* BASIC INFO */}
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ fontWeight: 600, mb: 2, mt: 1 }}
            >
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="fullName"
                  label="Full Name *"
                  fullWidth
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="email"
                  label="Email *"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="phone"
                  label="Phone *"
                  fullWidth
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="company"
                  label="Company *"
                  fullWidth
                  value={formData.company}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="industry"
                  label="Industry"
                  fullWidth
                  value={formData.industry}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="productInterest"
                  label="Product Interest"
                  fullWidth
                  value={formData.productInterest}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* STATUS & CLASSIFICATION */}
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Status & Classification
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select
                    name="source"
                    value={formData.source}
                    label="Source"
                    onChange={handleChange}
                  >
                    <MenuItem value="Website">Website</MenuItem>
                    <MenuItem value="Referral">Referral</MenuItem>
                    <MenuItem value="Campaign">Campaign</MenuItem>
                    <MenuItem value="Cold Call">Cold Call</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rating</InputLabel>
                  <Select
                    name="rating"
                    value={formData.rating}
                    label="Rating"
                    onChange={handleChange}
                  >
                    <MenuItem value="Hot">Hot</MenuItem>
                    <MenuItem value="Warm">Warm</MenuItem>
                    <MenuItem value="Cold">Cold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid fullWidth sx={{ minWidth: 200 }} item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Assigned To</InputLabel>
                  <Select
                    name="assignedTo"
                    value={formData.assignedTo}
                    label="Assigned To"
                    onChange={handleChange}
                    disabled={userRole !== "admin"}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid fullWidth sx={{ minWidth: 200 }} item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Lead Owner</InputLabel>
                  <Select
                    name="leadOwner"
                    value={formData.leadOwner}
                    label="Lead Owner"
                    onChange={handleChange}
                  >
                    <MenuItem value="">None</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* ADDRESS */}
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Address Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="address.street"
                  label="Street"
                  fullWidth
                  value={formData.address?.street || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  size="small"
                  name="address.city"
                  label="City"
                  fullWidth
                  value={formData.address?.city || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  size="small"
                  name="address.state"
                  label="State"
                  fullWidth
                  value={formData.address?.state || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6} sm={6}>
                <TextField
                  size="small"
                  name="address.postalCode"
                  label="Postal Code"
                  fullWidth
                  value={formData.address?.postalCode || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6} sm={6}>
                <TextField
                  size="small"
                  name="address.country"
                  label="Country"
                  fullWidth
                  value={formData.address?.country || ""}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* ADDITIONAL */}
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Additional Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="tags"
                  label="Tags"
                  fullWidth
                  value={formData.tags?.join(", ") || ""}
                  onChange={handleChange}
                  placeholder="Comma separated"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="followUpDate"
                  label="Follow Up Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.followUpDate}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  name="remarks"
                  label="Remarks"
                  fullWidth
                  value={formData.remarks}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  size="small"
                  name="notes"
                  label="Notes / Additional Info"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {currentLead ? "Update Lead" : "Create Lead"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Leads;
