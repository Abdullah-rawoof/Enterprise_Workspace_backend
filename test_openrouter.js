const { OpenRouter } = require("@openrouter/sdk");

async function testChat() {
    console.log("Initializing OpenRouter...");
    const openrouter = new OpenRouter({
        apiKey: "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"
    });

    console.log("Sending request...");
    try {
        const stream = await openrouter.chat.send({
            model: "arcee-ai/trinity-large-preview:free",
            messages: [
                { role: "user", content: "Say hello world" }
            ],
            stream: true
        });

        console.log("Stream started...");
        let response = "";
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                process.stdout.write(content);
                response += content;
            }
        }
        console.log("\n\nFinished. Total length:", response.length);
    } catch (error) {
        console.error("Error during test:", error);
    }
}

testChat();
