import type {Metadata} from 'next';
import localFont from 'next/font/local';
import {Nav} from '@/components/home/Nav';
import './globals.css';

const krypton = localFont({
  src: '../public/fonts/monospace_krypton.ttf',
  variable: '--font-krypton',
  display: 'swap',
});

export const metadata: Metadata = {
  description: 'Song\'s Site.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    description: 'A calm, atmospheric space for work, writing, art, and travel.',
    images: [
      {
        alt: 'SQYC Journal over a warm-gold topographic map',
        height: 909,
        url: '/og.png',
        width: 1732,
      },
    ],
    title: 'Song\'s Site',
    type: 'website',
  },
  title: 'Song\'s Site',
  twitter: {
    card: 'summary_large_image',
    description: 'A calm, atmospheric space for work, writing, art, and travel.',
    images: ['/og.png'],
    title: 'Song\'s Site',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${krypton.variable} h-full antialiased`} lang="en">
      <body className={`${krypton.className} flex min-h-full flex-col`}>
        {children}
        <Nav />
      </body>
    </html>
  );
}
