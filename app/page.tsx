import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#0B0C0E] selection:bg-[#00F29B]/30 text-white font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-[#00F29B]/10 blur-[120px] rounded-[100%] pointer-events-none" />
      
      {/* Container with continuous side borders to mimic Cryptix grid style */}
      <div className="max-w-[1200px] mx-auto w-full border-x border-white/10 min-h-screen flex flex-col">
        
        {/* Navbar */}
        <nav className="w-full border-b border-white/10 bg-[#0B0C0E]/80 backdrop-blur-md z-50 sticky top-0">
          <div className="px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Lightning Bolt Icon */}
              <div className="inline-flex items-center justify-center text-[#00F29B]">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Signal</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#9C9FA8]">
              <Link href="#" className="hover:text-white transition-colors">Agents</Link>
              <Link href="#" className="hover:text-white transition-colors">How it works</Link>
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/chat" className="rounded-full bg-transparent border border-white/20 text-white px-6 py-2.5 text-sm font-semibold hover:bg-white/5 transition-all duration-300">
                Launch App
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1 flex flex-col w-full">
          
          {/* Hero Section */}
          <section className="w-full py-24 md:py-32 px-6 flex flex-col items-center text-center border-b border-white/10 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#16171B] border border-white/10 text-sm font-medium text-[#9C9FA8] mb-8">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} className="w-4 h-4 text-[#00F29B]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <span className="ml-2">Signal Agent V1 is live on Solana</span>
            </div>
            
            <h1 className="text-5xl md:text-[5.5rem] font-bold tracking-tight mb-6 max-w-4xl leading-[1.05] text-white font-display">
              The Premium Solana Agent Platform.
            </h1>
            
            <p className="text-lg md:text-xl text-[#9C9FA8] max-w-2xl mb-12 font-medium leading-relaxed">
              Signal is an autonomous DeFi agent that continuously analyzes Solana protocols to execute the most profitable yield strategies for your portfolio.
            </p>
            
            <div className="flex justify-center relative">
              <div className="absolute inset-0 bg-[#00F29B]/20 blur-xl rounded-full pointer-events-none" />
              <Link href="/chat" className="relative rounded-full bg-[#00F29B] px-10 py-4 text-lg font-bold text-black hover:bg-[#00e599] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center">
                Get started now
              </Link>
            </div>
          </section>

          {/* Dashboard Mockup Section */}
          <section className="w-full py-24 px-8 border-b border-white/10 relative">
            <div className="max-w-4xl mx-auto relative rounded-3xl border border-white/10 bg-[#16171B] shadow-2xl p-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00F29B]/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#0B0C0E]">
                {/* Header */}
                <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#121316]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="text-sm font-medium text-[#9C9FA8]">Portfolio Dashboard</div>
                  <div className="w-10"></div>
                </div>
                
                {/* Content */}
                <div className="p-8 h-[450px] flex flex-col md:flex-row gap-8">
                  {/* Left Column: Balance & Swap */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="text-[#9C9FA8] text-sm mb-1">Total Balance</div>
                      <div className="text-4xl font-bold text-white">$124,592.45</div>
                      <div className="text-[#00F29B] text-sm font-medium mt-1">+12.5% this month</div>
                    </div>
                    
                    <div className="p-5 rounded-2xl bg-[#16171B] border border-white/5 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white font-medium">Quick Swap</span>
                      </div>
                      <div className="bg-[#0B0C0E] rounded-xl p-3 border border-white/5 flex justify-between items-center">
                        <div>
                          <div className="text-[#9C9FA8] text-xs">Pay with</div>
                          <div className="text-white font-medium">42.5 USDC</div>
                        </div>
                        <div className="px-3 py-1 bg-[#16171B] rounded-lg text-sm">USDC</div>
                      </div>
                      <div className="bg-[#0B0C0E] rounded-xl p-3 border border-white/5 flex justify-between items-center">
                        <div>
                          <div className="text-[#9C9FA8] text-xs">Get</div>
                          <div className="text-white font-medium">0.24 SOL</div>
                        </div>
                        <div className="px-3 py-1 bg-[#16171B] rounded-lg text-sm">SOL</div>
                      </div>
                      <button className="w-full py-3 rounded-xl bg-[#00F29B] text-black font-bold text-sm hover:bg-[#00e599]">
                        Execute Swap
                      </button>
                    </div>
                  </div>
                  
                  {/* Right Column: Assets */}
                  <div className="flex-1">
                    <div className="text-white font-medium mb-4">Recent Assets</div>
                    <div className="space-y-3">
                      {[
                        { name: "Solana", sym: "SOL", val: "$45,231", change: "+5.2%" },
                        { name: "Jito", sym: "JTO", val: "$12,400", change: "+12.4%" },
                        { name: "Jupiter", sym: "JUP", val: "$8,192", change: "-1.2%", down: true }
                      ].map(asset => (
                        <div key={asset.sym} className="flex justify-between items-center p-4 rounded-xl bg-[#16171B] border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0B0C0E] flex items-center justify-center font-bold text-xs">{asset.sym}</div>
                            <div>
                              <div className="text-white font-medium">{asset.name}</div>
                              <div className="text-[#9C9FA8] text-xs">{asset.sym}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{asset.val}</div>
                            <div className={`text-xs font-medium ${asset.down ? 'text-red-400' : 'text-[#00F29B]'}`}>
                              {asset.change}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid Section (Why Choose Cryptix style) */}
          <section id="features" className="w-full flex flex-col md:flex-row border-b border-white/10">
            {/* Feature 1 */}
            <div className="flex-1 p-10 border-b md:border-b-0 md:border-r border-white/10 hover:bg-[#16171B]/50 transition-colors">
              <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-[#16171B]">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-display">Maximum Security</h3>
              <p className="text-[#9C9FA8] text-sm leading-relaxed">Built-in smart contract safety checks and exposure limits ensure your capital remains secure.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="flex-1 p-10 border-b md:border-b-0 md:border-r border-white/10 hover:bg-[#16171B]/50 transition-colors">
              <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-[#16171B]">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-display">Instant Transactions</h3>
              <p className="text-[#9C9FA8] text-sm leading-relaxed">Execute trades and yield strategies in milliseconds with Solana&apos;s high-throughput network.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="flex-1 p-10 hover:bg-[#16171B]/50 transition-colors">
              <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-[#16171B]">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-display">Optimized Yields</h3>
              <p className="text-[#9C9FA8] text-sm leading-relaxed">Our AI automatically routes your funds to the highest yielding pools while managing risk.</p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="w-full py-32 px-6 flex flex-col items-center text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 text-white max-w-2xl font-display">
              Ready to take control of your crypto?
            </h2>
            <div className="relative">
              <div className="absolute inset-0 bg-[#00F29B]/20 blur-xl rounded-full pointer-events-none" />
              <Link href="/chat" className="relative rounded-full bg-[#00F29B] px-10 py-4 text-lg font-bold text-black hover:bg-[#00e599] hover:scale-[1.02] transition-all duration-300 inline-block">
                Start Trading Now
              </Link>
            </div>
          </section>

        </main>
        
        {/* Footer */}
        <footer className="w-full border-t border-white/10 bg-[#0B0C0E]">
          <div className="flex flex-col md:flex-row p-12 gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center justify-center text-[#00F29B]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Signal</span>
              </div>
              <p className="text-[#9C9FA8] text-sm mb-6">The Premium Crypto Yield Platform.</p>
              <p className="text-[#9C9FA8] text-xs">© {new Date().getFullYear()} Signal Agent. All rights reserved.</p>
            </div>
            
            <div className="flex-1 flex gap-16">
              <div>
                <h4 className="text-white font-bold mb-4">Product</h4>
                <div className="flex flex-col gap-3 text-[#9C9FA8] text-sm">
                  <Link href="#" className="hover:text-white">Features</Link>
                  <Link href="#" className="hover:text-white">Pricing</Link>
                  <Link href="#" className="hover:text-white">Security</Link>
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold mb-4">Company</h4>
                <div className="flex flex-col gap-3 text-[#9C9FA8] text-sm">
                  <Link href="#" className="hover:text-white">About Us</Link>
                  <Link href="#" className="hover:text-white">Careers</Link>
                  <Link href="#" className="hover:text-white">Contact</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
