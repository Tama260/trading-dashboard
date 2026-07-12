import Watchlist from "@/components/Watchlist";
import PositionTracker from "@/components/PositionTracker";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">
            Trading Intelligence Dashboard
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Alat bantu analisis rule-based, bukan nasihat keuangan.
          </p>
        </header>

        <Watchlist />

        <section>
          <PositionTracker />
        </section>

        <footer className="mt-8 text-xs text-neutral-600 border-t border-neutral-900 pt-4">
          Educational project oleh Daffa. Bukan nasihat keuangan. Semua
          sinyal bersifat rule-based. DYOR (Do Your Own Research).
        </footer>
      </div>
    </main>
  );
}
