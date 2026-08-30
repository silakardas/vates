import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { StoryProvider } from "@/lib/StoryContext";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsModalProvider } from "@/lib/SettingsModalContext";
import FeedbackWidget from "@/components/FeedbackWidget";
import SettingsModal from "@/components/SettingsModal";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vates-six.vercel.app"),
  title: "Vates — Writing Atelier",
  description: "A daily-prompt writing space for fiction and fanfic writers. No account needed to start.",
  keywords: ["fanfiction", "creative writing", "writing prompts", "daily writing challenge", "fiction writing app"],
  openGraph: {
    title: "Vates — Writing Atelier",
    description: "A daily-prompt writing space for fiction and fanfic writers. No account needed to start.",
    url: "https://vates-six.vercel.app",
    siteName: "Vates",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vates — Writing Atelier",
    description: "A daily-prompt writing space for fiction and fanfic writers. No account needed to start.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <StoryProvider>
            <SettingsModalProvider>
              {children}
              <FeedbackWidget />
              <SettingsModal />
            </SettingsModalProvider>
          </StoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}