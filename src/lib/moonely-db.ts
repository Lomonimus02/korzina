// @/lib/moonely-db.ts
// Universal MoonelyDB Client - The "Universal Adapter"
// 
// Работает в двух режимах:
// 1. API Mode (Vercel Deploy) → NEXT_PUBLIC_MOONELY_API_URL есть → PostgreSQL через API
// 2. LocalStorage Mode (ZIP Export) → NEXT_PUBLIC_MOONELY_API_URL нет → localStorage/in-memory
//
// v3.0 - Simplified hybrid logic for Production VPS deployment

// ============= Type Definitions =============
interface DBResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

interface VirtualRecord<T = any> {
  id: string;
  chatId: string;
  collection: string;
  data: T;
  createdAt: string;
  updatedAt: string;
}

interface MoonelyDBConfig {
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;
}

type DBMode = 'API' | 'LOCAL_STORAGE';

// ============= Environment Helper =============
const getEnv = (key: string): string => {
  // @ts-ignore - process.env для Node/Next.js/CRA
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }
  // @ts-ignore - import.meta.env для Vite
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return '';
};

// ============= URL Sanitization (CRITICAL) =============
/**
 * Sanitizes the API URL to ensure it always ends correctly with /api/db
 * This fixes 404 errors caused by double slashes or missing paths
 * 
 * Examples:
 *   Input: "https://site.ngrok.app/"        → Output: "https://site.ngrok.app/api/db"
 *   Input: "https://site.ngrok.app"         → Output: "https://site.ngrok.app/api/db"
 *   Input: "https://site.ngrok.app/api/db"  → Output: "https://site.ngrok.app/api/db"
 *   Input: "https://site.ngrok.app/api/db/" → Output: "https://site.ngrok.app/api/db"
 */
function sanitizeApiUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  
  let url = rawUrl.trim();
  
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  // Remove existing /api/db suffix (we'll add it back)
  if (url.endsWith('/api/db')) {
    url = url.slice(0, -7); // Remove '/api/db'
  }
  
  // Append /api/db
  return `${url}/api/db`;
}

// ============= Request Deduplication Cache =============
// Prevents duplicate getAll calls during React Strict Mode double-render
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_TTL = 100; // 100ms - enough to prevent double-render duplicates

function getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[MoonelyDB] Cache HIT:', key);
    return cached.promise;
  }
  
  const promise = fetchFn();
  requestCache.set(key, { promise, timestamp: Date.now() });
  
  // Cleanup old cache entries
  setTimeout(() => requestCache.delete(key), CACHE_TTL * 2);
  
  return promise;
}

// ============= LocalStorage Implementation =============
class LocalStorageDB {
  private projectId: string;
  private storageKey: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.storageKey = `moonely_db_${projectId}`;
    console.log('[MoonelyDB:LocalStorage] Initialized with key:', this.storageKey);
  }

  private getStorage(): Record<string, VirtualRecord[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private setStorage(data: Record<string, VirtualRecord[]>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  private generateId(): string {
    return 'local_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  getAll<T = any>(collection: string): DBResponse<VirtualRecord<T>[]> {
    const storage = this.getStorage();
    const records = (storage[collection] || []) as VirtualRecord<T>[];
    return { success: true, data: records };
  }

  getById<T = any>(collection: string, id: string): DBResponse<VirtualRecord<T>> {
    const storage = this.getStorage();
    const records = storage[collection] || [];
    const record = records.find(r => r.id === id) as VirtualRecord<T> | undefined;
    if (!record) {
      return { success: false, data: null as any, error: 'Record not found' };
    }
    return { success: true, data: record };
  }

  add<T = any>(collection: string, data: T): DBResponse<VirtualRecord<T>> {
    const storage = this.getStorage();
    if (!storage[collection]) storage[collection] = [];
    
    const now = new Date().toISOString();
    const record: VirtualRecord<T> = {
      id: this.generateId(),
      chatId: this.projectId,
      collection,
      data,
      createdAt: now,
      updatedAt: now,
    };
    
    storage[collection].push(record);
    this.setStorage(storage);
    return { success: true, data: record };
  }

  update<T = any>(collection: string, id: string, data: Partial<T>): DBResponse<VirtualRecord<T>> {
    const storage = this.getStorage();
    const records = storage[collection] || [];
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) {
      return { success: false, data: null as any, error: 'Record not found' };
    }
    
    records[index] = {
      ...records[index],
      data: { ...records[index].data, ...data },
      updatedAt: new Date().toISOString(),
    };
    
    storage[collection] = records;
    this.setStorage(storage);
    return { success: true, data: records[index] as VirtualRecord<T> };
  }

  remove(collection: string, id: string): DBResponse<{ message: string }> {
    const storage = this.getStorage();
    const records = storage[collection] || [];
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) {
      return { success: false, data: { message: '' }, error: 'Record not found' };
    }
    
    records.splice(index, 1);
    storage[collection] = records;
    this.setStorage(storage);
    return { success: true, data: { message: 'Record deleted' } };
  }
}

