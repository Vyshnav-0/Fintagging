const express = require('express');
const router = express.Router();
const { evaluateResults } = require('../controllers/evaluateController');

router.post('/', evaluateResults);

module.exports = router;
