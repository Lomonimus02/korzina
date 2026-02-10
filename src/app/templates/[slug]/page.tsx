import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { Footer } from "@/components/footer";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industryData = industries[slug];
  
  if (!industryData) {
    return {
      title: "Moonely Templates",
    };
  }

  return {
    title: `Сайт ${industryData.title} — создайте за 60 секунд`,
    description: `Профессиональный сайт ${industryData.title} без программирования. Опишите идею — получите готовый результат с дизайном и текстами.`,
    alternates: {
      canonical: `https://www.moonely.ru/templates/${slug}`,
    },
    openGraph: {
      title: `Сайт ${industryData.title} за 60 секунд`,
      description: `Создайте профессиональный сайт ${industryData.title} с помощью ИИ. Без навыков дизайна и программирования.`,
    }
  };
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const industryData = industries[slug];

  if (!industryData) {
    notFound();
  }

  const { title, prompt, faq } = industryData;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] flex flex-col overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="flex-1 flex flex-col items-center justify-center relative px-4">
        {/* Gradient Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-orange-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-4xl w-full py-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Создать сайт <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">{title}</span>
          </h1>
          
          <p className="text-xl text-white/60 max-w-2xl">
            Сгенерируйте профессиональный сайт {title} за секунды. 
            Без программирования и дизайнеров.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link href={`/new?q=${encodeURIComponent(prompt)}`}>
              <Button size="lg" className="text-lg px-8 h-14 bg-white text-black hover:bg-white/90">
                Создать бесплатно <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="relative z-10 w-full max-w-3xl py-16">
          <h2 className="text-3xl font-bold text-center mb-10 text-white">Частые вопросы</h2>
          <div className="space-y-6">
            {faq.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors">
                <h3 className="text-xl font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-white/70">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer className="bg-[#0A0A0A] border-t-0" />
    </div>
  );
}
