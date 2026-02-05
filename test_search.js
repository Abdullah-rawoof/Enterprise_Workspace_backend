const google = require('googlethis');

async function test() {
    console.log("Testing Google Search...");
    try {
        const options = {
            page: 0,
            safe: false,
            additional_params: {
                hl: 'en'
            }
        };
        const response = await google.search('latest ai news', options);
        if (response.results && response.results.length > 0) {
            console.log("Search Successful! Found", response.results.length, "results.");
            console.log("Title:", response.results[0].title);
            console.log("URL:", response.results[0].url);
        } else {
            console.log("Search returned no results.");
            console.log(response);
        }
    } catch (e) {
        console.error("Search Failed:", e);
    }
}

test();
