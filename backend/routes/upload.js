const express = require('express');
const router = express.Router();
const { upload, uploadFile } = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');

// Protect upload route with authentication
router.post('/', authMiddleware, upload, uploadFile);

module.exports = router;
