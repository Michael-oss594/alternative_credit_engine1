// Config for LLM-based categorization i can switch the behavior on/off without changing code.
module.exports = {
  enabled: process.env.LLM_ENABLED === "true",
  apiUrl: process.env.LLM_API_URL || "http://localhost:8000/v1/generate",
  apiKey: process.env.LLM_API_KEY || "",
  categories: process.env.LLM_CATEGORIES
    ? process.env.LLM_CATEGORIES.split(",").map((s) => s.trim())
    : [
        "salary",
        "business_income",
        "transfers",
        "utilities",
        "rent",
        "loan_repayment",
        "gambling",
        "pos_withdrawal",
        "cash_withdrawal",
        "food_delivery",
        "others",
      ],
};
