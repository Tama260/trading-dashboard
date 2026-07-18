import type { Metadata } from "next";
import "./globals.css";
import { AnalysisContextProvider } from "@/lib/analysisContext";

export const metadata: Metadata = {
  title: "Trading Intelligence Dashboard",
  description: "Portfolio project — dashboard analisis trading rule-based",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AnalysisContextProvider>{children}</AnalysisContextProvider>
      </body>
    </html>
  );
}
