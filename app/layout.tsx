import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from './providers';

export const metadata: Metadata = {
  title: 'OmniConnect: Copilot Connector Gateway & Dev Workbench',
  description:
    'Production architecture for Microsoft 365 Copilot Connectors: Semantic Retrieval vs Agent Actions, RLS data trimming, OAuth write gatekeeping, and PostHog observability.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased font-sans">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
