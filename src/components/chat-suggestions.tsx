"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  LayoutDashboard,
  ShoppingBag,
  Briefcase,
  Globe,
  Calculator,
  FileText,
  MessageSquare,
  CloudSun,
  CheckSquare,
  Music,
  TrendingUp,
  Utensils,
  Activity,
  Plane,
  GraduationCap,
  Sparkles
} from "lucide-react";

interface ChatSuggestionsProps {
  onSelect: (text: string) => void;
  className?: string;
  buttonClassName?: string;
}

const SUGGESTIONS_DATA = [
  {
    label: "CRM Дашборд",
    prompt: "Создай современный CRM дашборд с боковой панелью, графиками данных используя recharts и таблицей пользователей. Используй темную тему.",
    icon: LayoutDashboard
  },
  {
    label: "Интернет-магазин",
    prompt: "Создай минималистичную страницу товара для интернет-магазина с галереей изображений, отображением цены и кнопкой добавления в корзину.",
    icon: ShoppingBag
  },
  {
    label: "Сайт-портфолио",
    prompt: "Разработай сайт личного портфолио с главным экраном, сеткой проектов и формой контактов. Используй темную эстетику.",
    icon: Briefcase
  },
  {
    label: "SaaS Лендинг",
    prompt: "Создай лендинг с высокой конверсией для SaaS продукта с закрепленным хедером, секцией преимуществ и карточками тарифов.",
    icon: Globe
  },
  {
    label: "Ипотечный калькулятор",
    prompt: "Создай ипотечный калькулятор, который принимает сумму кредита, процентную ставку и срок, и отображает ежемесячный платеж.",
    icon: Calculator
  },
  {
    label: "Главная блога",
    prompt: "Создай главную страницу блога с избранным постом, сеткой недавних статей и фильтром по категориям.",
    icon: FileText
  },
  {
    label: "Чат-приложение",
    prompt: "Создай интерфейс чата в реальном времени с боковой панелью контактов и основной областью сообщений.",
    icon: MessageSquare
  },
  {
    label: "Погода",
    prompt: "Создай дашборд погоды, показывающий текущие условия и прогноз на 5 дней, используя чистый макет с карточками.",
    icon: CloudSun
  },
  {
    label: "Менеджер задач",
    prompt: "Создай менеджер задач в стиле Канбан с колонками 'Нужно сделать', 'В процессе' и 'Готово' и возможностью перетаскивания.",
    icon: CheckSquare
  },
  {
    label: "Музыкальный плеер",
    prompt: "Создай интерфейс музыкального плеера с обложкой альбома, элементами управления воспроизведением и списком воспроизведения.",
    icon: Music
  },
  {
    label: "Крипто трекер",
    prompt: "Создай дашборд криптовалют, показывающий цены в реальном времени, график торгов и сводку портфеля.",
    icon: TrendingUp
  },
  {
    label: "Книга рецептов",
    prompt: "Создай приложение с рецептами, строкой поиска, карточками рецептов с изображениями и детальным просмотром ингредиентов.",
    icon: Utensils
  },
  {
    label: "Фитнес трекер",
    prompt: "Создай дашборд для отслеживания фитнеса с кольцами активности, историей тренировок и графиками прогресса.",
    icon: Activity
  },
  {
    label: "Бронирование путешествий",
    prompt: "Создай интерфейс поиска для бронирования путешествий с вводом пункта назначения, выбором дат и списком результатов.",
    icon: Plane
  },
  {
    label: "Онлайн курс",
    prompt: "Создай интерфейс просмотра курса для платформы онлайн-обучения с видеоплеером, списком уроков и индикатором прогресса.",
    icon: GraduationCap
  }
];

export function ChatSuggestions({ onSelect, className, buttonClassName }: ChatSuggestionsProps) {
  const { trackClick } = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<typeof SUGGESTIONS_DATA>([]);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    // Rotate every hour, showing 3 items
    const startIndex = (hour * 3) % SUGGESTIONS_DATA.length;
    
    const selected = [];
    for (let i = 0; i < 3; i++) {
      selected.push(SUGGESTIONS_DATA[(startIndex + i) % SUGGESTIONS_DATA.length]);
    }
    
    setCurrentSuggestions(selected);
  }, []);

  if (!mounted) {
    return null; // Or a skeleton if preferred
  }

  return (
    <div className={cn("flex flex-row flex-wrap items-center justify-center gap-2 mt-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200", className)}>
      {currentSuggestions.map((item, index) => {
        const Icon = item.icon;
        return (
          <Button
            key={index}
            variant="outline"
            onClick={() => { trackClick("suggestion_click"); onSelect(item.prompt); }}
            className={cn(
              "rounded-full h-auto py-2 px-4 text-xs sm:text-sm font-normal cursor-pointer",
              "bg-black/5 dark:bg-white/5",
              "border-black/5 dark:border-white/10",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-black/10 dark:hover:bg-white/10",
              "hover:border-black/10 dark:hover:border-white/20",
              "transition-all duration-300",
              buttonClassName
            )}
          >
            <Icon className="w-3 h-3 mr-2 text-orange-400/80" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
