import { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Paper,
  Container,
  CircularProgress,
} from "@mui/material";

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match.");
      setLoading(false);
      return;
    }
    
    if (formData.newPassword.length < 6) {
        setError("New password must be at least 6 characters long.");
        setLoading(false);
        return;
    }

    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      setSuccess(true);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" className="py-16">
      <Paper
        elevation={2}
        className="px-8 py-10 rounded-2xl"
        sx={{ mt: 8, mb: 2 }}
      >
        <Box className="mb-6 text-center">
          <Typography
            variant="h5"
            fontWeight={700}
            className="mb-1"
            sx={{ letterSpacing: 2 }}
          >
            Change Your Password
          </Typography>
          <Typography variant="subtitle2" className="text-gray-500">
            Update your account's password
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" className="mb-4">
            Password changed successfully!
          </Alert>
        )}

        <form noValidate autoComplete="off" onSubmit={handleSubmit}>
          <TextField
            label="Current Password"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleChange}
            required
            fullWidth
            margin="normal"
            autoComplete="current-password"
            InputProps={{ sx: { borderRadius: 2 } }}
          />

          <TextField
            label="New Password"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            required
            fullWidth
            margin="normal"
            autoComplete="new-password"
            InputProps={{ sx: { borderRadius: 2 } }}
          />

          <TextField
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            fullWidth
            margin="normal"
            autoComplete="new-password"
            InputProps={{ sx: { borderRadius: 2 } }}
          />

          <Box className="mt-6 flex flex-col items-center">
            <Button
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              disabled={loading}
              size="large"
              className="rounded-lg"
              sx={{ height: 48, fontWeight: 600, fontSize: 17 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Update Password"
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
