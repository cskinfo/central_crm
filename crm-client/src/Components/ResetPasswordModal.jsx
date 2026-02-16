import { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export default function ResetPasswordModal({ open, onClose, user }) {
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };
  
  const handleClose = () => {
      setPasswords({ newPassword: "", confirmPassword: "" });
      setError("");
      setSuccess("");
      setLoading(false);
      onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (passwords.newPassword.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/users/${user._id}/force-password-reset`,
        { newPassword: passwords.newPassword },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSuccess(response.data.message);
      setTimeout(handleClose, 2500); // Close modal after success message
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Reset Password
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          You are setting a new password for <span style={{ fontWeight: 'bold' }}>{user?.username}</span>.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="New Password"
            type="password"
            value={passwords.newPassword}
            onChange={handleChange}
            disabled={loading || !!success}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={passwords.confirmPassword}
            onChange={handleChange}
            disabled={loading || !!success}
          />
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
             <Button onClick={handleClose} disabled={loading}>Cancel</Button>
             <Button type="submit" variant="contained" disabled={loading || !!success}>
               {loading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
             </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}