import Watchlist from "@/components/Watchlist";
import StockWatchlist from "@/components/StockWatchlist";
import ForexWatchlist from "@/components/ForexWatchlist";
import PositionTracker from "@/components/PositionTracker";
import FloatingNews from "@/components/FloatingNews";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingAIChat from "@/components/FloatingAIChat";
import MarketScanner from "@/components/MarketScanner";
import CommandPalette from "@/components/CommandPalette";

export default function Home() {
  return (
    <main
      className="min-h-screen p-6 md:p-10"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}
    >
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">
              Trading Intelligence Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              Alat bantu analisis rule-based, bukan nasihat keuangan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="hidden sm:inline text-[11px] px-2 py-1 rounded-md"
              style={{ color: "var(--text-faint)", border: "1px solid var(--border-card)" }}
            >
              Tekan <kbd className="font-mono">⌘K</kbd> buat cari cepat
            </span>
            <ThemeToggle />
          </div>
        </header>

        <MarketScanner />

        <Watchlist />
        <StockWatchlist />
        <ForexWatchlist />

        <section>
          <PositionTracker />
        </section>

        <footer
          className="mt-8 text-xs pt-4 flex flex-col gap-2"
          style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-card)" }}
        >
          <p>
            Educational project oleh Daffa. Bukan nasihat keuangan. Semua
            sinyal bersifat rule-based. DYOR (Do Your Own Research).
          </p>
          <p>
            Made by{" "}
            <span style={{ color: "var(--text-tertiary)" }}>
              Daffa Novendra Aditama
            </span>{" "}
            —{" "}
            <a
              href="https://s.id/Portofolio-Daffa_Novendra_Aditama"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
            >
              Portfolio
            </a>{" "}
            ·{" "}
            <a
              href="https://github.com/Tama260"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>

      <FloatingNews />
      <FloatingAIChat />
      <CommandPalette />
    </main>
  );
}
