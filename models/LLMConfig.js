const mongoose = require('mongoose');

const llmConfigSchema = new mongoose.Schema({
    prompt: { type: String, default: "You are a helpful AI assistant for the organization." },
    temperature: { type: Number, default: 0.7 },
    model: { type: String, default: "openai/gpt-3.5-turbo" },
    enableSearch: { type: Boolean, default: true },
    enableRAG: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LLMConfig', llmConfigSchema);
