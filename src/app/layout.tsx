import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { PrivacyAwareAnalytics } from "@/components/layout/PrivacyAwareAnalytics";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { getSession } from "@/lib/auth";
import { normalizeAccessStatus } from "@/lib/db/users";
import { copy } from "@/lib/copy";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
  themeColor: "#101716",
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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} relative min-h-screen bg-midnight antialiased`}
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
