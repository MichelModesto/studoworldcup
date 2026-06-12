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
  title: "StudoWorldCup · Copa do Mundo 2026",
  description:
    "Plataforma de estatísticas e análises da Copa do Mundo FIFA 2026 — México, Canadá e Estados Unidos.",
  keywords: ["Copa do Mundo 2026", "estatísticas", "futebol", "FIFA", "World Cup"],
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
