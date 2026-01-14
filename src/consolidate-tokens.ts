import { createClient } from "@evolution-sdk/evolution";
import dotenv from "dotenv";

dotenv.config();

const main = async () => {
  try {
    // 1. Initialize Client
    const client = createClient({
      network: "mainnet",
      provider: {
        type: "blockfrost",
        baseUrl: "https://cardano-mainnet.blockfrost.io/api/v0",
        projectId: process.env.BLOCKFROST_API_KEY!,
      },
      wallet: {
        type: "seed",
        mnemonic: process.env.WALLET_MNEMONIC!,
        accountIndex: 0,
      },
    });

    console.log("🔄 Starting Consolidation (Unfrack) Process...");

    // 2. Fetch all UTXOs
    console.log("Fetching Wallet UTXOs...");
    const utxos = await client.getWalletUtxos();
    console.log(`Found ${utxos.length} UTXOs in total.`);

    if (utxos.length <= 1) {
      console.log(
        "✅ Wallet is already consolidated (1 or 0 UTXOs). No action needed."
      );
      return;
    }

    console.log("📦 Preparing transaction to consolidate all inputs...");

    // 3. Build Transaction
    // We strictly collect ALL UTXOs as inputs.
    // We send NO explicit outputs.
    // Result: The builder will calculate (Total Inputs - Fee) and put the rest into Change.
    // This effectively merges everything into the minimum number of Change UTXOs (usually 1).
    const tx = client.newTx().collectFrom({ inputs: utxos });
    // We can use the 'unfrack' option to ensure optimal packing, though default change logic usually suffices for this.
    // enabling rollUpAdaOnly helps if there are many small pure ADA UTXOs.
    // isolation of fungibles is disabled by default (good for us, we want to merge).
    // .build({
    //   unfrack: {
    //     ada: { rollUpAdaOnly: true }
    //   }
    // });
    // Note: simple .build() is often enough for "Sweep to self".
    console.log("🛠️  Building transaction...");
    const signedTx = await tx.build().then((t) => t.sign());

    console.log("📝 Transaction signed. Submitting...");
    const txHash = await signedTx.submit();

    console.log("\n✅ Consolidation Transaction Submitted!");
    console.log(`🔗 Tx Hash: ${txHash}`);
    console.log(
      `🔎 View on Explorer: https://cardanoscan.io/transaction/${txHash}`
    );
    console.log(
      "\n⏳ Please wait a few minutes for the transaction to confirm. Then run 'npm run check-balance' to see your new 'Free' ADA balance!"
    );
  } catch (error) {
    console.error("❌ Error during consolidation:", error);
  }
};

main();
