"use client";

import { WalletBalance } from "@/components/balance";
import { Chat } from "@/components/chat";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function ChatPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#0B0C0E] selection:bg-[#00F29B]/30 text-white font-sans">
      {/* Background Glows */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-[#00F29B]/10 blur-[120px] rounded-[100%] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[1200px] mx-auto w-full border-x border-white/10 min-h-screen flex flex-col pt-8 pb-8 px-4 sm:px-8">
        
        <header className="flex flex-col sm:flex-row items-center justify-between w-full z-10 gap-4 mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="inline-flex items-center justify-center text-[#00F29B]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Signal</span>
          </Link>
          
          <div className="flex flex-wrap items-center justify-center gap-4 p-1.5 rounded-2xl bg-[#16171B] border border-white/10 backdrop-blur-md">
            <div className="hover:scale-105 transition-transform duration-300">
              {/* Wallet button overridden via globals or its own styles. 
                  We'll just pass some inline styles to make it fit better if possible. */}
              <WalletMultiButton style={{ backgroundColor: '#00F29B', color: '#000', borderRadius: '12px', height: '40px', fontWeight: 'bold' }} />
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
            <div className="pr-3 text-white font-medium">
              <WalletBalance />
            </div>
          </div>
        </header>
        
        <div className="w-full z-10 flex-1 flex flex-col max-w-5xl mx-auto h-[calc(100vh-12rem)]">
          <Chat />
        </div>
      </div>
    </div>
  );
}
