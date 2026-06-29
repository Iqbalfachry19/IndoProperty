"use client";

import {
  ArrowUpRight,
  Building2,
  Coins,
  Wallet,
  TrendingUp,
  ShieldCheck,
  PieChart,
  Activity,
  AlertTriangle,
  Lock,
  WifiOff,
} from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/app/components/ui/Button";
import { ConnectWallet } from "@/app/components/ConnectWallet";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESSES, TokenABI } from "@/app/lib/web3/abi";
import { formatUnits } from "viem";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

// ─── constants ───────────────────────────────────────────────────────────────

const MANTLE_SEPOLIA_CHAIN_ID = 5003;
const NATIVE_SYMBOL = "MNT";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatIDR(val: bigint | undefined): string {
  if (!val) return "Rp 0";
  const n = Number(val);
  if (n >= 1_000_000_000_000) return `Rp ${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000)     return `Rp ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)         return `Rp ${(n / 1_000_000).toFixed(2)}M`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatBps(bps: bigint | undefined): string {
  if (!bps) return "0%";
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

function formatMNT(wei: bigint | undefined, decimals = 6): string {
  if (!wei) return `0 ${NATIVE_SYMBOL}`;
  return `${parseFloat(formatUnits(wei, 18)).toFixed(decimals)} ${NATIVE_SYMBOL}`;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address, isConnected, chain } = useAccount();

  const isWrongNetwork = isConnected && chain?.id !== MANTLE_SEPOLIA_CHAIN_ID;

  const tokenContract = {
    address: CONTRACT_ADDRESSES.SPVToken as `0x${string}`,
    abi: TokenABI,
  } as const;

  // ── batch read ──────────────────────────────────────────────────────────────
  const { data, refetch } = useReadContracts({
    contracts: [
      { ...tokenContract, functionName: "balanceOf",          args: address ? [address] : undefined },
      { ...tokenContract, functionName: "totalSupply" },
      { ...tokenContract, functionName: "propertyInfo" },
      { ...tokenContract, functionName: "totalRentDistributed" },
      { ...tokenContract, functionName: "paused" },
      { ...tokenContract, functionName: "pendingRentOf",      args: address ? [address] : undefined },
      { ...tokenContract, functionName: "isFrozen",           args: address ? [address] : undefined },
      { ...tokenContract, functionName: "getFrozenTokens",    args: address ? [address] : undefined },
      { ...tokenContract, functionName: "accRentPerToken" },
    ],
    query: { enabled: !!address && !isWrongNetwork },
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

  const balance         = balanceResult?.result         as bigint | undefined;
  const totalSupply     = totalSupplyResult?.result     as bigint | undefined;
  const propertyInfo    = propertyInfoResult?.result    as readonly [string, string, string, bigint, bigint, bigint, bigint, boolean] | undefined;
  const totalRent       = totalRentResult?.result       as bigint | undefined;
  const paused          = pausedResult?.result          as boolean | undefined;
  const pendingRent     = pendingRentResult?.result     as bigint | undefined;
  const isFrozen        = isFrozenResult?.result        as boolean | undefined;
  const frozenTokens    = frozenTokensResult?.result    as bigint | undefined;
  const accRentPerToken = accRentResult?.result         as bigint | undefined;

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

  // derived
  const formattedBalance = formatUnits(balance ?? 0n, 18);
  const formattedSupply  = formatUnits(totalSupply ?? 0n, 18);
  const formattedFrozen  = formatUnits(frozenTokens ?? 0n, 18);
  const ownershipPct     =
    balance && totalSupply && totalSupply > 0n
      ? ((Number(balance) / Number(totalSupply)) * 100).toFixed(4)
      : "0";

  // ── claim rent ─────────────────────────────────────────────────────────────
  const {
    writeContract,
    data: claimTxHash,
    isPending: isClaimPending,
    reset: resetClaim,
  } = useWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimTxHash });

  // refetch on-chain data after successful claim
  useEffect(() => {
    if (isClaimSuccess) refetch();
  }, [isClaimSuccess, refetch]);

  function handleClaimRent() {
    writeContract({
      address: CONTRACT_ADDRESSES.SPVToken as `0x${string}`,
      abi: TokenABI,
      functionName: "claimRent",
    });
  }

  const claimDisabled =
    !isConnected ||
    isWrongNetwork ||
    !pendingRent ||
    pendingRent === 0n ||
    isClaimPending ||
    isClaimConfirming;

  // ── compliance status ───────────────────────────────────────────────────────
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

  // ─── render ──────────────────────────────────────────────────────────────────
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
      <div className="max-w-7xl mx-auto px-8 pt-6 space-y-3">
        {isWrongNetwork && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-700 text-sm">
            <WifiOff size={16} />
            Wrong network. Please switch to <strong className="mx-1">Mantle Sepolia</strong> (Chain ID: {MANTLE_SEPOLIA_CHAIN_ID}).
          </div>
        )}
        {isLiquidated && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            <AlertTriangle size={16} />
            This SPV has been liquidated. Token transfers are disabled.
          </div>
        )}
        {paused && !isLiquidated && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-yellow-700 text-sm">
            <AlertTriangle size={16} />
            Token contract is currently paused by the SPV manager.
          </div>
        )}
        {isFrozen && (
          <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 p-4 text-orange-700 text-sm">
            <Lock size={16} />
            Your address is frozen. Contact the SPV manager for assistance.
          </div>
        )}
        {isClaimSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
            ✓ Rent claimed successfully! Your balance has been updated.
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <section className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Appraised Value</p>
                  <h2 className="text-2xl font-bold mt-2">{formatIDR(appraisedValue)}</h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {totalAreaM2 ? `${totalAreaM2.toString()} m²` : "—"}
                  </p>
                </div>
                <Wallet className="text-red-600 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">My Tokens</p>
                  <h2 className="text-3xl font-bold mt-2">
                    {parseFloat(formattedBalance).toLocaleString()}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">{ownershipPct}% ownership</p>
                </div>
                <Building2 className="text-blue-600 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Expected Yield</p>
                  <h2 className="text-3xl font-bold mt-2">{formatBps(expectedYieldBps)}</h2>
                  <p className="text-green-600 text-sm mt-2">Annual</p>
                </div>
                <TrendingUp className="text-green-600 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Compliance</p>
                  <h2 className={`text-2xl font-bold mt-2 ${complianceColor}`}>
                    {complianceLabel}
                  </h2>
                  <p className="text-green-600 text-sm mt-2">ERC-3643</p>
                </div>
                <ShieldCheck className="text-emerald-600 shrink-0" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Property Details + Wallet ── */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">

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
                    <p className="font-medium mt-1">
                      {parseFloat(formattedSupply).toLocaleString()} PROP
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Rent Distributed</p>
                    <p className="font-medium mt-1">{formatMNT(totalRent)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Area</p>
                    <p className="font-medium mt-1">
                      {totalAreaM2?.toString() ?? "—"} m²
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className={`font-medium mt-1 ${complianceColor}`}>{complianceLabel}</p>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] rounded-xl border border-dashed flex items-center justify-center text-slate-400 text-sm">
                  {!isConnected
                    ? "Connect wallet to load property data"
                    : isWrongNetwork
                    ? "Switch to Mantle Sepolia to load data"
                    : "Loading property data…"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Connected Address</p>
                <p className="font-medium mt-1 break-all text-sm">
                  {isConnected && address ? address : "Not Connected"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Network</p>
                <p className={`font-medium mt-1 text-sm ${isWrongNetwork ? "text-red-600" : ""}`}>
                  {isConnected && chain ? chain.name : "—"}
                  {isWrongNetwork && " ⚠ Wrong network"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">PROP Balance</p>
                <p className="font-medium mt-1 text-red-600">
                  {parseFloat(formattedBalance).toLocaleString()} PROP
                </p>
              </div>
              {frozenTokens !== undefined && frozenTokens > 0n && (
                <div>
                  <p className="text-sm text-slate-500">Frozen Tokens</p>
                  <p className="font-medium mt-1 text-orange-600">
                    {parseFloat(formattedFrozen).toLocaleString()} PROP
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500">Claimable Rent</p>
                <p className="font-medium mt-1 text-green-600">
                  {formatMNT(pendingRent)}
                </p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleClaimRent}
                disabled={claimDisabled}
              >
                {isClaimPending
                  ? "Waiting for signature…"
                  : isClaimConfirming
                  ? "Confirming…"
                  : "Claim Rent"}
              </Button>
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
                  <th className="py-3 font-medium">Property</th>
                  <th className="font-medium">My Tokens</th>
                  <th className="font-medium">Token Price</th>
                  <th className="font-medium">Yield</th>
                  <th className="font-medium">Total Supply</th>
                  <th className="font-medium">Ownership</th>
                  <th />
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
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      {!isConnected
                        ? "Connect wallet to view holdings"
                        : isWrongNetwork
                        ? "Switch to Mantle Sepolia"
                        : "Loading…"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Bottom ── */}
        <div className="grid lg:grid-cols-2 gap-6 mt-8">

          <Card>
            <CardHeader>
              <CardTitle>On-Chain Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isClaimSuccess && (
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <Coins className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Rent Claimed</p>
                      <p className="text-sm text-slate-500">{propName ?? "SPV Token"}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 shrink-0">Just now</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <Activity className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Total Rent Distributed</p>
                    <p className="text-sm text-slate-500">{formatMNT(totalRent)} (all-time)</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <PieChart className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Acc. Rent / Token</p>
                    <p className="text-sm text-slate-500">
                      {formatMNT(accRentPerToken, 8)} / PROP
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                disabled={claimDisabled}
              >
                {isClaimPending || isClaimConfirming ? "Claiming…" : "Claim Yield"}
              </Button>
            </CardContent>
          </Card>

        </div>
      </section>
    </main>
  );
}