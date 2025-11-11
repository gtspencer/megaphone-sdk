import type { Abi } from "viem";

export const megaphoneAbi = [
  {
    inputs: [],
    name: "auction",
    outputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bool", name: "isDayPreBought", type: "bool" },
      {
        internalType: "uint256",
        name: "highestBid_amount",
        type: "uint256"
      },
      { internalType: "uint256", name: "highestBid_fid", type: "uint256" },
      { internalType: "address", name: "highestBid_bidder", type: "address" },
      {
        internalType: "uint256",
        name: "highestBid_timestamp",
        type: "uint256"
      },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "bool", name: "settled", type: "bool" },
      {
        internalType: "uint256",
        name: "megaphoneMetadata_validUntil",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "megaphoneMetadata_fid",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_auctionId", type: "uint256" },
      { internalType: "uint256", name: "_fid", type: "uint256" },
      { internalType: "string", name: "_name", type: "string" }
    ],
    name: "preBuyAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getPreBuyAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "settings",
    outputs: [
      { internalType: "address", name: "usdcToken", type: "address" },
      { internalType: "address", name: "treasury", type: "address" },
      {
        internalType: "uint256",
        name: "createBidReservePrice",
        type: "uint256"
      },
      { internalType: "uint256", name: "timeBuffer", type: "uint256" },
      { internalType: "bool", name: "launched", type: "bool" },
      {
        internalType: "uint256",
        name: "scheduledEndTime",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "maxExtensionTime",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "megaphoneMetadata_validUntil",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "megaphoneMetadata_fid",
        type: "uint256"
      },
      { internalType: "uint256", name: "minPreBuyId", type: "uint256" },
      { internalType: "uint256", name: "maxPreBuyId", type: "uint256" },
      { internalType: "bool", name: "allowPreBuy", type: "bool" },
      {
        internalType: "address",
        name: "verifierAddress",
        type: "address"
      },
      { internalType: "uint256", name: "revSharePercent", type: "uint256" },
      {
        internalType: "uint256",
        name: "preBuyPremiumPercent",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_auctionId", type: "uint256" },
      { internalType: "uint256", name: "_fid", type: "uint256" },
      { internalType: "string", name: "_name", type: "string" },
      { internalType: "bytes", name: "_signature", type: "bytes" },
      { internalType: "address", name: "_referrer", type: "address" }
    ],
    name: "preBuyAuctionWithRevShare",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const satisfies Abi;

