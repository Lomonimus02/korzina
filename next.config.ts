import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Отключаем строгий режим (мы это уже делали, но проверим)
  reactStrictMode: false,
  
  // 2. ВАЖНО: Заставляем Next.js правильно обрабатывать Sandpack
  transpilePackages: ["@codesandbox/sandpack-react"],
  
  // 3. Для Докера
  output: "standalone",
  
  // 4. Разрешаем ngrok для dev режима
  allowedDevOrigins: ["https://cantonal-rosario-feckly.ngrok-free.dev"],

  // 4. Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },

  // 5. Разрешаем изображения из Yandex Object Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.storage.yandexcloud.net",
      },
    ],
  },
};

export default nextConfig;