// ============= Main MoonelyDB Class =============
class MoonelyDB {
  private mode: DBMode;
  private apiUrl: string;
  private apiKey: string | null;
  private projectId: string | null;
  private localStorage: LocalStorageDB | null = null;
  private inMemoryStorage: Map<string, VirtualRecord[]> | null = null;

  constructor(config?: MoonelyDBConfig) {
    // Read from environment or config
    // Priority: config > VITE > NEXT_PUBLIC
    const rawApiUrl = config?.apiUrl 
      || getEnv('VITE_MOONELY_API_URL') 
      || getEnv('NEXT_PUBLIC_MOONELY_API_URL')
      || '';
    
    this.apiKey = config?.apiKey 
      || getEnv('VITE_MOONELY_API_KEY') 
      || getEnv('NEXT_PUBLIC_MOONELY_API_KEY')
      || null;
    
    this.projectId = config?.projectId 
      || getEnv('VITE_MOONELY_PROJECT_ID') 
      || getEnv('NEXT_PUBLIC_MOONELY_PROJECT_ID')
      || null;

    // ============= THE BRAIN: Simplified Mode Detection =============
    // ГЛАВНАЯ ЛОГИКА: Проверяем ТОЛЬКО наличие API URL
    // - Есть URL → API режим (Vercel Deploy / Production VPS)
    // - Нет URL → LocalStorage режим (ZIP Export / Standalone)
    
    this.apiUrl = '';
    this.mode = 'LOCAL_STORAGE'; // Default to localStorage

    if (rawApiUrl && rawApiUrl.trim() !== '') {
      // ✅ API MODE: URL присутствует - это задеплоенный сайт
      this.mode = 'API';
      this.apiUrl = sanitizeApiUrl(rawApiUrl);
      console.log('[MoonelyDB] 🚀 Mode: API (Production VPS)');
      console.log('[MoonelyDB] API URL:', this.apiUrl);
    } else {
      // ✅ LOCAL_STORAGE MODE: URL отсутствует - это ZIP Export
      this.mode = 'LOCAL_STORAGE';
      
      // Проверяем доступность localStorage (браузер)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        this.localStorage = new LocalStorageDB(this.projectId || 'standalone');
        console.log('[MoonelyDB] 💾 Mode: LOCAL_STORAGE (Browser)');
      } else {
        // Fallback для SSR или среды без localStorage
        this.inMemoryStorage = new Map();
        console.log('[MoonelyDB] 🧠 Mode: IN-MEMORY (SSR/Node.js fallback)');
      }
    }

    // Debug logging
    console.log('='.repeat(60));
    console.log('[MoonelyDB] ✅ Initialized');
    console.log('[MoonelyDB] Mode:', this.mode);
    console.log('[MoonelyDB] API URL:', this.apiUrl || '(none - using local storage)');
    console.log('[MoonelyDB] API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : '(none)');
    console.log('[MoonelyDB] Project ID:', this.projectId || '(default)');
    console.log('='.repeat(60));
  }

