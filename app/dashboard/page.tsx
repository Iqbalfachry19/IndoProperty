"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Coins,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Landmark,
  PieChart,
  Activity,
  AlertTriangle,
  Lock,
} from "lucide-react";

import { Button } from "@/app/components/ui/Button";
import { ConnectWallet } from "@/app/components/ConnectWallet";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, TokenABI } from "@/app/lib/web3/abi";
import { formatUnits } from "viem";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatIDR(wei: bigint | undefined): string {
  if (!wei) return "Rp 0";
  // contract stores IDR as plain integer (not wei-scaled for fiat)
  // adjust divisor if your contract uses a different precision
  const n = Number(wei);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(2)}M`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatBps(bps: bigint | undefined): string {
  if (!bps) return "0%";
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address, isConnected, chain } = useAccount();

  const tokenContract = {
    address: CONTRACT_ADDRESSES.SPVToken as `0x${string}`,
    abi: TokenABI,
  } as const;

  // ── batch read ──────────────────────────────────────────────────────────────
  const { data, refetch } = useReadContracts({
    contracts: [
      { ...tokenContract, functionName: "balanceOf",           args: address ? [address] : undefined },
      { ...tokenContract, functionName: "totalSupply" },
      { ...tokenContract, functionName: "propertyInfo" },
      { ...tokenContract, functionName: "totalRentDistributed" },
      { ...tokenContract, functionName: "paused" },
      { ...tokenContract, functionName: "pendingRentOf",       args: address ? [address] : undefined },
      { ...tokenContract, functionName: "isFrozen",            args: address ? [address] : undefined },
      { ...tokenContract, functionName: "getFrozenTokens",     args: address ? [address] : undefined },
      { ...tokenContract, functionName: "accRentPerToken" },
    ],
    query: { enabled: !!address },
  });

  const [
    balanceResult,
    totalSupplyResult,
    propertyInfoResult,
    totalRentResult,
    pausedResult,
    pendingRentResult,
    isFrozenResult,
    frozenTokensResult,
    accRentResult,
  ] = data ?? [];

  const balance          = balanceResult?.result          as bigint | undefined;
  const totalSupply      = totalSupplyResult?.result      as bigint | undefined;
  const propertyInfo     = propertyInfoResult?.result     as readonly [string, string, string, bigint, bigint, bigint, bigint, boolean] | undefined;
  const totalRent        = totalRentResult?.result        as bigint | undefined;
  const paused           = pausedResult?.result           as boolean | undefined;
  const pendingRent      = pendingRentResult?.result      as bigint | undefined;
  const isFrozen         = isFrozenResult?.result         as boolean | undefined;
  const frozenTokens     = frozenTokensResult?.result     as bigint | undefined;
  const accRentPerToken  = accRentResult?.result          as bigint | undefined;

  // destructure propertyInfo tuple
  const [
    propName,
    propAddress,
    certNo,
    appraisedValue,
    tokenPriceIDR,
    totalAreaM2,
    expectedYieldBps,
    isLiquidated,
  ] = propertyInfo ?? [];

  // derived values
  const formattedBalance   = balance    ? formatUnits(balance,    18) : "0";
  const formattedSupply    = totalSupply ? formatUnits(totalSupply, 18) : "0";
  const formattedFrozen    = frozenTokens ? formatUnits(frozenTokens, 18) : "0";
  const formattedPending   = pendingRent  ? formatUnits(pendingRent,  18) : "0"; // in ETH/native — adapt if IDR-denominated
  const ownershipPct       = balance && totalSupply && totalSupply > 0n
    ? ((Number(balance) / Number(totalSupply)) * 100).toFixed(4)
    : "0";

  // ── claim rent write ────────────────────────────────────────────────────────
  const { writeContract, data: claimTxHash, isPending: isClaimPending } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  function handleClaimRent() {
    writeContract({
      address: CONTRACT_ADDRESSES.SPVToken as `0x${string}`,
      abi: TokenABI,
      functionName: "claimRent",
    });
  }

  // ── status badges ───────────────────────────────────────────────────────────
  const complianceLabel = isLiquidated
    ? "Liquidated"
    : paused
    ? "Paused"
    : isFrozen
    ? "Frozen"
    : "Verified";

  const complianceColor = isLiquidated
    ? "text-red-600"
    : paused
    ? "text-yellow-600"
    : isFrozen
    ? "text-orange-600"
    : "text-green-600";

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 text-black bg-slate-50 min-h-screen">
      {/* ── Header ── */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-8 py-8 flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <p className="text-sm text-slate-500">Welcome back 👋</p>
            <h1 className="text-4xl font-bold mt-2">Investor Dashboard</h1>
            <p className="text-slate-500 mt-2">
              Manage your Indonesian Real Estate Security Tokens.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <ConnectWallet />
            <Button className="bg-red-600 hover:bg-red-700">Browse Properties</Button>
          </div>
        </div>
      </section>

      {/* ── Alerts ── */}
      {(paused || isFrozen || isLiquidated) && (
        <div className="max-w-7xl mx-auto px-8 pt-6">
          {isLiquidated && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm mb-3">
              <AlertTriangle size={16} />
              This property SPV has been liquidated. Token transfers are disabled.
            </div>
          )}
          {paused && !isLiquidated && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-yellow-700 text-sm mb-3">
              <AlertTriangle size={16} />
              Token contract is currently paused by the SPV manager.
            </div>
          )}
          {isFrozen && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 p-4 text-orange-700 text-sm mb-3">
              <Lock size={16} />
              Your address is frozen. Contact the SPV manager for assistance.
            </div>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      <section className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Appraised Value */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Property Value</p>
                  <h2 className="text-2xl font-bold mt-2">{formatIDR(appraisedValue)}</h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {totalAreaM2 ? `${totalAreaM2.toString()} m²` : "—"}
                  </p>
                </div>
                <Wallet className="text-red-600" />
              </div>
            </CardContent>
          </Card>

          {/* Token Holdings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">My Tokens</p>
                  <h2 className="text-3xl font-bold mt-2">{parseFloat(formattedBalance).toLocaleString()}</h2>
                  <p className="text-slate-500 text-sm mt-2">{ownershipPct}% ownership</p>
                </div>
                <Building2 className="text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Expected Yield */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Expected Yield</p>
                  <h2 className="text-3xl font-bold mt-2">{formatBps(expectedYieldBps)}</h2>
                  <p className="text-green-600 text-sm mt-2">Annual</p>
                </div>
                <TrendingUp className="text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Compliance</p>
                  <h2 className={`text-2xl font-bold mt-2 ${complianceColor}`}>{complianceLabel}</h2>
                  <p className="text-green-600 text-sm mt-2">ERC-3643</p>
                </div>
                <ShieldCheck className="text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Property Info + Wallet ── */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* Property Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              {propertyInfo ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                  <div>
                    <p className="text-slate-500">Property Name</p>
                    <p className="font-medium mt-1">{propName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Certificate No.</p>
                    <p className="font-medium mt-1 break-all">{certNo || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Address</p>
                    <p className="font-medium mt-1">{propAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Appraised Value</p>
                    <p className="font-medium mt-1">{formatIDR(appraisedValue)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Token Price</p>
                    <p className="font-medium mt-1">{formatIDR(tokenPriceIDR)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Supply</p>
                    <p className="font-medium mt-1">{parseFloat(formattedSupply).toLocaleString()} PROP</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Rent Distributed</p>
                    <p className="font-medium mt-1">{parseFloat(formatUnits(totalRent ?? 0n, 18)).toFixed(6)} ETH</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Area</p>
                    <p className="font-medium mt-1">{totalAreaM2?.toString() ?? "—"} m²</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className={`font-medium mt-1 ${complianceColor}`}>{complianceLabel}</p>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] rounded-xl border border-dashed flex items-center justify-center text-slate-400">
                  {isConnected ? "Loading property data…" : "Connect wallet to load data"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-slate-500">Connected Address</p>
                <p className="font-medium mt-2 break-all text-sm">
                  {isConnected && address ? address : "Not Connected"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Network</p>
                <p className="font-medium mt-2">{isConnected && chain ? chain.name : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">PROP Balance</p>
                <p className="font-medium mt-2 text-red-600">
                  {parseFloat(formattedBalance).toLocaleString()} PROP
                </p>
              </div>
              {frozenTokens !== undefined && frozenTokens > 0n && (
                <div>
                  <p className="text-sm text-slate-500">Frozen Tokens</p>
                  <p className="font-medium mt-2 text-orange-600">
                    {parseFloat(formattedFrozen).toLocaleString()} PROP
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500">Claimable Rent</p>
                <p className="font-medium mt-2 text-green-600">
                  {parseFloat(formattedPending).toFixed(6)} ETH
                </p>
              </div>
              {/* Claim Rent */}
              <Button
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                onClick={handleClaimRent}
                disabled={!isConnected || !pendingRent || pendingRent === 0n || isClaimPending || isClaimConfirming}
              >
                {isClaimPending || isClaimConfirming ? "Claiming…" : "Claim Rent"}
              </Button>
              {isClaimSuccess && (
                <p className="text-green-600 text-sm text-center">
                  ✓ Rent claimed successfully!
                </p>
              )}
              <Button className="w-full" variant="outline">View Wallet</Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Token Summary ── */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Token Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-3">Property</th>
                  <th>My Tokens</th>
                  <th>Token Price</th>
                  <th>Yield</th>
                  <th>Supply</th>
                  <th>Ownership</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {propName ? (
                  <tr className="border-b hover:bg-slate-50">
                    <td className="py-5 font-medium">{propName}</td>
                    <td>{parseFloat(formattedBalance).toLocaleString()}</td>
                    <td>{formatIDR(tokenPriceIDR)}</td>
                    <td className="text-green-600">{formatBps(expectedYieldBps)}</td>
                    <td>{parseFloat(formattedSupply).toLocaleString()}</td>
                    <td>{ownershipPct}%</td>
                    <td>
                      <Button variant="ghost" size="sm">
                        <ArrowUpRight size={18} />
                      </Button>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {isConnected ? "Loading…" : "Connect wallet to view holdings"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Bottom ── */}
        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isClaimSuccess && (
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <Coins className="text-green-600" />
                    <div>
                      <p className="font-medium">Rent Claimed</p>
                      <p className="text-sm text-slate-500">{propName ?? "SPV Token"}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">Just now</span>
                </div>
              )}
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <Activity className="text-blue-600" />
                  <div>
                    <p className="font-medium">Total Rent Distributed</p>
                    <p className="text-sm text-slate-500">
                      {parseFloat(formatUnits(totalRent ?? 0n, 18)).toFixed(6)} ETH (all time)
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <PieChart className="text-purple-600" />
                  <div>
                    <p className="font-medium">Acc. Rent / Token</p>
                    <p className="text-sm text-slate-500">
                      {parseFloat(formatUnits(accRentPerToken ?? 0n, 18)).toFixed(8)} ETH/PROP
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button>Browse Marketplace</Button>
              <Button variant="outline">Transfer Tokens</Button>
              <Button variant="outline">View Compliance</Button>
              <Button
                variant="outline"
                onClick={handleClaimRent}
                disabled={!isConnected || !pendingRent || pendingRent === 0n || isClaimPending || isClaimConfirming}
              >
                Claim Yield
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}