import Link from "next/link";
import { industries } from "@/lib/industries";
import { Metadata } from "next";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Готовые шаблоны сайтов для любой ниши",
  description: "Выберите категорию бизнеса и получите профессиональный сайт за 60 секунд. Более 50 направлений: кафе, салоны красоты, юристы, фитнес и другие.",
  openGraph: {
    title: "Шаблоны сайтов Moonely — 50+ ниш для бизнеса",
    description: "Готовые решения для кафе, магазинов, салонов, стартапов и других направлений. Сайт за минуту.",
  },
};

export default function TemplatesIndexPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <main className="flex-1 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold text-white mb-4 text-center">
            Каталог шаблонов
          </h1>
          <p className="text-xl text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Выберите категорию, и искусственный интеллект создаст для вас уникальный сайт за 1 минуту.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.entries(industries).map(([slug, data]) => (
              <Link 
                key={slug} 
                href={`/templates/${slug}`}
                className="group block p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all hover:border-white/20"
              >
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors mb-2">
                  {data.title.charAt(0).toUpperCase() + data.title.slice(1)}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {data.prompt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer className="bg-[#0A0A0A] border-t border-white/10" />
    </div>
  );
}
