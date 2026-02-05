const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { Document } = require('@langchain/core/documents');

// We will use a simple local store: Array of { content, metadata, id }
// For "vectors", we might just do keyword search + simple scoring for this Node-only demo without heavy Python deps.
// OR we can use a light embedding if available. 
// For robustness without heavy install, we'll use a Keyword + Context Window approach (common for simple RAG).
// If user needs semantic, we'd need an API for embeddings (OpenAI/OpenRouter).

const indexFile = path.join(__dirname, '../data/rag_index.json');

const loadIndex = () => {
    if (!fs.existsSync(indexFile)) return [];
    return JSON.parse(fs.readFileSync(indexFile));
};

const saveIndex = (index) => {
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
};

exports.addDocument = async (text, metadata) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text], [metadata]);
    const index = loadIndex();

    const newChunks = docs.map(d => ({
        id: Math.random().toString(36).substring(7),
        content: d.pageContent,
        metadata: d.metadata,
        timestamp: new Date().toISOString()
    }));

    const updatedIndex = [...index, ...newChunks];
    saveIndex(updatedIndex);

    console.log(`Added ${newChunks.length} chunks to index.`);
    return newChunks.length;
};

// Simple TF-IDF like retrieval or Keyword Match for the demo
// Real production would use Pinecone/Milvus
exports.search = async (query, k = 5) => {
    const index = loadIndex();
    if (index.length === 0) return [];

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    // Score chunks based on term frequency
    const scored = index.map(chunk => {
        let score = 0;
        const lowerContent = chunk.content.toLowerCase();
        queryTerms.forEach(term => {
            if (lowerContent.includes(term)) score += 1;
        });
        return { ...chunk, score };
    });

    // Sort by score
    const results = scored
        .filter(d => d.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

    return results;
};
