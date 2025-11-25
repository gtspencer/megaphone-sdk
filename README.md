# Megaphone SDK

TypeScript client for interacting with the Megaphone on-chain contracts on Base.

This implementation includes a core sdk, and a react sub-package.

### Core
- Pre buy auction days (with rev share if used with API key - request one from @0xspencer on Farcaster and TBA)
- Incentivized interactions
  - Current auction winner can include these calls for any actions taken in their miniapp, which increases the user score

### React
- Pre buy timeline view
- Logo

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
  operatorFid: 1768n, // Required: Your operator FID
  apiKey: process.env.MEGAPHONE_API_KEY, // Optional: Required for rev-share and incentivized interactions
  isTestnet: false, // Optional: Use Base Sepolia testnet (default: false)
  debug: false, // Optional: Show full error messages (default: false)
  referrer: "0x..." as `0x${string}` // Optional: Default referrer address
});
```

## Configuration

### `MegaphoneOptions`

All options when creating a `Megaphone` instance:

- **`operatorFid`** (required): `bigint` - Your operator FID used for reporting pre-buys
- **`apiKey`** (optional): `string` - API key required for rev-share operations and incentivized interactions
- **`isTestnet`** (optional): `boolean` - Use Base Sepolia testnet instead of Base mainnet (default: `false`)
- **`debug`** (optional): `boolean` - Show full error messages instead of simplified ones (default: `false`)
- **`referrer`** (optional): `Address` - Default referrer address for rev-share operations

All network information (chain id, contract addresses, backend URL) defaults to
the production Base deployment. You can also import constants like
`BASE_CHAIN_ID`, `MEGAPHONE_CONTRACT_ADDRESS`, or override them if needed.

## Methods

### `preBuy`

Fetches the current pre-buy amount on-chain, approves USDC, and calls the
`preBuyAuction` contract method. Automatically reports the pre-buy to the backend
after successful transaction. Returns `true` when the transaction is confirmed
successfully.

**Parameters:**
- **`auctionId`** (required): `bigint` - The auction ID to pre-buy
- **`fid`** (required): `bigint` - The Farcaster FID of the buyer
- **`name`** (required): `string` - The name of the bidder
- **`account`** (required): `Address` - The wallet address making the purchase
- **`config`** (required): `Config` - Wagmi configuration

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
fetches the pre-buy amount, approves USDC, then calls `preBuyAuctionWithRevShare`.
Automatically reports the pre-buy to the backend after successful transaction.
Returns `true` when the transaction is confirmed successfully.

**Parameters:**
- **`auctionId`** (required): `bigint` - The auction ID to pre-buy
- **`fid`** (required): `bigint` - The Farcaster FID of the buyer
- **`name`** (required): `string` - The name of the bidder
- **`account`** (required): `Address` - The wallet address making the purchase
- **`config`** (required): `Config` - Wagmi configuration
- **`referrer`** (required): `Address` - The referrer address to receive rev-share

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

### `recordIncentivizedInteraction`

Records an incentivized interaction for a user. Requires an `apiKey` to be set
in the `Megaphone` instance. Returns the recorded interaction details.

**Parameters:**
- **`userFid`** (required): `bigint` - The Farcaster FID of the user
- **`interactionLevel`** (required): `number` - Interaction level (must be 1, 2, or 3)

**Returns:**
```ts
{
  success: boolean;
  fid: number;
  auctionId: number;
  interactionLevel: number;
}
```

```ts
const result = await megaphone.recordIncentivizedInteraction({
  userFid: 1234n,
  interactionLevel: 2 // Must be 1, 2, or 3
});
```

## Utility Methods

### `getPreBuyWindow`

Returns the current pre-buy window with availability status for each auction day.

**Parameters:**
- **`config`** (required): `Config` - Wagmi configuration

**Returns:** Array of `PreBuyWindowDay` objects with:
- `auctionId`: `bigint` - The auction ID
- `available`: `boolean` - Whether this auction is available for pre-buy
- `date`: `Date` - The date in local timezone (normalized to 12pm EST)
- `timestamp`: `bigint` - Unix timestamp in seconds

```ts
const window = await megaphone.getPreBuyWindow({ config });

