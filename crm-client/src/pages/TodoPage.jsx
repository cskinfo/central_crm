import { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Button, List, ListItem,
  ListItemText, Checkbox, IconButton, CircularProgress, Alert, Box,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import axios from "axios";
import { getAuthHeader } from "./Auth";

export default function TodoPage() {
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for the confirmation dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);

  // Fetch all to-dos from the server on component load
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/todos", { headers: getAuthHeader() });
      setTodos(data);
    } catch (err) {
      setError("Failed to fetch your to-do list. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Handle adding a new to-do item
  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    try {
      const { data: newTodo } = await axios.post("/api/todos", { text: newTodoText }, { headers: getAuthHeader() });
      setTodos([newTodo, ...todos]); // Add new to-do to the top of the list
      setNewTodoText("");
    } catch (err) {
      setError("Failed to add the new to-do item.");
    }
  };

  // Handle toggling the completion status of a to-do
  const handleToggleTodo = async (id) => {
    try {
      const { data: updatedTodo } = await axios.put(`/api/todos/${id}`, {}, { headers: getAuthHeader() });
      setTodos(todos.map(todo => (todo._id === id ? updatedTodo : todo)));
    } catch (err) {
      setError("Failed to update the to-do's status.");
    }
  };

  // --- MODIFIED DELETE LOGIC ---

  // 1. Open the confirmation dialog
  const handleDeleteClick = (id) => {
    setTodoToDelete(id);
    setOpenConfirmDialog(true);
  };

  // 2. Close the confirmation dialog
  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setTodoToDelete(null);
  };

  // 3. Perform the delete after confirmation
  const handleConfirmDelete = async () => {
    if (!todoToDelete) return;
    try {
      await axios.delete(`/api/todos/${todoToDelete}`, { headers: getAuthHeader() });
      setTodos(todos.filter(todo => todo._id !== todoToDelete));
    } catch (err) {
      setError("Failed to delete the to-do item.");
    } finally {
      handleCloseConfirmDialog();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
          My Tasks
        </Typography>
        <Box component="form" onSubmit={handleAddTodo} sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Add a new task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
          />
          <Button type="submit" variant="contained" size="large" sx={{ px: 4 }}>
            Add
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {todos.length > 0 ? todos.map(todo => (
              <ListItem
                key={todo._id}
                secondaryAction={
                  // Call the function to open the dialog instead of deleting directly
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(todo._id)}>
                    <Delete color="error" />
                  </IconButton>
                }
                sx={{
                  bgcolor: todo.completed ? 'action.hover' : 'background.paper',
                  borderRadius: 2,
                  mb: 1,
                  transition: 'background-color 0.3s',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Checkbox
                  edge="start"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo._id)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemText
                  primary={todo.text}
                  sx={{ textDecoration: todo.completed ? 'line-through' : 'none', color: todo.completed ? 'text.secondary' : 'text.primary' }}
                />
              </ListItem>
            )) : (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 5 }}>
                Your to-do list is empty. Add a task to get started!
              </Typography>
            )}
          </List>
        )}
      </Paper>

      {/* --- CONFIRMATION DIALOG COMPONENT --- */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this task? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}