const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
        enum: ['10-K', 'PDF', 'DOCX', 'HTML'],
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'completed', 'failed'],
        default: 'uploaded',
    },
    fileUrl: {
        type: String,
        required: true,
    },
    metadata: {
        companyName: String,
        fiscalYear: String,
        documentType: String,
    },
    extractedData: {
        rawText: String,
        tables: [Object],
    },
});

module.exports = mongoose.model('Report', ReportSchema);
