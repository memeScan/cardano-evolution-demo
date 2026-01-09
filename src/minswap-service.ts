import { Core, createClient } from "@evolution-sdk/evolution";
import type { SigningClient } from "@evolution-sdk/evolution";
import dotenv from "dotenv";

dotenv.config();

const MINSWAP_API_URL = "https://agg-api.minswap.org";

/**
 * Service to interact with Minswap Aggregator API.
 *
 * Note: Default Base URL is Mainnet.
 */
export class MinswapService {
  private client: SigningClient;

  constructor() {
    // Instantiate client internally based on env vars
    this.client = createClient({
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
  }

  /**
   * Helper to format asset string for Minswap API.
   * ADA/Lovelace -> "lovelace"
   * Native Token -> PolicyID + TokenName(Hex)
   */
  private formatAsset(asset: string): string {
    if (!asset || asset === "lovelace" || asset === "ada") {
      return "lovelace";
    }
    // Remove "." if present (evolution SDK might use "." separator)
    return asset.replace(".", "");
  }

  /**
   * Get a quote for a swap.
   * @param from Asset ID input
   * @param to Asset ID output
   * @param amount Input amount in smallest unit (e.g. Lovelace)
   * @param slippage Slippage tolerance (e.g. 0.01 for 1%) - API expects number like 0.01? Or 1?
   *    Subagent said "0.5 for 0.5%". So 1% = 1.0 or 0.01?
   *    Let's check subagent notes: "e.g., 0.5 for 0.5%". So it's percentage value flows.
   */
  public async quote({
    from,
    to,
    amount, // string integer
    slippage = 0.5, // 0.5%
  }: {
    from: string;
    to: string;
    amount: string;
    slippage?: number;
  }) {
    const url = `${MINSWAP_API_URL}/aggregator/estimate`;

    const token_in = this.formatAsset(from);
    const token_out = this.formatAsset(to);

    const payload = {
      token_in,
      token_out,
      amount,
      slippage,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Minswap Quote failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    // Return both the data and the params used, as execute needs them
    return {
      success: true,
      data,
      requestParams: payload,
    };
  }

  /**
   * Execute the swap transaction based on quote.
   * @param quoteResult The result object from .quote()
   */
  public async execute(quoteResult: any) {
    if (!quoteResult || !quoteResult.success) {
      throw new Error("Invalid quote result");
    }

    const address = await this.client.address();
    // @ts-ignore
    const sender = Core.Address.toBech32(address);

    const url = `${MINSWAP_API_URL}/aggregator/build-tx`;

    // Extract necessary data from quote result
    // The build-tx endpoint requires:
    // - sender
    // - min_amount_out (from estimate response)
    // - estimate (the original params used for estimation)

    // Check if data contains min_amount_out
    const minAmountOut =
      quoteResult.data.min_amount_out || quoteResult.data.amount_out;
    // Fallback? Ideally min_amount_out should be there.

    const payload = {
      sender,
      min_amount_out: minAmountOut,
      estimate: {
        ...quoteResult.data,
        amount: quoteResult.data.amount_in,
        slippage: quoteResult.requestParams.slippage,
      },
      amount_in_decimal: false,
    };

    // console.log("✅ Payload:", payload);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // console.log("✅ Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Minswap Build Tx Error Body:", errorText);
        throw new Error(
          `Minswap Build Tx failed: ${response.status} - ${errorText}`
        );
      }

      const buildData = await response.json();
      const cborHex = buildData.cbor;

      if (!cborHex) {
        throw new Error("No CBOR returned from Minswap");
      }

      console.log("Built Transaction CBOR length:", cborHex.length);

      // Deserialize
      // @ts-ignore
      // @ts-ignore
      const tx = Core.Transaction.fromCBORHex(cborHex);

      // Fetch wallet UTXOs so the signer knows which inputs belong to it
      const utxos = await this.client.getWalletUtxos();

      // Sign (returns witness set)
      const witnessSet = await this.client.signTx(tx, { utxos });

      // Serialize witness set to CBOR hex
      // @ts-ignore
      const witnessSetHex = Core.TransactionWitnessSet.toCBORHex(witnessSet);
      // console.log("✅ Witness Set Hex:", witnessSetHex);

      // Submit to Minswap Aggregator
      const finalizeUrl = `${MINSWAP_API_URL}/aggregator/finalize-and-submit-tx`;

      const submitPayload = {
        cbor: cborHex,
        witness_set: witnessSetHex,
      };

      const submitResponse = await fetch(finalizeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitPayload),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(
          `Minswap Submit failed: ${submitResponse.status} - ${errorText}`
        );
      }

      const submitData = await submitResponse.json();
      console.log("✅ Submit Data:", submitData);
      return { success: true, hash: submitData.tx_id };
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  }
}

const main = async () => {
  const minswapService = new MinswapService();

  const quoteResult = await minswapService.quote({
    from: "lovelace",
    to: "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e",
    amount: "1000000",
    slippage: 0.5,
  });

  console.log("✅ Quote received:", quoteResult.data);

  const executeResult = await minswapService.execute(quoteResult);

  console.log("✅ Execute result:", executeResult);
};

main();
