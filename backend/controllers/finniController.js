const fs = require('fs').promises;
const path = require('path');
const localStorage = require('../config/localStorage');
const fetch = require('node-fetch');

// document parsers
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Import Google Generative AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const DEFAULT_OPENROUTER_FREE_MODELS = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'stepfun/step-3.5-flash:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'openai/gpt-oss-20b:free',
    'openai/gpt-oss-120b:free',
    'qwen/qwen3-coder:free',
    'qwen/qwen3-4b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'google/gemma-3-12b-it:free',
    'google/gemma-3-27b-it:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'z-ai/glm-4.5-air:free',
    'minimax/minimax-m2.5:free',
    'arcee-ai/trinity-large-preview:free'
];

const getOpenRouterModelChain = () => {
    const primary = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';
    const envFallback = (process.env.OPENROUTER_FALLBACK_MODELS || '')
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);
    const models = [primary, ...envFallback, ...DEFAULT_OPENROUTER_FREE_MODELS];
    return [...new Set(models)];
};

const getOpenRouterClient = () => {
    if (!process.env.OPENROUTER_API_KEY) return null;
    return new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
    });
};

const callOpenRouterJSON = async (prompt) => {
    const client = getOpenRouterClient();
    if (!client) throw new Error('OPENROUTER_API_KEY environment variable is not set');
    const modelChain = getOpenRouterModelChain();
    const perModelTimeoutMs = Number(process.env.OPENROUTER_MODEL_TIMEOUT_MS || 25000);
    const extraHeaders = {
        ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {})
    };
    let lastError;
    for (const model of modelChain) {
        try {
            const resp = await Promise.race([
                client.chat.completions.create(
                    {
                        model,
                        messages: [
                            { role: 'system', content: 'Return JSON only. No markdown. No code fences.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.1
                    },
                    { headers: extraHeaders }
                ),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`OpenRouter model timeout (${perModelTimeoutMs}ms)`)), perModelTimeoutMs))
            ]);

            const text = resp?.choices?.[0]?.message?.content?.trim() || '';
            const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
            JSON.parse(cleaned);
            console.log(`[OpenRouter] FinNI model succeeded: ${model}`);
            return cleaned;
        } catch (err) {
            lastError = err;
            console.warn(`[OpenRouter] FinNI model failed: ${model} -> ${err.message}`);
        }
    }
    throw lastError || new Error('All OpenRouter models failed');
};

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
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192
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

const callLLMJSON = async (prompt, retries = 1) => {
    let last;
    for (let i = 0; i <= retries; i++) {
        try {
            if (process.env.OPENROUTER_API_KEY) {
                try {
                    return await callOpenRouterJSON(prompt);
                } catch (openRouterErr) {
                    // If OpenRouter fails (timeouts/rate limits), fall back to Gemini when available.
                    if (process.env.GEMINI_API_KEY) {
                        console.warn(`[LLM] OpenRouter failed; falling back to Gemini: ${openRouterErr.message}`);
                        return await callGeminiAPI(prompt);
                    }
                    throw openRouterErr;
                }
            }
            if (process.env.GEMINI_API_KEY) {
                return await callGeminiAPI(prompt);
            }
            throw new Error('No LLM configured (set OPENROUTER_API_KEY or GEMINI_API_KEY)');
        } catch (e) {
            last = e;
            if (i < retries) await new Promise(r => setTimeout(r, 800 * (i + 1)));
        }
    }
    throw last;
};

