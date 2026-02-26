/**
 * Moonely DB SDK для инъекции в Sandpack
 * 
 * Работает в трёх режимах:
 * 1. Sandpack редактор → postMessage proxy через родительский фрейм → серверная БД
 * 2. Vercel деплой → прямые запросы к API с ключом → серверная БД (через ngrok tunnel)
 * 3. Локальный запуск (ZIP) → localStorage
 * 
 * v2.0 - Complete rewrite with ngrok support and URL sanitization
 * ВАЖНО: Не использовать import.meta - не работает в Sandpack!
 */

// ============= URL Sanitization Helper =============
/**
 * Sanitizes the API URL to ensure it always ends correctly with /api/db
 * This fixes 404 errors caused by double slashes or missing paths
 */
function sanitizeApiUrlForSdk(rawUrl: string): string {
  if (!rawUrl) return '';
  
  let url = rawUrl.trim();
  
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  // Remove existing /api/db suffix (we'll add it back)
  if (url.endsWith('/api/db')) {
    url = url.slice(0, -7);
  }
  
  // Append /api/db
  return `${url}/api/db`;
}

// Функция для генерации SDK с захардкоженным projectId, API URL и API Key
export function generateMoonelyDbCode(projectId: string, apiUrl: string, apiKey: string): string {
  // Sanitize the URL before embedding
  const sanitizedUrl = apiUrl ? sanitizeApiUrlForSdk(apiUrl) : '';
  
  return `// Moonely Virtual Backend SDK v2.2
// Auto-injected by Moonely AI Website Builder
// Project ID: ${projectId}
// API URL: ${sanitizedUrl || '(none)'}
// Supports: Vercel Deploy, ZIP Export (localStorage), Sandpack Preview (postMessage)

// ============= Configuration =============
// These values are injected at build/deploy time
const __MOONELY_PROJECT_ID__ = "${projectId}";
const __MOONELY_API_URL__ = "${sanitizedUrl}";
const __MOONELY_API_KEY__ = "${apiKey}";

// ============= URL Sanitization =============
function sanitizeApiUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  while (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/api/db')) url = url.slice(0, -7);
  return url + '/api/db';
}

// ============= Mode Detection =============
const getMode = () => {
  if (typeof window === 'undefined') return 'local';
  
  const hostname = window.location.hostname;
  
  // Локальный режим: localhost, 127.0.0.1, file://, пустой хост
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || window.location.protocol === 'file:') {
    return 'local';
  }
  
  // Sandpack режим: codesandbox.io - используем postMessage proxy
  if (hostname.includes('codesandbox.io') || hostname.includes('csb.app') || window.parent !== window) {
    return 'proxy';
  }
  
  // Production режим: прямые запросы к API
  return 'direct';
};

// ============= Type Definitions =============
const DBResponse = {};
const VirtualRecord = {};

// ============= Request Deduplication Cache =============
// Prevents duplicate getAll calls during React Strict Mode double-render
const requestCache = new Map();
const CACHE_TTL = 100; // 100ms - enough to prevent double-render duplicates

function getCachedOrFetch(key, fetchFn) {
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
  constructor(projectId) {
    this.projectId = projectId;
    this.storageKey = \`moonely_db_\${projectId}\`;
    console.log('[MoonelyDB:LocalStorage] Initialized with key:', this.storageKey);
  }

  getStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  setStorage(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  generateId() {
    return 'local_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  collection(name) {
    return {
      getAll: async () => {
        const cacheKey = \`getAll:\${this.projectId}:\${name}\`;
        return getCachedOrFetch(cacheKey, async () => {
          const storage = this.getStorage();
          const records = storage[name] || [];
          return { success: true, data: records };
        });
      },

      getById: async (id) => {
        const storage = this.getStorage();
        const records = storage[name] || [];
        const record = records.find(r => r.id === id);
        if (!record) {
          return { success: false, data: null, error: 'Record not found' };
        }
        return { success: true, data: record };
      },

      add: async (data) => {
        const storage = this.getStorage();
        if (!storage[name]) storage[name] = [];
        
        const now = new Date().toISOString();
        const record = {
          id: this.generateId(),
          chatId: this.projectId,
          collection: name,
          data,
          createdAt: now,
          updatedAt: now,
        };
        
        storage[name].push(record);
        this.setStorage(storage);
        return { success: true, data: record };
      },

      update: async (id, data) => {
        const storage = this.getStorage();
        const records = storage[name] || [];
        const index = records.findIndex(r => r.id === id);
        
        if (index === -1) {
          return { success: false, data: null, error: 'Record not found' };
        }
        
        records[index] = {
          ...records[index],
          data: { ...records[index].data, ...data },
          updatedAt: new Date().toISOString(),
        };
        
        storage[name] = records;
        this.setStorage(storage);
        return { success: true, data: records[index] };
      },

      remove: async (id) => {
        const storage = this.getStorage();
        const records = storage[name] || [];
        const index = records.findIndex(r => r.id === id);
        
        if (index === -1) {
          return { success: false, data: { message: '' }, error: 'Record not found' };
        }
        
        records.splice(index, 1);
        storage[name] = records;
        this.setStorage(storage);
        return { success: true, data: { message: 'Record deleted' } };
      },
    };
  }
}

// ============= PostMessage Proxy Implementation (для Sandpack) =============
class ProxyDB {
  constructor(projectId) {
    this.projectId = projectId;
    this.requestId = 0;
    this.pendingRequests = new Map();
    
    console.log('[MoonelyDB:Proxy] Initialized with projectId:', projectId);
    
    // Слушаем ответы от родительского окна
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'MOONELY_DB_RESPONSE') {
        console.log('[MoonelyDB:Proxy] Received response:', event.data);
        const { requestId, response, error } = event.data;
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          this.pendingRequests.delete(requestId);
          if (error) {
            pending.reject(new Error(error));
          } else {
            pending.resolve(response);
          }
        }
      }
    });
  }

  sendRequest(action, payload) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      this.pendingRequests.set(requestId, { resolve, reject });
      
      console.log('[MoonelyDB:Proxy] Sending request:', { requestId, action, payload, projectId: this.projectId });
      
      // Отправляем запрос родительскому окну
      window.parent.postMessage({
        type: 'MOONELY_DB_REQUEST',
        requestId,
        action,
        payload: { ...payload, projectId: this.projectId },
      }, '*');
      
      // Timeout 30 секунд
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  collection(name) {
    return {
      getAll: async () => {
        const cacheKey = \`proxy:getAll:\${this.projectId}:\${name}\`;
        return getCachedOrFetch(cacheKey, () => {
          return this.sendRequest('getAll', { collection: name });
        });
      },

      getById: async (id) => {
        return this.sendRequest('getById', { id });
      },

      add: async (data) => {
        return this.sendRequest('add', { collection: name, data });
      },

      update: async (id, data) => {
        return this.sendRequest('update', { id, data });
      },

      remove: async (id) => {
        return this.sendRequest('remove', { id });
      },
    };
  }
}

// ============= Direct API Implementation (для Vercel с ngrok) =============
class DirectDB {
  constructor(projectId, apiUrl, apiKey) {
    this.baseUrl = apiUrl;
    this.projectId = projectId;
    this.apiKey = apiKey;
    
    console.log('='.repeat(60));
    console.log('[MoonelyDB DirectDB] 🚀 Initialized');
    console.log('[MoonelyDB DirectDB] API URL:', apiUrl);
    console.log('[MoonelyDB DirectDB] API Key:', apiKey ? apiKey.substring(0, 8) + '...' : '(none)');
    console.log('[MoonelyDB DirectDB] Project ID:', projectId);
    console.log('='.repeat(60));
  }

  async request(method, body, queryParams) {
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${this.apiKey}\`,
      // CRITICAL: Bypass ngrok/tunnel interstitial pages
      "ngrok-skip-browser-warning": "true",
      "Bypass-Tunnel-Reminder": "true"
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    let url;
    try {
      url = new URL(this.baseUrl);
    } catch (e) {
      console.error('[MoonelyDB] ❌ INVALID URL:', this.baseUrl);
      throw new Error('Invalid API URL: ' + this.baseUrl);
    }
    
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const fullUrl = url.toString();
    console.log('[MoonelyDB DirectDB] 📡', method, fullUrl);

    try {
      const res = await fetch(fullUrl, options);
      
      // Check for HTML response (tunnel interstitial page)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.error('='.repeat(60));
        console.error('[MoonelyDB] ❌❌❌ CRITICAL ERROR ❌❌❌');
        console.error('[MoonelyDB] Received HTML instead of JSON!');
        console.error('[MoonelyDB] URL attempted:', fullUrl);
        console.error('[MoonelyDB] This usually means ngrok tunnel is showing interstitial page.');
        console.error('[MoonelyDB] Solutions:');
        console.error('  1. Restart ngrok: ngrok http 3000');
        console.error('  2. Update NEXT_PUBLIC_MOONELY_API_URL with new ngrok URL');
        console.error('  3. Redeploy the site');
        console.error('='.repeat(60));
        throw new Error('API returned HTML instead of JSON. Tunnel may be blocking the request.');
      }
      
      if (!res.ok) {
        console.error('='.repeat(60));
        console.error('[MoonelyDB] ❌ HTTP ERROR:', res.status, res.statusText);
        console.error('[MoonelyDB] URL attempted:', fullUrl);
        console.error('='.repeat(60));
        
        let errorMsg = 'HTTP ' + res.status;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      
      const data = await res.json();
      console.log('[MoonelyDB DirectDB] ✅ Response OK, records:', Array.isArray(data.data) ? data.data.length : 1);
      return data;
    } catch (err) {
      console.error('='.repeat(60));
      console.error('[MoonelyDB DirectDB] ❌❌❌ REQUEST FAILED ❌❌❌');
      console.error('[MoonelyDB DirectDB] URL attempted:', fullUrl);
      console.error('[MoonelyDB DirectDB] Error:', err?.message || err);
      
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        console.error('[MoonelyDB] 🔍 Possible causes:');
        console.error('  1. CORS: API server not allowing this origin');
        console.error('  2. Network: ngrok tunnel is down');
        console.error('  3. Mixed Content: HTTPS page → HTTP API');
        console.error('[MoonelyDB] Current page:', typeof window !== 'undefined' ? window.location.href : 'SSR');
      }
      
      console.error('='.repeat(60));
      throw err;
    }
  }

  collection(name) {
    return {
      getAll: async () => {
        const cacheKey = \`direct:getAll:\${this.projectId}:\${name}\`;
        return getCachedOrFetch(cacheKey, () => {
          return this.request("GET", undefined, {
            collection: name,
            projectId: this.projectId,
          });
        });
      },

      getById: async (id) => {
        return this.request("GET", undefined, {
          id,
          projectId: this.projectId,
        });
      },

      add: async (data) => {
        return this.request("POST", {
          collection: name,
          projectId: this.projectId,
          data,
        });
      },

      update: async (id, data) => {
        return this.request("PUT", {
          id,
          projectId: this.projectId,
          data,
        });
      },

      remove: async (id) => {
        return this.request("DELETE", undefined, {
          id,
          projectId: this.projectId,
        });
      },
    };
  }
}

// ============= Main MoonelyDB Class =============
class MoonelyDB {
  constructor() {
    this.mode = getMode();
    
    console.log('='.repeat(60));
    console.log('[MoonelyDB] 🎯 Initializing...');
    console.log('[MoonelyDB] Mode:', this.mode.toUpperCase());
    console.log('[MoonelyDB] Injected API URL:', __MOONELY_API_URL__);
    console.log('[MoonelyDB] Injected API Key:', __MOONELY_API_KEY__ ? __MOONELY_API_KEY__.substring(0, 8) + '...' : '(none)');
    console.log('[MoonelyDB] Injected Project ID:', __MOONELY_PROJECT_ID__);
    
    if (typeof window !== 'undefined') {
      console.log('[MoonelyDB] Current hostname:', window.location.hostname);
      console.log('[MoonelyDB] Current protocol:', window.location.protocol);
    }
    
    // Warnings for common issues
    if (this.mode === 'direct') {
      if (!__MOONELY_API_KEY__) {
        console.warn('[MoonelyDB] ⚠️ WARNING: Direct mode but no API key! Requests will fail.');
      }
      if (__MOONELY_API_URL__.includes('localhost') || __MOONELY_API_URL__.includes('127.0.0.1')) {
        console.error('[MoonelyDB] 🚨 CRITICAL: API URL points to localhost!');
        console.error('[MoonelyDB] This will NOT work in production!');
        console.error('[MoonelyDB] Use ngrok: ngrok http 3000');
      }
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && __MOONELY_API_URL__.startsWith('http://')) {
        console.error('[MoonelyDB] 🚨 CRITICAL: Mixed Content detected!');
        console.error('[MoonelyDB] HTTPS page trying to fetch from HTTP API.');
        console.error('[MoonelyDB] Browser will block this request!');
        console.error('[MoonelyDB] Use ngrok with HTTPS: ngrok http 3000');
      }
    }
    
    console.log('='.repeat(60));
    
    this.localDb = new LocalStorageDB(__MOONELY_PROJECT_ID__);
    this.proxyDb = new ProxyDB(__MOONELY_PROJECT_ID__);
    this.directDb = new DirectDB(__MOONELY_PROJECT_ID__, __MOONELY_API_URL__, __MOONELY_API_KEY__);
  }

  collection(name) {
    switch (this.mode) {
      case 'local':
        return this.localDb.collection(name);
      case 'proxy':
        return this.proxyDb.collection(name);
      case 'direct':
        return this.directDb.collection(name);
    }
  }
}

export const db = new MoonelyDB();
export { MoonelyDB };
`;
}

