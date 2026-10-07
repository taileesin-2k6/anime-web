import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Suspense } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AniStore - Web Xem & Lưu Trữ Anime Cá Nhân',
  description: 'Trang web lưu trữ và phát trực tuyến các bộ anime yêu thích qua Google Drive với giao diện mượt mà trên mọi thiết bị.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className="h-full dark">
      <body 
        suppressHydrationWarning 
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-[#0b0d13] text-gray-100 antialiased selection:bg-rose-500 selection:text-white`}
      >
        <Suspense fallback={<div className="h-16 bg-[#0f1117]" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
