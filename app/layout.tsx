import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
// ✅ Import the new provider
import AuthProvider from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ROSCA - Rotating Savings & Credit Association",
    template: "%s | ROSCA",
  },
  description:
    "A modern platform for managing rotating savings groups with trust, transparency, and community.",
  keywords: [
    "savings",
    "ROSCA",
    "chit fund",
    "community finance",
    "rotating savings",
  ],
  authors: [{ name: "ROSCA Team" }],
  creator: "ROSCA System",
  publisher: "ROSCA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/Images/rosca_logo.png",
    apple: "/Images/rosca_logo.png",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    title: "ROSCA - Modern Savings Platform",
    description:
      "Manage your rotating savings groups with ease and transparency",
    siteName: "ROSCA",
    images: [
      {
        url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "ROSCA Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ROSCA - Modern Savings Platform",
    description:
      "Manage your rotating savings groups with ease and transparency",
    images: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    ],
    creator: "@rosca",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-text`}>
        {/* ✅ Wrap content in AuthProvider */}
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                color: "#111827",
                border: "1px solid #E5E7EB",
              },
              success: {
                iconTheme: {
                  primary: "#10B981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#EF4444",
                  secondary: "#fff",
                },
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
