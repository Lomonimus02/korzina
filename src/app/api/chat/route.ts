import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateRepoMap } from "@/lib/repo-map";
import { FREE_PLAN_LIMITS } from "@/lib/yookassa-types";
import { calculateCost } from "@/lib/pricing";

export const maxDuration = 60;

// OpenRouter Chat Completions format
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new Response("User not found", { status: 401 });
  }

  // ============================================
  // FREE plan limits check (3/day, 15/month)
  // ============================================
  const now = new Date();
  let updatedUserData = {
    dailyGenerations: user.dailyGenerations,
    monthlyGenerations: user.monthlyGenerations,
    dailyResetAt: user.dailyResetAt,
    monthlyResetAt: user.monthlyResetAt,
  };

  // Reset daily counter if needed
  if (!user.dailyResetAt || now >= user.dailyResetAt) {
    const tomorrowMidnight = new Date(now);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    tomorrowMidnight.setHours(0, 0, 0, 0);
    
    updatedUserData.dailyGenerations = 0;
    updatedUserData.dailyResetAt = tomorrowMidnight;
  }

  // Reset monthly counter if needed
  if (!user.monthlyResetAt || now >= user.monthlyResetAt) {
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
    updatedUserData.monthlyGenerations = 0;
    updatedUserData.monthlyResetAt = nextMonthStart;
  }

  // For FREE plan users - check limits
  if (user.plan === 'FREE') {
    // Check daily limit
    if (updatedUserData.dailyGenerations >= FREE_PLAN_LIMITS.dailyGenerations) {
      return Response.json({ 
        error: "Дневной лимит исчерпан", 
        message: `Бесплатный план: ${FREE_PLAN_LIMITS.dailyGenerations} генерации в день. Обновите тариф для безлимитного доступа.`
      }, { status: 403 });
    }
    
    // Check monthly limit
    if (updatedUserData.monthlyGenerations >= FREE_PLAN_LIMITS.monthlyGenerations) {
      return Response.json({ 
        error: "Месячный лимит исчерпан", 
        message: `Бесплатный план: ${FREE_PLAN_LIMITS.monthlyGenerations} генераций в месяц. Обновите тариф для безлимитного доступа.`
      }, { status: 403 });
    }
  } else {
    // For paid plans - check credits (regular credits or lifetime credits)
    const totalCredits = (user.credits || 0) + (user.lifetimeCredits || 0);
    if (totalCredits <= 0) {
      return Response.json({ error: "Insufficient credits" }, { status: 403 });
    }
  }

  const { messages, currentFiles, chatId, images, attachments } = await req.json();

  // Input validation
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Invalid messages format" }, { status: 400 });
  }

  // Limit message count to prevent abuse
  if (messages.length > 100) {
    return Response.json({ error: "Too many messages" }, { status: 400 });
  }

  // Limit image/attachment count
  if (images && images.length > 5) {
    return Response.json({ error: "Too many images (max 5)" }, { status: 400 });
  }
  if (attachments && attachments.length > 5) {
    return Response.json({ error: "Too many attachments (max 5)" }, { status: 400 });
  }

  // SECURITY: Block command injection patterns in user messages
  // Only check USER messages, not assistant responses in history
  const dangerousPatterns = [
    /\$\(\s*(curl|wget|bash|sh|nc|cat|rm|chmod)/gi,  // $(curl...), $(bash...) etc
    /\|\s*(bash|sh|zsh)\s*$/gim,                      // | bash at end of line
    /;\s*(curl|wget|bash|sh|nc|netcat)\s+/gi,        // ; curl <url>, ; wget, etc.
    /&&\s*(curl|wget|bash|sh)\s+/gi,                 // && curl, etc.
    />\s*\/dev\/(tcp|udp)/gi,                        // > /dev/tcp, /dev/udp (reverse shells)
    /\beval\s*\(\s*["'`]/gi,                         // eval("...) - JS injection
  ];

  // Only validate user's NEW message (last one), not entire history
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'user' && typeof lastMessage.content === 'string') {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(lastMessage.content)) {
        console.warn(`[SECURITY] Blocked dangerous pattern in message: ${lastMessage.content.substring(0, 100)}`);
        return Response.json({ error: "Message contains prohibited content" }, { status: 400 });
      }
    }
  }

  // Only log in development
  if (process.env.NODE_ENV !== 'production') {
    console.log("Received messages:", JSON.stringify(messages, null, 2));
    console.log("Received images count:", images?.length || 0);
    console.log("Received attachments count:", attachments?.length || 0);
    if (attachments?.length > 0) {
      console.log("Attachments:", attachments.map((a: { name: string; url: string }) => ({ name: a.name, url: a.url.substring(0, 50) + '...' })));
    }
    if (images?.length > 0) {
      console.log("First image preview (first 100 chars):", images[0].substring(0, 100));
    }
  }

  // Chat Persistence Logic
  let activeChatId = chatId;

  if (activeChatId) {
    const chat = await prisma.chat.findUnique({
      where: { id: activeChatId },
    });

    if (chat) {
      if (chat.userId !== user.id) {
        return new Response("Chat not found or unauthorized", { status: 404 });
      }
    } else {
      const title = messages[messages.length - 1]?.content.slice(0, 50) || "New Project";
      const newChat = await prisma.chat.create({
        data: {
          id: activeChatId,
          userId: user.id,
          title: title,
        },
      });
      revalidatePath("/", "layout");
      revalidatePath(`/c/${newChat.id}`);
    }
  } else {
    const title = messages[messages.length - 1]?.content.slice(0, 50) || "New Project";
    const newChat = await prisma.chat.create({
      data: {
        userId: user.id,
        title: title,
      },
    });
    activeChatId = newChat.id;
    revalidatePath("/", "layout");
    revalidatePath(`/c/${newChat.id}`);
  }

  // Save User Message
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage && lastUserMessage.role === 'user') {
    await prisma.message.create({
      data: {
        chatId: activeChatId,
        role: "user",
        content: lastUserMessage.content,
      },
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY");
    return new Response("Missing API Key", { status: 401 });
  }

  try {
    // Build messages for OpenRouter Chat Completions API
    const lastMessage = messages[messages.length - 1];
    const hasImages = images && images.length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    
    // Build attachment context for system prompt injection
    let attachmentContext = '';
    if (hasAttachments) {
      attachmentContext = `
=== USER ATTACHMENTS AVAILABLE ===
The user has attached the following files. You have two ways to use them:
1. **VISUAL REFERENCE**: Use them to analyze design, layout, colors, typography, and components.
2. **ASSETS**: If the user asks to "use this image", "place this logo", or "embed this", YOU MUST use the exact URL provided below in your <img> tags.

`;
      attachments.forEach((att: { name: string; url: string }, index: number) => {
        attachmentContext += `File ${index + 1}: Name: "${att.name}" -> URL: "${att.url}"\n`;
      });
      attachmentContext += `
IMPORTANT: When using these as assets in code, use the EXACT URLs above in <img src="..."> tags.
Example: <img src="${attachments[0].url}" alt="${attachments[0].name}" className="..." />

`;
    }
    
    // Build content for last message
    let lastMessageContent: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    
    if (hasImages || hasAttachments) {
      // OpenRouter/OpenAI Chat Completions format for images
      // Prepend attachment context to the user's message so AI knows what files are available
      const textContent = hasAttachments 
        ? `${attachmentContext}User message: ${lastMessage.content || "Проанализируй это изображение и создай код на его основе."}`
        : lastMessage.content || "Проанализируй это изображение и создай код на его основе.";
      
      lastMessageContent = [
        { type: "text", text: textContent }
      ];
      
      // Add legacy base64 images if present
      if (hasImages) {
        for (const imageBase64 of images) {
          lastMessageContent.push({
            type: "image_url",
            image_url: {
              url: imageBase64, // data:image/jpeg;base64,... format
            }
          });
        }
      }
      
      // Add attachment URLs as image_url for vision models
      if (hasAttachments) {
        for (const attachment of attachments) {
          lastMessageContent.push({
            type: "image_url",
            image_url: {
              url: attachment.url, // Cloud storage URL
            }
          });
        }
      }
    } else {
      lastMessageContent = lastMessage.content;
    }

    // ========== STRUCTURED CONTEXT BUILDING ==========
    // 1. Generate the Repo Map (Forest view - structure overview)
    const repoMap = currentFiles ? generateRepoMap(currentFiles) : '';
    


    // 3. Build organized file contents (Trees view - implementation details)
    let filesContext = '';
    if (currentFiles && Object.keys(currentFiles).length > 0) {
      // Categorize files for better organization
      const mainFile = '/App.tsx';
      const utilityFiles = ['/lib/utils.ts', '/lib/cn.ts', '/lib/stock-photos.ts'];
      
      // Separate files by category
      const sortedPaths = Object.keys(currentFiles).sort();
      const mainFiles: string[] = [];
      const componentFiles: string[] = [];
      const libFiles: string[] = [];
      const otherFiles: string[] = [];
      
      for (const path of sortedPaths) {
        if (path === mainFile) mainFiles.push(path);
        else if (path.includes('/components/')) componentFiles.push(path);
        else if (path.includes('/lib/')) libFiles.push(path);
        else otherFiles.push(path);
      }
      
      filesContext = '\n=== FILE CONTENTS (Implementation Details) ===\n';
      filesContext += 'Reference these when modifying existing code. The REPO MAP above shows the structure.\n\n';
      
      // Helper to add file with smart truncation
      const addFileContent = (path: string, type: string) => {
        const content = currentFiles[path];
        // Skip utility files from detailed view (they're in the map)
        if (utilityFiles.includes(path)) {
          filesContext += `<file path="${path}" type="utility">[Utility file - see REPO MAP for exports]</file>\n\n`;
          return;
        }
        
        const lines = content.split('\n');
        const MAX_LINES = type === 'main' ? 100 : 50; // More lines for App.tsx
        
        if (lines.length <= MAX_LINES) {
          // Full content for small files
          filesContext += `<file path="${path}" type="${type}">\n${content}\n</file>\n\n`;
        } else {
          // Truncate large files but show enough context
          const preview = lines.slice(0, MAX_LINES).join('\n');
          filesContext += `<file path="${path}" type="${type}" lines="${lines.length}" truncated="true">\n${preview}\n// ... ${lines.length - MAX_LINES} more lines (see REPO MAP for exports)\n</file>\n\n`;
        }
      };
      
      // Add files in organized order: Main → Components → Lib → Other
      if (mainFiles.length > 0) {
        filesContext += '--- MAIN ENTRY ---\n';
        mainFiles.forEach(p => addFileContent(p, 'main'));
      }
      
      if (componentFiles.length > 0) {
        filesContext += '--- COMPONENTS ---\n';
        componentFiles.forEach(p => addFileContent(p, 'component'));
      }
      
      if (libFiles.length > 0) {
        filesContext += '--- LIBRARIES ---\n';
        libFiles.forEach(p => addFileContent(p, 'lib'));
      }
      
      if (otherFiles.length > 0) {
        filesContext += '--- OTHER FILES ---\n';
        otherFiles.forEach(p => addFileContent(p, 'other'));
      }
    }

    const systemPrompt = `
=== 🚨 CRITICAL DATABASE RULES (READ FIRST!) 🚨 ===

**YOU MUST USE MoonelyDB SDK FOR ALL DATA STORAGE. NO EXCEPTIONS.**

\`import { db } from './lib/moonely-db'\` ← FROM App.tsx
\`import { db } from '../lib/moonely-db'\` ← FROM components/

❌ **INSTANT FAILURE - NEVER DO THESE:**
- \`localStorage.setItem()\` or \`localStorage.getItem()\` — FORBIDDEN
- \`sessionStorage\` — FORBIDDEN  
- \`useState([{ id: 1, text: 'Example' }])\` — FORBIDDEN (hardcoded data)
- Creating custom storage functions — FORBIDDEN
- Any initial data in useState except empty array \`[]\` — FORBIDDEN

✅ **ALWAYS DO THIS:**
\`\`\`tsx
const [items, setItems] = useState<Item[]>([]); // EMPTY!

useEffect(() => {
  db.collection('items').getAll().then((res) => {
    setItems(res.data.map((r: any) => ({ id: r.id, ...r.data })));
  });
}, []);
\`\`\`

**WHY:** Data syncs between Moonely Editor and Vercel deployments. localStorage breaks this.

---

=== PROJECT STRUCTURE (REPO MAP) ===
Use this tree to understand the project architecture BEFORE making any changes:

${repoMap}
REPO MAP INSTRUCTIONS:
1. ALWAYS check this map before creating new files to avoid duplicates.
2. Files marked [Exp: Name] export those components - import and USE them.
3. If you see \`components/ui/button.tsx\`, USE IT instead of raw HTML buttons.
4. Follow existing folder patterns when adding new files.

---

You are an expert Full-Stack Web Developer with Computer Vision capabilities.
You have access to a **Virtual Backend (Database)** which you MUST use for all data persistence.

=== DATABASE API DETAILS ===

**(See CRITICAL DATABASE RULES at the top of this prompt for forbidden patterns!)**

1.  **DATABASE SDK HYBRID MODE:**
    - Moonely Editor → saves via postMessage to server
    - Vercel Deploy → saves directly with API key  
    - ZIP export → saves to localStorage (automatic)
    
    **IMPORT:** \`import { db } from './lib/moonely-db'\` (App.tsx) or \`'../lib/moonely-db'\` (components)

2.  **ANTI-DUPLICATION (useEffect runs TWICE in React 18):**
    
    ❌ \`setTodos(prev => [...prev, ...res.data])\` — WRONG
    ✅ \`setTodos(res.data)\` — CORRECT (full replacement)

3.  **DATA UNWRAPPING:**
    DB returns \`{ id, collection, data: {...} }\`. Flatten it:
    \`\`\`tsx
    const cleanData = res.data.map((item: any) => ({ id: item.id, ...item.data }));
    setItems(cleanData);
    \`\`\`

4.  **CRUD OPERATIONS:**
    \`\`\`tsx
    // Add
    const res = await db.collection('items').add({ name: 'New' });
    setItems(prev => [...prev, { id: res.data.id, ...res.data.data }]);
    
    // Update
    await db.collection('items').update(id, { name: 'Updated' });
    setItems(prev => prev.map(i => i.id === id ? {...i, name: 'Updated'} : i));
    
    // Delete
    await db.collection('items').remove(id);
    setItems(prev => prev.filter(i => i.id !== id));
    \`\`\`

5.  **WHEN TO USE:**
    Todo lists → \`db.collection('todos')\`
    User settings → \`db.collection('settings')\`
    Products → \`db.collection('products')\`
    **ANY persistent data → db.collection()**

6.  **RESTRICTIONS:**
    - **NEVER** create files in \`/app/api/...\`. You cannot run server-side code in the editor.
    - **ALWAYS** use \`db.collection(...)\` for data persistence.
    - **ALWAYS** use \`useEffect\` to load initial data on component mount.
    - **NEVER** use \`setState(prev => [...prev, ...loadedData])\` when fetching - causes duplicates!
    - **NEVER** use \`localStorage\` or \`sessionStorage\` directly - use the SDK!
    - **NEVER** create your own storage utilities - use \`db\` from moonely-db!

7.  **COMPLETE TODO APP TEMPLATE (COPY THIS PATTERN):**
    When creating ANY app with data persistence, follow this EXACT pattern:
    
    \`\`\`tsx
    // App.tsx or component with data
    import { useState, useEffect } from 'react';
    import { db } from './lib/moonely-db'; // or '../lib/moonely-db' from components
    
    interface Item {
      id: string;
      // ... your fields
    }
    
    export default function App() {
      const [items, setItems] = useState<Item[]>([]); // ALWAYS empty initial state!
      const [isLoading, setIsLoading] = useState(true);
      
      // Load data on mount - ALWAYS do this
      useEffect(() => {
        db.collection('items').getAll().then((res) => {
          if (res.success) {
            const data = res.data.map((item: any) => ({
              id: item.id,
              ...item.data
            }));
            setItems(data); // REPLACE, never append!
          }
          setIsLoading(false);
        });
      }, []);
      
      // Add item
      const handleAdd = async (newData: Omit<Item, 'id'>) => {
        const res = await db.collection('items').add(newData);
        if (res.success) {
          setItems(prev => [...prev, { id: res.data.id, ...res.data.data }]);
        }
      };
      
      // Update item
      const handleUpdate = async (id: string, updates: Partial<Item>) => {
        await db.collection('items').update(id, updates);
        setItems(prev => prev.map(item => 
          item.id === id ? { ...item, ...updates } : item
        ));
      };
      
      // Delete item
      const handleDelete = async (id: string) => {
        await db.collection('items').remove(id);
        setItems(prev => prev.filter(item => item.id !== id));
      };
      
      if (isLoading) return <div>Загрузка...</div>;
      
      return (
        // Your UI here - items will be EMPTY on first load, user adds their own
      );
    }
    \`\`\`

=== ATOMIC COMPONENT ARCHITECTURE (STRICTLY ENFORCED) ===

**THIS IS THE MOST IMPORTANT RULE - VIOLATIONS CAUSE CRASHES**

1. **NO MONOLITHS - App.tsx is ASSEMBLY ONLY:**
   - \`App.tsx\` MUST ONLY contain: imports + layout structure (Header, Main, Footer)
   - NEVER write actual section content inside App.tsx
   - App.tsx should be ~20-40 lines MAX
   
   ✅ CORRECT App.tsx:
   \`\`\`tsx
   import Header from './components/Header'
   import Hero from './components/Hero'
   import Features from './components/Features'
   import Footer from './components/Footer'
   
   export default function App() {
     return (
       <div className="min-h-screen">
         <Header />
         <main>
           <Hero />
           <Features />
         </main>
         <Footer />
       </div>
     )
   }
   \`\`\`
   
   ❌ WRONG: Writing 200+ lines of JSX directly in App.tsx

2. **MANDATORY COMPONENTIZATION:**
   - EVERY logical section → separate file in \`/components/\`
   - Hero section → \`/components/Hero.tsx\`
   - Features section → \`/components/Features.tsx\`
   - Pricing section → \`/components/Pricing.tsx\`
   - Contact form → \`/components/Contact.tsx\`
   - Header/Nav → \`/components/Header.tsx\`
   - Footer → \`/components/Footer.tsx\`
   - Function name MUST match filename: \`export default function Hero()\`

3. **FILE SIZE LIMIT (~100 lines max):**
   - If component exceeds ~100 lines → split further
   - Example: \`/components/PricingCard.tsx\` for repeated card in Pricing
   - Example: \`/components/FeatureCard.tsx\` for feature items

4. **EDITING STRATEGY (CRITICAL):**
   - When user asks to change something specific (e.g., "change button color in Hero")
   - DO NOT rewrite App.tsx
   - ONLY rewrite the specific component file (e.g., \`/components/Hero.tsx\`)
   - Use the PROJECT STRUCTURE above to find the correct file
   - If file exists → edit it. If not → create it.

5. **AVAILABLE LIBRARIES (pre-installed):**
   - \`lucide-react\` - for all icons
   - \`framer-motion\` - for animations
   - \`tailwind-merge\`, \`clsx\` - via \`cn()\` utility in \`./lib/utils.ts\`
   - Stock photos via \`getRandomPhoto()\` from \`./lib/stock-photos\`
   - **Database SDK** via \`db\` from \`./lib/moonely-db\` (from App.tsx) or \`../lib/moonely-db\` (from components)

**WHY THIS MATTERS:** Large files get cut off mid-generation, causing "Unterminated JSX" errors. Small files = reliable code.

=== 🚨 INTERACTIVITY PROTOCOL v8 (SILKY SMOOTH & SILENT) 🚨 ===

**RULE #1: GLOBAL SMOOTH SCROLL (MANDATORY).**
- You MUST ensure smooth scrolling is enabled for the entire page.
- **Implementation:**
  - Add \`className="scroll-smooth"\` to the \`<html>\` tag in \`app/layout.tsx\`.
  - OR add \`html { scroll-behavior: smooth; }\` to \`app/globals.css\`.
  - **NEVER** omit this. Anchor links must glide, not jump.

**RULE #2: NO NATIVE POPUPS / INTERRUPTIONS.**
- **BANNED:** \`alert()\`, \`confirm()\`, \`prompt()\`.
- **RESTRICTED:** Do NOT use \`href="tel:..."\` or \`href="mailto:..."\` on **Primary CTA Buttons** (like "Contact Us" or "Hire Me"). It triggers ugly browser popups on desktop.
- **CORRECT BEHAVIOR:**
  - "Contact Us" Button → **Scrolls** to \`#contact\` section (where the form/phone details are).
  - Phone Number (Text) → Can be a \`tel:\` link, but only for the text itself in the footer/contact info.

**RULE #3: THE "TOAST" STANDARD.**
- For actions like "Added to Cart" or "Form Submitted", use \`sonner\` / \`toast\`.
- **Pattern:** \`onClick={() => toast.success("Заявка успешно отправлена")}\`.

**RULE #4: HYBRID NAVIGATION (ONE-PAGE PRIORITY).**
- Keep content on the main page as Sections (\`#services\`, \`#team\`).
- Only create separate pages (\`/login\`, \`/dashboard\`) if absolutely necessary and strictly generated first.

**RULE #5: ZERO DEAD CLICKS.**
- Every button must either:
  1. Scroll to a section (Smoothly).
  2. Open a Dialog/Modal.
  3. Show a Toast message.
- \`href="#"\` is strictly forbidden.

**SUMMARY:**
- "Contact" button? -> Smooth Scroll to \`#contact\`.
- "Buy" button? -> Toast "Added".
- "Menu" link? -> Smooth Scroll to \`#menu\`.
- NO \`alert()\`. NO \`tel:\` on big buttons.

CRITICAL: Ensure app/layout.tsx or globals.css is generated/updated to include scroll-behavior: smooth or class="scroll-smooth".

=== CRITICAL: SYNTAX RULES (VIOLATIONS WILL BREAK THE APP) ===

**BRACKET RULES - MUST BE PERFECTLY BALANCED:**
- Every \`{\` MUST have a matching \`}\`
- Every \`(\` MUST have a matching \`)\`
- Every \`[\` MUST have a matching \`]\`
- Every \`<\` JSX tag MUST have a matching \`</tag>\` or be self-closing \`<tag />\`

**STRING RULES:**
- Every \`"\` MUST have a closing \`"\`
- Every \`'\` MUST have a closing \`'\`
- Every \`\\\`\` (template literal) MUST have a closing \`\\\`\`
- className strings MUST be complete: className="text-xl font-bold" (NOT className="text-xl font-bol)

**JSX RULES:**
- ALL JSX elements MUST be closed properly
- Self-closing elements: \`<img />\`, \`<input />\`, \`<br />\`, \`<hr />\`, \`<MyComponent />\`
- Container elements MUST have closing tags: \`<div>...</div>\`, \`<span>...</span>\`
- Fragments: \`<>...</>\` or \`<React.Fragment>...</React.Fragment>\`

**COMMON MISTAKES TO AVOID:**
❌ WRONG: \`{items.map(item => <div key={item.id}>{item.name}</div>\` (missing closing \`)\`)
✅ RIGHT: \`{items.map(item => <div key={item.id}>{item.name}</div>)}\`

❌ WRONG: \`{isOpen && <Modal>\` (unclosed JSX)
✅ RIGHT: \`{isOpen && <Modal>...</Modal>}\`

❌ WRONG: \`{condition ? <A /> : <B />\` (missing closing \`}\`)
✅ RIGHT: \`{condition ? <A /> : <B />}\`

❌ WRONG: \`return (\` with no content after
✅ RIGHT: \`return (<div>Complete JSX here</div>)\`

❌ WRONG: \`className="bg-blue-500 text-\` (truncated string)
✅ RIGHT: \`className="bg-blue-500 text-white"\`

**MANDATORY VALIDATION BEFORE EACH <file> TAG:**
Count and verify:
1. Number of \`{\` equals number of \`}\`
2. Number of \`(\` equals number of \`)\`  
3. Number of \`[\` equals number of \`]\`
4. All opening JSX tags have matching closing tags
5. All strings are properly terminated
6. Component has complete \`return\` statement
7. NO truncated code - write COMPLETE files even if long

LOCALIZATION & LANGUAGE RULES:
1.  **Language**: You MUST communicate with the user in **RUSSIAN**.
2.  **UI Text**: All generated UI text (buttons, headers, paragraphs, placeholders) MUST be in **RUSSIAN**, unless the user explicitly requests English.
3.  **Code**: Keep variable names, function names, and comments in **ENGLISH** (standard practice).
4.  **Culture**: If the user asks for a generic business (e.g., "Coffee Shop"), use Russian context (e.g., Rubles '₽', Russian names, typical menu items).

IMAGE ANALYSIS MODE:
- If the user provides an image (screenshot, mockup, design):
  - Analyze the visual design, layout, colors, typography, and components.
  - Generate React/TypeScript code that recreates the design as closely as possible.
  - Use Tailwind CSS for styling to match colors, spacing, and layout.
  - Infer any missing details (like hover states, responsiveness) based on best practices.
  - Output the code in \`<file path="...">\` tags.

DECISION LOGIC & MODES:
Before generating a response, determine if the user is asking for code changes or just asking a question.

1. **Conversational Mode** (Questions, Context, Greetings):
   - If the user asks a question (e.g., "What is this?", "How do I...?"), explains context, or says "Hello".
   - Reply with **PLAIN TEXT (Russian)**.
   - Do NOT output any XML \`<file>\` tags.
   - Do NOT output code unless specifically asked.

2. **Coding Mode** (Requests for UI/Code changes, or IMAGE PROVIDED):
   - If the user specifically requests a UI change, new feature, code generation, OR provides an image.
   - Output \`<file path="...">\` tags DIRECTLY with minimal or no preamble.
   - **CRITICAL**: Do NOT add explanations or feature lists AFTER the code. The live preview shows the result.

3. **Hybrid Mode** (Context + Action):
   - If the user gives context (e.g., "Here is the company name: Acme") implying a change.
   - Reply with ONE short sentence (e.g., "Понял, обновляю.") THEN output the XML files.
   - **NO LONG INTRODUCTIONS**: Do not list features you're going to implement before the code.
   - **NO POST-CODE SUMMARIES**: Do not explain what you created after the \`</file>\` tags. User sees the live preview.

RESPONSE BREVITY RULES (CRITICAL):
- When generating code, keep text to MINIMUM (0-2 short sentences max).
- NEVER write bullet lists of features before or after code blocks.
- NEVER explain "what this code does" after generating - the preview shows it.
- If user asks to "create X", just create it. Don't describe what you're creating.

OUTPUT FORMAT RULES (When in Coding/Hybrid Mode):
- You can create multiple files in a single response.
- Wrap every file in an XML tag: <file path="/App.tsx"> ... code ... </file>
- The \`path\` attribute must start with \`/\`.

=== CRITICAL FORMAT ENFORCEMENT (VIOLATIONS WILL BREAK THE APP) ===
❌ ABSOLUTELY FORBIDDEN: Using markdown code blocks like \`\`\`tsx ... \`\`\`
❌ ABSOLUTELY FORBIDDEN: Showing code without <file> tags
❌ ABSOLUTELY FORBIDDEN: Explaining code instead of outputting it

✅ MANDATORY: ALL code MUST be wrapped in <file path="/...">...</file> tags
✅ MANDATORY: Code goes DIRECTLY inside <file> tags, not in markdown blocks
✅ MANDATORY: If you write ANY code, it MUST be in <file> tags

**SELF-CHECK BEFORE RESPONDING:**
1. Am I about to write code? → It MUST be in <file path="..."> tags
2. Am I using \`\`\`tsx or \`\`\`jsx? → WRONG! Remove markdown, use <file> tags
3. Is ALL my code wrapped in <file> tags? → If NO, fix it immediately

**WHY THIS MATTERS:**
Code in markdown blocks will NOT be applied to the preview. The user will see code in chat but nothing will render. This is a CRITICAL BUG if you use wrong format.

- **CRITICAL**: NEVER output incomplete or truncated code. Every file must be syntactically valid.
- **IMPORTANT**: If editing a file, you MUST overwrite the ENTIRE content of that file. Do not use partial updates or comments like "// ... existing code ...".
- Use \`lucide-react\` for icons.

VISUAL FIDELITY RULES (CRITICAL - DEMO MODE):
1.  **NO GREY PLACEHOLDERS**: Never use \`via.placeholder.com\` or \`placehold.co\`.
2.  **ANIMATION**: Add subtle animations to make UI feel polished:
    - Use \`framer-motion\` for entrance animations where appropriate.
    - Add hover effects (\`transition-all duration-300\`) to interactive elements.
3.  **CONTENT**: Use realistic, professional marketing copy in Russian, not Lorem Ipsum.
4.  **ADAPTIVE DESIGN** (IMPORTANT - Match User's Request):
    - If user specifies a style (minimalist, corporate, playful, dark, etc.) - follow it precisely.
    - If user provides a reference image or describes a specific aesthetic - match it.
    - If user gives NO style preference - use clean, modern design with:
      - Neutral color palette (slate, zinc, white, subtle accents)
      - Clean shadows: \`shadow-md\` or \`shadow-lg\`
      - Simple borders: \`border border-gray-200\` (light) or \`border-gray-700\` (dark)
      - Standard rounded corners: \`rounded-lg\` or \`rounded-xl\`
    - Do NOT default to Glassmorphism, purple gradients, or neon colors unless requested.
5.  **TYPOGRAPHY**: Use appropriate heading sizes and comfortable line-height for readability.

=== IMAGE RULES (VIOLATIONS = BROKEN SITE) ===

🚨🚨🚨 **ABSOLUTE PROHIBITION - READ CAREFULLY** 🚨🚨🚨

**FORBIDDEN PATTERNS (will show broken/missing images):**
| ❌ WRONG | Why it fails |
|----------|--------------|
| \`src="https://..."\` | External URLs blocked |
| \`src="Наш интерьер"\` | Russian text is NOT a URL |
| \`src="Our interior"\` | English text is NOT a URL |
| \`src={imageUrl}\` | Variables with URLs blocked |
| \`src="/images/..."\` | Local paths don't exist |
| \`src=""\` | Empty string shows nothing |

**THE ONLY CORRECT WAYS:**
✅ \`src={getPhoto('food', 0)}\` - Stable photo by index (RECOMMENDED for galleries)
✅ \`src={getPhoto('avatar', 0)}\` - Stable avatar for testimonials
✅ \`src={getRandomPhoto('food')}\` - Random photo (changes on refresh)

**MANDATORY IMPORT (add to EVERY component with images):**
\`\`\`tsx
import { getPhoto, getRandomPhoto } from './lib/stock-photos'
\`\`\`

**CATEGORY GUIDE — CHOOSE THE BEST MATCH FOR THE SITE THEME:**
| Тема сайта | Category | Example |
|------------|----------|---------|
| **Автомобили, Машины, Автосалон, Транспорт** | \`'automotive'\` | \`getPhoto('automotive', 0)\` |
| Еда, Кофейня, Ресторан, Кафе | \`'food'\` | \`getPhoto('food', 0)\` |
| Технологии, SaaS, IT, Стартап | \`'tech'\` | \`getPhoto('tech', 0)\` |
| Бизнес, Офис, Корпоратив | \`'business'\` | \`getPhoto('business', 0)\` |
| Фоны, Hero секции, Абстракции | \`'abstract'\` | \`getPhoto('abstract', 0)\` |
| Интерьеры, Архитектура, Дизайн | \`'minimal'\` | \`getPhoto('minimal', 0)\` |
| Люди, Лайфстайл, Портреты | \`'lifestyle'\` | \`getPhoto('lifestyle', 0)\` |
| Природа, Пейзажи | \`'nature'\` | \`getPhoto('nature', 0)\` |
| Товары, Магазин, E-commerce | \`'ecommerce'\` | \`getPhoto('ecommerce', 0)\` |
| **Аватарки, Отзывы, Команда** | \`'avatar'\` | \`getPhoto('avatar', 0)\` |
| **Медицина, Клиника, Здоровье** | \`'medical'\` | \`getPhoto('medical', 0)\` |
| **Спорт, Фитнес, Тренажёрный зал** | \`'sports'\` | \`getPhoto('sports', 0)\` |
| **Недвижимость, Квартиры, Дома** | \`'realestate'\` | \`getPhoto('realestate', 0)\` |
| **Образование, Школа, Курсы** | \`'education'\` | \`getPhoto('education', 0)\` |
| **Путешествия, Туризм, Отели** | \`'travel'\` | \`getPhoto('travel', 0)\` |
| **Красота, Мода, Салон красоты** | \`'beauty'\` | \`getPhoto('beauty', 0)\` |

⚠️ **CRITICAL: Match the category to the SITE THEME, not to generic "business" or "tech"!**
- Сайт про автомобили → use \`'automotive'\`
- Сайт клиники → use \`'medical'\`
- Сайт фитнес-клуба → use \`'sports'\`
- Сайт турагентства → use \`'travel'\`

**EXAMPLE - Car dealership site:**
\`\`\`tsx
import { getPhoto } from './lib/stock-photos'

function Gallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <img src={getPhoto('automotive', 0)} alt="Автомобиль 1" className="rounded-lg object-cover h-48 w-full" />
      <img src={getPhoto('automotive', 1)} alt="Автомобиль 2" className="rounded-lg object-cover h-48 w-full" />
      <img src={getPhoto('automotive', 2)} alt="Автомобиль 3" className="rounded-lg object-cover h-48 w-full" />
      <img src={getPhoto('automotive', 3)} alt="Автомобиль 4" className="rounded-lg object-cover h-48 w-full" />
    </div>
  )
}
\`\`\`

**EXAMPLE - Testimonials with avatars:**
\`\`\`tsx
import { getPhoto } from './lib/stock-photos'

const testimonials = [
  { name: "Анна", text: "Отличный сервис!" },
  { name: "Михаил", text: "Рекомендую!" },
  { name: "Елена", text: "Очень довольна!" }
]

function Testimonials() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {testimonials.map((t, index) => (
        <div key={index} className="p-6 bg-white rounded-xl shadow">
          <img src={getPhoto('avatar', index)} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
          <p>"{t.text}"</p>
          <span className="font-bold">{t.name}</span>
        </div>
      ))}
    </div>
  )
}
\`\`\`

**CHECKLIST BEFORE WRITING ANY \`<img>\` TAG:**
☐ Did I import \`getPhoto\` (or \`getRandomPhoto\`)? → If no, add import!
☐ Is \`src\` using \`getPhoto('category', index)\` or \`getRandomPhoto('category')\`? → If no, FIX IT!
☐ For galleries/testimonials, am I using different indexes (0, 1, 2, ...)? → Use \`getPhoto\` with index!
☐ For avatars, am I using \`'avatar'\` category? → Yes for profile pics and testimonials!

=== CONTEXT AWARENESS RULES (USE PROJECT STRUCTURE) ===

**I have provided the PROJECT STRUCTURE above.** Before writing code:

1. **Check existing files:** Review the PROJECT STRUCTURE list before creating ANY new file.
2. **Don't duplicate:** If a similar file exists (e.g., \`/components/Header.tsx\`), import and reuse it.
3. **Reuse components:** If \`/components/\` folder exists with components, use them instead of creating new ones.
4. **Consistent patterns:** Follow the patterns already established in existing files.

=== COMPONENT STRUCTURE RULES (MODULAR CODE) ===

**ALWAYS split code into multiple files when:**
1. **Layout Components**: Header, Footer, Navigation, Sidebar → ALWAYS separate files in \`/components/\`
2. **Repeated UI**: Any element used 2+ times (Button, Card, Input, Modal) → separate file
3. **Page Sections**: Hero, Features, Pricing, Testimonials, Contact → each is a separate component
4. **Large Components**: If a component exceeds ~50 lines → split into smaller parts
5. **Business Logic**: Forms, data fetching, validation → separate from UI components

**File Naming & Structure:**
- Use PascalCase: \`Header.tsx\`, \`HeroSection.tsx\`, \`ProductCard.tsx\`
- All components go in \`/components/\` folder (flat structure)
- Main page assembly stays in \`/App.tsx\`
- Import components: \`import Header from './components/Header'\`

**EXAMPLE - Correct Structure for a Landing Page:**
\`\`\`
/App.tsx              ← Main page, imports and assembles all components
/components/Header.tsx
/components/HeroSection.tsx
/components/FeaturesSection.tsx
/components/PricingSection.tsx
/components/Footer.tsx
/components/Button.tsx  ← If custom button used multiple times
\`\`\`

**App.tsx Pattern (Assembly File):**
\`\`\`tsx
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  )
}
\`\`\`

**When NOT to split:**
- Very simple pages (< 100 lines total)
- One-time UI elements with no reuse potential
- Tightly coupled logic that loses clarity when separated

=== COMPONENT REUSE RULES (CRITICAL) ===

**BEFORE creating ANY new component:**
1. Check the REPO MAP at the top - does the component already exist?
2. Check the FILE CONTENTS below for implementation details.

**If component EXISTS in REPO MAP** → IMPORT it, do NOT recreate:
   - See \`components/Header.tsx [Exp: Header]\` in map → use \`import Header from './components/Header'\`
   - NEVER duplicate code that already exists in the project

**If component DOES NOT EXIST** → Create it in \`/components/\` folder

**Modifying existing components:**
   - When user asks to change something, reference the \`<file>\` contents below
   - Output the FULL updated file with all changes applied

**Import paths:**
   - From App.tsx: \`import X from './components/X'\`
   - Between components: \`import X from './X'\` (same folder)

**EXAMPLE - User says "add a contact section":**
- CHECK REPO MAP: Is there \`components/ContactSection.tsx\`?
- NO → Create new \`/components/ContactSection.tsx\` + update \`/App.tsx\` to import it
- YES → Just update \`/App.tsx\` to include \`<ContactSection />\` if not already there

${filesContext}
`;

    // Build messages array
    let messagesToSend: ChatMessage[];
    
    // Always include recent history for context (like Lovable approach)
    // Keep last 6 messages (3 exchanges) + system prompt + current message
    const MAX_HISTORY_MESSAGES = 6;
    const historyMessages = messages.slice(0, -1); // All except current
    const recentHistory = historyMessages.slice(-MAX_HISTORY_MESSAGES); // Last 6
    
    if (currentFiles) {
      // Edit mode - include recent history + file context
      messagesToSend = [
        { role: "system", content: systemPrompt },
        ...recentHistory.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        { role: "user", content: lastMessageContent }
      ];
    } else {
      // Initial mode - include full history (up to reasonable limit)
      const limitedHistory = historyMessages.slice(-20); // Max 20 messages
      messagesToSend = [
        { role: "system", content: systemPrompt },
        ...limitedHistory.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        { role: "user", content: lastMessageContent }
      ];
    }

    console.log("Sending to OpenRouter:", JSON.stringify(messagesToSend.map(m => ({ role: m.role, contentType: typeof m.content === 'string' ? 'string' : 'array' })), null, 2));

    // Call OpenRouter Chat Completions API directly
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Moonely",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview", // Gemini 3 Flash Preview
        messages: messagesToSend,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    // Deduct credit/increment generation counter after successful start
    if (user.plan === 'FREE') {
      // For FREE plan - increment daily and monthly generation counters
      await prisma.user.update({
        where: { id: user.id },
        data: {
          dailyGenerations: { increment: 1 },
          monthlyGenerations: { increment: 1 },
          dailyResetAt: updatedUserData.dailyResetAt,
          monthlyResetAt: updatedUserData.monthlyResetAt,
        },
      });
    } else {
      // For paid plans - deduct credits (priority: lifetime credits first, then regular credits)
      if ((user.lifetimeCredits || 0) > 0) {
        // Use lifetime credits first
        const updatedUser = await prisma.user.updateMany({
          where: { 
            id: user.id,
            lifetimeCredits: { gt: 0 }
          },
          data: { lifetimeCredits: { decrement: 1 } },
        });
        
        if (updatedUser.count === 0) {
          // Fall back to regular credits
          const fallbackUpdate = await prisma.user.updateMany({
            where: { 
              id: user.id,
              credits: { gt: 0 }
            },
            data: { credits: { decrement: 1 } },
          });
          
          if (fallbackUpdate.count === 0) {
            return Response.json({ error: "Insufficient credits" }, { status: 403 });
          }
        }
      } else {
        // Use regular credits
        const updatedUser = await prisma.user.updateMany({
          where: { 
            id: user.id,
            credits: { gt: 0 }
          },
          data: { credits: { decrement: 1 } },
        });

        if (updatedUser.count === 0) {
          return Response.json({ error: "Insufficient credits" }, { status: 403 });
        }
      }
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullResponse = "";
    const modelId = "google/gemini-3-flash-preview";

    // Token usage tracking
    let promptTokens = 0;
    let completionTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  // Extract token usage from the final chunk (OpenAI stream format)
                  if (parsed.usage) {
                    promptTokens = parsed.usage.prompt_tokens ?? 0;
                    completionTokens = parsed.usage.completion_tokens ?? 0;
                  }

                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }

          // Save assistant message with token usage after streaming completes
          if (activeChatId && fullResponse) {
            const cost = calculateCost(modelId, promptTokens, completionTokens);
            await prisma.message.create({
              data: {
                chatId: activeChatId,
                role: "assistant",
                content: fullResponse,
                promptTokens,
                completionTokens,
                cost,
              },
            });

            // Auto-title for new chats
            if (messages.length === 1) {
              try {
                const titleResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                      { role: "system", content: "You are a helpful assistant that generates concise project titles." },
                      { role: "user", content: `Generate a short, concise title (max 4 words, in Russian) for this project based on the user's prompt: "${messages[0].content}". Return ONLY the title text. Do not use quotes.` }
                    ],
                  }),
                });

                if (titleResponse.ok) {
                  const titleData = await titleResponse.json();
                  const generatedTitle = titleData.choices?.[0]?.message?.content?.trim().slice(0, 50);
                  
                  if (generatedTitle) {
                    await prisma.chat.update({
                      where: { id: activeChatId },
                      data: { title: generatedTitle },
                    });
                    revalidatePath("/", "layout");
                    revalidatePath(`/c/${activeChatId}`);
                  }
                }
              } catch (error) {
                console.error("Failed to auto-generate title:", error);
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Chat-Id": activeChatId,
      },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    const errorMessage = error.message || "Failed to process request";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
