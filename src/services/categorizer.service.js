const { categorizeWithLLM } = require("./llm.service");

function ruleBasedCategorize(transactions) {
  return transactions.map((txn) => {
    const desc = txn.description.toLowerCase();

    let category = "others";

    if (desc.includes("salary")) category = "salary";
    else if (desc.includes("business") || desc.includes("inc") || desc.includes("corp"))
      category = "business_income";
    else if (desc.includes("transfer")) category = "transfers";
    else if (
      desc.includes("electric") ||
      desc.includes("water") ||
      desc.includes("utility") ||
      desc.includes("gas bill")
    )
      category = "utilities";
    else if (desc.includes("rent")) category = "rent";
    else if (desc.includes("emi") || desc.includes("loan"))
      category = "loan_repayment";
    else if (desc.includes("casino") || desc.includes("bet") || desc.includes("gambl"))
      category = "gambling";
    else if (desc.includes("pos") || desc.includes("purchase"))
      category = "pos_withdrawal";
    else if (desc.includes("atm")) category = "cash_withdrawal";
    else if (desc.includes("swiggy") || desc.includes("kfc"))
      category = "food_delivery";

    return { ...txn, category };
  });
}

exports.categorizeTransactions = async (transactions) => {
  const llmResult = await categorizeWithLLM(transactions);

  if (Array.isArray(llmResult) && llmResult.length === transactions.length) {
    return llmResult;
  }
  return ruleBasedCategorize(transactions);
};