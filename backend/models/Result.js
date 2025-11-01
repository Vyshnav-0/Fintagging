const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        required: true,
    },
    modelName: {
        type: String,
        required: true,
    },
    taskType: {
        type: String,
        enum: ['FinNI', 'FinCL'],
        required: true,
    },
    results: {
        predictions: [{
            value: String,
            entityType: String,
            confidence: Number,
            location: {
                pageNum: Number,
                coordinates: {
                    x: Number,
                    y: Number,
                    width: Number,
                    height: Number,
                },
            },
            xbrlTag: {
                concept: String,
                taxonomy: String,
                confidence: Number,
            },
        }],
        metrics: {
            precision: Number,
            recall: Number,
            f1Score: Number,
            accuracy: Number,
        },
    },
    processingTime: Number,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Result', ResultSchema);
