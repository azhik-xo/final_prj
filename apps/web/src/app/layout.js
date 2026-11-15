import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'GlucoGuard — Intelligent Glucose Monitoring Simulation',
  description: 'AI-Powered Continuous Glucose Monitoring & Intelligent Emergency Response System (Simulation Prototype)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased bg-slate-50 text-slate-900">
        {/* Mandatory Clinical Simulation Disclaimer Banner */}
        <header className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-semibold tracking-wide shadow-sm flex items-center justify-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-950 animate-pulse" />
          <span>
            SIMULATION MODE ACTIVE — Educational & Research Prototype Only. Not a Medical Device. No Clinical Prescriptions or Real Emergency Dispatches.
          </span>
        </header>

        {/* Global Navigation Header */}
        <nav className="border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-[33px] z-40">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg shadow-sm">
                G
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">GlucoGuard</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Simulation
                </span>
              </div>
            </Link>

            {/* Nav Route Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link 
                href="/" 
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
              >
                Patient Dashboard
              </Link>
              <Link 
                href="/simulation" 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Simulation Lab
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a 
              href="https://github.com/azhik-xo/final_prj" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub Repo</span>
            </a>
          </div>
        </nav>

        {/* Main Application Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
          <p>
            GlucoGuard Final-Year Engineering Simulation Project &copy; {new Date().getFullYear()}. All telemetry generated synthetically.
          </p>
        </footer>
      </body>
    </html>
  );
}
