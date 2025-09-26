import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ==========================================================================
// FONT CONFIGURATION
// ==========================================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ==========================================================================
// METADATA CONFIGURATION
// ==========================================================================

export const metadata: Metadata = {
  title: "MizeUp - Maximize Insurance Reimbursement for Therapists",
  description: "MizeUp helps solo practice therapists streamline insurance billing, reduce administrative burden, and focus on what matters most - your patients. Maximize your reimbursement rates today.",
  keywords: [
    "therapy billing",
    "insurance reimbursement", 
    "therapist practice management",
    "solo practice",
    "healthcare billing software",
    "automated billing",
    "therapy practice revenue"
  ],
  authors: [{ name: "MizeUp" }],
  creator: "MizeUp",
  publisher: "MizeUp",
  openGraph: {
    title: "MizeUp - Maximize Insurance Reimbursement for Therapists",
    description: "Streamline insurance billing and reduce administrative burden for solo practice therapists. Focus on what matters most - your patients.",
    type: "website",
    siteName: "MizeUp",
  },
  twitter: {
    card: "summary_large_image",
    title: "MizeUp - Maximize Insurance Reimbursement for Therapists",
    description: "Streamline insurance billing and reduce administrative burden for solo practice therapists.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ==========================================================================
// LAYOUT COMPONENT
// ==========================================================================

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}