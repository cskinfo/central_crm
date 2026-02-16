const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Todo = require("../models/Todo");

// Helper middleware to get the user ID from the JWT token
const getUserIdFromToken = (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (error) {
    return null;
  }
};

// GET all to-dos for the currently logged-in user
router.get("/", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  try {
    const todos = await Todo.find({ user: userId }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching to-dos" });
  }
});

// POST (create) a new to-do item
router.post("/", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  const { text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ message: "To-do text cannot be empty" });
  }

  try {
    const newTodo = new Todo({ text, user: userId });
    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(500).json({ message: "Server error while creating to-do" });
  }
});

// PUT (update) a to-do's completion status
router.put("/:id", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
  
  try {
    const todo = await Todo.findOne({ _id: req.params.id, user: userId });
    if (!todo) {
      return res.status(404).json({ message: "To-do not found or not owned by user" });
    }

    // Toggle the completed status
    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (err) {
    res.status(500).json({ message: "Server error while updating to-do" });
  }
});

// DELETE a to-do item
router.delete("/:id", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
  
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!todo) {
      return res.status(404).json({ message: "To-do not found or not owned by user" });
    }
    res.json({ message: "To-do deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error while deleting to-do" });
  }
});

module.exports = router;