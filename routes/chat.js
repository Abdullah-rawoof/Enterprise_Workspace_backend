const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');
const LLMConfig = require('../models/LLMConfig');

const Document = require('../models/Document');
const Message = require('../models/Message');
const verifyToken = require('../middleware/auth'); // Optional: if we want to protect chat

// Initialize OpenAI (or OpenRouter)
// Ideally, API Key should be in .env
const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "sk-or-v1-...", // Fallback or Error
});

// Helper: Parse Documents (Scoped to Org)
async function parseDocuments(ownerEmail) {
    // SECURITY FIX: Only fetch documents owned by this admin (or staff's admin)
    const docs = await Document.find({ uploadedBy: ownerEmail });
    let context = [];

    for (const doc of docs) {
        const filePath = path.join(__dirname, '..', doc.path);
        if (!fs.existsSync(filePath)) {
            console.warn(`[RAG Warning] File not found: ${filePath}. Ephemeral storage might have wiped it.`);
            continue;
        }

        let content = '';
        try {
            if (doc.type === 'pdf') {
                const buffer = fs.readFileSync(filePath);
                const data = await pdf(buffer);
                content = data.text;
            } else if (doc.type === 'docx') {
                const buffer = fs.readFileSync(filePath);
                const result = await mammoth.extractRawText({ buffer });
                content = result.value;
            } else if (['txt', 'md', 'json'].includes(doc.type)) {
                content = fs.readFileSync(filePath, 'utf-8');
            }
        } catch (e) {
            console.error(`Error parsing ${doc.name}:`, e);
        }

        if (content) {
            // Chunking (Simple split)
            const chunks = content.match(/[\s\S]{1,1000}/g) || [];
            chunks.forEach((chunk, i) => {
                context.push({
                    text: `[Source: ${doc.name}] [Description: ${doc.description || 'None'}] ${chunk}`,
                    metadata: { source: doc.name, page: i + 1, description: doc.description }
                });
            });
        }
    }
    return context;
}

// Helper: Web Search
const DDG = require('duck-duck-scrape');

async function performWebSearch(query) {
    try {
        const searchResults = await DDG.search(query, {
            safeSearch: DDG.SafeSearchType.OFF
        });

        let results = [];
        if (searchResults.results && searchResults.results.length > 0) {
            results = searchResults.results.slice(0, 3).map(r => ({
                title: r.title,
                description: r.description,
                url: r.url,
                source: 'Web Search'
            }));
        }

        // Fallback
        if (results.length === 0) {
            console.log("DDG returned no results.");
            // Try a backup or just return empty
        }
        return results;

    } catch (e) {
        console.error("Search Error (DDG):", e);
        return [];
    }
}

// Helper: Retrieve Relevant Context (Simple Keyword Match)
function retrieveContext(query, allChunks) {
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
    return allChunks.filter(chunk => {
        const text = chunk.text.toLowerCase();
        return keywords.some(k => text.includes(k));
    }).slice(0, 5); // Top 5
}

router.post('/', verifyToken, async (req, res) => {
    try {
        const { message } = req.body;

        // 1. Get Config
        const config = await LLMConfig.findOne() || new LLMConfig();

        // Determine Org Owner (Admin Email)
        let orgOwnerEmail = req.user.email;
        if (req.user.role === 'staff') {
            // If staff, look up their admin
            const User = require('../models/User');
            const staff = await User.findById(req.user.id);
            if (staff && staff.adminId) {
                const admin = await User.findById(staff.adminId);
                if (admin) orgOwnerEmail = admin.email;
            }
        }

        // 2. Parallel: Web Search + Document Parsing
        const [webResults, allChunks] = await Promise.all([
            config.enableSearch ? performWebSearch(message) : [],
            config.enableRAG ? parseDocuments(orgOwnerEmail) : []
        ]);

        // 3. Retrieve
        const docContext = retrieveContext(message, allChunks);

        // 4. Construct System Prompt with Governance Instructions
        const systemPrompt = `
        ${config.prompt}

        You are a highly capable AI assistant.
        
        **Instructions**:
        1. **Context Priority**: First, verify if the [Context] or [Web Search] provides the answer.
        2. **Hybrid Knowledge**: If the context/search is insufficient, YOU ARE PERMITTED to use your own internal knowledge to answer helpfuly.
        3. **Citations**:
           - If using documents, cite the source name.
           - If using web search, cite the URL.
           - If using internal knowledge, cite "General Knowledge" or "LLM Model".
        4. **Governance**: You must output a JSON object describing your reasoning.
        
        Format your response as a valid JSON object with the following structure:
        {
          "response": "Your main natural language answer here (markdown supported).",
          "governance": {
             "validation": {
                "riskLevel": "Low" | "Medium" | "High",
                "confidenceScore": 0-100,
                "hallucinationCheck": "Pass" | "Fail",
                "unsupportedClaims": []
             },
             "bias": {
                "hasBias": boolean,
                "flaggedTerms": []
             },
             "evidence": [
                { "claim": "...", "source": "..." }
             ]
          },
          "sources": [
             { "metadata": { "source": "..." } }
          ]
        }

        [Web Search Data]:
        ${JSON.stringify(webResults)}

        [Document Context]:
        ${JSON.stringify(docContext.map(c => ({ text: c.text, source: c.metadata.source })))}
        `;

        // 5. Call LLM
        const completion = await client.chat.completions.create({
            model: "openai/gpt-3.5-turbo", // Or config.model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            response_format: { type: "json_object" } // Enforce JSON
        });

        const result = JSON.parse(completion.choices[0].message.content);

        // Inject computed sources if LLM missed them
        if (!result.sources || result.sources.length === 0) {
            result.sources = [...webResults.map(w => ({ metadata: { source: w.title } })), ...docContext.map(d => ({ metadata: { source: d.metadata.source } }))];
        }

        // SAVE HISTORY
        // 1. User Message
        await Message.create({
            userEmail: req.user.email,
            role: 'user',
            content: message
        });

        // 2. Assistant Message
        await Message.create({
            userEmail: req.user.email,
            role: 'assistant',
            content: result.response, // Main text
            governance: result.governance, // Gov Data
            sources: result.sources
        });

        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// GET /history
router.get('/history', verifyToken, async (req, res) => {
    try {
        const history = await Message.find({ userEmail: req.user.email }).sort({ timestamp: 1 });
        // Format for frontend
        const formatted = history.map(m => ({
            role: m.role,
            content: m.content,
            governance: m.governance,
            sources: m.sources
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
