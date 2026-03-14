import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AuthSessionProvider from "@/components/session-provider";
import JsonLd from "@/components/json-ld";
import { YandexMetrika } from "@/components/yandex-metrika";
import { AnalyticsPageTracker } from "@/components/analytics/page-tracker";
import { Suspense } from "react";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://moonely.ru'),
  title: {
    default: "Moonely — Создайте сайт за 60 секунд с помощью ИИ",
    template: "%s | Moonely — Конструктор сайтов на ИИ",
  },
  description: "Опишите идею — получите готовый профессиональный сайт за минуту. Без программирования и дизайнеров. Просто расскажите, что вам нужно, и искусственный интеллект создаст всё за вас.",
  applicationName: "Moonely",
  keywords: [
    "создать сайт бесплатно",
    "сайт за минуту",
    "конструктор сайтов",
    "сделать лендинг",
    "сайт для бизнеса",
    "нейросеть сайт",
    "AI веб-дизайн",
    "сайт без программирования",
    "создать сайт онлайн",
    "генератор сайтов",
    "конструктор без кода",
    "сайт своими руками",
  ],
  robots: "index, follow",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon-32x32.png", color: "#4c1d95" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Moonely — Создайте сайт за 60 секунд",
    description: "Расскажите ИИ о своей идее и получите готовый профессиональный сайт. Без навыков программирования.",
    url: "https://www.moonely.ru",
    siteName: "Moonely",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "https://www.moonely.ru/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Moonely — Конструктор сайтов на ИИ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moonely — Создайте сайт за 60 секунд",
    description: "Опишите идею — получите готовый сайт. Без программирования.",
    images: ["https://www.moonely.ru/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Favicon meta tags for search engines (Yandex, Google) */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="msapplication-TileColor" content="#4c1d95" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="theme-color" content="#4c1d95" />
        
        {/* Global script to suppress react-error-overlay from Sandpack */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function hideErrorOverlay() {
                  var elements = document.querySelectorAll('iframe, div');
                  elements.forEach(function(el) {
                    var style = window.getComputedStyle(el);
                    var zIndex = parseInt(style.zIndex || '0');
                    if (zIndex > 2147483600 && style.position === 'fixed') {
                      el.style.display = 'none';
                      el.style.visibility = 'hidden';
                      if (el.parentNode) el.parentNode.removeChild(el);
                    }
                  });
                }
                
                // Watch for new elements
                var observer = new MutationObserver(function(mutations) {
                  hideErrorOverlay();
                });
                
                if (document.body) {
                  observer.observe(document.body, { childList: true, subtree: true });
                } else {
                  document.addEventListener('DOMContentLoaded', function() {
                    observer.observe(document.body, { childList: true, subtree: true });
                  });
                }
                
                setInterval(hideErrorOverlay, 200);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div
          style={{
            position: "fixed",
            zIndex: -1,
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), #030303",
          }}
        />
        <JsonLd />
        <YandexMetrika />
        <Suspense fallback={null}>
          <AnalyticsPageTracker />
        </Suspense>
        <AuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
