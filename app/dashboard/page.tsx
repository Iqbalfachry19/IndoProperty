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
} from "lucide-react";

import { Button } from "@/app/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="flex-1 text-black bg-slate-50 min-h-screen">
      {/* Header */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-8 py-8 flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <p className="text-sm text-slate-500">Welcome back 👋</p>

            <h1 className="text-4xl font-bold mt-2">Investor Dashboard</h1>

            <p className="text-slate-500 mt-2">
              Manage your Indonesian Real Estate Security Tokens.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline">Connect Wallet</Button>

            <Button className="bg-red-600 hover:bg-red-700">
              Browse Properties
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Portfolio Value</p>

                  <h2 className="text-3xl font-bold mt-2">Rp 2.45B</h2>

                  <p className="text-green-600 text-sm mt-2">+12.5%</p>
                </div>

                <Wallet className="text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Properties</p>

                  <h2 className="text-3xl font-bold mt-2">4</h2>

                  <p className="text-slate-500 text-sm mt-2">Active SPVs</p>
                </div>

                <Building2 className="text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Rental Yield</p>

                  <h2 className="text-3xl font-bold mt-2">9.8%</h2>

                  <p className="text-green-600 text-sm mt-2">Annual</p>
                </div>

                <TrendingUp className="text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Compliance</p>

                  <h2 className="text-2xl font-bold mt-2">Verified</h2>

                  <p className="text-green-600 text-sm mt-2">ERC-3643</p>
                </div>

                <ShieldCheck className="text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* Portfolio */}

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-[350px] rounded-xl border border-dashed flex items-center justify-center text-slate-400">
                Portfolio Chart Empty
                <br />
              </div>
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

                <p className="font-medium mt-2 break-all">0x7B2...91Fd</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Network</p>

                <p className="font-medium mt-2">Ethereum Sepolia</p>
              </div>

              <Button className="w-full">View Wallet</Button>
            </CardContent>
          </Card>
        </div>

        {/* Holdings */}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>My Holdings</CardTitle>
          </CardHeader>

          <CardContent>
            <table className="w-full">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-3">Property</th>

                  <th>Tokens</th>

                  <th>Value</th>

                  <th>Yield</th>

                  <th></th>
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    name: "Transpark Juanda",
                    value: "Rp 750M",
                    token: "75",
                    yield: "9.2%",
                  },
                  {
                    name: "BSD Office Tower",
                    value: "Rp 600M",
                    token: "60",
                    yield: "8.8%",
                  },
                  {
                    name: "Bali Villa",
                    value: "Rp 1.1B",
                    token: "110",
                    yield: "11.1%",
                  },
                ].map((item) => (
                  <tr key={item.name} className="border-b hover:bg-slate-50">
                    <td className="py-5 font-medium">{item.name}</td>

                    <td>{item.token}</td>

                    <td>{item.value}</td>

                    <td className="text-green-600">{item.yield}</td>

                    <td>
                      <Button variant="ghost" size="sm">
                        <ArrowUpRight size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Bottom */}

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <Coins className="text-red-600" />

                  <div>
                    <p className="font-medium">Purchased Tokens</p>

                    <p className="text-sm text-slate-500">Transpark Juanda</p>
                  </div>
                </div>

                <span>Today</span>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-3">
                  <Activity className="text-blue-600" />

                  <div>
                    <p className="font-medium">Rental Yield Received</p>

                    <p className="text-sm text-slate-500">Rp 2,500,000</p>
                  </div>
                </div>

                <span>Yesterday</span>
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

              <Button variant="outline">Claim Yield</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
