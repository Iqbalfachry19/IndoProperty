import { Button } from "@/app/components/ui/Button";

export default function IndoPropertyWebsite() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="IndoProperty Logo"
              className="h-8 w-auto"
            />
            <span className="text-lg font-bold text-slate-800">
              IndoProperty
            </span>
          </div>

          <nav className="hidden md:flex gap-6 text-sm text-slate-600">
            <a href="#" className="hover:text-slate-900">
              Home
            </a>
            <a href="#" className="hover:text-slate-900">
              About
            </a>
            <a href="#" className="hover:text-slate-900">
              How It Works
            </a>
            <a href="#" className="hover:text-slate-900">
              Properties
            </a>
            <a href="#" className="hover:text-slate-900">
              Contact
            </a>
          </nav>
          <Button className="bg-red-600 hover:bg-red-700">Launch App</Button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1549692520-acc6669e2f0c')",
        }}
      >
        <div className="bg-black/50">
          <div className="max-w-7xl mx-auto px-6 py-28 text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tokenizing Indonesian Real Estate
            </h1>
            <p className="mb-8 text-lg">
              Fractional Ownership of Real Estate with ERC-3643 Compliance.
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-red-600 hover:bg-red-700">
                Get Started
              </Button>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-slate-900"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 px-6 text-center">
          <div>
            <h3 className="font-semibold">Compliant & Secure</h3>
            <p className="text-sm text-slate-600">
              Built with regulatory-first design
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Fractional Ownership</h3>
            <p className="text-sm text-slate-600">
              Accessible real estate investing
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Built on ERC-3643</h3>
            <p className="text-sm text-slate-600">
              Institutional-grade security token
            </p>
          </div>
        </div>
      </section>

      {/* Featured Property */}
      <section className="py-16 bg-slate-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-6">
            Featured Property: Transpark Juanda Bekasi
          </h2>
          <img
            src="https://images.unsplash.com/photo-1590650046871-92c887180603"
            alt="Transpark Juanda"
            className="rounded-xl shadow mb-6"
          />
          <p className="mb-6 text-slate-600">
            Invest in Prime Bekasi Real Estate
          </p>
          <Button className="bg-red-600 hover:bg-red-700">View Details</Button>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-10">
            Invest in Indonesian Real Estate on the Blockchain
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold">KYC Verified Users</h3>
              <p className="text-sm text-slate-600">
                On-chain identity verification
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Secure Transactions</h3>
              <p className="text-sm text-slate-600">
                ERC-3643 compliant transfers
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Earn Real Yield</h3>
              <p className="text-sm text-slate-600">
                Rental & asset-backed returns
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-6 text-sm">
        © 2025 IndoProperty. All rights reserved.
      </footer>
    </div>
  );
}
