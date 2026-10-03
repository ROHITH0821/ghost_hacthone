import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { PrivacyAwareAnalytics } from "@/components/layout/PrivacyAwareAnalytics";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { getSession } from "@/lib/auth";
import { normalizeAccessStatus } from "@/lib/db/users";
import { copy } from "@/lib/copy";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  keywords: [...copy.meta.keywords],
  icons: {
    icon: "/ghost-logo.png",
    apple: "/ghost-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const initialUser = session
    ? {
        id: session.userId,
        email: session.email,
        accessStatus: normalizeAccessStatus(session.accessStatus),
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} relative min-h-screen bg-paper text-ink antialiased`}
      >
        <a href="#main-content" className="skip-link">Skip to content</a>
        <SiteBackground />
        <div className="relative z-10">
          <PreferencesProvider><AuthProvider initialUser={initialUser}>{children}</AuthProvider></PreferencesProvider>
        </div>
        <PrivacyAwareAnalytics />
      </body>
    </html>
  );
}
