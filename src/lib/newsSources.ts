// Sumber RSS publik gratis, tidak butuh API key. Dipilih dari media yang
// menyediakan feed RSS resmi untuk syndication (bukan scraping).
export const NEWS_SOURCES: { name: string; url: string; category: string }[] = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    category: "crypto",
  },
  {
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    category: "crypto",
  },
  {
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    category: "crypto",
  },
  {
    name: "Investing.com",
    url: "https://www.investing.com/rss/news.rss",
    category: "market",
  },
];
