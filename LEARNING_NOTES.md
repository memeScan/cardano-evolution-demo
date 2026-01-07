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

## 9. 交易速度对比: Cardano vs Ethereum

在 Preprod 测试网中，我们观察到交易确认时间通常在 **20~30 秒** 之间。

### 对比数据

| 特性                  | Cardano (L1)          | Ethereum (L1)       | ETH Layer 2           |
| :-------------------- | :-------------------- | :------------------ | :-------------------- |
| **理论出块时间**      | **~20 秒** (概率分布) | **~12 秒** (固定)   | < 1 秒 (Soft Confirm) |
| **实际确认感受**      | 稍慢，但稳定          | 快，但拥堵时极慢    | 极快 (秒级)           |
| **确定性 (Finality)** | **高** (上链即稳)     | 中 (需等待多个确认) | 依赖 L1 结算          |
| **Gas 费用体验**      | 稳定且低廉            | 波动极大            | 低廉                  |

### 核心区别

1.  **稳定性**: Cardano 不存在 "Gas War"，只要交易被提交，一般不会因为网络拥堵而被无限期由 Mempool 丢弃。
2.  **速度体验**: 作为 Layer 1 区块链，Cardano 的 20 秒属于中等水平（慢于 Solana/Avax，快于 Bitcoin）。
3.  **开发建议**: 在 UI 设计上，建议为用户显示 "等待确认中..." 的状态（约 20-30s），而不是让用户以为界面卡死。

### 深入解析

1.  **理论出块 (Theory)**:

    - **Ethereum (12s)**: 升级为 PoS 后，以太坊的出块时间非常固定。
    - **Cardano (20s)**: 平均出块时间约为 20 秒，但这只是一个概率平均值。有时候可能 5 秒就出一个块，有时候可能需要等待 40 秒。

2.  **拥堵与费用 (Gas War)**:

    - **Ethereum**: 在网络拥堵时，这实质上是一个拍卖市场。如果你愿意支付极高的 Gas 费，你的交易可以很快打包；反之，如果你给的费率正常但网络突然拥堵，你的交易可能在 Mempool（内存池）中卡上几个小时。
    - **Cardano**: 采用确定性费用及其调度算法。只要交易符合规则且进入 Mempool，它通常会按顺序处理，很少出现因 "出价不够高" 而被无限期忽略的情况。

3.  **确定性 (Finality)**:

    - **Cardano**: 交易一旦上链，回滚概率极低。通常 1-2 个区块确认后（约 40 秒），交易所就认为足够安全。
    - **Ethereum**: 为了防止长程攻击或重组，CEX 通常要求更多的确认（例如 12 个区块，约 3 分钟）。

4.  **与 Layer 2 对比**:
    - 如果你习惯了 Arbitrum 或 Optimism 的 "秒级确认"，Cardano L1 的体感确实会慢。这是去中心化 Layer 1 (全球共识) 与 Layer 2 (定序器快速确认) 的本质区别。Cardano 也有自己的 L2 方案 (如 Hydra) 来解决即时性问题。

## 10. (附) 如何在代码中测量交易时间

这是一个简单的脚本，用于在发送交易时自动计算上链耗时：

```typescript
// 1. 签名
const signed = await tx.sign();

console.log("正在提交交易...");
const startTime = Date.now(); // 记录开始时间

// 2. 提交
const hash = await signed.submit();
console.log("交易已提交:", hash);

console.log("等待确认中 (Wait for confirmation)...");

// 3. 等待确认 (awaitTx 默认每 5s 查询一次)
const confirmed = await client.awaitTx(hash);
const endTime = Date.now(); // 记录结束时间

if (confirmed) {
  const duration = (endTime - startTime) / 1000;
  console.log(`✅ 交易已确认! 耗时: ${duration.toFixed(2)}秒`);
} else {
  console.log("未检测到交易确认");
}
```

## 11. 进阶支付: Native Tokens 与 ADA 金额处理

### 处理 ADA 金额 (Working with ADA Amounts)

在 Cardano 中，最小单位是 **Lovelace** (1 ADA = 1,000,000 Lovelace)。
为了代码清晰，建议统一处理转换逻辑：

```typescript
// 常用常量
const oneADA = 1_000_000n;
const halfADA = 500_000n;

// 动态计算 (例如 2.5 ADA)
const amount = 2.5;
const lovelace = BigInt(Math.floor(amount * 1_000_000));
console.log(lovelace); // 2500000n
```

### 发送原生代币 (Payments with Native Tokens)

Cardano 支持原生代币 (Native Tokens)，发送代币时不仅需要指定 ADA (作为最小 UTXO 押金)，还需要在 `assets` 中添加代币信息。

**资产标识**:

- **Policy ID**: 代币的策略 ID (32 字节 Hex)。
- **Asset Name**: 代币名称 (Hex 编码)。

```typescript
// 1. 初始化资产列表 (至少包含最小 ADA)
let assets = Core.Assets.fromLovelace(2_000_000n);

// 2. 添加原生代币
const policyId =
  "7edb7a2d9fbc4d2a68e4c9e9d3d7a5c8f2d1e9f8a7b6c5d4e3f2a1b0c9d8e7f6";
const assetName = ""; // 空字符串表示无名称 (主要用于 Fungible Token)，如果是 NFT 则需要 Hex 编码名称
const tokenAmount = 100n;

// 使用 addByHex 添加
assets = Core.Assets.addByHex(assets, policyId, assetName, tokenAmount);

// 3. 构建交易
const tx = await client
  .newTx()
  .payToAddress({
    address: Core.Address.fromBech32("addr_test1..."),
    assets: assets, // 包含 ADA 和 Token
  })
  .build();

const signed = await tx.sign();
await signed.submit();
```
