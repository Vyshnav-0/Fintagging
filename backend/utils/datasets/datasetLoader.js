const { HfInference } = require('@huggingface/inference');
const fs = require('fs').promises;
const path = require('path');

class DatasetLoader {
    constructor() {
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        this.dataDir = path.join(__dirname, '../../data');
        this.finniCachePath = path.join(this.dataDir, 'finni_eval_cache.json');
        this.finclCachePath = path.join(this.dataDir, 'fincl_eval_cache.json');
    }

    async initializeCache() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }

        try {
            await fs.access(this.finniCachePath);
        } catch {
            await fs.writeFile(this.finniCachePath, JSON.stringify([]));
        }

        try {
            await fs.access(this.finclCachePath);
        } catch {
            await fs.writeFile(this.finclCachePath, JSON.stringify([]));
        }
    }

    async loadFinNIDataset() {
        try {
            // First check cache
            const cachedData = JSON.parse(await fs.readFile(this.finniCachePath, 'utf-8'));
            if (cachedData.length > 0) {
                return cachedData;
            }

            // If not in cache, fetch from Hugging Face
            const dataset = await this.hf.textGeneration({
                model: 'TheFinAI/FinNI-eval',
                inputs: JSON.stringify({
                    task: 'list_samples',
                    split: 'test'
                })
            });

            const parsedData = JSON.parse(dataset.generated_text);
            await fs.writeFile(this.finniCachePath, JSON.stringify(parsedData, null, 2));
            return parsedData;
        } catch (error) {
            console.error('Error loading FinNI dataset:', error);
            throw error;
        }
    }

    async loadFinCLDataset() {
        try {
            // First check cache
            const cachedData = JSON.parse(await fs.readFile(this.finclCachePath, 'utf-8'));
            if (cachedData.length > 0) {
                return cachedData;
            }

            // If not in cache, fetch from Hugging Face
            const dataset = await this.hf.textGeneration({
                model: 'TheFinAI/FinCL-eval',
                inputs: JSON.stringify({
                    task: 'list_samples',
                    split: 'test'
                })
            });

            const parsedData = JSON.parse(dataset.generated_text);
            await fs.writeFile(this.finclCachePath, JSON.stringify(parsedData, null, 2));
            return parsedData;
        } catch (error) {
            console.error('Error loading FinCL dataset:', error);
            throw error;
        }
    }

    async getFinNIEvalSample() {
        const dataset = await this.loadFinNIDataset();
        const randomIndex = Math.floor(Math.random() * dataset.length);
        return dataset[randomIndex];
    }

    async getFinCLEvalSample() {
        const dataset = await this.loadFinCLDataset();
        const randomIndex = Math.floor(Math.random() * dataset.length);
        return dataset[randomIndex];
    }

    // Helper method to evaluate FinNI predictions
    async evaluateFinNIPredictions(predictions, goldStandard) {
        const metrics = {
            precision: 0,
            recall: 0,
            f1Score: 0,
            accuracy: 0,
            detailedResults: []
        };

        // Compare predictions with gold standard
        let truePositives = 0;
        let falsePositives = 0;
        let falseNegatives = 0;

        goldStandard.forEach(gold => {
            const matchingPred = predictions.find(pred => 
                this._isMatchingEntity(pred, gold)
            );

            if (matchingPred) {
                truePositives++;
                metrics.detailedResults.push({
                    status: 'correct',
                    predicted: matchingPred,
                    actual: gold
                });
            } else {
                falseNegatives++;
                metrics.detailedResults.push({
                    status: 'missed',
                    predicted: null,
                    actual: gold
                });
            }
        });

        predictions.forEach(pred => {
            const hasMatch = goldStandard.some(gold => 
                this._isMatchingEntity(pred, gold)
            );
            if (!hasMatch) {
                falsePositives++;
                metrics.detailedResults.push({
                    status: 'false_positive',
                    predicted: pred,
                    actual: null
                });
            }
        });

        // Calculate metrics
        metrics.precision = truePositives / (truePositives + falsePositives) || 0;
        metrics.recall = truePositives / (truePositives + falseNegatives) || 0;
        metrics.f1Score = 2 * ((metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)) || 0;
        metrics.accuracy = truePositives / goldStandard.length || 0;

        return metrics;
    }

    // Helper method to evaluate FinCL predictions
    async evaluateFinCLPredictions(predictions, goldStandard) {
        const metrics = {
            precision: 0,
            recall: 0,
            f1Score: 0,
            accuracy: 0,
            detailedResults: []
        };

        let correctMappings = 0;
        let totalPredictions = predictions.length;
        let totalGoldStandard = goldStandard.length;

        goldStandard.forEach(gold => {
            const matchingPred = predictions.find(pred =>
                pred.xbrlTag?.concept === gold.xbrlTag?.concept
            );

            if (matchingPred) {
                correctMappings++;
                metrics.detailedResults.push({
                    status: 'correct',
                    predicted: matchingPred,
                    actual: gold
                });
            } else {
                metrics.detailedResults.push({
                    status: 'incorrect',
                    predicted: matchingPred || null,
                    actual: gold
                });
            }
        });

        metrics.precision = correctMappings / totalPredictions || 0;
        metrics.recall = correctMappings / totalGoldStandard || 0;
        metrics.f1Score = 2 * ((metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)) || 0;
        metrics.accuracy = correctMappings / totalGoldStandard || 0;

        return metrics;
    }

    _isMatchingEntity(pred, gold) {
        // Consider entities matching if they have the same value and type
        // You can adjust this logic based on your specific requirements
        return pred.value === gold.value && 
               pred.type === gold.type &&
               Math.abs(parseFloat(pred.value) - parseFloat(gold.value)) < 0.01;
    }
}

module.exports = new DatasetLoader();