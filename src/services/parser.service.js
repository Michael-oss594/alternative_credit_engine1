exports.parseTransactions = (text) => {
  const lines = text.split("\n");

  const transactions = [];

  const txnRegex =
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d+\.\d{2})?\s+(\d+\.\d{2})?\s+(\d+\.\d{2})/;

  lines.forEach((line) => {
    const match = line.match(txnRegex);
    if (match) {
      transactions.push({
        date: match[1],
        description: match[2],
        debit: parseFloat(match[3]) || 0,
        credit: parseFloat(match[4]) || 0,
        balance: parseFloat(match[5]),
      });
    }
  });

  return transactions;
};