exports.generateFeatures = (transactions) => {
  // category totals and counts
  const categoryTotals = {};
  const categoryCounts = {};

  transactions.forEach((t) => {
    const cat = t.category || "others";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.debit || 0);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // transactions by month
  const monthlyData = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    if (isNaN(date)) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { incomes: [], expenses: [], balances: [], transfers: 0, inflows: 0, outflows: 0 };
    }
    if (t.credit > 0) {
      monthlyData[monthKey].incomes.push(t.credit);
      monthlyData[monthKey].inflows++;
    }
    if (t.debit > 0) {
      monthlyData[monthKey].expenses.push(t.debit);
      monthlyData[monthKey].outflows++;
      if (t.category === 'transfer') monthlyData[monthKey].transfers++;
    }
    monthlyData[monthKey].balances.push(t.balance);
  });

  // Income stability
  const allIncomes = Object.values(monthlyData).flatMap(m => m.incomes);
  const monthly_income = allIncomes.length > 0 ? allIncomes.reduce((a, b) => a + b, 0) / allIncomes.length : 0;
  const income_variance = allIncomes.length > 1 ? allIncomes.reduce((sum, inc) => sum + Math.pow(inc - monthly_income, 2), 0) / (allIncomes.length - 1) : 0;
  const income_frequency = Object.values(monthlyData).filter(m => m.incomes.length > 0).length;

  // Spending behavior
  const totalExpenses = Object.values(monthlyData).flatMap(m => m.expenses).reduce((a, b) => a + b, 0);
  const essentialCategories = ['utilities', 'rent', 'groceries', 'transport'];
  const essentialSpend = essentialCategories.reduce((sum, cat) => sum + (categoryTotals[cat] || 0), 0);
  const expense_ratio = totalExpenses > 0 ? essentialSpend / totalExpenses : 0;
  const essential_vs_nonessential_spend = essentialSpend / Math.max(1, totalExpenses - essentialSpend);

  // Liquidity
  const allBalances = Object.values(monthlyData).flatMap(m => m.balances);
  const avg_monthly_balance = allBalances.length > 0 ? allBalances.reduce((a, b) => a + b, 0) / allBalances.length : 0;
  const min_balance = allBalances.length > 0 ? Math.min(...allBalances) : 0;
  const liquidity_buffer = avg_monthly_balance - min_balance;
  const transfer_behavior = Object.values(monthlyData).reduce((sum, m) => sum + m.transfers, 0) / Math.max(1, transactions.length);
  const copy_code = 0; 
  const inflow_frequency = Object.values(monthlyData).reduce((sum, m) => sum + m.inflows, 0) / Math.max(1, Object.keys(monthlyData).length);
  const outflow_frequency = Object.values(monthlyData).reduce((sum, m) => sum + m.outflows, 0) / Math.max(1, Object.keys(monthlyData).length);
  const transaction_volatility = allBalances.length > 1 ? Math.sqrt(allBalances.reduce((sum, bal) => sum + Math.pow(bal - avg_monthly_balance, 2), 0) / (allBalances.length - 1)) : 0;

  // Debt signal
  const loan_repayment_count = categoryCounts['loan_repayment'] || 0;
  const loan_default_flags = transactions.filter(t => t.description.toLowerCase().includes('default') || t.description.toLowerCase().includes('penalty')).length;

  // Data quantity
  const expectedMonths = Object.keys(monthlyData).length;
  const missing_month = 0; 
  const duplicate_transaction = transactions.length - new Set(transactions.map(t => `${t.date}-${t.description}-${t.debit}-${t.credit}`)).size;

  // metrics
  const salaryTxns = transactions.filter((t) => t.category === "salary");
  const totalSalary = salaryTxns.reduce((sum, t) => sum + t.credit, 0);
  const avgIncome = totalSalary / (salaryTxns.length || 1);

  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const avgBalance =
    transactions.reduce((sum, t) => sum + t.balance, 0) /
    (transactions.length || 1);
  const negativeBalanceDays = transactions.filter((t) => t.balance < 0).length;
  const bounceCount = transactions.filter((t) =>
    t.description.toLowerCase().includes("bounce")
  ).length;

  return {
    avgIncome,
    totalDebit,
    avgBalance,
    negativeBalanceDays,
    bounceCount,
    categoryTotals,
    categoryCounts,
    income_stability: {
      monthly_income,
      income_variance,
      income_frequency
    },
    spending_behavior: {
      expense_ratio,
      essential_vs_nonessential_spend
    },
    liquidity: {
      avg_monthly_balance,
      min_balance,
      liquidity_buffer,
      transfer_behavior,
      copy_code,
      inflow_frequency,
      outflow_frequency,
      transaction_volatility
    },
    debt_signal: {
      loan_repayment_count,
      loan_default_flags
    },
    data_quantity: {
      missing_month,
      duplicate_transaction
    }
  };
};