import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "GestionFormation",
  description: "Plateforme de gestion de formation, quiz et certification",
};

// ===== TELEPHONE : viewport correct, sinon tout est zoomé / coupé =====
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh w-full overflow-x-hidden bg-[#f1f5f9] font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}