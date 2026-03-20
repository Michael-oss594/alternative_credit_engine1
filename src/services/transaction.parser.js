const DATE_PATTERNS = [
  /\d{1,2}[-/]\d{1,2}[-/]\d{4}/,
  /\d{1,2}-[A-Za-z]{3}-\d{4}/,
  /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/,
];

function normalizeAmountToken(token) {
  if (!token) return token;

  const parts = token.trim().split(/\s+/);

  if (parts.length > 1) {
    const cand = parts.reverse().find((p) => /\d+\.\d{2}$/.test(p));
    if (cand) return cleanAmount(cand);
  }

  return cleanAmount(token.trim());
}

function cleanAmount(amountStr) {
  if (!amountStr) return amountStr;

  const str = amountStr.replace(/[, ]/g, "");

  if (/^(19|20|21|22|23|24|25|26)\d{7,}\.\d{2}$/.test(str)) {
    return str.slice(2);
  }

  return str;
}

function normalizeDateStr(str) {
  return str.replace(/\s+/g, " ").trim();
}

function isValidTransaction(tx) {
  if (!tx) return false;

  if (tx.balance !== 0 || tx.debit !== 0 || tx.credit !== 0) return true;

  if (tx.description && tx.description.trim().length > 0) return true;

  return false;
}

function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split(/[/-]/);

  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  return new Date(year, month - 1, day);
}

function findDateRange(text) {
  const simpleRange = /(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
  let match = text.match(simpleRange);

  if (match) {
    return `${match[1]} to ${match[2]}`;
  }

  const rangeRegex =
    /(?:statement\s+period|period|from)\s*[:\-]?\s*(?<start>\d{1,2}(?:[-/\s][A-Za-z]{3}|[-/\s]\d{1,2})[-/]\d{4})\s*(?:to|-)\s*(?<end>\d{1,2}(?:[-/\s][A-Za-z]{3}|[-/\s]\d{1,2})[-/]\d{4})/i;

  match = text.match(rangeRegex);

  if (match && match.groups) {
    return `${match.groups.start} to ${match.groups.end}`;
  }

  const genericRange =
    /(<start>\d{1,2}(?:[-/\s][A-Za-z]{3}|[-/\s]\d{1,2})[-/]\d{4})\s*(?:to|-)\s*(<end>\d{1,2}(?:[-/\s][A-Za-z]{3}|[-/\s]\d{1,2})[-/]\d{4})/i;

  match = text.match(genericRange);

  if (match && match.groups) {
    return `${match.groups.start} to ${match.groups.end}`;
  }

  return "";
}

function computeMonthCountFromRange(range) {
  if (!range) return 0;

  const parts = range.split(/\s+to\s+/i);

  if (parts.length !== 2) return 0;

  const start = parseDDMMYYYY(parts[0]);
  const end = parseDDMMYYYY(parts[1]);

  if (!start || !end || isNaN(start) || isNaN(end)) return 0;

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (end.getDate() >= start.getDate()) {
    months += 1;
  }

  return months;
}

function findLineMatch(text, regex) {
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const m = line.match(regex);
    if (m) return m;
  }

  return null;
}

exports.extractMetadata = (text) => {
  const upper = text.toUpperCase();

  let bank_name = "";

  if (upper.includes("ZENITH")) bank_name = "Zenith Bank";
  else if (upper.includes("GTCO") || upper.includes("GUARANTY TRUST"))
    bank_name = "Guaranty Trust Bank";
  else if (upper.includes("OPAY")) bank_name = "OPay";
  else if (upper.includes("PALMPAY") || upper.includes("PALM PAY"))
    bank_name = "PalmPay";
  else bank_name = "Unknown";

  const accountNameRegexes = [
    /Account\s*Name[:\s]+([^\n\r]+)/i,
    /A\/C\s*Name[:\s]+([^\n\r]+)/i,
    /Customer\s*Name[:\s]+([^\n\r]+)/i,
  ];

  let account_name = "";

  for (const rx of accountNameRegexes) {
    const m = text.match(rx);

    if (m) {
      account_name = m[1].trim();
      break;
    }
  }

  let account_number = "";

  const accountNumberMatch = text.match(
    /Account\s*(?:No\.?|Number)[:\s]*(\d{6,16})/i
  );

  if (accountNumberMatch) {
    account_number = accountNumberMatch[1];
  } else {
    const genericAcct = text.match(/(\d{10,16})/g);

    if (genericAcct && genericAcct.length) {
      account_number = genericAcct[0];
    }
  }

  const statement_period = findDateRange(text);
  const month_of_history = computeMonthCountFromRange(statement_period);

  return {
    account_name,
    bank_name,
    account_number,
    statement_period,
    month_of_history,
  };
};

