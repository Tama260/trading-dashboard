import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { NEWS_SOURCES } from "@/lib/newsSources";

const parser = new Parser({
  timeout: 8000, // jangan biarkan 1 feed lambat bikin semua nunggu lama
});

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
};

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  const sources = category
    ? NEWS_SOURCES.filter((s) => s.category === category)
    : NEWS_SOURCES;

  try {
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const feed = await parser.parseURL(source.url);
          return (feed.items || []).map(
            (item): NewsItem => ({
              title: item.title || "(tanpa judul)",
              link: item.link || "",
              source: source.name,
              pubDate: item.isoDate || item.pubDate || "",
              // Snippet dari RSS feed itu sendiri — ringkasan resmi yang
              // memang disediakan penerbit untuk syndication, BUKAN hasil
              // scraping artikel penuh
              snippet: (item.contentSnippet || "").slice(0, 200),
            })
          );
        } catch {
          // 1 sumber gagal (timeout/down) — jangan gagalkan semuanya
          return [];
        }
      })
    );

    const allNews = results
      .flat()
      .filter((n) => n.title && n.link)
      .sort(
        (a, b) =>
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      )
      .slice(0, 40);

    return NextResponse.json({ news: allNews });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil berita" },
      { status: 502 }
    );
  }
}
