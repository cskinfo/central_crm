import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Box,
  Dialog,
  DialogActions,
  Button,
  DialogTitle,
  DialogContent,
  Slide,
  Avatar,
  Stack,
  Chip,
  Divider,
  useTheme,
} from "@mui/material";
import {
  DeleteOutline,
  VpnKeyOutlined,
  EditOutlined,
  Person,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ResetPasswordModal from "./ResetPasswordModal";

// Modern Transition
const Transition = (props) => <Slide direction="up" {...props} />;

// Helper to generate initials from name
const getInitials = (first, last) => {
  return `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();
};

export default function SalespersonList() {
  const theme = useTheme();
  const [salespersons, setSalespersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const navigate = useNavigate();

  const fetchSalespersons = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSalespersons(
        (response.data || []).filter((user) => user.role === "salesperson")
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch salespersons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalespersons();
  }, []);

  const handleEditClick = (id) => navigate(`/admin/salesperson-list/${id}`);

  const handleDeleteClick = (person) => {
    setSelectedPerson(person);
    setDeleteDialogOpen(true);
  };

  const handleResetPasswordClick = (person) => {
    setSelectedPerson(person);
    setResetModalOpen(true);
  };

  const handleCloseResetModal = () => {
    setResetModalOpen(false);
    setSelectedPerson(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPerson) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/users/${selectedPerson._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setDeleteDialogOpen(false);
      setSelectedPerson(null);
      fetchSalespersons();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete salesperson");
      setDeleteDialogOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- UI CONSTANTS ---
  const tableHeaderSx = {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
    fontWeight: 600,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    py: 2,
  };

  return (
    <Box sx={{ backgroundColor: "#F9FAFB", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">
        {/* 1. Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: "#111827", mb: 1 }}
          >
            Sales Team
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your salespersons and handle account access.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* 2. Main Content Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
              <CircularProgress size={40} thickness={4} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeaderSx}>User Profile</TableCell>
                    <TableCell sx={tableHeaderSx}>Contact Info</TableCell>
                    <TableCell sx={tableHeaderSx}>Zone Assignment</TableCell>
                    <TableCell sx={tableHeaderSx}>Activity</TableCell>
                    <TableCell sx={{ ...tableHeaderSx, textAlign: "right" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salespersons.map((person) => (
                    <TableRow
                      key={person._id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      {/* Compound Column: Avatar + Name + Email */}
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.light,
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                            }}
                          >
                            {getInitials(person.firstName, person.lastName)}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600, color: "#111827" }}
                            >
                              {person.firstName} {person.lastName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {person.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Phone Column */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            color: "text.primary",
                          }}
                        >
                          {person.phone || "—"}
                        </Typography>
                      </TableCell>

                      {/* Zone as Chip */}
                      <TableCell>
                        {person.zone ? (
                          <Chip
                            label={person.zone}
                            size="small"
                            sx={{
                              bgcolor: "#EFF6FF",
                              color: "#1D4ED8",
                              fontWeight: 500,
                              borderRadius: "6px",
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>

                      {/* Formatted Date */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" color="text.primary">
                            {person.lastLogin
                              ? new Date(person.lastLogin).toLocaleDateString()
                              : "Never"}
                          </Typography>
                          {person.lastLogin && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(person.lastLogin).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Refined Actions */}
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Tooltip title="Reset Password">
                            <IconButton
                              onClick={() => handleResetPasswordClick(person)}
                              size="small"
                              sx={{
                                color: "text.secondary",
                                "&:hover": { color: "warning.main" },
                              }}
                            >
                              <VpnKeyOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Profile">
                            <IconButton
                              onClick={() => handleEditClick(person._id)}
                              size="small"
                              sx={{
                                color: "text.secondary",
                                "&:hover": { color: "primary.main" },
                              }}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              onClick={() => handleDeleteClick(person)}
                              size="small"
                              sx={{
                                color: "text.secondary",
                                "&:hover": {
                                  color: "error.main",
                                  bgcolor: "#FEF2F2",
                                },
                              }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Empty State Handling */}
                  {salespersons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <Person
                            sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                          />
                          <Typography variant="body1" color="text.secondary">
                            No salespersons found.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Modals & Dialogs */}
        {selectedPerson && (
          <ResetPasswordModal
            open={resetModalOpen}
            onClose={handleCloseResetModal}
            user={selectedPerson}
          />
        )}

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          TransitionComponent={Transition}
          PaperProps={{ sx: { borderRadius: 3, padding: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Delete User?</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary">
              Are you sure you want to remove{" "}
              <strong>
                {selectedPerson?.firstName} {selectedPerson?.lastName}
              </strong>
              ? This action creates a permanent record deletion and cannot be
              undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={deleteLoading}
              disableElevation
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
            >
              {deleteLoading ? "Deleting..." : "Delete User"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
