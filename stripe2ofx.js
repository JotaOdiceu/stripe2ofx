#!/usr/bin/env node
import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import moment from 'moment';

const CURRENCIES = [
  { sign: 'R$', code: 'BRL' },
  { sign: '$', code: 'USD' },
  { sign: '£', code: 'GBP' },
  { sign: '€', code: 'EUR' }
];

function findHeader(headers, candidates) {
  for (const name of candidates) {
    const found = headers.find(h => h.trim().toLowerCase() === name.toLowerCase());
    if (found !== undefined) return found;
  }
  return null;
}

function getCell(data, row, candidates) {
  const headers = data[0];
  const targetCol = findHeader(headers, Array.isArray(candidates) ? candidates : [candidates]);
  if (!targetCol) {
    throw new Error(`File does not have any of the expected columns: ${Array.isArray(candidates) ? candidates.join(', ') : candidates}`);
  }
  const index = headers.indexOf(targetCol);
  return row[index] ? row[index].trim() : '';
}

function getAmount(data, rowIndex) {
  const raw = getCell(data, data[rowIndex], ['Amount']);
  const amount = parseFloat(raw.replace(/[^0-9.-]/g, ''));
  const type = getCell(data, data[rowIndex], ['Type']).toLowerCase();

  if (type === 'refund') {
    return amount > 0 ? amount * -1 : amount;
  }
  return amount;
}

function getFees(data, rowIndex) {
  try {
    const raw = getCell(data, data[rowIndex], ['Fee', 'Fees']);
    const fees = parseFloat(raw.replace(/[^0-9.-]/g, ''));
    return isNaN(fees) ? 0 : fees;
  } catch {
    return 0;
  }
}

function getId(data, rowIndex) {
  try {
    const id = getCell(data, data[rowIndex], [
      'balance_transaction_id',
      'Balance Transaction ID',
      'id',
      'ID',
      'Source ID',
      'source_id'
    ]);
    if (id) return id;
  } catch {
    // fall through to synthetic id below
  }
  return null;
}

function getDate(data, rowIndex) {
  const rawDate = getCell(data, data[rowIndex], ['Created (UTC)', 'Created', 'Date', 'Available On (UTC)']);
  return moment(rawDate);
}

function formatDate(date) {
  return date.format('YYYYMMDD');
}

function detectCurrency(data) {
  const headers = data[0];
  const currencyCol = findHeader(headers, ['Currency', 'Customer Facing Currency']);

  if (currencyCol) {
    const code = data[1][headers.indexOf(currencyCol)].trim().toUpperCase();
    const known = CURRENCIES.find(c => c.code === code);
    if (known) return known;
    return { sign: code, code };
  }

  const firstAmountCell = getCell(data, data[1], ['Amount']);
  const currency = CURRENCIES.find(cur => firstAmountCell.startsWith(cur.sign));
  if (currency) return currency;

  throw new Error('Could not determine currency of transactions');
}

function processTransactions(data) {
  if (data.length < 2) {
    throw new Error('File does not contain any transactions.');
  }

  console.log(`Transactions:\t${data.length - 1}`);

  const currency = detectCurrency(data);
  console.log(`Currency:\t\t${currency.code}`);

  let total = 0;
  for (let i = 1; i < data.length; i++) {
    total += getAmount(data, i) - getFees(data, i);
  }
  console.log(`Total:\t\t\t${currency.sign} ${total.toFixed(2)}`);

  let startDate = null;
  let endDate = null;

  for (let i = 1; i < data.length; i++) {
    const date = getDate(data, i);

    if (!endDate || date > endDate) {
      endDate = date;
    }
    if (!startDate || date < startDate) {
      startDate = date;
    }
  }

  console.log(`Start Date:\t\t${startDate.format('YYYY-MM-DD')}`);
  console.log(`End Date:\t\t${endDate.format('YYYY-MM-DD')}`);

  return { currency, total, startDate, endDate };
}

