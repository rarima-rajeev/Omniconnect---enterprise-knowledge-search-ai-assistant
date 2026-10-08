import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from './providers';

export const metadata: Metadata = {
  title: 'OmniConnect — Enterprise Knowledge Search AI Assistant',
  description:
    'Ask questions across company documents with automated role-based permission controls.',
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
