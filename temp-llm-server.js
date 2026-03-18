// Simple mock LLM endpoint for testing categorization
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

app.post('/v1/generate', (req, res) => {
  const { prompt } = req.body;
  const lines = (prompt || '')
    .split('\n')
    .filter((l) => l.trim().startsWith('- '))
    .map((l) => l.trim().slice(2));
  const categories = lines.map((desc) => {
    let category = 'others';
    const d = desc.toLowerCase();
    if (d.includes('salary')) category = 'salary';
    else if (d.includes('emi') || d.includes('loan')) category = 'loan_repayment';
    else if (d.includes('atm')) category = 'cash_withdrawal';
    else if (d.includes('swiggy') || d.includes('zomato')) category = 'food_delivery';
    else if (d.includes('rent')) category = 'rent';
    return { description: desc, category };
  });
  res.json({ text: JSON.stringify(categories) });
});

const server = app.listen(8000, () => {
  console.log('Mock LLM server running on http://localhost:8000');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
