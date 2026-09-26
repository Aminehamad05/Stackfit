import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
