"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Newspaper, Calendar, X } from "lucide-react";
import { NewsAdminPanel } from "@/components/news-admin-panel";
import { useAnalytics } from "@/hooks/use-analytics";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image: string | null;
  published: boolean;
  createdAt: string;
}

interface NewsGridProps {
  items: NewsItem[];
  isAdmin?: boolean;
}

// Format date to Russian locale
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Truncate text with ellipsis
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function NewsGrid({ items: initialItems, isAdmin = false }: NewsGridProps) {
  const [items, setItems] = useState(initialItems);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const { trackClick } = useAnalytics();

  // Callback to add new news item to list
  const handleNewsCreated = (newItem: NewsItem) => {
    setItems([newItem, ...items]);
  };

  // Callback to update news item in list
  const handleNewsUpdated = (updatedItem: NewsItem) => {
    setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  // Callback to delete news item from list
  const handleNewsDeleted = (deletedId: string) => {
    setItems(items.filter(item => item.id !== deletedId));
  };

  // If no news and not admin, don't render anything
  if (items.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <>
      {/* News Section */}
      <div className="relative w-[calc(100%-2rem)] md:w-[85%] lg:w-[80%] mx-auto bg-zinc-950/85 backdrop-blur-sm rounded-[2.5rem] mt-8">
        <section className="w-full px-6 md:px-10 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Новости
              </h2>
              <p className="text-zinc-400 text-base md:text-lg">
                Последние обновления и новости Moonely
              </p>
            </div>

            {/* Admin Panel */}
            {isAdmin && (
              <NewsAdminPanel 
                initialNews={items}
                onNewsCreated={handleNewsCreated}
                onNewsUpdated={handleNewsUpdated}
                onNewsDeleted={handleNewsDeleted}
              />
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">Пока нет новостей</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  onClick={() => { trackClick("news_article_open"); setSelectedItem(item); }}
                  className="group cursor-pointer bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 flex flex-col md:flex-row"
                >
                  {/* Image */}
                  {item.image && (
                    <div className="relative w-full md:w-64 lg:w-80 aspect-[16/9] md:aspect-auto md:min-h-[160px] overflow-hidden shrink-0">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 flex-1">
                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <time dateTime={item.createdAt}>
                        {formatDate(item.createdAt)}
                      </time>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Preview */}
                    <p className="text-sm text-zinc-400 line-clamp-3">
                      {truncateText(item.content, 300)}
                    </p>

                    {/* Read more link */}
                    <div className="mt-3 text-sm font-medium text-orange-400 group-hover:text-orange-300 transition-colors">
                      Читать далее →
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Full Article Modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent
          className="!max-w-none w-[98vw] md:w-[65vw] lg:w-[50vw] max-h-[90vh] overflow-y-auto p-0 bg-zinc-950 border-zinc-800 rounded-xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <article className="flex flex-col">
              {/* Close Button */}
              <button
                onClick={() => { trackClick("news_article_close"); setSelectedItem(null); }}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Hero Image */}
              {selectedItem.image && (
                <div className="relative w-full aspect-[21/9] overflow-hidden">
                  <Image
                    src={selectedItem.image}
                    alt={selectedItem.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                </div>
              )}

              {/* Article Content */}
              <div className="p-6 md:p-8">
                {/* Date */}
                <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={selectedItem.createdAt}>
                    {formatDate(selectedItem.createdAt)}
                  </time>
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
                  {selectedItem.title}
                </h1>

                {/* Content */}
                <div className="prose prose-invert prose-zinc max-w-none">
                  {selectedItem.content.split("\n").map((paragraph, idx) => (
                    <p key={idx} className="text-zinc-300 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
