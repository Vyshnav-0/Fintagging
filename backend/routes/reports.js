const express = require('express');
const router = express.Router();
const localStorage = require('../config/localStorage');

router.get('/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        
        // Get report details
        const report = await localStorage.getReport(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Get results for this report
        const results = await localStorage.getResultsByReportId(reportId);

        res.status(200).json({
            success: true,
            message: 'Results retrieved successfully',
            data: results
        });
    } catch (error) {
        console.error('Error retrieving report results:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving results',
            error: error.message
        });
    }
});

module.exports = router;