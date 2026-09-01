# stripe2ofx

[![npm version](https://img.shields.io/npm/v/@jotaodiceu/stripe2ofx.svg)](https://www.npmjs.com/package/@jotaodiceu/stripe2ofx)
[![node](https://img.shields.io/node/v/@jotaodiceu/stripe2ofx.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@jotaodiceu/stripe2ofx.svg)](LICENSE)

Command-line utility that converts [Stripe](https://stripe.com) balance history and
transfer exports (CSV) into the [OFX](https://en.wikipedia.org/wiki/Open_Financial_Exchange)
format that accounting software reads for bank-statement imports.

```console
$ stripe2ofx balance_history.csv statement.ofx
Transactions:   6
Currency:       BRL
Total:          R$ 0.00
Start Date:     2026-08-01
End Date:       2026-08-31

OFX file successfully created: statement.ofx
```

## Features

- **Modern & legacy CSV support** — reads current `balance_history.csv` exports
  (`Created (UTC)`, `Fee`, `Currency`) as well as older ones (`Date`, `Fees`, `Amount`).
- **Fee splitting** — every row becomes one transaction for the gross amount plus a
  separate transaction for the Stripe fee, so the fee shows up as its own line.
- **Refund handling** — `refund` rows are normalised to a negative amount.
- **Stable transaction IDs** — `FITID` is the real Stripe transaction ID from the CSV
  (`balance_transaction_id` / `id` / `Source ID`), so re-importing the same export
  never creates duplicates. Falls back to a date-based ID only when the CSV carries
  no ID column.
- **Currency auto-detection** — from the `Currency` column or the symbol in `Amount`
  (`R$`, `$`, `£`, `€`); any other ISO code passes through untouched.
- **Zero config** — a single file, two small dependencies, ES modules.

## Installation

Global (adds a `stripe2ofx` command available from any folder):

```bash
npm install -g @jotaodiceu/stripe2ofx
```

Or run it from a clone without installing:

```bash
npm install
node stripe2ofx.js <input.csv> [output.ofx]
```

Requires Node.js 18 or newer.

## Usage

```bash
stripe2ofx <input.csv> [output.ofx]
```

| Argument     | Default         |
|--------------|-----------------|
| `input.csv`  | `transfers.csv` |
| `output.ofx` | `transfers.ofx` |

### Getting the CSV from Stripe

Dashboard → **Balance** → **All activity** → **Export**, or any transfer/payout
export. The following column names are recognised (first match wins):

| Purpose        | Accepted headers                                         |
|----------------|----------------------------------------------------------|
| Transaction ID | `balance_transaction_id`, `id`, `Source ID`, `source_id` |
| Type           | `Type`                                                   |
| Amount         | `Amount`                                                 |
| Fee            | `Fee`, `Fees`                                            |
| Date           | `Created (UTC)`, `Created`, `Date`, `Available On (UTC)` |
| Currency       | `Currency`, `Customer Facing Currency`                   |
| Memo           | `Description` (falls back to the transaction ID)         |

Unknown columns are ignored.

## Output

OFX 1.0.2 (SGML) with a single `CHECKING` account. `BANKID` and `ACCTID` are fixed
at `001` — most importers key on `FITID`, but adjust `stripe2ofx.js` if your
software needs real account numbers.

## About

Fork of [nordbergm/stripe2ofx](https://github.com/nordbergm/stripe2ofx).

## License

[BSD-3-Clause](LICENSE)
