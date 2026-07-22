import Watchlist from "@/components/Watchlist";
import StockWatchlist from "@/components/StockWatchlist";
import ForexWatchlist from "@/components/ForexWatchlist";
import PositionTracker from "@/components/PositionTracker";
import FloatingNews from "@/components/FloatingNews";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingAIChat from "@/components/FloatingAIChat";

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
            <ThemeToggle />
          </div>
        </header>

        <Watchlist />
        <StockWatchlist />
        <ForexWatchlist />

        <section>
          <PositionTracker />
        </section>

        <footer
          className="mt-8 text-xs pt-4"
          style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-card)" }}
        >
          Educational project oleh Daffa. Bukan nasihat keuangan. Semua
          sinyal bersifat rule-based. DYOR (Do Your Own Research).
        </footer>
      </div>

      <FloatingNews />
      <FloatingAIChat />
    </main>
  );
}
