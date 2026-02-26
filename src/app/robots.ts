import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/c/', '/api/', '/admin/', '/payment/', '/forgot-password/', '/sdjgfoiwureouDKJF23467324659283_12431354252sdgfhjso/'],
      },
      // AI crawlers - explicitly allowed for GEO (Generative Engine Optimization)
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'CCBot',
        allow: '/',
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
      },
    ],
    sitemap: 'https://www.moonely.ru/sitemap.xml',
  }
}
