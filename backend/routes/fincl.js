const express = require('express');
const router = express.Router();
const { processFinCL } = require('../controllers/finclController');

router.post('/', processFinCL);

module.exports = router;
