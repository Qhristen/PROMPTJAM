"use client";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mplTokenMetadata,
  fetchAllDigitalAssetByOwner,
} from "@metaplex-foundation/mpl-token-metadata";
import { Connection, PublicKey } from "@solana/web3.js";
import { Loader2, Wallet } from "lucide-react";
import React, { useState } from "react";

// Type definitions

type Token = {
  mint: string;
  amount: number;
  symbol?: string;
  decimals: number;
};

type NFT = {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
};

type WalletData = {
  tokens: Token[];
  nfts: NFT[];
  isLoading: boolean;
  error: string | null;
};

const SolanaWalletViewer = () => {
  const [activeTab, setActiveTab] = useState<"tokens" | "nfts">("tokens");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletData, setWalletData] = useState<WalletData>({
    tokens: [],
    nfts: [],
    isLoading: false,
    error: null,
  });

  const fetchMetadata = async (uri: string) => {
    try {
      const response = await fetch(uri);
      return await response.json();
    } catch {
      return null;
    }
  };

  const fetchWalletData = async (address: string) => {
    setWalletData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const RPC_ENDPOINT = "https://api.devnet.solana.com";
      const umi = createUmi(RPC_ENDPOINT).use(mplTokenMetadata());
      const connection = new Connection(RPC_ENDPOINT);
      const ownerPublicKey = new PublicKey(address);

      // Fetch tokens
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        ownerPublicKey,
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
        }
      );
      const tokens: Token[] = tokenAccounts.value.map((accountInfo) => {
        const accountData = accountInfo.account.data;
        const mint = new PublicKey(accountData.slice(0, 32)).toString();
        const amount = Number(accountData.slice(64, 72).readBigUInt64LE());
        const decimals = accountData[44];
        return { mint, amount, decimals };
      });

      // Fetch NFTs
      const assets = await fetchAllDigitalAssetByOwner(umi, ownerPublicKey);
      const nfts: NFT[] = await Promise.all(
        assets.map(async (asset) => {
          const metadata = await fetchMetadata(asset.metadata.uri);
          return {
            mint: asset.publicKey.toString(),
            name: asset.metadata.name,
            symbol: asset.metadata.symbol,
            uri: asset.metadata.uri,
            image: metadata?.image,
          };
        })
      );

      setWalletData({ tokens, nfts, isLoading: false, error: null });
    } catch (error) {
      setWalletData((prev) => ({
        ...prev,
        isLoading: false,
        error: error?.message,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (walletAddress) fetchWalletData(walletAddress);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Wallet className="w-8 h-8 text-purple-600" />
        <h1 className="text-2xl font-bold">Solana Wallet Viewer</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter Solana wallet address"
          className="flex-1 p-2 border text-black rounded-lg"
        />
        <button
          type="submit"
          disabled={walletData.isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          {walletData.isLoading ? "Loading..." : "Search"}
        </button>
      </form>
      {walletData.error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {walletData.error}
        </div>
      )}
      {walletData.isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab("tokens")}
              className={
                activeTab === "tokens"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-500"
              }
            >
              Tokens ({walletData.tokens.length})
            </button>
            <button
              onClick={() => setActiveTab("nfts")}
              className={
                activeTab === "nfts"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-500"
              }
            >
              NFTs ({walletData.nfts.length})
            </button>
          </div>
          <div className="mt-4">
            {activeTab === "tokens" ? (
              <>
                <div className="grid gap-4">
                  {walletData.tokens.map((token) => (
                    <div
                      key={token.mint}
                      className="p-4 border rounded-lg text-black bg-gray-100 hover:shadow-lg transition-shadow flex flex-col space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-lg text-black">
                          {token.symbol}
                        </span>
                        <span className="text-gray-800 font-semibold">
                          {token.amount / Math.pow(10, token.decimals)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1 truncate">
                        Mint: {token.mint}
                      </div>
                    </div>
                  ))}
                  {walletData.tokens.length === 0 && (
                    <div className="text-center text-gray-500">
                      No tokens found
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {walletData.nfts.map((nft) => (
                  <div key={nft.mint}>
                    <img src={nft.image} alt={nft.name} />
                    <h3>{nft.name}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SolanaWalletViewer;
