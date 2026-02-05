const { search: ddgSearch, SafeSearchType } = require('duck-duck-scrape');

exports.search = async (query) => {
    try {
        console.log(`Searching Web for: "${query}"`);
        const searchResults = await ddgSearch(query, {
            safeSearch: SafeSearchType.MODERATE
        });

        if (!searchResults.results || searchResults.results.length === 0) {
            return [];
        }

        // Map to a clean format
        return searchResults.results.slice(0, 5).map(result => ({
            title: result.title,
            link: result.url,
            snippet: result.description || 'No description available'
        }));

    } catch (error) {
        console.error("Web Search Error:", error);
        return [];
    }
};
