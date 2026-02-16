import { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Button, Box, CircularProgress, Alert,
  List, ListItem, ListItemText, Divider, Accordion, AccordionSummary, AccordionDetails,
  FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput, Grid
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from "axios";
import { getAuthHeader } from "./Auth";
import { format } from 'date-fns';

export default function BroadcastPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin state
  const [salespersons, setSalespersons] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sentBroadcasts, setSentBroadcasts] = useState([]);

  // Salesperson state
  const [receivedBroadcasts, setReceivedBroadcasts] = useState([]);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    setUser(currentUser);

    if (currentUser.role === 'admin') {
      fetchAdminData();
    } else {
      fetchSalespersonData();
    }
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, broadcastsRes] = await Promise.all([
        axios.get("/api/users", { headers: getAuthHeader() }),
        axios.get("/api/broadcasts", { headers: getAuthHeader() })
      ]);
      setSalespersons(usersRes.data.filter(u => u.role === 'salesperson'));
      setSentBroadcasts(broadcastsRes.data);
    } catch (err) {
      setError("Failed to load data for admin.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalespersonData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/broadcasts", { headers: getAuthHeader() });
      setReceivedBroadcasts(data);
    } catch (err) {
      setError("Failed to load broadcasts.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setError("");
    if (!title || !message || selectedUsers.length === 0) {
      return setError("Please fill in title, message, and select recipients.");
    }
    try {
      await axios.post("/api/broadcasts", { title, message, recipients: selectedUsers }, { headers: getAuthHeader() });
      setTitle("");
      setMessage("");
      setSelectedUsers([]);
      fetchAdminData(); // Refresh sent messages
    } catch (err) {
      setError("Failed to send broadcast.");
    }
  };
  
  const handleMarkAsRead = async (broadcastId, isRead) => {
    if (isRead || user.role !== 'salesperson') return; // Don't re-mark or if user is admin
    try {
        await axios.post(`/api/broadcasts/${broadcastId}/mark-read`, {}, { headers: getAuthHeader() });
        // Update local state to reflect the change immediately
        setReceivedBroadcasts(prev => prev.map(b => 
            b._id === broadcastId ? { ...b, readBy: [...b.readBy, user.id] } : b
        ));
    } catch (err) {
        console.error("Failed to mark as read", err);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {user?.role === 'admin' ? (
        // ADMIN VIEW
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h5" gutterBottom>Send a Broadcast</Typography>
              {error && <Alert severity="error" onClose={() => setError("")} sx={{mb: 2}}>{error}</Alert>}
              <Box component="form" onSubmit={handleSendBroadcast}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Recipients</InputLabel>
                  <Select
                    multiple
                    value={selectedUsers}
                    onChange={(e) => setSelectedUsers(e.target.value)}
                    input={<OutlinedInput label="Recipients" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value === 'everyone' ? 'Everyone' : salespersons.find(s => s._id === value)?.username} />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="everyone"><em>Select All Salespersons</em></MenuItem>
                    {salespersons.map((sp) => (
                      <MenuItem key={sp._id} value={sp._id}>{sp.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} margin="normal" />
                <TextField fullWidth label="Message" value={message} onChange={(e) => setMessage(e.target.value)} margin="normal" multiline rows={4} />
                <Button type="submit" variant="contained" sx={{ mt: 2 }} size="large">Send Message</Button>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h5" gutterBottom>Sent History</Typography>
              <List sx={{maxHeight: 500, overflow: 'auto'}}>
                {sentBroadcasts.map(b => (
                  <ListItem key={b._id} divider>
                    <ListItemText
                      primary={b.title}
                      secondary={`Sent to ${b.recipients.length} user(s) on ${format(new Date(b.createdAt), 'PPpp')}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        // SALESPERSON VIEW
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h4" gutterBottom>Broadcast Messages</Typography>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {receivedBroadcasts.map(b => {
            const isRead = b.readBy.includes(user.id);
            return (
              <Accordion key={b._id} onChange={() => handleMarkAsRead(b._id, isRead)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: isRead ? 'inherit' : 'action.hover' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', pr: 2 }}>
                    <Typography sx={{ fontWeight: isRead ? 'normal' : 'bold' }}>{b.title}</Typography>
                    {!isRead && <Chip label="New" color="error" size="small" />}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    From: {b.sender.username} | Received: {format(new Date(b.createdAt), 'PPpp')}
                  </Typography>
                  <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{b.message}</Typography>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>
      )}
    </Container>
  );
}