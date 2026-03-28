// BANK DETECTION

function detectBank(text) {
  const t = text.toLowerCase();

  if (t.includes("zenith bank")) return "zenith";
  if (t.includes("guaranty trust") || t.includes("gtbank")) return "gtbank";
  if (t.includes("opay")) return "opay";
  if (t.includes("palmpay")) return "palmpay";

  return "unknown";
}


//ZENITH / GTBANK PARSER (STRUCTURED)

function parseStructuredBank(text) {
  const lines = text.split("\n");
  const transactions = [];

  const txnRegex =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})/;

  function cleanAmount(val) {
    return parseFloat((val || "0").replace(/,/g, ""));
  }

  for (const line of lines) {
    const match = line.match(txnRegex);

    if (match) {
      transactions.push({
        date: match[1],
        description: match[2].trim(),
        debit: cleanAmount(match[3]),
        credit: cleanAmount(match[4]),
        balance: cleanAmount(match[5]),
      });
    }
  }

  return transactions;
}


// OPAY / PALMPAY PARSER (UNSTRUCTURED)

function parseFintech(text) {
  const transactions = [];

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const dateRegex =
    /(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2} [A-Za-z]{3} \d{4}|\d{4}-\d{2}-\d{2})/;

  const amountRegex = /[\d,]+\.\d{2}/g;

  function cleanAmount(val) {
    return parseFloat(val.replace(/,/g, ""));
  }

  function detectType(text) {
    if (/(received|deposit|transfer from|\bcr\b)/i.test(text)) return "credit";
    if (/(sent|send|withdraw|payment|pos|airtime|bet|\bdr\b|transfer to)/i.test(text)) return "debit";
    return "unknown";
  }

  let buffer = [];

  function flush() {
    if (!buffer.length) return;

    const joined = buffer.join(" ");

    const dateMatch = joined.match(dateRegex);
    if (!dateMatch) {
      buffer = [];
      return;
    }

    const date = dateMatch[1];

    const amounts = [...joined.matchAll(amountRegex)].map(m =>
      cleanAmount(m[0])
    );

    if (!amounts.length) {
      buffer = [];
      return;
    }

    let debit = 0;
    let credit = 0;
    let balance = 0;

    if (amounts.length >= 2) {
     
      balance = amounts[amounts.length - 1];

      const txnAmount = amounts[0];

      if (detectType(joined) === "debit") {
        debit = txnAmount;
      } else {
        credit = txnAmount;
      }
    } else {
      if (detectType(joined) === "debit") {
        debit = amounts[0];
      } else {
        credit = amounts[0];
      }
    }

    let description = joined
      .replace(dateRegex, "")
      .replace(amountRegex, "")
      .replace(/\b\d{10,}\b/g, "")
      .replace(/opay|account statement|generated on|www\.opayweb\.com/gi, "")
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
    const hasDate = dateRegex.test(line);

    if (hasDate) {
      flush(); 
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  flush();

  
  const cleaned = transactions.filter(
    t => t.debit > 0 || t.credit > 0
  );

  console.log("OPAY PARSED:", cleaned.length);

  return cleaned;
}

// FALLBACK PARSER
function parseFallback(text) {
  console.warn("⚠️ Unknown bank format — using fallback");

  const amountRegex = /[\d,]+\.\d{2}/g;

  const matches = text.match(amountRegex) || [];

  return matches.map((amt, i) => ({
    date: "UNKNOWN",
    description: "Unparsed Transaction",
    debit: 0,
    credit: parseFloat(amt.replace(/,/g, "")),
    balance: 0,
  }));
}

// MAIN EXPORT

exports.parseTransactions = (text) => {
  const bank = detectBank(text);

  console.log("🏦 Detected bank:", bank);

  let transactions = [];

  switch (bank) {
    case "zenith":
    case "gtbank":
      transactions = parseStructuredBank(text);
      break;

    case "opay":
    case "palmpay":
      transactions = parseFintech(text);
      break;

    default:
      transactions = parseFallback(text);
  }

  // if parser returns empty, fallback
  if (!transactions.length) {
    console.warn("⚠️ Primary parser failed — fallback triggered");
    transactions = parseFallback(text);
  }

  return transactions;
};