exports.parseTransactions = (text) => {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);

  const upper = text.toUpperCase();

  const isZenith = upper.includes("ZENITH");
  const isGTB = upper.includes("GTCO") || upper.includes("GUARANTY TRUST");
  const isOPay = upper.includes("OPAY");
  const isPalmPay = upper.includes("PALMPAY") || upper.includes("PALM PAY");

  if (isZenith) return parseZenithTransactions(lines);
  else if (isGTB) return parseGTBTransactions(lines);
  else if (isOPay) return parseOPayTransactions(lines);
  else if (isPalmPay) return parsePalmPayTransactions(lines);
  else return parseZenithTransactions(lines);
};

function parseZenithTransactions(lines) {
  const transactions = [];

  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}/;
  const amountRegex = /-?(?:\d{1,3}(?:[, ]\d{3})*|\d+)\.\d{2}/g;

  let buffer = [];

  function cleanDesc(desc) {
    return desc
      .replace(/\s+/g, " ")
      .replace(/DATE DESCRIPTION.*$/i, "")
      .replace(/ZENITH.*$/i, "")
      .replace(/Page \d+ of \d+/i, "")
      .trim();
  }

  function flush() {
    if (!buffer.length) return;

    const joined = buffer.join(" ");

    const dateMatch = joined.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
    if (!dateMatch) {
      buffer = [];
      return;
    }

    const date = dateMatch[0];

    const amounts = joined.match(amountRegex);

    if (!amounts || amounts.length < 2) {
      buffer = [];
      return;
    }

    const cleanAmounts = amounts.map((a) =>
      parseFloat(normalizeAmountToken(a))
    );

    let debit = 0,
      credit = 0,
      balance = 0;

    if (cleanAmounts.length >= 3) {
      debit = cleanAmounts[cleanAmounts.length - 3];
      credit = cleanAmounts[cleanAmounts.length - 2];
      balance = cleanAmounts[cleanAmounts.length - 1];
    } else if (cleanAmounts.length === 2) {
      credit = cleanAmounts[cleanAmounts.length - 2];
      balance = cleanAmounts[cleanAmounts.length - 1];
    }

    let description = joined
      .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, "")
      .replace(amountRegex, "")
      .trim();

    description = cleanDesc(description);

    if (
      !description ||
      /opening balance/i.test(description) ||
      /total/i.test(description)
    ) {
      buffer = [];
      return;
    }

    transactions.push({
      date,
      description,
      debit,
      credit,
      balance,
    });

    buffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (dateRegex.test(line)) {
      flush();
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  flush();

  return transactions.filter(isValidTransaction);
}

function parseGTBTransactions(lines) {
  const transactions = [];

  const dateRegex = /^\d{1,2}[- /\s][A-Z]{3}[- /\s]\d{4}/i;
  const amountRegex = /-?(?:\d{1,3}(?:[, ]\d{3})*|\d+)\.\d{2}/g;

  let currentTx = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dateMatch = line.match(dateRegex);

    if (dateMatch) {
      if (currentTx) transactions.push(currentTx);

      
      const dateStr = dateMatch[0];

      currentTx = {
        date: dateStr,
        description: "",
        debit: 0,
        credit: 0,
        balance: 0,
      };

      const rest = line.slice(dateStr.length).trim();

      if (rest) {
        const amounts = rest.match(amountRegex);

        if (amounts && amounts.length >= 3) {
          const clean = amounts.map((a) =>
            parseFloat(normalizeAmountToken(a))
          );

          currentTx.debit = clean[0];
          currentTx.credit = clean[1];
          currentTx.balance = clean[2];
        } else {
          currentTx.description += rest + " ";
        }
      }

      continue;
    }

    if (!currentTx) continue;

    const amounts = line.match(amountRegex);

    if (amounts && amounts.length > 0) {
      const clean = amounts.map((a) =>
        parseFloat(normalizeAmountToken(a))
      );

      if (clean.length === 1) currentTx.balance = clean[0];
      else if (clean.length === 2) {
        currentTx.debit = clean[0];
        currentTx.balance = clean[1];
      } else if (clean.length >= 3) {
        currentTx.debit = clean[0];
        currentTx.credit = clean[1];
        currentTx.balance = clean[2];
      }
    } else {
      currentTx.description += line + " ";
    }
  }

  if (currentTx && isValidTransaction(currentTx)) transactions.push(currentTx);

  return transactions;
}

