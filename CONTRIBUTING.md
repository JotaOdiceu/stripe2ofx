# Contributing to Stripe 2 OFX

Thank you for taking the time to contribute to `stripe2ofx`!

## Getting Started

1. **Fork the Repository**: Create your own fork of the repository on GitHub.
2. **Clone your Fork**:

   ```bash
   git clone https://github.com/jotaodiceu/stripe2ofx.git
   cd stripe2ofx
   ```

3. **Install Dependencies**:

   ```bash
   npm install
   ```

## Development & Code Guidelines

- **ES Modules**: All JavaScript code uses modern Node.js ES Modules syntax (`import`/`export`).
- **CSV Format Compatibility**: Ensure changes maintain compatibility with both current Stripe `balance_history.csv` exports and legacy export headers.
- **Code Style**: Use `const`/`let`, arrow functions, and clear variable naming.

## Commit Message Guidelines

Please follow the commit message convention used in this repository:

- Short, descriptive summary in English starting with a capital letter.
- Use imperative/action phrasing without Conventional Commit prefixes.
- Example: `Fix currency detection for EUR exports`

## Submitting Pull Requests

1. Create a descriptive topic branch (`git checkout -b feature/your-feature-name`).
2. Test your changes using sample Stripe CSV files.
3. Push your branch to GitHub and open a Pull Request against the `master` branch.

## Reporting Issues

If you encounter a bug or have a suggestion, please open an issue on the repository issue tracker. Include the Stripe CSV column headers and Node.js version if reporting an error.
