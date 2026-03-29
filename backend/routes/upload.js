const express = require('express');
const router = express.Router();
const { upload, uploadFile } = require('../controllers/uploadController');

// Public upload endpoint (no authentication required)
router.post('/', upload, uploadFile);

module.exports = router;
