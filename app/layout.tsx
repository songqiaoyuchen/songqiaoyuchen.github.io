import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const krypton = localFont({
  src: "../public/fonts/monospace_krypton.ttf",
  variable: "--font-krypton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Site",
  description: "Personal Site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${krypton.variable} h-full antialiased`}
    >
      <body className={`${krypton.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