window.forEach(({ auctionId, available, date, timestamp }) => {
  console.log(`Auction ${auctionId} on ${date.toLocaleDateString()}: ${available ? 'Available' : 'Sold'}`);
  console.log(`Timestamp: ${timestamp}`);
});
```

### `getPreBuyData`

Returns comprehensive pre-buy data from the contract including status array,
configuration, and current pricing.

**Parameters:**
- **`config`** (required): `Config` - Wagmi configuration

**Returns:** `PreBuyData` object with:
- `preBuyStatus`: `boolean[]` - Array indicating which auctions in the window are bought
- `minPreBuyId`: `bigint` - Minimum pre-buy ID offset
- `maxPreBuyId`: `bigint` - Maximum pre-buy ID offset
- `currentAuctionId`: `bigint` - Current auction token ID
- `currentAuctionEndTime`: `bigint` - Current auction end time (Unix timestamp)
- `currentPreBuyPrice`: `bigint` - Current pre-buy price in USDC (6 decimals)

```ts
const preBuyData = await megaphone.getPreBuyData({ config });
console.log(`Current pre-buy price: ${preBuyData.currentPreBuyPrice}`);
```

### `getPreBuyAmount`

Returns the current pre-buy amount from the contract.

**Parameters:**
- **`config`** (required): `Config` - Wagmi configuration

**Returns:** `bigint` - Current pre-buy amount in USDC (6 decimals)

```ts
const amount = await megaphone.getPreBuyAmount(config);
```

## React UI (optional)

Install React peers if you plan to use the pre-built components:

```bash
npm install react react-dom
```

The React entry point lives at `0xmegaphone-sdk/react` and reuses the same client
logic under the hood. Wrap your app with `MegaphoneProvider` (or pass a
`Megaphone` instance directly) and drop in the components.

```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "viem/chains";
import {
  MegaphoneProvider,
  TimelinePanel,
  Logo
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
        <MegaphoneProvider
          operatorFid={1768n}
          apiKey={process.env.MEGAPHONE_API_KEY}
          isTestnet={false}
          debug={false}
          referrer="0x..." as `0x${string}`
        >
          <Logo white={false} width={64} height={64} />
          <TimelinePanel
            account={"0xabc123..." as `0x${string}`}
            fid={1768n}
            name="Alice"
            referrer="0xdef456..." as `0x${string}`}
          />
        </MegaphoneProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### `MegaphoneProvider`

React context provider that makes a `Megaphone` client available to child components.

**Props:** Same as `MegaphoneOptions`:
- **`operatorFid`** (required): `bigint` - Your operator FID
- **`apiKey`** (optional): `string` - API key for rev-share operations
- **`isTestnet`** (optional): `boolean` - Use Base Sepolia (default: `false`)
- **`debug`** (optional): `boolean` - Show full error messages (default: `false`)
- **`referrer`** (optional): `Address` - Default referrer address

### `TimelinePanel`

Displays a timeline of available pre-buy days with selection and purchase functionality.
Shows all days in the pre-buy window, with purchased days displayed as disabled.
Dates are normalized to 12pm EST and displayed in the user's local timezone.

**Props:**
- **`account`** (required): `Address` - The wallet address
- **`fid`** (required): `bigint` - The Farcaster FID of the user
- **`name`** (required): `string` - The name of the user
- **`referrer`** (optional): `Address` - Referrer address for rev-share (if provided with API key, uses rev-share flow)
- **`renderDay`** (optional): `(day: AvailableDay, options: { selected: boolean; select: () => void }) => ReactNode` - Custom render function for day buttons
- **`buttonText`** (optional): `string` - Custom button text
- **`formatButtonLabel`** (optional): `(amount: bigint) => string` - Custom function to format button label with amount
- **`formatAmount`** (optional): `(amount: bigint) => string` - Custom function to format amount (default: 2 decimal places)
- **`loadingText`** (optional): `string` - Text shown while loading (default: `"Loading…"`)
- **`emptyText`** (optional): `string` - Text shown when no days available (default: `"No pre-buy days are currently available."`)
- **`disabled`** (optional): `boolean` - Disable the component
- **`className`** (optional): `string` - CSS class name
- **`style`** (optional): `CSSProperties` - Inline styles
- **`onSuccess`** (optional): `(result: { auctionId: bigint; success: boolean }) => void` - Callback on successful pre-buy
- **`onError`** (optional): `(error: unknown) => void` - Callback on error
- **`client`** (optional): `Megaphone` - Pre-configured Megaphone instance (overrides provider)
- **`clientOptions`** (optional): `MegaphoneOptions` - Options to create a client (if not using provider)

The panel automatically uses rev-share flow if both `apiKey` and `referrer` are provided,
otherwise defaults to the standard pre-buy flow.

### `Logo`

Displays the Megaphone logo as an SVG. Supports both black and white variants.

**Props:**
- **`white`** (optional): `boolean` - Use white logo variant (default: `false`)
- **`width`** (optional): `number | string` - Logo width (default: `128`)
- **`height`** (optional): `number | string` - Logo height (default: `128`)
- **`className`** (optional): `string` - CSS class name
- **`style`** (optional): `CSSProperties` - Inline styles
- **`alt`** (optional): `string` - Accessibility label (default: `"Logo"`)

```tsx
<Logo white={true} width={64} height={64} />
```