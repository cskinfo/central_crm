const express = require('express');
const router = express.Router();
const {
    getUserById
} = require('../controllers/userControllers');
const {
    protect,
    admin
} = require('../middleware/Auth');

// Get user by ID
router.get('/:id', protect, admin, getUserById);

module.exports = router;