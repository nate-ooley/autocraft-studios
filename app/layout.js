import { Poppins, Nunito } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
});

export const metadata = {
  title: 'AutoCraft Studios — Short-Form Video That Sells',
  description:
    'Done-for-you short-form video production for TikTok, Reels, and Shorts. Packages from $300. Video drives discovery, trust, and sales — we craft it for you.',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
