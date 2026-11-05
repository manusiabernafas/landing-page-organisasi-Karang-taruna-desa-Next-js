import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ORG_NAME, SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

const title = "Pemuda RW 05 Kwarasan — Basecamp Pemuda";
const description =
  "Website digital Pemuda RW 05 Kwarasan, Nogotirto, Gamping, Sleman untuk kegiatan, kas, inventaris, event, dan transparansi organisasi.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s · ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: ["Pemuda RW 05", "Kwarasan", "Nogotirto", "Gamping", "Sleman", "karang taruna", "kas pemuda", "kegiatan pemuda", "Yogyakarta"],
  authors: [{ name: ORG_NAME }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: SITE_NAME,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a14" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('basecamp-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${body.variable} h-full antialiased`} data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-text">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ classNames: { toast: "!rounded-2xl !font-sans" } }}
        />
      </body>
    </html>
  );
}