// Для обратной совместимости
export const MOONELY_DB_SDK_CODE = generateMoonelyDbCode("", "", "");

/**
 * tsconfig.json для Sandpack с алиасами путей
 */
const SANDPACK_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}`;

/**
 * Генерирует объект файлов для инъекции в Sandpack
 * @param chatId - ID проекта (чата), используется как projectId для данных
 * @param apiKey - API ключ проекта (для Vercel деплоев)
 * @param apiUrl - URL API (должен быть ngrok URL для продакшена)
 */
export function getMoonelyDbFiles(
  chatId?: string,
  apiKey?: string,
  apiUrl?: string
): Record<string, { code: string; hidden?: boolean; readOnly?: boolean }> {
  // Get API URL from environment if not provided
  // IMPORTANT: Must use NEXT_PUBLIC_ prefix for client-side access!
  const envApiUrl = process.env.NEXT_PUBLIC_MOONELY_API_URL || '';
  const finalApiUrl = apiUrl || envApiUrl;
  
  // Log what URL we're using
  console.log('[getMoonelyDbFiles] Using API URL:', finalApiUrl || '(none - will use relative path)');
  
  // Генерируем SDK с захардкоженными значениями
  const sdkCode = chatId
    ? generateMoonelyDbCode(chatId, finalApiUrl, apiKey || "")
    : MOONELY_DB_SDK_CODE;

  return {
    '/lib/moonely-db.ts': {
      code: sdkCode,
      hidden: true,
      readOnly: true,
    },
    '/tsconfig.json': {
      code: SANDPACK_TSCONFIG,
      hidden: true,
      readOnly: true,
    },
  };
}
