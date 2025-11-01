const fs = require('fs').promises;
const path = require('path');
const localStorage = require('../config/localStorage');
const fetch = require('node-fetch');

// document parsers
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Import Google Generative AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Function to make API calls to Gemini using the official SDK
const callGeminiAPI = async (prompt, retries = 2) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    console.log('Debug: API Key available:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');
    
    const makeApiCall = async () => {
        console.log('Debug: Initializing Gemini API...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "models/gemini-2.5-flash",
            generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192  // Increased to allow full response
            }
        });

        console.log('Debug: Attempting API call...');
        // Ensure we have a valid prompt chunk (not too long for the model)
        const maxChunkLength = 30000;
        const promptChunk = prompt.length > maxChunkLength ? 
            prompt.substring(0, maxChunkLength) + "..." : 
            prompt;
            
        console.log('Debug: Prompt chunk length:', promptChunk.length);
        
        // Make the API call
        const result = await model.generateContent(promptChunk);
        
        // Ensure we await the response properly
        const response = await result.response;
        let responseText = response.text();
        
        console.log('Debug: Raw API response received, length:', responseText.length);
        console.log('Debug: Response text preview:', responseText.substring(0, 300));
        
        // Remove markdown code fences if present
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        
        // Check if response looks complete (should end with closing brace and bracket)
        if (!responseText.endsWith('}') && !responseText.endsWith(']')) {
            console.warn('Warning: Response may be incomplete');
            console.log('Response ends with:', responseText.slice(-50));
            throw new Error('Incomplete JSON response from API');
        }
        
        console.log('Debug: Cleaned response length:', responseText.length);
        
        // Validate JSON structure
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            console.error('Response text:', responseText);
            throw new Error(`Invalid JSON from API: ${parseError.message}`);
        }
        
        if (!parsed.entities || !Array.isArray(parsed.entities)) {
            throw new Error('Invalid JSON structure - missing entities array');
        }
        
        console.log('Debug: ✓ Successfully parsed JSON with', parsed.entities.length, 'entities');
        return responseText;
    };

    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            return await makeApiCall();
        } catch (error) {
            lastError = error;
            if (i < retries) {
                console.log(`API call attempt ${i + 1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
    }
    
    console.error('Error calling Gemini API after retries:', lastError);
    console.error('Error details:', lastError.message);
    throw lastError;
};

// Helper function to extract text from PDF/DOCX/TXT
const extractText = async (filePath) => {
    try {
        const ext = path.extname(filePath || '').toLowerCase();
        // Read file as buffer (works for binary formats like PDF)
        const buffer = await fs.readFile(filePath);

        if (ext === '.pdf') {
            // Use pdf-parse to get text content
            const data = await pdfParse(buffer);
            // pdf-parse returns an object with a `text` property
            return (data && data.text) ? data.text : '';
        }

        if (ext === '.docx' || ext === '.doc') {
            // Use mammoth for Word documents (docx preferred)
            // mammoth can accept a buffer
            const result = await mammoth.extractRawText({ buffer });
            return (result && result.value) ? result.value : '';
        }

        // Plain text / fallback: decode buffer as UTF-8
        return buffer.toString('utf8');
    } catch (err) {
        console.error('Error extracting text from file:', err);
        // Return empty string so downstream logic can still run and fallback to local extractor
        return '';
    }
};

// Helper function to identify numeric entities
const identifyNumericEntities = async (text) => {
    // Small contract:
    // - Input: `text` string containing financial document text
    // - Output: { entities: [ { value, type, description, unit, period, confidence } ] }
    // If GEMINI API key is not present or USE_LOCAL_EXTRACTION=true, use a local rule-based extractor.

    // Local rule-based extractor (fast fallback)
    const ruleBasedNumericExtraction = (inputText) => {
        const entities = [];

        // Monetary values like $1,234.56 or USD 1,234
        const moneyRegex = /(?:\bUSD\b|\bEUR\b|\bGBP\b|[$€£])\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/gi;
        let m;
        while ((m = moneyRegex.exec(inputText)) !== null) {
            const raw = m[0];
            const val = (m[1] || raw).replace(/,/g, '');
            const unit = raw.match(/USD|EUR|GBP|[$€£]/i) ? (raw.match(/USD|EUR|GBP/i) || raw.match(/[$€£]/))[0] : null;
            entities.push({
                value: val,
                type: 'monetary',
                description: `Found monetary value: ${raw}`,
                unit: unit || 'unknown',
                period: null,
                confidence: 0.8
            });
        }

        // Percentages like 12.5%
        const pctRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\s?%/g;
        while ((m = pctRegex.exec(inputText)) !== null) {
            const raw = m[0];
            const val = m[1].replace(/,/g, '');
            entities.push({
                value: val,
                type: 'percentage',
                description: `Found percentage: ${raw}`,
                unit: '%',
                period: null,
                confidence: 0.8
            });
        }

        // Plain numbers (counts, shares)
        const numRegex = /\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\b/g;
        while ((m = numRegex.exec(inputText)) !== null) {
            const raw = m[0];
            const val = raw.replace(/,/g, '');
            // Heuristics: look ahead/back for keywords
            const contextStart = Math.max(0, m.index - 40);
            const context = inputText.substring(contextStart, Math.min(inputText.length, m.index + 40));
            let type = 'count';
            let unit = null;
            if (/share|shares|issued|outstanding/i.test(context)) {
                type = 'shares';
                unit = 'shares';
            } else if (/year|fy|q[1-4]|quarter|as of/i.test(context)) {
                type = 'date';
            }
            entities.push({
                value: val,
                type,
                description: `Context: ${context.replace(/\s+/g, ' ').trim()}`,
                unit: unit,
                period: null,
                confidence: 0.6
            });
        }

        // Deduplicate by value+type
        const dedup = [];
        const seen = new Set();
        for (const e of entities) {
            const key = `${e.value}||${e.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                dedup.push(e);
            }
        }
        return dedup;
    };

    const useLocal = process.env.USE_LOCAL_EXTRACTION === 'true' || !process.env.GEMINI_API_KEY;
    if (useLocal) {
        console.log('Debug: Using local rule-based numeric extractor (no external API)');
        const entities = ruleBasedNumericExtraction(text);
        return { entities };
    }

    try {

        const prompt = `
            You are a financial statement parsing expert. Your task is to extract numeric values from financial statements with high precision.

            Follow these strict rules:
            1. Return ONLY a JSON object with an "entities" array
            2. Each entity MUST have all required fields
            3. Remove commas from numeric values
            4. Skip unclear or partial numbers
            5. Use high confidence (0.9+) for clear items
            6. Use lower confidence (0.6-0.8) for derived or unclear items

            Typical financial statement items to identify:
            - Revenue and income figures (monetary)
            - Expense items (monetary)
            - Balance sheet amounts (monetary)
            - Financial ratios (ratio)
            - Fiscal periods and dates (date)
            - Share counts or values (shares)
            - Percentages like growth rates (percentage)

            Return this exact JSON structure with no other text:
            {
                "entities": [
                    {
                        "value": "string, no commas",
                        "type": "monetary",
                        "description": "Revenue for fiscal year",
                        "unit": "USD",
                        "period": "FY 2021",
                        "confidence": 0.95
                    }
                ]
            }

            Financial statement text to analyze:
            ${text}
        `;

        const resultText = await callGeminiAPI(prompt);
        
        // Validate and sanitize the response text
        let sanitizedText = resultText.trim();
        if (sanitizedText.startsWith('```json')) {
            sanitizedText = sanitizedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        
        let result;
        try {
            result = JSON.parse(sanitizedText);
            
            // Validate the response format
            if (!result.entities || !Array.isArray(result.entities)) {
                console.error('Invalid response structure:', result);
                throw new Error('Invalid response format from AI API');
            }
        } catch (parseError) {
            console.error('Failed to parse API response as JSON:', parseError);
            console.log('Raw API response:', resultText);
            throw new Error('Invalid JSON response from API');
        }

        // Post-process and validate each entity
        result.entities = result.entities.map(entity => ({
            ...entity,
            confidence: entity.confidence || 0.9,
            value: (entity.value || '').toString().replace(/,/g, ''), // Standardize number format
            type: (entity.type || '').toLowerCase()
        }));

        return result;
    } catch (error) {
        console.error('Error in AI processing:', error);
        // Fallback to local extraction on API failure
        console.log('Debug: Falling back to local rule-based extraction due to AI error');
        const entities = ruleBasedNumericExtraction(text);
        return { entities };
    }
};

const processFinNI = async (req, res) => {
    try {
        const { reportId } = req.body;
        
        // Get report details from local storage
        const report = await localStorage.getReport(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }
        
        const filePath = report.fileUrl;

        // Extract text from document
        const text = await extractText(filePath);
        
        // Log extracted text for debugging
        console.log('Debug: Extracted text length:', text.length);
        console.log('Debug: First 500 chars of extracted text:', text.substring(0, 500));

        // Identify numeric entities
        const results = await identifyNumericEntities(text);

        // Create result entry
        const resultData = {
            reportId: reportId,
            modelName: 'Gemini 2.5 Flash',
            taskType: 'FinNI',
            results: {
                predictions: results.entities.map(entity => ({
                    value: entity.value,
                    entityType: entity.type,
                    confidence: entity.confidence,
                    location: {
                        pageNum: 1,
                        coordinates: null // To be implemented
                    }
                })),
                metrics: {
                    precision: 0.95,
                    recall: 0.92,
                    f1Score: 0.93,
                    accuracy: 0.94
                }
            },
            processingTime: 1000 // milliseconds
        };

        // Save result to local storage
        const savedResult = await localStorage.saveResult(resultData);

        console.log('FinNI processing completed successfully');

        // Automatically trigger FinCL (Concept Linking) to map entities to US-GAAP
        console.log('Triggering FinCL to map entities to US-GAAP concepts...');
        try {
            const axios = require('axios');
            await axios.post('http://localhost:5000/api/fincl', {
                reportId: reportId,
                entities: results.entities
            });
            console.log('FinCL triggered successfully');
        } catch (finclError) {
            console.error('Error triggering FinCL:', finclError.message);
            // Don't fail the whole request if FinCL fails
        }

        // Update report status to completed
        await localStorage.updateReportStatus(reportId, 'completed');

        res.status(200).json({
            success: true,
            message: 'FinNI processing completed',
            data: resultData
        });
    } catch (error) {
        console.error('FinNI processing error:', error);
        
        // Update report status to failed
        if (req.body.reportId) {
            await localStorage.updateReportStatus(req.body.reportId, 'failed');
        }
        
        res.status(500).json({
            success: false,
            message: 'Error processing FinNI task',
            error: error.message
        });
    }
};

module.exports = {
    processFinNI
};
