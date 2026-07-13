import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { StoryProvider } from "@/lib/StoryContext";
import { AuthProvider } from "@/lib/AuthContext";
import FeedbackWidget from "@/components/FeedbackWidget";
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
  title: "Vates — Writing Atelier",
  description: "A personal writing space for fiction and fanfic writers.",
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
            {children}
            <FeedbackWidget />
          </StoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
