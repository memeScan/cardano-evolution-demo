# Cardano 开发学习笔记 (基于 Evolution SDK)

本笔记基于 `@evolution-sdk/evolution` 库的学习与实践，涵盖了从环境配置到交易发送的完整流程。

## 1. 环境准备

首先配置环境变量 `.env`，需要 Blockfrost API Key 和 钱包助记词。

```env
BLOCKFROST_API_KEY=your_preprod_project_id
WALLET_MNEMONIC=your 24 words mnemonic ...
```

## 2. 创建 Client

使用 `createClient` 初始化 SDK 客户端，指定网络（Preprod 测试网）、Provider (Blockfrost) 和钱包。

```typescript
import { createClient } from "@evolution-sdk/evolution";
import dotenv from "dotenv";

dotenv.config();

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
    accountIndex: 0, // 默认使用第 0 个账户
  },
});
```

## 3. 获取并查看钱包地址

SDK 返回的地址是一个对象，需要使用 `Core.Address.toBech32` 转换为人类可读的字符串格式（如 `addr_test1...`）。

```typescript
import { Core } from "@evolution-sdk/evolution";

// 获取地址对象
const address = await client.address();

// 转换为 Bech32 字符串
// @ts-ignore
const addressStr = Core.Address.toBech32(address);

console.log("我的钱包地址:", addressStr);
```

## 4. 查询余额 (UTXO 模式)

Cardano 是基于 UTXO (Unspent Transaction Output) 模型的。查询余额实际上是获取所有属于该钱包的 UTXO 并累加其中的 Lovelace (1 ADA = 1,000,000 Lovelace)。

```typescript
// 获取钱包所有 UTXO
const utxos = await client.getWalletUtxos();

if (utxos.length > 0) {
  let totalLovelace = 0n;

  // 遍历并累加余额
  for (const utxo of utxos) {
    if (utxo.assets.lovelace) {
      totalLovelace += BigInt(utxo.assets.lovelace);
    }
  }

  // 转换为 ADA 显示
  const adaBalance = Number(totalLovelace) / 1_000_000;
  console.log(`💰 余额: ${adaBalance.toLocaleString()} ADA`);
} else {
  console.log("余额为 0");
}
```

## 5. 发送交易 (转账)

构建、签名并提交交易。注意金额单位是 API 这里的 `fromLovelace` 需要 BigInt。

```typescript
const tx = await client
  .newTx()
  .payToAddress({
    // 目标地址需要转换格式
    address: Core.Address.fromBech32(
      "addr_test1qrjzxthmfzm5vcrzm0q3653fl9kqe7zllw4..." // 收款人地址
    ),
    // 转账金额 (例如 2 ADA)
    assets: Core.Assets.fromLovelace(2_000_000n),
  })
  .build();

// 签名
const signed = await tx.sign();

// 提交上链
const hash = await signed.submit();

console.log(`交易已提交! Hash: ${hash}`);
console.log(
  `🔍 区块链浏览器: https://preprod.cardanoscan.io/transaction/${hash}`
);
```

## 6. 常用工具链接

- **水龙头 (Faucet)**: [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/) (领取测试币)
- **区块浏览器 (Preprod)**: [Cardanoscan Preprod](https://preprod.cardanoscan.io/)

## 7. 获取测试币 (Faucet)

在测试网开发需要申请测试币 (tADA)。

- **领取地址**: [Cardano Testnets Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
- **操作步骤**:
  1. 访问 Faucet 页面。
  2. Environment 选择 **Pre-production Testnet**。
  3. Action 选择 **Receive test ADA**。
  4. 输入你的钱包地址。
  5. 点击领取，通常几分钟内到账 (一般每次 10,000 tADA)。
- **限制**: 每个地址/IP 通常每 24 小时可领取一次。

## 8. Provider 配置详解

`Evolution SDK` 支持多种 Provider，用于与区块链网络交互。

### Blockfrost (当前使用)

最常用的服务商，需注册账号获取 Project ID。

- **官网**: [blockfrost.io](https://blockfrost.io/)
- **配置**:
  ```typescript
  provider: {
    type: "blockfrost",
    // Preprod: https://cardano-preprod.blockfrost.io/api/v0
    // Mainnet: https://cardano-mainnet.blockfrost.io/api/v0
    baseUrl: "https://cardano-preprod.blockfrost.io/api/v0",
    projectId: process.env.BLOCKFROST_API_KEY!,
  }
  ```

### 其他 Provider 选项 (参考)

如果你想切换其他服务商或自建节点：

- **Maestro**: 另一个流行的基础设施服务商。
  - Endpoint: `https://preprod.gomaestro-api.ai/v0`
- **Kupmios (自建)**: 结合了 Ogmios 和 Kupo 的方案，适合本地开发或自托管。
  ```typescript
  provider: {
    type: "kupmios",
    ogmiosUrl: "ws://localhost:1337",
    kupoUrl: "http://localhost:1442",
  }
  ```
- **Koios**: 社区驱动的 API 服务，通常不需要 API Key。
  - Endpoint: `https://preprod.koios.rest/api/v1`

更详细列表请参考: [Evolution SDK Provider 文档](https://intersectmbo.github.io/evolution-sdk/docs/providers/provider-types/)
