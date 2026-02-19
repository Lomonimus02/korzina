/**
 * Утилиты для работы с Vercel API
 * 
 * Документация: https://vercel.com/docs/rest-api
 * 
 * Архитектура позволяет легко заменить Vercel на другой провайдер
 * (например, собственный сервер) путём замены этого модуля.
 */

const VERCEL_API_URL = "https://api.vercel.com";

export interface VercelDeploymentResult {
  id: string;
  url: string;
  readyState: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  projectId?: string;
}

export interface VercelFile {
  file: string;
  data: string;
  encoding: "base64";
}

export interface VercelEnvVar {
  key: string;
  value: string;
  target: ("production" | "preview" | "development")[];
  type: "encrypted" | "plain";
}

/**
 * Создаёт деплой на Vercel из файлов
 */
export async function createVercelDeployment(
  token: string,
  projectName: string,
  files: Record<string, string>,
  displayName?: string, // Человекочитаемое название для title
  envVars?: VercelEnvVar[] // Переменные окружения для проекта
): Promise<VercelDeploymentResult> {
  const siteTitle = displayName || projectName;
  
  // Преобразуем файлы в формат Vercel
  const vercelFiles: VercelFile[] = [];
  
  // Добавляем основные файлы проекта
  for (const [path, content] of Object.entries(files)) {
    const filePath = path.startsWith("/") ? path.slice(1) : path;
    vercelFiles.push({
      file: `src/${filePath}`,
      data: Buffer.from(content).toString("base64"),
      encoding: "base64",
    });
  }
  
  // Добавляем package.json для React проекта
  const packageJson = {
    name: projectName,
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "lucide-react": "^0.344.0",
      "clsx": "^2.1.0",
      "tailwind-merge": "^2.2.1",
      "framer-motion": "^10.16.4",
      "react-router-dom": "^6.22.3"
    },
    devDependencies: {
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.2.0",
      "autoprefixer": "^10.4.17",
      "postcss": "^8.4.35",
      "tailwindcss": "^3.4.1",
      "typescript": "^5.3.0",
      "vite": "^5.1.0"
    }
  };
  
  vercelFiles.push({
    file: "package.json",
    data: Buffer.from(JSON.stringify(packageJson, null, 2)).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
  vercelFiles.push({
    file: "vite.config.ts",
    data: Buffer.from(viteConfig).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
      baseUrl: ".",
      paths: {
        "@/*": ["./src/*"]
      }
    },
    include: ["src"],
    references: [{ path: "./tsconfig.node.json" }]
  };
  vercelFiles.push({
    file: "tsconfig.json",
    data: Buffer.from(JSON.stringify(tsConfig, null, 2)).toString("base64"),
    encoding: "base64",
  });
  
  // tsconfig.node.json
  const tsConfigNode = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: "ESNext",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true
    },
    include: ["vite.config.ts"]
  };
  vercelFiles.push({
    file: "tsconfig.node.json",
    data: Buffer.from(JSON.stringify(tsConfigNode, null, 2)).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
  vercelFiles.push({
    file: "tailwind.config.js",
    data: Buffer.from(tailwindConfig).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем postcss.config.js
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
  vercelFiles.push({
    file: "postcss.config.js",
    data: Buffer.from(postcssConfig).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${siteTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  vercelFiles.push({
    file: "index.html",
    data: Buffer.from(indexHtml).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем main.tsx
  const mainTsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
  vercelFiles.push({
    file: "src/main.tsx",
    data: Buffer.from(mainTsx).toString("base64"),
    encoding: "base64",
  });
  
  // Добавляем index.css с Tailwind
  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  vercelFiles.push({
    file: "src/index.css",
    data: Buffer.from(indexCss).toString("base64"),
    encoding: "base64",
  });
  
  // Подготавливаем тело запроса
  const deploymentBody: Record<string, any> = {
    name: projectName,
    files: vercelFiles,
    projectSettings: {
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "dist",
      installCommand: "npm install",
      skipGitConnectDuringLink: true,
    },
    target: "production",
  };

  // Добавляем переменные окружения если они переданы
  if (envVars && envVars.length > 0) {
    deploymentBody.env = envVars.reduce((acc, env) => {
      acc[env.key] = env.value;
      return acc;
    }, {} as Record<string, string>);
  }

  // Создаём деплой через Vercel API
  const response = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deploymentBody),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error("Vercel API error:", error);
    throw new Error(error.error?.message || "Ошибка при создании деплоя");
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    url: `https://${data.url}`,
    readyState: data.readyState,
    projectId: data.projectId,
  };
}

/**
 * Проверяет статус деплоя
 */
export async function getDeploymentStatus(
  token: string,
  deploymentId: string
): Promise<VercelDeploymentResult> {
  const response = await fetch(`${VERCEL_API_URL}/v13/deployments/${deploymentId}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Ошибка при получении статуса");
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    url: `https://${data.url}`,
    readyState: data.readyState,
    projectId: data.projectId,
  };
}

/**
 * Проверяет валидность токена Vercel
 */
export async function validateVercelToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/v2/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Удаляет деплой
 */
export async function deleteDeployment(
  token: string,
  deploymentId: string
): Promise<void> {
  const response = await fetch(`${VERCEL_API_URL}/v13/deployments/${deploymentId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Ошибка при удалении деплоя");
  }
}
