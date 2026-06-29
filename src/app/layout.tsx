import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeInitializer } from "@/components/layout/ThemeInitializer";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Job Search Command Center",
  description: "Track applications, contacts, and weekly job search goals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
