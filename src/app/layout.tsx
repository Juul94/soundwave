import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { InstallGate } from "@/components/InstallGate";
import { I18nProvider } from "@/components/I18n";
import { getLang, getT } from "@/i18n/server";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  return {
  title: { default: "Soundwave", template: "%s · Soundwave" },
  description: (await getT()).description,
  applicationName: "Soundwave",
  appleWebApp: { capable: true, title: "Soundwave", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider lang={lang}>
          {children}
          <RegisterSW />
          <InstallGate />
        </I18nProvider>
      </body>
    </html>
  );
}
