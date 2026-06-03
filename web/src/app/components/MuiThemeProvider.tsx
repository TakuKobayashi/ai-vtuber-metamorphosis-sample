'use client';

import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import type { ReactNode } from 'react';

// MUI をダークテーマで統一する
// これにより Select・Dialog・Typography 等の文字色が
// 暗い背景でも白系になって見えるようになる
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export function MuiThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