function parseOPayTransactions(lines) {
  const transactions = [];

  const amountRegex = /[\d,]+\.\d{2}/g;
  const dateRegex = /(\d{1,2} [A-Za-z]{3} \d{4})/;

  let buffer = [];

  function flushBuffer() {
    if (!buffer.length) return;

    const joined = buffer.join(" ");
    const lower = joined.toLowerCase();

    const dateMatch = joined.match(dateRegex);
    if (!dateMatch) {
      buffer = [];
      return;
    }

    const date = dateMatch[1];

    // extract amounts
    const amounts = [...joined.matchAll(amountRegex)].map(m =>
      parseFloat(cleanAmount(m[0]))
    );

    if (!amounts.length) {
      buffer = [];
      return;
    }

    let debit = 0;
    let credit = 0;
    let balance = 0;

    if (amounts.length >= 3) {
      const a = amounts[0];
      const b = amounts[1];
      const c = amounts[2];

      balance = c || 0;

      if (
        lower.includes("received") ||
        lower.includes("transfer from") ||
        lower.includes("deposit")
      ) {
        credit = a;
        debit = b;
      } else if (
        lower.includes("send") ||
        lower.includes("sent") ||
        lower.includes("withdraw") ||
        lower.includes("payment") ||
        lower.includes("airtime") ||
        lower.includes("bet") ||
        lower.includes("pos")
      ) {
        debit = a;
        credit = b;
      } else {
        credit = a;
        debit = b;
      }

    } else if (amounts.length >= 1) {
      const amt = amounts[0];

      if (
        lower.includes("send") ||
        lower.includes("sent") ||
        lower.includes("withdraw") ||
        lower.includes("payment") ||
        lower.includes("airtime") ||
        lower.includes("bet") ||
        lower.includes("pos")
      ) {
        debit = amt;

      } else if (
        lower.includes("received") ||
        lower.includes("transfer from") ||
        lower.includes("deposit")
      ) {
        credit = amt;

      } else {
        credit = amt;
      }
    }

    let description = joined
      .replace(dateRegex, "")
      .replace(amountRegex, "")
      .replace(/\b\d{10,}\b/g, "")
      .replace(/opay|account statement|generated on/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!description) description = "Transaction";

    transactions.push({
      date,
      description,
      debit,
      credit,
      balance,
    });

    buffer = [];
  }

  for (const line of lines) {
    const clean = line.trim();

    if (
      !clean ||
      /^(Trans\. Time|Generated on|Account Statement|O$)/i.test(clean) ||
      /OPay|www\.opayweb\.com|Licensed/i.test(clean)
    ) continue;

    if (dateRegex.test(clean)) {
      flushBuffer();
      buffer.push(clean);
    } else {
      buffer.push(clean);
    }
  }

  flushBuffer();
  console.log({
  totalCredit: transactions.reduce((s, t) => s + t.credit, 0),
  totalDebit: transactions.reduce((s, t) => s + t.debit, 0),
});

  return transactions;
}

function parsePalmPayTransactions(lines) {
  const transactions = [];

  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}/;
  const amountRegex = /[\d,]+\.\d{2}/g;

  let buffer = [];

  function flushBuffer() {
    if (!buffer.length) return;

    const joined = buffer.join(" ");

    const dateMatch = joined.match(dateRegex);
    if (!dateMatch) {
      buffer = [];
      return;
    }

    const date = dateMatch[0];

    const amounts = [...joined.matchAll(amountRegex)].map(m =>
      parseFloat(cleanAmount(m[0]))
    );

    if (!amounts.length) {
      buffer = [];
      return;
    }

    let debit = 0;
let credit = 0;
let balance = 0;

const text = joined.toLowerCase();

// extract amounts
if (amounts.length >= 3) {
  const moneyIn = amounts[0];
  const moneyOut = amounts[1];
  balance = amounts[2] || 0;

  credit = moneyIn;
  debit = moneyOut;

} else if (amounts.length >= 1) {
  const amt = amounts[0];

  if (
    text.includes("send") ||
    text.includes("sent") ||
    text.includes("withdraw") ||
    text.includes("transfer to") ||
    text.includes("airtime") ||
    text.includes("bet") ||
    text.includes("1xbet") ||
    text.includes("bet9ja") ||
    text.includes("pos")
  ) {
    debit = amt;

  } else if (
    text.includes("received") ||
    text.includes("deposit") ||
    text.includes("transfer from") ||
    text.includes("cashbox interest")
  ) {
    credit = amt;

  } else {
    credit = amt;
  }
}

    let description = joined
      .replace(dateRegex, "")
      .replace(amountRegex, "")
      .replace(/\b\d{10,}\b/g, "")
      .replace(/OPAY|PALMPAY|ACCOUNT STATEMENT/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!description) description = "Transaction";

    transactions.push({
      date,
      description,
      debit,
      credit,
      balance,
    });

    buffer = [];
  }

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    if (dateRegex.test(cleanLine)) {
      flushBuffer();
      buffer.push(cleanLine);
    } else {
      buffer.push(cleanLine);
    }
  }

  flushBuffer();
  console.log(transactions.slice(0, 10));

  return transactions;
}