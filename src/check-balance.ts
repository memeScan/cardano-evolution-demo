import { createClient, Core } from "@evolution-sdk/evolution";
import dotenv from "dotenv";

dotenv.config();

const main = async () => {
  try {
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

    console.log("Fetching Wallet UTXOs...");
    const utxos = await client.getWalletUtxos();
    console.log(`Found ${utxos.length} UTXOs.`);

    const balances: Record<string, bigint> = {};

    for (const utxo of utxos) {
      const assets = utxo.assets;

      // Handle Lovelace
      if (assets.lovelace) {
        const current = balances["lovelace"] || 0n;
        balances["lovelace"] = current + BigInt(assets.lovelace);
      }

      // Handle MultiAsset
      if (assets.multiAsset && assets.multiAsset.map) {
        let policyMap = assets.multiAsset.map;

        // Check if map is a Map instance or plain object
        const entries =
          policyMap instanceof Map
            ? Array.from(policyMap.entries())
            : Object.entries(policyMap);

        for (const [policyId, tokens] of entries) {
          // items in map are usually Maps too if the parent is a Map
          const tokenEntries =
            tokens instanceof Map
              ? Array.from(tokens.entries())
              : Object.entries(tokens as any);

          for (const [tokenName, amount] of tokenEntries) {
            let nameHex = tokenName as string;
            // Check if tokenName is an object with bytes property
            if (
              typeof tokenName === "object" &&
              tokenName !== null &&
              "bytes" in tokenName
            ) {
              const bytes = (tokenName as any).bytes;
              // Check for array or buffer structure and convert to hex
              if (
                Array.isArray(bytes) ||
                bytes instanceof Uint8Array ||
                Buffer.isBuffer(bytes)
              ) {
                nameHex = Buffer.from(bytes).toString("hex");
              } else {
                // Fallback if it's already a string or other type
                nameHex = String(bytes);
              }
            }

            const assetId = `${policyId}.${nameHex}`;
            const current = balances[assetId] || 0n;
            balances[assetId] = current + BigInt(amount as string);
          }
        }
      }
    }

    console.log("\n--- Wallet Balances ---");
    for (const [asset, amount] of Object.entries(balances)) {
      if (asset === "lovelace") {
        const ada = Number(amount) / 1_000_000;
        console.log(`ADA: ${ada.toLocaleString()} ₳`);
      } else {
        // Asset IDs are usually PolicyID + TokenName(Hex)
        // We can display the raw ID and amount for now.
        // Ideally we would fetch metadata, but that's a separate task.
        console.log(`Asset [${asset}]: ${amount.toString()}`);
      }
    }
    console.log("-----------------------");
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

main();
