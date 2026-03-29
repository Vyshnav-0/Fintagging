const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

class AIService {
    constructor() {
        this.gemini = process.env.GEMINI_API_KEY ? 
            new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
        
        this.openai = process.env.OPENAI_API_KEY ? 
            new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
        
        if (!this.gemini && !this.openai) {
            throw new Error('No AI service API keys configured');
        }
    }

    async processFinancialText(text, task = 'extraction') {
        try {
            // Try Gemini first
            if (this.gemini) {
                try {
                    return await this._processWithGemini(text, task);
                } catch (geminiError) {
                    console.warn('Gemini API error:', geminiError);
                    // Fall back to OpenAI if available
                    if (this.openai) {
                        return await this._processWithOpenAI(text, task);
                    }
                    throw geminiError;
                }
            } else if (this.openai) {
                return await this._processWithOpenAI(text, task);
            }
            
            throw new Error('No AI service available');
        } catch (error) {
            console.error('AI processing error:', error);
            throw error;
        }
    }

    async _processWithGemini(text, task) {
        const model = this.gemini.getGenerativeModel({ model: "models/gemini-2.5-flash" });
        
        const systemPrompt = task === 'extraction' ? 
            'You are a financial data extraction expert. Extract financial facts precisely and consistently.' :
            'You are an XBRL taxonomy mapping expert. Map financial facts to appropriate US-GAAP concepts.';

        const prompt = this._generatePrompt(text, task);

        try {
            // Generate content with improved configuration
            const result = await model.generateContent({
                contents: [{ 
                    role: "user", 
                    parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
                }],
                generationConfig: {
                    temperature: 0.1, // Low temperature for consistent results
                    topK: 40,
                    topP: 0.8,
                    maxOutputTokens: 2048
                }
            });

            const response = result.response;
            let resultText = response.text();
            
            // Remove markdown code fences if present
            resultText = resultText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
            
            // Validate JSON response
            try {
                const jsonResult = JSON.parse(resultText);
                return jsonResult;
            } catch (jsonError) {
                console.error('Failed to parse Gemini response as JSON:', resultText);
                throw new Error(`Invalid JSON response from Gemini API: ${jsonError.message}`);
            }
        } catch (error) {
            console.error('Gemini API detailed error:', error);
            throw new Error(`Gemini API error: ${error.message}`);
        }
    }

    async _processWithOpenAI(text, task) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: task === 'extraction' ?
                            'You are a financial data extraction expert. Extract financial facts precisely and consistently.' :
                            'You are an XBRL taxonomy mapping expert. Map financial facts to appropriate US-GAAP concepts.'
                    },
                    {
                        role: "user",
                        content: this._generatePrompt(text, task)
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            });

            return JSON.parse(completion.choices[0].message.content);
        } catch (error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }

    _generatePrompt(text, task) {
        if (task === 'extraction') {
            return `
                Analyze the following financial text and extract all numeric values.
                For each value provide:
                1. The exact numeric value as it appears in the text
                2. The standardized type (one of: monetary, percentage, ratio, shares, date, count)
                3. The contextual description
                4. The unit (e.g., USD, EUR, shares, %)
                5. The period (e.g., Q1 2025, FY 2024, as of December 31, 2024)
                
                Respond ONLY with a JSON object in the following format, nothing else:
                {
                    "entities": [
                        {
                            "value": "actual numeric value",
                            "type": "standardized type",
                            "description": "contextual description",
                            "unit": "measurement unit",
                            "period": "time period",
                            "confidence": 0.95
                        }
                    ]
                }

                Text to analyze:
                ${text}
            `;
        } else {
            return `
                Map the financial entities to appropriate US-GAAP concepts.
                
                For each entity, provide:
                1. The US-GAAP concept name from the available taxonomy
                2. Confidence score (0-1)
                3. Brief explanation of the mapping

                Respond ONLY with a JSON object in the following format:
                {
                    "mappings": [
                        {
                            "entityId": "index",
                            "xbrlTag": {
                                "concept": "us-gaap concept",
                                "taxonomy": "us-gaap",
                                "confidence": 0.95
                            },
                            "explanation": "reason for mapping"
                        }
                    ]
                }

                Text to analyze:
                ${text}
            `;
        }
    }

    // Helper method to validate financial numbers
    validateFinancialNumber(value) {
        // Remove any commas and spaces
        const cleanValue = value.replace(/[,\s]/g, '');
        
        // Check if it's a valid number
        if (!/^-?\d*\.?\d+$/.test(cleanValue)) {
            return false;
        }

        // Parse the number
        const num = parseFloat(cleanValue);
        
        // Check for reasonable range in financial context
        // Adjust these limits based on your specific needs
        if (num > 1e15 || num < -1e15) { // Trillion dollar range
            return false;
        }

        return true;
    }

    // Helper method to validate extracted entities
    validateExtractedEntities(entities) {
        const validTypes = ['monetary', 'percentage', 'ratio', 'shares', 'date', 'count'];
        const validUnits = ['USD', 'EUR', 'GBP', 'shares', '%', 'units'];

        return entities.filter(entity => {
            return (
                this.validateFinancialNumber(entity.value) &&
                validTypes.includes(entity.type.toLowerCase()) &&
                entity.description?.length > 0 &&
                (validUnits.includes(entity.unit) || /^[A-Z]{3}$/.test(entity.unit)) &&
                entity.period?.length > 0 &&
                typeof entity.confidence === 'number' &&
                entity.confidence >= 0 &&
                entity.confidence <= 1
            );
        });
    }
}

module.exports = new AIService();