  /**
   * Set Project ID dynamically
   */
  setProjectId(id: string) {
    this.projectId = id;
    if (this.mode === 'LOCAL_STORAGE') {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        this.localStorage = new LocalStorageDB(id);
      }
    }
  }

  /**
   * Set API Key dynamically
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Universal request method with robust error handling
   * Includes headers to bypass ngrok/tunnel warning pages
   */
  private async request<T = any>(
    method: string, 
    body?: any,
    queryParams?: Record<string, string>
  ): Promise<DBResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      // Critical: Bypass tunnel interstitial pages
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
    };

    // Authorization strategy
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // If no API key, rely on cookies (Session Auth for Moonely Preview)
    if (!this.apiKey) {
      options.credentials = 'include';
    }

    // Build URL with query parameters
    let url: URL;
    try {
      // Handle both absolute and relative URLs
      if (this.apiUrl.startsWith('http')) {
        url = new URL(this.apiUrl);
      } else {
        url = new URL(this.apiUrl, window.location.origin);
      }
    } catch (e) {
      console.error('[MoonelyDB] ❌ INVALID URL:', this.apiUrl);
      throw new Error(`Invalid API URL: ${this.apiUrl}`);
    }
    
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const fullUrl = url.toString();
    console.log(`[MoonelyDB] 📡 ${method} ${fullUrl}`);

    try {
      const res = await fetch(fullUrl, options);
      
      // Check for HTML response (tunnel interstitial page)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.error('='.repeat(60));
        console.error('[MoonelyDB] ❌❌❌ CRITICAL ERROR ❌❌❌');
        console.error('[MoonelyDB] Received HTML instead of JSON!');
        console.error('[MoonelyDB] URL attempted:', fullUrl);
        console.error('[MoonelyDB] This usually means:');
        console.error('  1. ngrok is showing an interstitial page');
        console.error('  2. The tunnel URL is incorrect or expired');
        console.error('  3. The API server is not running');
        console.error('[MoonelyDB] Solutions:');
        console.error('  1. Restart ngrok and update NEXT_PUBLIC_MOONELY_API_URL');
        console.error('  2. Ensure your local server is running on port 3000');
        console.error('='.repeat(60));
        throw new Error('API returned HTML instead of JSON. Check tunnel configuration.');
      }
      
      // Check for error status codes
      if (!res.ok) {
        console.error('='.repeat(60));
        console.error('[MoonelyDB] ❌❌❌ HTTP ERROR ❌❌❌');
        console.error('[MoonelyDB] Status:', res.status, res.statusText);
        console.error('[MoonelyDB] URL attempted:', fullUrl);
        console.error('='.repeat(60));
        
        let errorMessage = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {}
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      console.log('[MoonelyDB] ✅ Response OK');
      return data;
      
    } catch (error: any) {
      console.error('='.repeat(60));
      console.error('[MoonelyDB] ❌❌❌ REQUEST FAILED ❌❌❌');
      console.error('[MoonelyDB] URL attempted:', fullUrl);
      console.error('[MoonelyDB] Error:', error?.message || error);
      
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        console.error('[MoonelyDB] 🔍 Possible causes:');
        console.error('  1. CORS: API server not allowing this origin');
        console.error('  2. Network: API server unreachable');
        console.error('  3. Mixed Content: HTTPS page → HTTP API');
        console.error('  4. ngrok tunnel is down');
      }
      
      console.error('='.repeat(60));
      throw error;
    }
  }

  // ============= Public Collection API =============
  /**
   * Work with a collection (like a database table)
   * 
   * @example
   * ```typescript
   * // Get all records
   * const { data } = await db.collection('todos').getAll();
   * 
   * // Add a record
   * await db.collection('todos').add({ title: 'Buy milk', done: false });
   * 
   * // Update a record
   * await db.collection('todos').update('record-id', { done: true });
   * 
   * // Delete a record
   * await db.collection('todos').remove('record-id');
   * ```
   */
  collection<T = any>(name: string) {
    // LocalStorage mode (browser)
    if (this.mode === 'LOCAL_STORAGE' && this.localStorage) {
      return {
        getAll: async (): Promise<DBResponse<VirtualRecord<T>[]>> => {
          return this.localStorage!.getAll<T>(name);
        },
        getById: async (id: string): Promise<DBResponse<VirtualRecord<T>>> => {
          return this.localStorage!.getById<T>(name, id);
        },
        add: async (data: T): Promise<DBResponse<VirtualRecord<T>>> => {
          return this.localStorage!.add<T>(name, data);
        },
        update: async (id: string, data: Partial<T>): Promise<DBResponse<VirtualRecord<T>>> => {
          return this.localStorage!.update<T>(name, id, data);
        },
        remove: async (id: string): Promise<DBResponse<{ message: string }>> => {
          return this.localStorage!.remove(name, id);
        },
      };
    }

    // In-Memory mode (SSR fallback when no localStorage)
    if (this.mode === 'LOCAL_STORAGE' && this.inMemoryStorage) {
      return {
        getAll: async (): Promise<DBResponse<VirtualRecord<T>[]>> => {
          const records = (this.inMemoryStorage!.get(name) || []) as VirtualRecord<T>[];
          return { success: true, data: records };
        },
        getById: async (id: string): Promise<DBResponse<VirtualRecord<T>>> => {
          const records = this.inMemoryStorage!.get(name) || [];
          const record = records.find(r => r.id === id) as VirtualRecord<T> | undefined;
          if (!record) return { success: false, data: null as any, error: 'Record not found' };
          return { success: true, data: record };
        },
        add: async (data: T): Promise<DBResponse<VirtualRecord<T>>> => {
          if (!this.inMemoryStorage!.has(name)) this.inMemoryStorage!.set(name, []);
          const now = new Date().toISOString();
          const record: VirtualRecord<T> = {
            id: 'mem_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
            chatId: this.projectId || 'standalone',
            collection: name,
            data,
            createdAt: now,
            updatedAt: now,
          };
          this.inMemoryStorage!.get(name)!.push(record);
          return { success: true, data: record };
        },
        update: async (id: string, data: Partial<T>): Promise<DBResponse<VirtualRecord<T>>> => {
          const records = this.inMemoryStorage!.get(name) || [];
          const index = records.findIndex(r => r.id === id);
          if (index === -1) return { success: false, data: null as any, error: 'Record not found' };
          records[index] = {
            ...records[index],
            data: { ...records[index].data, ...data },
            updatedAt: new Date().toISOString(),
          };
          return { success: true, data: records[index] as VirtualRecord<T> };
        },
        remove: async (id: string): Promise<DBResponse<{ message: string }>> => {
          const records = this.inMemoryStorage!.get(name) || [];
          const index = records.findIndex(r => r.id === id);
          if (index === -1) return { success: false, data: { message: '' }, error: 'Record not found' };
          records.splice(index, 1);
          return { success: true, data: { message: 'Record deleted' } };
        },
      };
    }

    // API mode (Vercel or Moonely Preview)
    return {
      /**
       * Get all records in the collection
       */
      getAll: async (): Promise<DBResponse<VirtualRecord<T>[]>> => {
        const cacheKey = `api:getAll:${this.projectId}:${name}`;
        return getCachedOrFetch(cacheKey, () => {
          return this.request<VirtualRecord<T>[]>('GET', undefined, {
            collection: name,
            projectId: this.projectId || '',
          });
        });
      },

      /**
       * Get a single record by ID
       */
      getById: async (id: string): Promise<DBResponse<VirtualRecord<T>>> => {
        return this.request<VirtualRecord<T>>('GET', undefined, {
          id,
          projectId: this.projectId || '',
        });
      },

      /**
       * Add a new record
       */
      add: async (data: T): Promise<DBResponse<VirtualRecord<T>>> => {
        return this.request<VirtualRecord<T>>('POST', {
          collection: name,
          projectId: this.projectId,
          data,
        });
      },

      /**
       * Update an existing record
       */
      update: async (id: string, data: Partial<T>): Promise<DBResponse<VirtualRecord<T>>> => {
        return this.request<VirtualRecord<T>>('PUT', {
          id,
          projectId: this.projectId,
          data,
        });
      },

      /**
       * Delete a record
       */
      remove: async (id: string): Promise<DBResponse<{ message: string }>> => {
        return this.request<{ message: string }>('DELETE', undefined, {
          id,
          projectId: this.projectId || '',
        });
      },
    };
  }
}

// ============= Exports =============
// Singleton instance for convenience
export const db = new MoonelyDB();

// Export class for custom instantiation
export { MoonelyDB };

// Export types for TypeScript
export type { DBResponse, VirtualRecord, MoonelyDBConfig, DBMode };
