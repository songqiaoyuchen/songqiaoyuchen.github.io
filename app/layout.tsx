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
  title: 'Song\'s Site',
  description: 'Song\'s Site.',
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
