import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from './providers';

export const metadata: Metadata = {
  title: 'AskWell — Enterprise Knowledge Search AI Assistant',
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
        <footer className="border-t border-slate-800/80 px-4 sm:px-6 py-5 text-center text-[11px] leading-relaxed text-slate-500">
          <p className="max-w-3xl mx-auto">
            <strong className="text-slate-400">Demo with fictional data.</strong> Every company, person, document,
            figure and incident in this app is invented for illustration and has nothing to do with any real company or
            real user. The personas are sample roles, and their profile photos are stock images.
          </p>
        </footer>
      </body>
    </html>
  );
}
