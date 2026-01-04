import { createClient, Core } from "@evolution-sdk/evolution";
import dotenv from "dotenv";

dotenv.config();

const main = async () => {
  try {
    const client = createClient({
      network: "preprod",
      provider: {
        type: "blockfrost",
        baseUrl: "https://cardano-preprod.blockfrost.io/api/v0",
        projectId: process.env.BLOCKFROST_API_KEY!,
      },
      wallet: {
        type: "seed",
        mnemonic: process.env.WALLET_MNEMONIC!,
        accountIndex: 0,
      },
    });

    // Get address
    const address = await client.address();

    // Convert to Bech32 string using Core.Address.toBech32
    // @ts-ignore
    const addressStr = Core.Address.toBech32(address);

    console.log("Derived Address:", addressStr);
    console.log("✅ Client created successfully");

    /*
    const tx = await client
      .newTx()
      .payToAddress({
        address: Core.Address.fromBech32(
          "addr_test1qrjzxthmfzm5vcrzm0q3653fl9kqe7zllw4gtr55gfcrjjkk9n0skqk0nx9pxsgmnzu4xnlt6fe36eve90t0qvyl0l8q2qzlez"
        ),
        assets: Core.Assets.fromLovelace(2_000_000n),
      })
      .build();

    const signed = await tx.sign();
    const hash = await signed.submit();
    console.log("Transaction submitted:", hash);
    console.log(`🔍 Check on Explorer: https://preprod.cardanoscan.io/transaction/${hash}`);
    */

    console.log("Fetching Wallet UTXOs...");
    const utxos = await client.getWalletUtxos();
    console.log("UTXOs found:", utxos.length);

    if (utxos.length > 0) {
      // Calculate balance
      let totalLovelace = 0n;
      for (const utxo of utxos) {
        if (utxo.assets.lovelace) {
          totalLovelace += BigInt(utxo.assets.lovelace);
        }
      }

      const adaBalance = Number(totalLovelace) / 1_000_000;
      console.log(`💰 Balance: ${adaBalance.toLocaleString()} ADA`);
    } else {
      console.log("No UTXOs found. Balance is 0 ADA.");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

main();
