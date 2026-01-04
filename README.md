# Cardano Evolution TypeScript Project

This project demonstrates how to interact with the Cardano blockchain (specifically Preprod Testnet) using the [Evolution SDK](https://intersectmbo.github.io/evolution-sdk/) (`@evolution-sdk/evolution`).

## 📚 Learning Notes

**[Start Here: Developer Learning Notes](./LEARNING_NOTES.md)**

Check the learning notes for detailed explanations on creating clients, managing wallets, sending transactions, and more.

## Prerequisites

- Node.js (v18+ recommended)
- A Blockfrost Project ID (Get one at [blockfrost.io](https://blockfrost.io/))
- A Cardano Wallet Mnemonic (for Preprod Testnet)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   # or
   bun install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env`.

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your details:

   - `BLOCKFROST_API_KEY`: Your Blockfrost Project ID (Preprod).
   - `WALLET_MNEMONIC`: Your 24-word wallet seed phrase.

## Running the project

Run the main script to check your balance and UTXOs:

```bash
bun src/index.ts
# or
npm run dev
```

## Project Structure

- `src/index.ts`: Main entry point. Contains examples of client initialization, address derivation, and balance fetching.
- `LEARNING_NOTES.md`: Detailed documentation and guide.
