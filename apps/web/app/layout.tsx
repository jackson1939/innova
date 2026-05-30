import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fundares Recycling Platform',
  description: 'Plataforma digital de gestión de reciclaje',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