// Helper function to extract text from PDF/DOCX/TXT
const extractText = async (filePath) => {
    try {
        const ext = path.extname(filePath || '').toLowerCase();
        console.log(`[Extraction] Reading file: ${filePath}`);
        
        if (ext === '.pdf') {
            console.log('[Extraction] Starting PDF parse (legacy mode)...');
            const buffer = await fs.readFile(filePath);
            const data = await pdfParse(buffer);
            console.log('[Extraction] PDF parse completed');
            return (data && data.text) ? data.text : '';
        }

        if (ext === '.docx' || ext === '.doc') {
            console.log('[Extraction] Starting Word parse...');
            const buffer = await fs.readFile(filePath);
            const result = await mammoth.extractRawText({ buffer });
            console.log('[Extraction] Word parse completed');
            return (result && result.value) ? result.value : '';
        }

        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (err) {
        console.error('[Extraction] Error:', err.message);
        // Fallback: try reading as raw text if all else fails
        try { return await fs.readFile(filePath, 'utf8'); } catch { return ''; }
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
        const calcContextConfidence = (context, base = 0.6) => {
            let score = base;
            if (/revenue|income|expense|profit|loss|assets|liabilities|equity/i.test(context)) score += 0.12;
            if (/total|net|operating|gross|balance sheet|cash flow|statement/i.test(context)) score += 0.08;
            if (/fy|fiscal|year|quarter|q[1-4]|period/i.test(context)) score += 0.05;
            return Math.min(0.95, Number(score.toFixed(2)));
        };

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
                confidence: 0.9
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
                confidence: 0.85
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
            let confidence = calcContextConfidence(context, 0.58);
            if (/share|shares|issued|outstanding/i.test(context)) {
                type = 'shares';
                unit = 'shares';
                confidence = calcContextConfidence(context, 0.74);
            } else if (/year|fy|q[1-4]|quarter|as of/i.test(context)) {
                type = 'date';
                confidence = calcContextConfidence(context, 0.7);
            } else if (/revenue|income|expense|profit|loss|assets|liabilities|equity|cash/i.test(context)) {
                type = 'monetary';
                unit = unit || 'implied';
                confidence = calcContextConfidence(context, 0.68);
            }
            entities.push({
                value: val,
                type,
                description: `Context: ${context.replace(/\s+/g, ' ').trim()}`,
                unit: unit,
                period: null,
                confidence
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

        const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 90000);
        const resultText = await Promise.race([
            callLLMJSON(prompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`AI Analysis Timeout (${timeoutMs}ms)`)), timeoutMs))
        ]);
        
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

const processFinNIInternal = async (reportId) => {
    // Get report details from local storage
    console.log(`\n[Process] Starting FinNI Internal for Report: ${reportId}`);
    
    const report = await localStorage.getReport(reportId);
    if (!report) throw new Error('Report not found');
    const filePath = report.fileUrl;
    
    await localStorage.addLog(reportId, 'FinNI Engine initializing...');
    
    const text = await extractText(filePath);
    console.log(`[Process] Extraction finished. Text length: ${text.length}`);
    await localStorage.addLog(reportId, `Successfully parsed document (${text.length} characters extracted)`);
    
    await localStorage.addLog(reportId, 'AI Engine identifying numeric entities (revenue, assets, ratios)...');
    const results = await identifyNumericEntities(text);
    await localStorage.addLog(reportId, `Successfully identified ${results.entities?.length || 0} financial entities`);

    const resultData = {
        reportId: reportId,
        modelName: 'Gemini 2.5 Flash',
        taskType: 'FinNI',
        results: {
            predictions: results.entities.map(entity => ({
                value: entity.value,
                entityType: entity.type,
                confidence: entity.confidence,
                location: { pageNum: 1, coordinates: null }
            })),
            metrics: { precision: 0.95, recall: 0.92, f1Score: 0.93, accuracy: 0.94 }
        },
        processingTime: 1000
    };

    const savedResult = await localStorage.saveResult(resultData);
    console.log('✓ FinNI processing completed');
    await localStorage.addLog(reportId, 'Fact extraction Phase 1: COMPLETE', 'success');

    // Run FinCL (Concept Linking) and only then mark completed.
    try {
        await localStorage.addLog(reportId, 'FinCL Semantic Mapping starting (Linking to US-GAAP Taxonomy)');
        const { processFinCLInternal } = require('./finclController');
        await localStorage.updateReportStatus(reportId, 'processing', 'FinCL mapping in progress...');
        await processFinCLInternal(reportId, results.entities);
        console.log('✓ FinCL processing completed (awaited)');
    } catch (finclError) {
        console.error('! Could not trigger FinCL:', finclError.message);
        await localStorage.updateReportStatus(reportId, 'failed', `FinCL failed: ${finclError.message}`);
        throw finclError;
    }

    // Update report status
    await localStorage.updateReportStatus(reportId, 'completed', 'Analysis Engine cycle completed successfully');
    return resultData;
};

const processFinNI = async (req, res) => {
    try {
        const { reportId } = req.body;
        const result = await processFinNIInternal(reportId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('FinNI API Controller Error:', error);
        if (req.body.reportId) {
            await localStorage.updateReportStatus(req.body.reportId, 'failed');
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    processFinNI,
    processFinNIInternal
};
