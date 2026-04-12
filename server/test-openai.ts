import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function testClaude() {
  try {
    console.log("Testing Anthropic Claude API...");
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 10,
      messages: [
        { role: "user", content: "Say hi!" }
      ]
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    console.log("Claude API test successful!");
    console.log("Response:", text);
  } catch (error) {
    console.error("Claude API test failed:", error);
  }
}

testClaude();
