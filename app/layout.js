import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'MaksPay — Crypto Payment Platform',
  description: 'MaksPay payment gateway with fee management, network control, and 2FA.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
