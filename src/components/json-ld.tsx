export default function JsonLd() {
  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Moonely",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "url": "https://www.moonely.ru",
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "0",
      "highPrice": "2990",
      "priceCurrency": "RUB",
      "offerCount": "4"
    },
    "description": "Конструктор сайтов на базе искусственного интеллекта. Опишите идею словами — получите готовый профессиональный сайт за 60 секунд. Не нужно уметь программировать или разбираться в дизайне.",
    "applicationSubCategory": "Конструктор сайтов для бизнеса",
    "featureList": [
      "Готовый сайт за 60 секунд",
      "Не требует навыков программирования",
      "Профессиональный дизайн автоматически",
      "Кинематографические анимации и эффекты",
      "Публикация сайта в один клик",
      "Скачивание проекта без ограничений",
      "Полная поддержка русского языка",
      "Оплата российскими картами"
    ],
    "screenshot": "https://www.moonely.ru/opengraph-image.png",
    "softwareVersion": "1.0",
    "author": {
      "@type": "Organization",
      "name": "Moonely",
      "url": "https://www.moonely.ru"
    }
  }

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Moonely",
    "url": "https://www.moonely.ru",
    "logo": "https://www.moonely.ru/opengraph-image.png",
    "description": "Сервис для создания сайтов и веб-приложений с помощью искусственного интеллекта",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "selenium.studio.web@gmail.com",
      "contactType": "customer support",
      "availableLanguage": ["Russian", "English"]
    },
    "sameAs": []
  }

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Moonely",
    "url": "https://www.moonely.ru",
    "description": "Создайте профессиональный сайт за 60 секунд. Опишите идею — искусственный интеллект сделает всё остальное. Без программирования и дизайнеров.",
    "inLanguage": "ru-RU",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.moonely.ru/templates?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  )
}
