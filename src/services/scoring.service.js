exports.scoreApplicant = (features) => {
  let score = 100;

  // penalties
  if (features.bounceCount > 2) score -= 20;
  if (features.negativeBalanceDays > 5) score -= 15;
  if (features.avgIncome < 20000) score -= 15;
  if (features.avgBalance < 5000) score -= 10;
  if (features.income_stability.income_variance > 50000) score -= 10;
  if (features.income_stability.income_frequency < 3) score -= 10; 
  if (features.spending_behavior.expense_ratio > 0.8) score -= 10; 
  if (features.liquidity.min_balance < 1000) score -= 10;
  if (features.debt_signal.loan_default_flags > 0) score -= 20;
  if (features.data_quantity.duplicate_transaction > 5) score -= 5;

  // penalize large spending in certain categories
  const catTotals = features.categoryTotals || {};
  const penalties = [
    "utilities",
    "rent",
    "loan_repayment",
    "gambling",
    "pos_withdrawal",
  ];
  penalties.forEach((cat) => {
    const amt = catTotals[cat] || 0;
    score -= Math.min(20, amt / 5000);
  });

  const businessAmt = catTotals.business_income || 0;
  if (businessAmt > 0) {
    score += Math.min(10, businessAmt / 10000);
  }

  score = Math.max(0, Math.min(100, score));

  let risk_band = "High";
  if (score >= 80) risk_band = "Low";
  else if (score >= 60) risk_band = "Medium";

  let loan_recommendation = "Decline";
  let recommended_limit = 0;
  if (score >= 70) {
    loan_recommendation = "Approve";
    recommended_limit = Math.min(500000, features.avgIncome * 0.5);
  } else if (score >= 40) {
    loan_recommendation = "Review";
    recommended_limit = Math.min(200000, features.avgIncome * 0.2);
  }

  return {
    credit_score: score,
    risk_band,
    loan_recommendation,
    recommended_limit,
  };
};