import React from 'react';

const faqs = [
  {
    q: "Нужно ли уметь программировать?",
    a: "Нет, Moonely создан для тех, кто никогда не писал код. Просто опишите словами, какой сайт вам нужен — искусственный интеллект сам создаст дизайн, напишет тексты и соберёт всё в готовый продукт."
  },
  {
    q: "Как быстро я получу результат?",
    a: "Первая версия сайта готова через 60 секунд после вашего запроса. Вы можете сразу вносить правки, менять цвета, тексты и структуру — ИИ мгновенно применяет изменения."
  },
  {
    q: "Можно ли скачать готовый сайт?",
    a: "Да, вы получаете полностью готовый проект, который можно скачать одним архивом. Код чистый и профессиональный — его примет любой разработчик или хостинг."
  },
  {
    q: "Это платно?",
    a: "Есть бесплатный тариф — создавайте и редактируйте сайты без оплаты. Для скачивания проектов и расширенных возможностей доступен PRO тариф от 50₽ в месяц."
  },
  {
    q: "Где будет размещён мой сайт?",
    a: "Вы получаете готовый проект и сами решаете, где его разместить: на любом хостинге в России или за рубежом. Мы также предлагаем публикацию в один клик прямо из панели управления."
  },
  {
    q: "Какие способы оплаты доступны?",
    a: "Принимаем все российские банковские карты (Visa, Mastercard, МИР), оплату через SberPay и ЮMoney. Оплата безопасна и происходит через сертифицированные платёжные системы."
  }
];

export function LandingFaq() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  };

  return (
    <section className="py-24 px-4 relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-16">
          Частые вопросы
        </h2>
        <div className="grid gap-6">
          {faqs.map((item, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 hover:bg-white/10 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-3">{item.q}</h3>
              <p className="text-gray-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
