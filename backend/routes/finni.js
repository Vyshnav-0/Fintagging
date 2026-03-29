const express = require('express');
const router = express.Router();
const { processFinNI } = require('../controllers/finniController');

router.post('/', processFinNI);

module.exports = router;
