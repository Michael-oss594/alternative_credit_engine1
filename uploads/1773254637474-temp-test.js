const { parseTransactions } = require('./src/services/transaction.parser');

const sample = `PalmPay statement
23 Jan 2024 Transfer to 08012345678 -5,000.00 10,000.00
24 Jan 2024 Received from 08098765432 2,000.00 12,000.00
`;

const result = parseTransactions(sample);
console.log('result', result);
console.log(JSON.stringify(result, null, 2));
