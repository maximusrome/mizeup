import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MizeUp - Optimize Your Therapy Practice",
  description: "Stop leaving money on the table with hidden billing codes. Earn $500+ monthly while saving 3+ hours weekly on documentation.",
  metadataBase: new URL('https://www.mizeup.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "MizeUp - Optimize Your Therapy Practice",
    description: "Stop leaving money on the table with hidden billing codes. Earn $500+ monthly while saving 3+ hours weekly on documentation.",
    url: 'https://www.mizeup.com',
    siteName: 'MizeUp',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}