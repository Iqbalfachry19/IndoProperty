"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, parseEther, isAddress } from "viem";
import {
  Users, ShieldCheck, Coins, Settings, ChevronRight,
  PauseCircle, PlayCircle, Lock, Unlock, AlertTriangle,
  UserPlus, UserMinus, Banknote, RefreshCw, WifiOff,
  CheckCircle2, XCircle, ArrowRightLeft, Building2,
} from "lucide-react";
import {
  CONTRACT_ADDRESSES,
  TokenABI,
  IdentityRegistryABI,
  ComplianceABI,
} from "@/app/lib/web3/abi";
import { ConnectWallet } from "@/app/components/ConnectWallet";

// ─── constants ────────────────────────────────────────────────────────────────
const MANTLE_SEPOLIA_CHAIN_ID = 5003;

const TOKEN    = CONTRACT_ADDRESSES.SPVToken        as `0x${string}`;
const REGISTRY = CONTRACT_ADDRESSES.IdentityRegistry as `0x${string}`;
const COMPLY   = CONTRACT_ADDRESSES.Compliance       as `0x${string}`;

// ─── tiny ui primitives ───────────────────────────────────────────────────────
function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        {...props}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-300"
      />
    </div>
  );
}

function ActionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-700">{icon}</span>
        <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TxButton({
  onClick, disabled, pending, label, pendingLabel, variant = "primary",
}: {
  onClick: () => void; disabled: boolean; pending: boolean;
  label: string; pendingLabel: string; variant?: "primary" | "danger" | "warning" | "success" | "ghost";
}) {
  const styles = {
    primary: "bg-slate-900 hover:bg-slate-700 text-white",
    danger:  "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    ghost:   "border border-slate-200 hover:bg-slate-50 text-slate-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin" /> {pendingLabel}
        </span>
      ) : label}
    </button>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}
    </span>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg text-sm font-medium ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// ─── hook: one write + wait ────────────────────────────────────────────────────
function useTxn() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  return { writeContract, hash, isPending, isConfirming, isSuccess, error, reset };
}

