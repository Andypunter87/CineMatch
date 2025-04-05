import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple test function
async function testOpenAI() {
  try {
    console.log("Testing OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hi!" }
      ],
      max_tokens: 10
    });

    console.log("OpenAI API test successful!");
    console.log("Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API test failed:", error);
  }
}

// Run the test
testOpenAI();