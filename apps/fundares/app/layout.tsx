import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Fundares Recycling Platform',
    template: '%s | Fundares',
  },
  description:
    'Plataforma digital de gestión de reciclaje para empresas aliadas de Fundares. Rastrea recolecciones, mide impacto ambiental y genera reportes automáticos.',
  keywords: ['reciclaje', 'sostenibilidad', 'impacto ambiental', 'Fundares'],
  openGraph: {
    title: 'Fundares Recycling Platform',
    description: 'Gestión inteligente de reciclaje con IA',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