function generateOfx(data, meta) {
  const { currency, startDate, endDate } = meta;
  const lines = [];

  lines.push(
    'OFXHEADER:100\n',
    'DATA:OFXSGML\n',
    'VERSION:102\n',
    'SECURITY:NONE\n',
    'ENCODING:USASCII\n',
    'CHARSET:1252\n',
    'COMPRESSION:NONE\n',
    'OLDFILEUID:NONE\n',
    'NEWFILEUID:NONE\n',
    '<OFX>\n',
    '\t<BANKMSGSRSV1>\n',
    '\t\t<STMTTRNRS>\n',
    '\t\t\t<TRNUID>0\n',
    '\t\t\t<STATUS>\n',
    '\t\t\t\t<CODE>0\n',
    '\t\t\t\t<SEVERITY>INFO\n',
    '\t\t\t</STATUS>\n',
    '\t\t\t<STMTRS>\n',
    `\t\t\t\t<CURDEF>${currency.code}\n`,
    '\t\t\t\t\t<BANKACCTFROM>\n',
    '\t\t\t\t\t\t<BANKID>001\n',
    '\t\t\t\t\t\t<ACCTID>001\n',
    '\t\t\t\t\t\t<ACCTTYPE>CHECKING\n',
    '\t\t\t\t\t</BANKACCTFROM>\n',
    '\t\t\t\t\t<BANKTRANLIST>\n',
    `\t\t\t\t\t\t<DTSTART>${formatDate(startDate)}\n`,
    `\t\t\t\t\t\t<DTEND>${formatDate(endDate)}\n`
  );

  for (let i = 1; i < data.length; i++) {
    let memo = '';
    try {
      memo = getCell(data, data[i], ['Description']);
    } catch {
      memo = '';
    }
    if (!memo) {
      memo = getCell(data, data[i], ['id', 'ID']);
    }

    const date = getDate(data, i);
    const resolvedId = getId(data, i);
    const id = resolvedId || `${date.format('YYYYMMDDHHmm')}${i}`;
    const amount = getAmount(data, i);
    const fees = getFees(data, i) * -1;
    const type = getCell(data, data[i], ['Type']);
    const ofxChargeType = amount > 0 ? 'CREDIT' : 'DEBIT';
    const ofxFeeType = fees > 0 ? 'CREDIT' : 'DEBIT';
    const chargeFitId = resolvedId ? id : `C${id}`;
    const feeFitId = resolvedId ? `${id}-fee` : `F${id}`;

    lines.push(
      '\t\t\t\t\t\t<STMTTRN>\n',
      `\t\t\t\t\t\t\t<TRNTYPE>${ofxChargeType}\n`,
      `\t\t\t\t\t\t\t<DTPOSTED>${formatDate(date)}\n`,
      `\t\t\t\t\t\t\t<TRNAMT>${amount.toFixed(2)}\n`,
      `\t\t\t\t\t\t\t<FITID>${chargeFitId}\n`,
      `\t\t\t\t\t\t\t<CHECKNUM>${chargeFitId}\n`,
      `\t\t\t\t\t\t\t<MEMO>${memo}\n`,
      '\t\t\t\t\t\t</STMTTRN>\n'
    );

    if (fees !== 0) {
      lines.push(
        '\t\t\t\t\t\t<STMTTRN>\n',
        `\t\t\t\t\t\t\t<TRNTYPE>${ofxFeeType}\n`,
        `\t\t\t\t\t\t\t<DTPOSTED>${formatDate(date)}\n`,
        `\t\t\t\t\t\t\t<TRNAMT>${fees.toFixed(2)}\n`,
        `\t\t\t\t\t\t\t<FITID>${feeFitId}\n`,
        `\t\t\t\t\t\t\t<CHECKNUM>${feeFitId}\n`,
        `\t\t\t\t\t\t\t<MEMO>Stripe Fees ${type} (${memo})\n`,
        '\t\t\t\t\t\t</STMTTRN>\n'
      );
    }
  }

  lines.push(
    '\t\t\t\t\t</BANKTRANLIST>\n',
    '\t\t\t\t</STMTRS>\n',
    '\t\t</STMTTRNRS>\n',
    '\t</BANKMSGSRSV1>\n',
    '</OFX>\n'
  );

  return lines.join('');
}

function main() {
  const fromPath = process.argv[2] || 'transfers.csv';
  const toPath = process.argv[3] || 'transfers.ofx';

  if (!fs.existsSync(fromPath)) {
    console.error(`Input ${fromPath} not found!`);
    process.exit(1);
  }

  try {
    const fileContent = fs.readFileSync(fromPath, 'utf-8');
    const data = parse(fileContent, {
      relaxed_quotes: true,
      skip_empty_lines: true,
      trim: true
    });

    const meta = processTransactions(data);
    const ofxContent = generateOfx(data, meta);
    fs.writeFileSync(toPath, ofxContent);
    console.log(`\nOFX file successfully created: ${toPath}`);
  } catch (err) {
    console.error('Error processing CSV:', err.message);
    process.exit(1);
  }
}

main();
