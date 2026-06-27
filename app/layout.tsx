import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "RoboDesk Learning Portal",
  description: "A state-of-the-art interactive docs reader and editor featuring Mermaid, raw HTML embeds, syntax highlighting, and live rendering.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RoboDesk Docs",
  },
};

export const viewport = {
  themeColor: "#00f2fe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}

