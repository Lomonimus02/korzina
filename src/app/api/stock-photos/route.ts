import { NextRequest, NextResponse } from "next/server";

// Pexels API - бесплатный, работает в России
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

// Маппинг категорий на поисковые запросы для Pexels
const CATEGORY_QUERIES: Record<string, string> = {
  abstract: "abstract gradient colorful background",
  tech: "technology computer laptop coding modern",
  business: "business office meeting teamwork professional",
  lifestyle: "people happy lifestyle friends group",
  minimal: "minimal architecture interior white clean",
  food: "food coffee restaurant dish gourmet",
  nature: "nature landscape mountains forest beautiful",
  travel: "travel city urban architecture modern",
  fashion: "fashion style portrait model elegant",
  health: "health fitness wellness sports active",
  education: "education study learning books university",
  ecommerce: "shopping retail products store modern",
};

// Fallback фото если API недоступен (проверенные работающие URL)
const FALLBACK_PHOTOS: Record<string, string[]> = {
  abstract: [
    "https://images.pexels.com/photos/3109807/pexels-photo-3109807.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2693212/pexels-photo-2693212.png?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  tech: [
    "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  business: [
    "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  lifestyle: [
    "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/708440/pexels-photo-708440.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  minimal: [
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1668860/pexels-photo-1668860.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  food: [
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
};

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const category = searchParams.get("category") || "abstract";
  const query = searchParams.get("query") || "";
  const count = parseInt(searchParams.get("count") || "5", 10);

  // Определяем поисковый запрос
  const searchQuery = query || CATEGORY_QUERIES[category] || CATEGORY_QUERIES.abstract;

  // Если нет API ключа, возвращаем fallback
  if (!PEXELS_API_KEY) {
    console.warn("PEXELS_API_KEY not configured, using fallback photos");
    const fallbackCategory = FALLBACK_PHOTOS[category] || FALLBACK_PHOTOS.abstract;
    const photos = fallbackCategory.slice(0, count).map((url, index) => ({
      id: `fallback-${index}`,
      url,
      alt: `${category} image ${index + 1}`,
      photographer: "Pexels",
    }));
    
    return NextResponse.json({ 
      success: true, 
      photos,
      source: "fallback"
    });
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
        // Кэшируем на 1 час
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data: PexelsResponse = await response.json();

    const photos = data.photos.map((photo) => ({
      id: photo.id.toString(),
      url: photo.src.large, // Используем large для хорошего качества
      alt: photo.alt || `Photo by ${photo.photographer}`,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
    }));

    return NextResponse.json({
      success: true,
      photos,
      source: "pexels",
      total: data.total_results,
    });
  } catch (error) {
    console.error("Pexels API error:", error);
    
    // Fallback при ошибке
    const fallbackCategory = FALLBACK_PHOTOS[category] || FALLBACK_PHOTOS.abstract;
    const photos = fallbackCategory.slice(0, count).map((url, index) => ({
      id: `fallback-${index}`,
      url,
      alt: `${category} image ${index + 1}`,
      photographer: "Pexels",
    }));
    
    return NextResponse.json({ 
      success: true, 
      photos,
      source: "fallback"
    });
  }
}

// POST для динамического поиска по произвольному запросу
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, count = 5 } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    if (!PEXELS_API_KEY) {
      // Возвращаем случайные fallback фото при отсутствии API ключа
      const allFallbacks = Object.values(FALLBACK_PHOTOS).flat();
      const shuffled = allFallbacks.sort(() => 0.5 - Math.random());
      const photos = shuffled.slice(0, count).map((url, index) => ({
        id: `fallback-${index}`,
        url,
        alt: `Image ${index + 1}`,
        photographer: "Pexels",
      }));
      
      return NextResponse.json({ 
        success: true, 
        photos,
        source: "fallback"
      });
    }

    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data: PexelsResponse = await response.json();

    const photos = data.photos.map((photo) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      alt: photo.alt || `Photo by ${photo.photographer}`,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
    }));

    return NextResponse.json({
      success: true,
      photos,
      source: "pexels",
      total: data.total_results,
    });
  } catch (error) {
    console.error("Pexels API error:", error);
    
    return NextResponse.json(
      { success: false, error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
