import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlayCanvas VRM Viewer',
  description: 'VRM キャラクターに VRMA アニメーションをランタイムで差し替えるビューア',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
