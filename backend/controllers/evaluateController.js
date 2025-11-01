const localStorage = require('../config/localStorage');
const datasetLoader = require('../utils/datasets/datasetLoader');

const evaluateResults = async (req, res) => {
    try {
        const { reportId, predictions, taskType } = req.body;

        // Get evaluation data based on task type
        let goldStandard;
        let metrics;

        if (taskType === 'FinNI') {
            const evalSample = await datasetLoader.getFinNIEvalSample();
            goldStandard = evalSample.entities;
            metrics = await datasetLoader.evaluateFinNIPredictions(predictions, goldStandard);
        } else if (taskType === 'FinCL') {
            const evalSample = await datasetLoader.getFinCLEvalSample();
            goldStandard = evalSample.mappings;
            metrics = await datasetLoader.evaluateFinCLPredictions(predictions, goldStandard);
        } else {
            throw new Error('Invalid task type');
        }

        // Create evaluation result
        const evaluationData = {
            reportId: reportId,
            modelName: req.body.modelName || 'GPT-4',
            taskType: taskType,
            results: {
                predictions: predictions,
                goldStandard: goldStandard,
                metrics: metrics
            },
            processingTime: Date.now() - req.body.startTime
        };

        // Save evaluation result to local storage
        const savedResult = await localStorage.saveResult(evaluationData);

        res.status(200).json({
            success: true,
            message: 'Evaluation completed',
            data: evaluationData
        });
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during evaluation',
            error: error.message
        });
    }
};

module.exports = {
    evaluateResults
};
