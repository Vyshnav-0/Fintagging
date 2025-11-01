const express = require('express');
const router = express.Router();
const localStorage = require('../config/localStorage');

// Get processing status
router.get('/:reportId/status', async (req, res) => {
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

        // Get results if any
        const results = await localStorage.getResultsByReportId(reportId);
        
        res.status(200).json({
            success: true,
            data: {
                status: report.status,
                results: results.length > 0 ? results : null,
                message: getStatusMessage(report.status)
            }
        });
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving processing status',
            error: error.message
        });
    }
});

function getStatusMessage(status) {
    switch (status) {
        case 'uploaded':
            return 'Document uploaded, waiting to start processing...';
        case 'processing':
            return 'Processing document...';
        case 'completed':
            return 'Processing completed successfully';
        case 'failed':
            return 'Processing failed';
        default:
            return 'Unknown status';
    }
}

module.exports = router;