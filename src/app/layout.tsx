import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "StudoWorldCup · Copa 2026 + Bolão",
    template: "%s · StudoWorldCup",
  },
  description:
    "Placar ao vivo, estatísticas de verdade e bolão com os amigos — a Copa do Mundo 2026 num lugar só.",
  keywords: ["Copa do Mundo 2026", "bolão", "palpites", "estatísticas", "futebol", "FIFA"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="app-bg min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
