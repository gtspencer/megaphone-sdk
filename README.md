# Megaphone SDK

TypeScript client for interacting with the Megaphone on-chain contracts on Base.

## Installation

```bash
npm install megaphone-sdk
```

Peer dependencies expected in the host app:

```bash
npm install wagmi viem
```

## Quick Start

```ts
import { createConfig, http } from "wagmi";
import { base } from "viem/chains";
import { Megaphone } from "megaphone-sdk";

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  }
});

const megaphone = new Megaphone({
  apiKey: process.env.MEGAPHONE_API_KEY
});
```

## Methods

### `preBuy`

Fetches the current pre-buy amount on-chain, approves USDC, and calls the
`preBuyAuction` contract method. Returns `true` when the transaction is
confirmed successfully.

```ts
const success = await megaphone.preBuy({
  auctionId: 1234n,
  fid: 9876n,
  name: "Alice",
  account: "0xabc123..." as `0x${string}`,
  config
});
```

### `preBuyWithRevShare`

Requests a rev-share signature from the Megaphone backend (requires `apiKey`),
fetches the pre-buy amount, approves USDC, then calls
`preBuyAuctionWithRevShare`. Returns `true` when the transaction is confirmed
successfully.

```ts
const success = await megaphone.preBuyWithRevShare({
  auctionId: 1234n,
  fid: 9876n,
  name: "Alice",
  account: "0xabc123..." as `0x${string}`,
  config,
  referrer: "0xdef456..." as `0x${string}`
});
```

## Configuration

All network information (chain id, contract addresses, backend URL) defaults to
the production Base deployment. You can also import constants like
`BASE_CHAIN_ID`, `MEGAPHONE_CONTRACT_ADDRESS`, or override them if needed.

## Utility

### `getAvailableDays`

Returns the future auctions that can be pre-bought along with their local dates.

```ts
const availableDays = await megaphone.getAvailableDays({ config });

availableDays.forEach(({ auctionId, date }) => {
  console.log(`Auction ${auctionId} ends on ${date.toLocaleString()}`);
});
```

Each entry also exposes the raw Unix timestamp (seconds) for other time-zone or
formatting use cases.