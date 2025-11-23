# Megaphone SDK

TypeScript client for interacting with the Megaphone on-chain contracts on Base.

## Installation

```bash
npm install 0xmegaphone-sdk
```

Peer dependencies expected in the host app:

```bash
npm install wagmi viem
```

## Quick Start

```ts
import { createConfig, http } from "wagmi";
import { base } from "viem/chains";
import { Megaphone } from "0xmegaphone-sdk";

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

## React UI (optional)

Install React peers if you plan to use the pre-built components:

```bash
npm install react react-dom
```

The React entry point lives at `0xmegaphone-sdk/react` and reuses the same client
logic under the hood. Wrap your app with `MegaphoneProvider` (or pass a
`Megaphone` instance directly) and drop in the panels.

```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "viem/chains";
import {
  MegaphoneProvider,
  ReservePanel,
  TimelinePanel
} from "0xmegaphone-sdk/react";

const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  }
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MegaphoneProvider apiKey={process.env.MEGAPHONE_API_KEY}>
          <TimelinePanel
            account={"0xabc123..." as `0x${string}`}
            fid={1768n}
            name="Alice"
          />

          <ReservePanel
            account={"0xabc123..." as `0x${string}`}
            fid={1768n}
            name="Alice"
            showAuctionIdInput
          />
        </MegaphoneProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- `ReservePanel` shows a single “Reserve the Megaphone” button (with optional
  auction-id input and customizable label) and calls the appropriate pre-buy
  method on click.
- `TimelinePanel` lists available pre-buy days, lets the user select one, and
  renders the same purchase button below the timeline.

Both panels default to the non–rev share flow unless an API key (and referrer)
is supplied; they expose `onSuccess` / `onError` callbacks and accept an
existing `Megaphone` instance if you prefer not to use the provider. For Base
Sepolia testing, pass `isTestnet` to the provider or component-level
`clientOptions`.