// ─── tabs ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "kyc" | "tokens" | "compliance";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "Overview",   icon: <Building2 size={15} /> },
  { id: "kyc",        label: "KYC / Identity", icon: <Users size={15} /> },
  { id: "tokens",     label: "Token Ops",  icon: <Coins size={15} /> },
  { id: "compliance", label: "Compliance", icon: <Settings size={15} /> },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { address, isConnected, chain } = useAccount();
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const isWrongNetwork = isConnected && chain?.id !== MANTLE_SEPOLIA_CHAIN_ID;

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
  }

  // ── global reads ─────────────────────────────────────────────────────────────
  const { data: globalData, refetch } = useReadContracts({
    contracts: [
      { address: TOKEN,    abi: TokenABI,            functionName: "paused" },
      { address: TOKEN,    abi: TokenABI,            functionName: "totalSupply" },
      { address: TOKEN,    abi: TokenABI,            functionName: "propertyInfo" },
      { address: TOKEN,    abi: TokenABI,            functionName: "totalRentDistributed" },
      { address: COMPLY,   abi: ComplianceABI,       functionName: "holderCount" },
      { address: COMPLY,   abi: ComplianceABI,       functionName: "maxHolders" },
      { address: COMPLY,   abi: ComplianceABI,       functionName: "minInvestmentIDR" },
      { address: COMPLY,   abi: ComplianceABI,       functionName: "lockUpPeriod" },
      { address: COMPLY,   abi: ComplianceABI,       functionName: "maxHoldingPercent" },
      { address: REGISTRY, abi: IdentityRegistryABI, functionName: "getAllUsers" },
      { address: TOKEN,    abi: TokenABI,            functionName: "isAgent", args: address ? [address] : undefined },
      { address: REGISTRY, abi: IdentityRegistryABI, functionName: "isAgent", args: address ? [address] : undefined },
    ],
    query: { enabled: !!address && !isWrongNetwork },
  });

  const paused        = globalData?.[0]?.result  as boolean | undefined;
  const totalSupply   = globalData?.[1]?.result  as bigint  | undefined;
  const propertyInfo  = globalData?.[2]?.result  as readonly [string,string,string,bigint,bigint,bigint,bigint,boolean] | undefined;
  const totalRent     = globalData?.[3]?.result  as bigint  | undefined;
  const holderCount   = globalData?.[4]?.result  as bigint  | undefined;
  const maxHolders    = globalData?.[5]?.result  as bigint  | undefined;
  const minInvest     = globalData?.[6]?.result  as bigint  | undefined;
  const lockUp        = globalData?.[7]?.result  as bigint  | undefined;
  const maxHoldPct    = globalData?.[8]?.result  as bigint  | undefined;
  const allUsers      = globalData?.[9]?.result  as readonly `0x${string}`[] | undefined;
  const isTokenAgent  = globalData?.[10]?.result as boolean | undefined;
  const isKycAgent    = globalData?.[11]?.result as boolean | undefined;

  const [propName,,, appraisedValue,,, expectedYieldBps, isLiquidated] = propertyInfo ?? [];

  const supplyFormatted = totalSupply ? parseFloat((Number(totalSupply) / 1e18).toFixed(4)) : 0;

  // ─── OVERVIEW ──────────────────────────────────────────────────────────────
  function OverviewTab() {
    const stats = [
      { label: "Total Supply",     value: `${supplyFormatted.toLocaleString()} PROP`, sub: propName ?? "—" },
      { label: "Token Holders",    value: holderCount?.toString() ?? "—",              sub: `max ${maxHolders?.toString() ?? "—"}` },
      { label: "Rent Distributed", value: totalRent ? `${(Number(totalRent)/1e18).toFixed(4)} MNT` : "0 MNT", sub: "all-time" },
      { label: "Appraised Value",  value: appraisedValue ? formatIDR(appraisedValue) : "—", sub: `${(Number(expectedYieldBps ?? 0n)/100).toFixed(2)}% yield` },
    ];

    return (
      <div className="space-y-6">
        {/* stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-2 text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* contract status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-sm text-slate-700 mb-4">Contract Status</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1">Token Contract</p>
              <StatusBadge ok={!paused} label={paused ? "Paused" : "Active"} />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Property</p>
              <StatusBadge ok={!isLiquidated} label={isLiquidated ? "Liquidated" : "Active"} />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Your Token Agent Role</p>
              <StatusBadge ok={!!isTokenAgent} label={isTokenAgent ? "Authorized" : "Not Agent"} />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Your KYC Agent Role</p>
              <StatusBadge ok={!!isKycAgent} label={isKycAgent ? "Authorized" : "Not Agent"} />
            </div>
          </div>
        </div>

        {/* addresses */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-sm text-slate-700 mb-4">Deployed Contracts</h3>
          <div className="space-y-3 text-sm font-mono">
            {[
              { label: "SPV Token",          addr: TOKEN },
              { label: "Identity Registry",  addr: REGISTRY },
              { label: "Compliance Module",  addr: COMPLY },
            ].map(c => (
              <div key={c.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-500 font-sans text-xs">{c.label}</span>
                <span className="text-slate-800 text-xs">{c.addr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── KYC TAB ───────────────────────────────────────────────────────────────
  function KycTab() {
    const [investorAddr, setInvestorAddr] = useState("");
    const [identityAddr, setIdentityAddr] = useState("");
    const [countryCode, setCountryCode]   = useState("360");
    const [checkAddr, setCheckAddr]       = useState("");
    const [lookupResult, setLookupResult] = useState<{ verified: boolean; country: number } | null>(null);

    const register = useTxn();
    const remove   = useTxn();

    const { writeContract: lookupCall, data: lookupHash } = useWriteContract();

    // check verification
    const { data: lookupData } = useReadContracts({
      contracts: [
        { address: REGISTRY, abi: IdentityRegistryABI, functionName: "isVerified",      args: isAddress(checkAddr) ? [checkAddr as `0x${string}`] : undefined },
        { address: REGISTRY, abi: IdentityRegistryABI, functionName: "investorCountry", args: isAddress(checkAddr) ? [checkAddr as `0x${string}`] : undefined },
      ],
      query: { enabled: isAddress(checkAddr) },
    });

    const verifiedResult = lookupData?.[0]?.result as boolean | undefined;
    const countryResult  = lookupData?.[1]?.result as number  | undefined;

    useEffect(() => {
      if (verifiedResult !== undefined) {
        setLookupResult({ verified: verifiedResult, country: countryResult ?? 0 });
      }
    }, [verifiedResult, countryResult]);

    useEffect(() => { if (register.isSuccess) { showToast("Investor registered", "success"); refetch(); register.reset(); } }, [register.isSuccess]);
    useEffect(() => { if (remove.isSuccess)   { showToast("Identity removed", "success");    refetch(); remove.reset();   } }, [remove.isSuccess]);

    return (
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Register */}
        <ActionCard title="Register Investor" icon={<UserPlus size={16} />}>
          <Input label="Investor Wallet Address" placeholder="0x…" value={investorAddr} onChange={e => setInvestorAddr(e.target.value)} />
          <Input label="OnchainID Address (use investor address for testnet)" placeholder="0x…" value={identityAddr} onChange={e => setIdentityAddr(e.target.value)} />
          <Input label="Country Code (ISO 3166 numeric)" placeholder="360" value={countryCode} onChange={e => setCountryCode(e.target.value)} />
          <TxButton
            label="Register Identity"
            pendingLabel={register.isConfirming ? "Confirming…" : "Signing…"}
            pending={register.isPending || register.isConfirming}
            variant="primary"
            disabled={!isAddress(investorAddr) || !isAddress(identityAddr) || !countryCode}
            onClick={() => register.writeContract({
              address: REGISTRY,
              abi: IdentityRegistryABI,
              functionName: "registerIdentity",
              args: [investorAddr as `0x${string}`, identityAddr as `0x${string}`, Number(countryCode)],
            })}
          />
        </ActionCard>

        {/* Remove */}
        <ActionCard title="Remove Identity" icon={<UserMinus size={16} />}>
          <Input label="Investor Wallet Address" placeholder="0x…" value={investorAddr} onChange={e => setInvestorAddr(e.target.value)} />
          <p className="text-xs text-slate-400">This will delete the investor's on-chain identity record. They will no longer be able to receive or transfer tokens.</p>
          <TxButton
            label="Remove Identity"
            pendingLabel={remove.isConfirming ? "Confirming…" : "Signing…"}
            pending={remove.isPending || remove.isConfirming}
            variant="danger"
            disabled={!isAddress(investorAddr)}
            onClick={() => remove.writeContract({
              address: REGISTRY,
              abi: IdentityRegistryABI,
              functionName: "deleteIdentity",
              args: [investorAddr as `0x${string}`],
            })}
          />
        </ActionCard>

        {/* Lookup */}
        <ActionCard title="Verify Investor Status" icon={<ShieldCheck size={16} />}>
          <Input label="Wallet Address to Check" placeholder="0x…" value={checkAddr} onChange={e => { setCheckAddr(e.target.value); setLookupResult(null); }} />
          {lookupResult && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Verified</span>
                <StatusBadge ok={lookupResult.verified} label={lookupResult.verified ? "Yes" : "No"} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Country Code</span>
                <span className="font-mono text-slate-800">{lookupResult.country}</span>
              </div>
            </div>
          )}
          {!isAddress(checkAddr) && checkAddr.length > 0 && (
            <p className="text-xs text-red-500">Invalid address</p>
          )}
        </ActionCard>

        {/* Registered Investors */}
        <ActionCard title="Registered Investors" icon={<Users size={16} />}>
          <div className="text-2xl font-bold text-slate-900">{allUsers?.length ?? 0}</div>
          <p className="text-xs text-slate-400">addresses in IdentityRegistry</p>
          {allUsers && allUsers.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {allUsers.map(u => (
                <div key={u} className="font-mono text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 truncate">{u}</div>
              ))}
            </div>
          )}
        </ActionCard>

      </div>
    );
  }

  // ─── TOKEN OPS TAB ─────────────────────────────────────────────────────────
  function TokenOpsTab() {
    const [mintTo, setMintTo]         = useState("");
    const [mintAmt, setMintAmt]       = useState("");
    const [burnFrom, setBurnFrom]     = useState("");
    const [burnAmt, setBurnAmt]       = useState("");
    const [freezeAddr, setFreezeAddr] = useState("");
    const [ftFrom, setFtFrom]         = useState("");
    const [ftTo, setFtTo]             = useState("");
    const [ftAmt, setFtAmt]           = useState("");
    const [rentAmt, setRentAmt]       = useState("");

    const mint   = useTxn();
    const burn   = useTxn();
    const pause  = useTxn();
    const freeze = useTxn();
    const ft     = useTxn();
    const rent   = useTxn();

    useEffect(() => { if (mint.isSuccess)   { showToast(`Minted ${mintAmt} PROP to ${mintTo.slice(0,8)}…`, "success");  refetch(); mint.reset();   } }, [mint.isSuccess]);
    useEffect(() => { if (burn.isSuccess)   { showToast("Tokens burned", "success");   refetch(); burn.reset();   } }, [burn.isSuccess]);
    useEffect(() => { if (pause.isSuccess)  { showToast(paused ? "Unpaused" : "Paused", "success"); refetch(); pause.reset();  } }, [pause.isSuccess]);
    useEffect(() => { if (freeze.isSuccess) { showToast("Address frozen", "success");  refetch(); freeze.reset(); } }, [freeze.isSuccess]);
    useEffect(() => { if (ft.isSuccess)     { showToast("Forced transfer complete", "success"); refetch(); ft.reset(); } }, [ft.isSuccess]);
    useEffect(() => { if (rent.isSuccess)   { showToast("Rent deposited", "success");  refetch(); rent.reset();   } }, [rent.isSuccess]);

    return (
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Pause / Unpause */}
        <ActionCard title="Pause Control" icon={paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}>
          <div className="flex items-center gap-3">
            <StatusBadge ok={!paused} label={paused ? "Paused" : "Active"} />
            <p className="text-xs text-slate-400">
              {paused ? "Token is paused — all transfers blocked." : "Token is live — transfers allowed."}
            </p>
          </div>
          <TxButton
            label={paused ? "Unpause Token" : "Pause Token"}
            pendingLabel="Confirming…"
            pending={pause.isPending || pause.isConfirming}
            variant={paused ? "success" : "warning"}
            disabled={false}
            onClick={() => pause.writeContract({ address: TOKEN, abi: TokenABI, functionName: paused ? "unpause" : "pause" })}
          />
        </ActionCard>

        {/* Mint */}
        <ActionCard title="Mint Tokens" icon={<Coins size={16} />}>
          <Input label="Recipient Address" placeholder="0x…" value={mintTo} onChange={e => setMintTo(e.target.value)} />
          <Input label="Amount (PROP)" placeholder="100" type="number" value={mintAmt} onChange={e => setMintAmt(e.target.value)} />
          <TxButton
            label="Mint"
            pendingLabel={mint.isConfirming ? "Confirming…" : "Signing…"}
            pending={mint.isPending || mint.isConfirming}
            variant="success"
            disabled={!isAddress(mintTo) || !mintAmt || Number(mintAmt) <= 0}
            onClick={() => mint.writeContract({
              address: TOKEN, abi: TokenABI, functionName: "mint",
              args: [mintTo as `0x${string}`, parseUnits(mintAmt, 18)],
            })}
          />
        </ActionCard>

        {/* Burn */}
        <ActionCard title="Burn Tokens" icon={<XCircle size={16} />}>
          <Input label="Holder Address" placeholder="0x…" value={burnFrom} onChange={e => setBurnFrom(e.target.value)} />
          <Input label="Amount (PROP)" placeholder="100" type="number" value={burnAmt} onChange={e => setBurnAmt(e.target.value)} />
          <TxButton
            label="Burn"
            pendingLabel={burn.isConfirming ? "Confirming…" : "Signing…"}
            pending={burn.isPending || burn.isConfirming}
            variant="danger"
            disabled={!isAddress(burnFrom) || !burnAmt || Number(burnAmt) <= 0}
            onClick={() => burn.writeContract({
              address: TOKEN, abi: TokenABI, functionName: "burn",
              args: [burnFrom as `0x${string}`, parseUnits(burnAmt, 18)],
            })}
          />
        </ActionCard>

        {/* Freeze Address */}
        <ActionCard title="Freeze Address" icon={<Lock size={16} />}>
          <Input label="Address to Freeze" placeholder="0x…" value={freezeAddr} onChange={e => setFreezeAddr(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <TxButton
              label="Freeze"
              pendingLabel="Signing…"
              pending={freeze.isPending || freeze.isConfirming}
              variant="warning"
              disabled={!isAddress(freezeAddr)}
              onClick={() => freeze.writeContract({
                address: TOKEN, abi: TokenABI, functionName: "setAddressFrozen",
                args: [freezeAddr as `0x${string}`, true],
              })}
            />
            <TxButton
              label="Unfreeze"
              pendingLabel="Signing…"
              pending={freeze.isPending || freeze.isConfirming}
              variant="ghost"
              disabled={!isAddress(freezeAddr)}
              onClick={() => freeze.writeContract({
                address: TOKEN, abi: TokenABI, functionName: "setAddressFrozen",
                args: [freezeAddr as `0x${string}`, false],
              })}
            />
          </div>
        </ActionCard>

        {/* Forced Transfer */}
        <ActionCard title="Forced Transfer" icon={<ArrowRightLeft size={16} />}>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
            Regulatory action — bypasses compliance checks.
          </p>
          <Input label="From Address" placeholder="0x…" value={ftFrom} onChange={e => setFtFrom(e.target.value)} />
          <Input label="To Address" placeholder="0x…" value={ftTo} onChange={e => setFtTo(e.target.value)} />
          <Input label="Amount (PROP)" placeholder="100" type="number" value={ftAmt} onChange={e => setFtAmt(e.target.value)} />
          <TxButton
            label="Execute Forced Transfer"
            pendingLabel={ft.isConfirming ? "Confirming…" : "Signing…"}
            pending={ft.isPending || ft.isConfirming}
            variant="danger"
            disabled={!isAddress(ftFrom) || !isAddress(ftTo) || !ftAmt || Number(ftAmt) <= 0}
            onClick={() => ft.writeContract({
              address: TOKEN, abi: TokenABI, functionName: "forcedTransfer",
              args: [ftFrom as `0x${string}`, ftTo as `0x${string}`, parseUnits(ftAmt, 18)],
            })}
          />
        </ActionCard>

        {/* Deposit Rent */}
        <ActionCard title="Deposit Rent" icon={<Banknote size={16} />}>
          <p className="text-xs text-slate-400">Send MNT to the contract for distribution to all token holders proportionally.</p>
          <Input label="Amount (MNT)" placeholder="0.1" type="number" value={rentAmt} onChange={e => setRentAmt(e.target.value)} />
          <TxButton
            label="Deposit Rent"
            pendingLabel={rent.isConfirming ? "Confirming…" : "Signing…"}
            pending={rent.isPending || rent.isConfirming}
            variant="success"
            disabled={!rentAmt || Number(rentAmt) <= 0}
            onClick={() => rent.writeContract({
              address: TOKEN, abi: TokenABI, functionName: "depositRent",
              value: parseEther(rentAmt),
            })}
          />
        </ActionCard>

      </div>
    );
  }

  // ─── COMPLIANCE TAB ────────────────────────────────────────────────────────
  function ComplianceTab() {
    const [newMaxHolders, setNewMaxHolders]   = useState("");
    const [newMinInvest, setNewMinInvest]     = useState("");
    const [newLockUp, setNewLockUp]           = useState("");
    const [newMaxPct, setNewMaxPct]           = useState("");
    const [whitelistAddr, setWhitelistAddr]   = useState("");
    const [countryCode, setCountryCode]       = useState("");

    const holders   = useTxn();
    const invest    = useTxn();
    const lockup    = useTxn();
    const pct       = useTxn();
    const whitelist = useTxn();
    const country   = useTxn();

    useEffect(() => { if (holders.isSuccess)   { showToast("Max holders updated", "success");       refetch(); holders.reset();   } }, [holders.isSuccess]);
    useEffect(() => { if (invest.isSuccess)    { showToast("Min investment updated", "success");    refetch(); invest.reset();    } }, [invest.isSuccess]);
    useEffect(() => { if (lockup.isSuccess)    { showToast("Lock-up period updated", "success");    refetch(); lockup.reset();    } }, [lockup.isSuccess]);
    useEffect(() => { if (pct.isSuccess)       { showToast("Max holding % updated", "success");     refetch(); pct.reset();       } }, [pct.isSuccess]);
    useEffect(() => { if (whitelist.isSuccess) { showToast("Whitelist updated", "success");         refetch(); whitelist.reset(); } }, [whitelist.isSuccess]);
    useEffect(() => { if (country.isSuccess)   { showToast("Country restriction updated","success");refetch(); country.reset();   } }, [country.isSuccess]);

    return (
      <div className="space-y-4">

        {/* current values */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-sm text-slate-700 mb-4">Current Parameters</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Max Holders",      value: maxHolders?.toString() ?? "—" },
              { label: "Current Holders",  value: holderCount?.toString() ?? "—" },
              { label: "Min Investment",   value: minInvest ? `Rp ${Number(minInvest).toLocaleString("id-ID")}` : "—" },
              { label: "Lock-up Period",   value: lockUp ? `${lockUp.toString()}s` : "—" },
              { label: "Max Holding %",    value: maxHoldPct ? `${(Number(maxHoldPct)/100).toFixed(2)}%` : "—" },
            ].map(p => (
              <div key={p.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{p.label}</p>
                <p className="font-semibold text-slate-900 mt-1">{p.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">

          <ActionCard title="Max Holders" icon={<Users size={16} />}>
            <Input label="New Max Holders" placeholder="300" type="number" value={newMaxHolders} onChange={e => setNewMaxHolders(e.target.value)} />
            <TxButton label="Update" pendingLabel="Confirming…" pending={holders.isPending || holders.isConfirming} variant="primary"
              disabled={!newMaxHolders || Number(newMaxHolders) <= 0}
              onClick={() => holders.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setMaxHolders", args: [BigInt(newMaxHolders)] })}
            />
          </ActionCard>

          <ActionCard title="Minimum Investment (IDR)" icon={<Banknote size={16} />}>
            <Input label="Amount in IDR (integer)" placeholder="1000000" type="number" value={newMinInvest} onChange={e => setNewMinInvest(e.target.value)} />
            <TxButton label="Update" pendingLabel="Confirming…" pending={invest.isPending || invest.isConfirming} variant="primary"
              disabled={!newMinInvest || Number(newMinInvest) <= 0}
              onClick={() => invest.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setMinInvestment", args: [BigInt(newMinInvest)] })}
            />
          </ActionCard>

          <ActionCard title="Lock-up Period (seconds)" icon={<Lock size={16} />}>
            <Input label="Seconds" placeholder="7776000 (90 days)" type="number" value={newLockUp} onChange={e => setNewLockUp(e.target.value)} />
            <p className="text-xs text-slate-400">90 days = 7,776,000 · 1 year = 31,536,000</p>
            <TxButton label="Update" pendingLabel="Confirming…" pending={lockup.isPending || lockup.isConfirming} variant="primary"
              disabled={!newLockUp}
              onClick={() => lockup.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setLockUpPeriod", args: [BigInt(newLockUp)] })}
            />
          </ActionCard>

          <ActionCard title="Max Holding Percent (bps)" icon={<ShieldCheck size={16} />}>
            <Input label="Basis points (100 = 1%)" placeholder="2000" type="number" value={newMaxPct} onChange={e => setNewMaxPct(e.target.value)} />
            <TxButton label="Update" pendingLabel="Confirming…" pending={pct.isPending || pct.isConfirming} variant="primary"
              disabled={!newMaxPct || Number(newMaxPct) <= 0}
              onClick={() => pct.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setMaxHoldingPercent", args: [BigInt(newMaxPct)] })}
            />
          </ActionCard>

          <ActionCard title="Whitelist Address" icon={<CheckCircle2 size={16} />}>
            <Input label="Address" placeholder="0x…" value={whitelistAddr} onChange={e => setWhitelistAddr(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <TxButton label="Whitelist" pendingLabel="Signing…" pending={whitelist.isPending || whitelist.isConfirming} variant="success"
                disabled={!isAddress(whitelistAddr)}
                onClick={() => whitelist.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setWhitelisted", args: [whitelistAddr as `0x${string}`, true] })}
              />
              <TxButton label="Remove" pendingLabel="Signing…" pending={whitelist.isPending || whitelist.isConfirming} variant="ghost"
                disabled={!isAddress(whitelistAddr)}
                onClick={() => whitelist.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setWhitelisted", args: [whitelistAddr as `0x${string}`, false] })}
              />
            </div>
          </ActionCard>

          <ActionCard title="Country Restriction" icon={<AlertTriangle size={16} />}>
            <Input label="Country Code (ISO 3166 numeric)" placeholder="840 (US)" type="number" value={countryCode} onChange={e => setCountryCode(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <TxButton label="Restrict" pendingLabel="Signing…" pending={country.isPending || country.isConfirming} variant="danger"
                disabled={!countryCode}
                onClick={() => country.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setCountryRestriction", args: [Number(countryCode), true] })}
              />
              <TxButton label="Allow" pendingLabel="Signing…" pending={country.isPending || country.isConfirming} variant="ghost"
                disabled={!countryCode}
                onClick={() => country.writeContract({ address: COMPLY, abi: ComplianceABI, functionName: "setCountryRestriction", args: [Number(countryCode), false] })}
              />
            </div>
          </ActionCard>

        </div>
      </div>
    );
  }

  // ─── helper ────────────────────────────────────────────────────────────────
  function formatIDR(val: bigint): string {
    const n = Number(val);
    if (n >= 1_000_000_000_000) return `Rp ${(n / 1_000_000_000_000).toFixed(2)}T`;
    if (n >= 1_000_000_000)     return `Rp ${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000)         return `Rp ${(n / 1_000_000).toFixed(2)}M`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  }

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">IndoProperty</p>
              <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <div className="flex gap-2">
                {isTokenAgent && <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">SPV Manager</span>}
                {isKycAgent   && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">KYC Agent</span>}
              </div>
            )}
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* alerts */}
      <div className="max-w-7xl mx-auto px-6 pt-4 space-y-2">
        {isWrongNetwork && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-700 text-sm">
            <WifiOff size={14} />
            Switch to <strong className="mx-1">Mantle Sepolia</strong> (Chain ID: {MANTLE_SEPOLIA_CHAIN_ID}) to use the admin console.
          </div>
        )}
        {!isTokenAgent && !isKycAgent && isConnected && !isWrongNetwork && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
            <AlertTriangle size={14} />
            Connected wallet is not an authorized agent. Transactions will fail.
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {tab === "overview"   && <OverviewTab />}
        {tab === "kyc"        && <KycTab />}
        {tab === "tokens"     && <TokenOpsTab />}
        {tab === "compliance" && <ComplianceTab />}
      </main>

      {/* toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

    </div>
  );
}