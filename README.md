# Stripe 2 OFX

A command-line utility that converts [Stripe](https://stripe.com) balance history and transfer exports (CSV) to the [OFX](https://en.wikipedia.org/wiki/Open_Financial_Exchange) file format commonly used by accounting software for statement imports.

## Features

- **Modern & Legacy Stripe CSV Support**: Compatible with both modern `balance_history.csv` exports (`Created (UTC)`, `Fee`, `Currency`) and legacy exports (`Date`, `Fees`, `Amount`).
- **ES Modules**: Refactored for modern Node.js (ESM).
- **Automated Fee & Transaction Splitting**:
  - Creates transaction entries for charges, refunds, and adjustments.
  - Generates separate fee entries when Stripe fees are present.
  - Automatically appends a final transfer transaction matching the net balance summary.

## Usage

### Prerequisites

- Node.js (v18+)

### Installation

```bash
npm install
```

### Running

```bash
node stripe2ofx.js <input-csv-file> [output-ofx-file]
```

#### Example

```bash
node stripe2ofx.js balance_history.csv stripe_export.ofx
```

If no output filename is specified, the output defaults to `output.ofx`.

## About

Fork of [nordbergm/stripe2ofx](https://github.com/nordbergm/stripe2ofx).

## License

[BSD-3-Clause](LICENSE)
