import type { Metadata } from 'next';
import './globals.css';
import { MuiThemeProvider } from './components/MuiThemeProvider';

export const metadata: Metadata = {
  title: 'PlayCanvas VRM Viewer',
  description: 'VRM キャラクターに VRMA アニメーションをランタイムで差し替えるビューア',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <MuiThemeProvider>{children}</MuiThemeProvider>
      </body>
    </html>
  );
}
