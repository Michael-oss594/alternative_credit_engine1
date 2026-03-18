const axios = require("axios");
const llmConfig = require("../config/llm");

function buildPrompt(transactions, categories) {
  return `You are an automated transaction categorizer. The possible categories are: ${categories.join(", ")}.
For each transaction description below choose the most appropriate category.
Return a JSON array where each element has the shape {"description":"...","category":"..."} and the order matches the input.
Only output the JSON array, nothing else.

Transactions:\n${transactions
    .map((t) => `- ${t.description}`)
    .join("\n")}
`;
}

async function categorizeWithLLM(transactions) {
  if (!llmConfig.enabled) {
    return null;
  }

  const prompt = buildPrompt(transactions, llmConfig.categories);

  try {
    const body = {
      prompt,
      max_tokens: 500,
      temperature: 0,
    };

    const headers = {};
    if (llmConfig.apiKey) {
      headers["Authorization"] = `Bearer ${llmConfig.apiKey}`;
    }

    const resp = await axios.post(llmConfig.apiUrl, body, { headers });
    const text = resp.data?.text || resp.data?.output || resp.data;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.warn("LLM response not JSON, falling back to default categories", text);
      return transactions.map((t) => ({ ...t, category: "others" }));
    }

    if (Array.isArray(parsed)) {
      return transactions.map((t, i) => {
        const item = parsed[i] || {};
        return { ...t, category: item.category || "others" };
      });
    }

    return transactions.map((t) => ({ ...t, category: "others" }));
  } catch (err) {
    console.error("Error calling LLM endpoint", err.message || err);
    return transactions.map((t) => ({ ...t, category: "others" }));
  }
}

module.exports = {
  categorizeWithLLM,
};
