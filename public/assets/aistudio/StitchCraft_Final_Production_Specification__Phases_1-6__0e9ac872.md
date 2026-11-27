# **STITCHCRAFT: FINAL PRODUCTION SPECIFICATION & DUAL-ENVIRONMENT ARCHITECTURE**

## **PART I: GITHUB FEATURE-BRANCH LOOP & AI EXECUTION PROTOCOL**

### **1\. Development Workflow (GitHub Feature Branches \+ Google AI Studio \+ Replit)**

This project is built iteratively across **Google AI Studio**, **GitHub**, and **Replit** using a strict **GitHub Feature-Branch Workflow**:

1. **One Branch Per Phase:** Every phase in Part III MUST be developed on its own dedicated GitHub feature branch branched off `main`:  
   * **Phase 1 Branch:** `phase-1-foundation`  
   * **Phase 2 Branch:** `phase-2-pattern-reader`  
   * **Phase 3 Branch:** `phase-3-row-counter`  
   * **Phase 4 Branch:** `phase-4-project-tracker`  
   * **Phase 5 Branch:** `phase-5-domain-tools`  
   * **Phase 6 Branch:** `phase-6-community-gallery`  
2. **Mandatory AI Branch-Advancement Prompt:** You MUST build strictly **one phase at a time**. Do not write code for future phases. When all checkpoint items for the current phase are complete and verified, you MUST stop generating new feature code and explicitly tell the user:  
   > *"Phase \[X\] is complete and verified\! Please commit your changes to `[current-branch]`, merge it into `main` on GitHub, and create a new feature branch named `[next-branch]` before we begin Phase \[X+1\]."*  
3. **Dual-Environment Loop (Google AI Studio $\leftrightarrow$ GitHub $\leftrightarrow$ Replit):**  
   * **Google AI Studio** runs the frontend in a client-side browser sandbox without a live Node.js server or database.  
   * **Replit** pulls from GitHub, runs the Express backend \+ Vite frontend, and persists data in Replit's built-in PostgreSQL database (`process.env.DATABASE_URL`).

### **2\. Strict Operating Rules for AI Coding Agents**

You are acting as an expert full-stack software engineer building **StitchCraft**, an amigurumi companion web application. Adhere strictly to these rules:

* **Strict Zero-Third-Party Service Policy:** You MUST NOT install, import, or integrate any third-party cloud platforms, Backend-as-a-Service (BaaS) providers, external databases, external authentication services, or paid API keys.  
  * **Forbidden:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Firebase, Clerk, Auth0, NextAuth external OAuth providers, YouTube Data API keys, embedded YouTube `<iframe>` players, Cloudinary, AWS S3, or external script/font CDNs.  
  * **Allowed:** Only **Google AI Studio**, **GitHub**, and **Replit** native environments, open-source npm packages running locally inside the workspace, standard HTML `<img>` tags rendering the `image_urls` stored in the SQL seed data, client-side `<canvas>` compressed photo Data URLs for user community posts, standard outbound hyperlinks (`<a href="..." target="_blank">`) to YouTube watch URLs, and built-in browser Web APIs.  
* **Display Exact SQL `image_urls`:** All pattern cards, the Pattern Reader media showcase, and linked project cards MUST display the actual images provided in `patterns.image_urls` (`pattern.image_urls[0]`, e.g., `https://img.youtube.com/vi/efHO6S5txaM/hqdefault.jpg`) using standard `<img>` tags (`object-cover`). Include a simple inline yarn-ball SVG fallback *only* for `onError` offline handling or custom projects not linked to a pattern.  
* **No Embedded Video Players (`<iframe>` Forbidden):** Never render a YouTube `<iframe>` player. Embedded iframes cause *"Video player configuration error"* inside sandboxed previews. Instead, convert `video_url` (`https://www.youtube.com/embed/{ID}`) into `https://www.youtube.com/watch?v={ID}` via `toYouTubeWatchUrl()` and render a clickable **"Watch Video Tutorial on YouTube ↗"** button (`target="_blank" rel="noopener noreferrer"`) that opens the video directly on YouTube in a new tab.  
* **Zero-3rd-Party Community Photo Uploads:** For user-uploaded finished plushie photos in `/gallery`, compress images in the browser using an HTML5 `<canvas>` element (`maxWidth: 800px`, JPEG quality `0.8`, \~80–120 KB) into a base64 `data:image/jpeg;base64,...` string and store it directly in Replit PostgreSQL (`TEXT`) and AI Studio `localStorage`.  
* **Unified Dual-Environment Architecture (Vite \+ React \+ Express):**  
  * Do **NOT** use Next.js App Router server middleware (`middleware.ts`), because Google AI Studio previews client-side React/Vite applications in a browser sandbox and cannot run a Next.js Node server.  
  * Build the frontend as a **Vite \+ React \+ TypeScript** Single Page Application (SPA) using `react-router-dom`, and place the Replit backend in `server/` using **Express** and `pg` (node-postgres).  
  * On boot, `src/lib/storageAdapter.ts` probes `GET /api/health` (`1500ms` timeout). If `200 OK`, it uses **Replit PostgreSQL Mode**; if unavailable (as in Google AI Studio), it seamlessly uses **AI Studio LocalStorage Mode** with zero errors.

### **3\. Phase Advancement Check-In Protocol**

Whenever the user asks, *"Am I ready to proceed to the next phase?"* (or at the end of a phase), verify these exact criteria before instructing them to cut the next GitHub branch:

* **Phase 1 (`phase-1-foundation`) Checkpoint:** Vite \+ React \+ Express folder structure initialized, Replit PostgreSQL DDL schema deployed (`users`, `patterns`, `user_projects`, `user_favorites`, `community_posts`, `post_likes`, `post_comments`), all 8 seed patterns \+ demo user \+ sample gallery posts seeded, `storageAdapter.ts` auto-detecting Replit vs. AI Studio mode, and self-contained auth working in both environments.  
* **Phase 2 (`phase-2-pattern-reader`) Checkpoint:** Home Dashboard (`/`), Pattern Library (`/patterns`) with search and category filters, Favorites toggle, and Interactive Pattern Reader (`/patterns/:id`) displaying the SQL `image_urls` thumbnails, direct clickable YouTube tutorial button (`watch?v=`), stitch decoder, and dynamic round-by-round written pattern accordions fully functional.  
* **Phase 3 (`phase-3-row-counter`) Checkpoint:** `useWakeLock` hook, `useSpeechRecognition` hook, and sticky `FloatingRowCounter` (with part selector, active project sync, and $64\times 64\text{px}$ touch controls) integrated into `/patterns/:id`.  
* **Phase 4 (`phase-4-project-tracker`) Checkpoint:** Project Tracker (`/projects`) supporting template-based and custom project creation, automatic row-range parsing (`parsePatternInstructionsToParts`), auto-completing parts/projects, `calculateOverallProgress()` progress bar, and CSV export (`stitchcraft_projects.csv`).  
* **Phase 5 (`phase-5-domain-tools`) Checkpoint:** Supplies & Safety Eye Comparison Tool (`/compare`) using `suppliesData.ts`, Pattern Resizer Calculator (`/calculator`) displaying all 4 result cards (including Poly-fil multiplier), and light/dark theme contrast audit complete.  
* **Phase 6 (`phase-6-community-gallery`) Checkpoint:** Community Showcase & Social Feed (`/gallery`) supporting `<canvas>`\-compressed photo uploads, pattern tagging (8 StitchCraft patterns or custom/other patterns), heart likes (`post_likes`), threaded comments (`post_comments`), 1-click **"Share to Gallery"** from completed projects in `/projects`, and GitHub \+ AI Studio \+ Replit end-to-end verification passed.

## **PART II: SOFTWARE SPECIFICATION & ARCHITECTURE DOCUMENT**

### **1\. Project Overview, Scope & Users**

#### **1.1 Fandom & Community Scope**

**StitchCraft** is a dedicated companion web application engineered specifically for the amigurumi crochet community. Amigurumi—the Japanese art of crocheting small, stuffed yarn creatures—requires specialized techniques distinct from standard garment or blanket crochet, including working in continuous spirals, maintaining tight stitch density to conceal poly-fil stuffing, and installing plastic safety eyes securely.

#### **1.2 Key Problems Solved**

1. **Hands-Free Row Tracking:** Prevents continuous screen timeouts while holding yarn and hooks.  
2. **Screen Wake Lock & Voice Controls:** Keeps the display active and enables hands-free row incrementing without touch interaction.  
3. **Yarn Weight Scaling & Eye Sizing:** Automatically adjusts safety eye sizes, hook sizes, and stuffing volume when changing yarn weights.  
4. **Safety Eye & Washer Backing Verification:** Matches yarn stitch density to correct washer profiles (flat vs. sinker/cupped) to prevent detachment.  
5. **Multi-Part Project Progress:** Tracks progress across separate pieces (head, body, limbs, wings, gills) before assembly.  
6. **Dynamic Part Breakdown:** Synchronizes tracking states against custom pattern parts rather than rigid presets.  
7. **Community Show & Tell:** Lets crafters share finished plushies tagged with the exact pattern, yarn weight, and hook size used, and interact through likes and comments.

#### **1.3 Explicit Scope Boundaries**

* **In Scope:** Browsing/searching/filtering the 8 curated amigurumi patterns with their SQL `image_urls`, favoriting patterns, reading full round-by-round written instructions, clicking direct outbound YouTube tutorial links, hands-free row counting synced to active projects, creating/editing/deleting/exporting personal plushie projects (both from templates and custom from scratch), comparing safety eye washers/yarns/stuffing, calculating yarn-weight scaling, and posting/liking/commenting on finished plushie photos in the Community Showcase Gallery.  
* **Explicitly Out of Scope:** Public written-pattern publishing by users, direct messaging, standalone unlinked yarn-skein inventory databases, and any third-party cloud/API integrations.

### **2\. Design System & Wireframe Architecture**

#### **2.1 Brand Style & Design Tokens**

| Token | Light Theme | Dark Theme | Purpose |
| :---- | :---- | :---- | :---- |
| `--bg-primary` | `#FDFBF7` (Warm Cream) | `#1A1D20` (Deep Slate) | Main page background |
| `--bg-surface` | `#FFFFFF` (Pure White) | `#25292E` (Card Grey) | Card & container backgrounds |
| `--text-primary` | `#2B2B2B` (Charcoal) | `#EAEAEA` (Soft White) | Primary typography |
| `--color-accent` | `#C86D51` (Terracotta) | `#E09F93` (Blush Pink) | Interactive elements & active buttons |
| `--color-secondary` | `#7A8B7B` (Sage Green) | `#95A796` (Muted Sage) | Secondary actions & badges |
| `--border-color` | `#E2DDD5` (Soft Beige) | `#363B42` (Dark Border) | Dividers & borders |

#### **2.2 Global Shell & Navigation**

```
RootLayout
├── GlobalNavbar
│   ├── BrandLogo ("StitchCraft") -> navigates to /
│   ├── PrimaryNavLinks: Home (/), Patterns (/patterns), My Projects (/projects), Gallery (/gallery), Compare (/compare), Calculator (/calculator)
│   ├── EnvironmentBadge ("Replit DB" | "AI Studio Sandbox")
│   ├── ThemeToggle (Feature #06: Light / Dark mode)
│   └── AuthControls ("Sign In" button or active Username + "Sign Out")
├── MainContentArea (Renders active route)
└── GlobalFooter (App title, zero-3rd-party badge, quick route links)
```

#### **2.3 View Breakdown & Component Trees**

##### **View 0: Craft Studio Dashboard (`/`)**

* **Purpose:** Entry landing dashboard providing quick resume for active WIPs, featured patterns, and tool shortcuts.  
* **Component Tree:**

```
HomeDashboardView
├── HeroBanner (App value proposition + primary CTA "Browse Patterns" -> /patterns)
├── ActiveProjectsSnapshot (If signed in with active WIPs: shows top 2 ProjectCards with "View All" -> /projects; if signed out: prompt to sign in or try Demo Crafter mode)
├── FeaturedPatternsRow (3 PatternCards: Classic Amigurumi Bumblebee, Fergus the No-Sew Frog, Baby Axolotl)
└── DomainToolsGrid (3 quick-launch cards: "Pattern Resizer & Eye Sizer" -> /calculator, "Safety Eye & Washer Guide" -> /compare, "Community Plushie Gallery" -> /gallery)
```

##### **View 1: Pattern Library & Directory (`/patterns`)**

* **Purpose:** Browse, search, and filter community amigurumi patterns.  
* **Component Tree:**

```
PatternLibraryView
├── SearchHeader (Feature #01: Real-time search input filtering by pattern title)
├── FilterToolbar (Feature #02: Category Pill Filters: "All", "Animals & Bugs", "Sea Life", "Seasonal & Fantasy" + "Favorites Only" toggle)
└── PatternGrid (Responsive 4-column desktop / 2-column tablet / 1-column mobile)
    └── PatternCard [xN]
        ├── PatternThumbnail (Renders pattern.image_urls[0] from SQL seed data with onError yarn-ball SVG fallback)
        ├── FavoriteButton (Feature #03: Toggle Favorite heart icon)
        ├── DifficultyBadge & CategoryBadge
        └── QuickSpecs (Yarn weight, Hook size, Safety eye size)
```

##### **View 2: Interactive Pattern Reader (`/patterns/:id`)**

* **Purpose:** Hands-free pattern view with the pattern's SQL thumbnail gallery, direct outbound YouTube tutorial link, full written instructions, step accordions, and sticky row tracker.  
* **Component Tree:**

```
PatternReaderView
├── PatternHeader (Title, DifficultyBadge, Category, Recommended Hook & Eye Size, FavoriteButton, "Start Project from Pattern" button)
├── MediaAndTutorialBar
│   ├── PatternImageShowcase (Feature #04: Renders pattern.image_urls from SQL seed data)
│   └── VideoTutorialLinkCard (Feature #05: Prominent "Watch Video Tutorial on YouTube ↗" outbound <a> button opening toYouTubeWatchUrl(video_url) in a new tab)
├── AbbreviationDecoderBar (Quick-reference pills decoding MR, sc, inc, dec, FLO, BLO, dc, tr, sl st)
├── PatternDetailsAccordion (Feature #10: Full round-by-round written pattern grouped by instructions JSON keys with checkable round rows)
└── FloatingRowCounter (Feature #07: Sticky Bottom Bar)
    ├── PartAndProjectSelector (Dropdowns to pick active Body Part & optional Linked Project)
    ├── CounterControls (64x64px "-" and "+" touch buttons, Reset button, Voice Mic toggle badge)
    └── WakeLockToggle (Keeps mobile display awake with browser support indicator)
```

##### **View 3: Amigurumi Project Tracker & Material Log (`/projects`) — *Primary CRUD View***

* **Purpose:** Create, edit, track, export, share, and delete personal Works-in-Progress (WIPs) and individual body parts.  
* **Component Tree:**

```
ProjectTrackerView
├── ActionHeader ("+ New Plushie Project" Modal Trigger + Status Filter tabs: All, In Progress, Planning, Completed, Frogged)
├── NewProjectModal (Create from Seed Pattern OR Custom From Scratch with custom part names & row counts)
├── ActiveProjectsGrid
│   └── ProjectCard [xN]
│       ├── ProjectThumbnail (Linked pattern's image_urls[0] or inline Yarn Ball SVG for custom projects)
│       ├── ProjectSpecsBadges (Target Yarn, Target Hook, Target Eye Size, Status dropdown)
│       ├── DynamicPartProgressList (Per-part row counter [- / +], current_row / total_rows display, auto-checked completion badge)
│       ├── OverallProgressBar (Feature #08: Calculated via calculateOverallProgress())
│       └── CardActions (Inline Personal Notes editor, "Share to Gallery" button on completed projects, Delete Project with confirmation)
└── ExportBar (Feature #11: "Export Projects to CSV" button downloading stitchcraft_projects.csv)
```

##### **View 4: Amigurumi Supplies & Eye Comparison Tool (`/compare`)**

* **Purpose:** Compare safety eye backings, yarn weights, and stuffing materials side by side using deterministic domain data.  
* **Component Tree:**

```
ComparisonView
├── CategoryTabs ("Safety Eye Washers", "Yarn Weights & Stitch Density", "Poly-Fil & Stuffing")
├── ItemSelectorPanel (2 dropdowns: Item A vs. Item B within selected category)
├── ComparisonTable (Feature #09: Side-by-Side Comparison Matrix of specs, security rating, best use cases, and pro tips)
└── CompatibilityNotes (Inline SVG cross-section diagram illustrating Flat Washer vs. Sinker/Cupped Washer locking mechanics)
```

##### **View 5: Pattern Resizer & Safety Eye Sizer (`/calculator`) — *Interactive Domain Tool***

* **Purpose:** Calculate scaling factors, hook adjustments, safety eye size changes, and poly-fil volume needs when changing yarn weights.  
* **Component Tree:**

```
ResizerCalculatorView
├── CalculatorForm
│   ├── PatternPresetDropdown (Optional: select one of the 8 patterns to auto-fill Original Yarn & Eye Size)
│   ├── OriginalYarnSelect & OriginalEyeInput (mm)
│   └── TargetYarnSelect
├── ResultsDashboard (4 Metric Cards)
│   ├── ScaledDimensionsCard (Calculated size multiplier, e.g., "1.36x larger")
│   ├── SafetyEyeRecommendation (Recommended mm diameter shift, e.g., "10mm")
│   ├── RecommendedHookCard (Zero-stuffing-leak hook size, e.g., "5.0mm")
│   └── StuffingEstimateCard (Calculated poly-fil volume multiplier, e.g., "1.84x stuffing")
└── QuickReferenceGuide (Summary chart of all 7 yarn weights from YARN_WEIGHT_MAP)
```

##### **View 6: Community Showcase & Social Feed (`/gallery`) — *Social Show & Tell***

* **Purpose:** Upload finished plushie photos, tag the pattern used (from StitchCraft or custom), and interact with fellow crafters via likes and comments.  
* **Component Tree:**

```
CommunityGalleryView
├── GalleryHeader (Title + "+ Share Finished Plushie" CTA button)
├── FilterAndSortBar
│   ├── PatternFilterDropdown ("All Patterns", 8 StitchCraft patterns, "Custom / Other Patterns")
│   └── SortToggle ("Newest" | "Most Liked")
├── CreatePostModal
│   ├── PhotoFileUploader (<input type="file" accept="image/*"> compressed via HTML5 <canvas> to Data URL)
│   ├── PatternTagSelector (Select one of the 8 patterns or enter custom pattern name)
│   ├── YarnAndHookInputs (Yarn weight & hook size used)
│   └── CaptionTextarea
└── SocialFeedGrid
    └── ShowcasePostCard [xN]
        ├── AuthorHeader (Username avatar badge, timestamp, Delete button if author)
        ├── PlushiePhoto (Compressed photo_data_url)
        ├── PatternBadgeLink (Clickable tag opening linked StitchCraft pattern in Pattern Reader)
        ├── CraftSpecsBadges (Yarn used, Hook used)
        ├── PostCaption
        ├── SocialActionBar (Interactive Heart Like button + count, Comment drawer toggle + count)
        └── CommentsThread (List of crafter comments + inline comment composer)
```

### **3\. Database Schema, Production Seed Script & Dual-Environment Storage**

#### **3.1 Replit Built-In PostgreSQL DDL Migration Script (`server/schema.sql`)**

Executed automatically on server startup in Replit against `process.env.DATABASE_URL`. Uses standard PostgreSQL `uuid-ossp` so all primary keys auto-generate cleanly:

```sql
-- Replit Built-In PostgreSQL DDL Migration Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Self-Contained Authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PATTERNS TABLE (Domain Content & Seed Data)
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(150) NOT NULL,
  difficulty VARCHAR(30) CHECK (difficulty IN ('Beginner', 'Advanced Beginner', 'Intermediate', 'Advanced')),
  yarn_weight VARCHAR(50) NOT NULL,
  recommended_hook VARCHAR(10) NOT NULL,
  recommended_eye_size VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  instructions JSONB NOT NULL,
  video_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER_PROJECTS TABLE (Primary CRUD Entity with Dynamic JSON map)
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
  project_name VARCHAR(150) NOT NULL,
  target_yarn VARCHAR(50) NOT NULL,
  target_hook VARCHAR(10) NOT NULL,
  target_eye_size VARCHAR(10) NOT NULL,
  -- Schema: {"part_name": {"current_row": 0, "total_rows": 15, "completed": false}}
  part_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_completion INT DEFAULT 0 CHECK (overall_completion BETWEEN 0 AND 100),
  status VARCHAR(20) DEFAULT 'In Progress' CHECK (status IN ('Planning', 'In Progress', 'Completed', 'Frogged')),
  personal_notes TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USER_FAVORITES TABLE (Many-to-Many Relationship)
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pattern_id)
);

-- 5. COMMUNITY_POSTS TABLE (Finished Plushie Showcase Gallery)
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
  custom_pattern_name VARCHAR(150),
  photo_data_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  yarn_used VARCHAR(80) DEFAULT 'Worsted (#4)',
  hook_used VARCHAR(20) DEFAULT '3.5mm',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. POST_LIKES TABLE (Community Post Hearts)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 7. POST_COMMENTS TABLE (Community Post Comments)
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **3.2 Production Seed Script (8 Amigurumi Patterns) (`server/seed.sql`)**

Run once on initialization (only when `SELECT COUNT(*) FROM patterns` equals `0` to prevent duplicate rows on server restart), along with 1 default demo user (`email: 'demo@stitchcraft.local'`, `username: 'CozyCrafter'`) and 3 sample community showcase posts:

```sql
INSERT INTO users (email, username, password_hash)
VALUES (
  'demo@stitchcraft.local',
  'CozyCrafter',
  '$2a$10$demoHashPlaceholderForLocalSelfContainedAuth000000000000'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO patterns (title, difficulty, yarn_weight, recommended_hook, recommended_eye_size, category, video_url, image_urls, instructions)
VALUES 
(
  'Classic Amigurumi Bumblebee',
  'Beginner',
  'Worsted (#4)',
  '3.5mm',
  '6mm',
  'Animals & Bugs',
  'https://www.youtube.com/embed/efHO6S5txaM',
  ARRAY['https://img.youtube.com/vi/efHO6S5txaM/hqdefault.jpg'],
  '{"body": ["R1 (Yellow): 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4: [2 sc, inc] x 6 (24)", "R5-6 (Yellow): Sc in each st around (24)", "R7-8 (Black): Sc in each st around (24)", "R9-10 (Yellow): Sc in each st around (24)", "R11-12 (Black): Sc in each st around (24)", "R13 (Yellow): [2 sc, dec] x 6 (18)", "R14: [1 sc, dec] x 6 (12)", "R15: Dec x 6 (6)"], "wings": ["In MR: [ch 2, 3 dc, ch 2, sl st]. Fasten off and leave tail for sewing."]}'
),
(
  'No-Sew Mini Whale',
  'Beginner',
  'Worsted Plush (#4)',
  '4.0mm',
  '6mm',
  'Sea Life',
  'https://www.youtube.com/embed/w1vSV4yy_lM',
  ARRAY['https://img.youtube.com/vi/w1vSV4yy_lM/hqdefault.jpg'],
  '{"whale": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4: [2 sc, inc] x 6 (24)", "R5-7: Sc in each st around (24)", "R8: 10 sc, Fin 1 [sl st, ch 2, 2 dc in same st, ch 2, sl st], 4 sc, Tail [sl st, (ch 3, 2 dc, ch 2, sl st) in same st, (ch 3, 2 dc, ch 2, sl st) in next st], 4 sc, Fin 2 [sl st, ch 2, 2 dc in same st, ch 2, sl st], 2 sc (24)", "R9 (White, BLO): [2 sc, dec] x 6 (18)", "R10: [1 sc, dec] x 6 (12)", "R11: Dec x 6 (6)"]}'
),
(
  'Fergus the No-Sew Frog',
  'Beginner',
  'Worsted (#4)',
  '3.5mm',
  '8mm',
  'Animals & Bugs',
  'https://www.youtube.com/embed/60t0lytJ4Tc',
  ARRAY['https://img.youtube.com/vi/60t0lytJ4Tc/hqdefault.jpg'],
  '{"eyes": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3-4: Sc in each st around (12)"], "body": ["R5: Ch 3, join eyes with sc, 11 sc on 1st eye, 3 sc in ch, 12 sc on 2nd eye, 3 sc in ch (30)", "R6-9: Sc in each st around (30)", "R10: [3 sc, dec] x 6 (24)", "R11: [2 sc, dec] x 6 (18)", "R12: [1 sc, dec] x 6 (12)", "R13: [1 sc, inc] x 6 (18)", "R14: [2 sc, inc] x 6 (24)", "R15: 5 sc, Arm 1 [ch 5, 2 sc, 2 sl st], 12 sc, Arm 2 [ch 5, 2 sc, 2 sl st], 7 sc (24)", "R16-18: Sc in each st around (24)", "R19: 4 sc, Leg 1 [ch 6, 3 sc, 2 sl st], 12 sc, Leg 2 [ch 6, 3 sc, 2 sl st], 8 sc (24)", "R20: Behind legs [2 sc, dec] x 6 (18)", "R21: [1 sc, dec] x 6 (12)", "R22: Dec x 6 (6)"]}'
),
(
  'Baby Axolotl',
  'Advanced Beginner',
  'Worsted (#4)',
  '3.5mm',
  '8mm',
  'Sea Life',
  'https://www.youtube.com/embed/il6KHblnEnk',
  ARRAY['https://img.youtube.com/vi/il6KHblnEnk/hqdefault.jpg'],
  '{"body": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4: [2 sc, inc] x 6 (24)", "R5-9: Sc in each st around (24)", "R10: [2 sc, dec] x 6 (18)", "R11: [1 sc, dec] x 6 (12)", "R12: Sc in each st around (12)", "R13: [1 sc, inc] x 6 (18)", "R14-17: Sc in each st around (18)", "R18: [1 sc, dec] x 6 (12)", "R19: Dec x 6 (6)"], "gills": ["Ch 4, sl st in 3 ch back down. Repeat x 2 to form 3 loops per gill."], "tail_fin": ["Attach yarn to back spine: [ch 2, 2 dc in same st, sl st down 3 st]."]}'
),
(
  'No-Sew Mini Octopus',
  'Beginner',
  'DK / Worsted (#3 / #4)',
  '3.5mm',
  '6mm',
  'Sea Life',
  'https://www.youtube.com/embed/QKg_GayyA2w',
  ARRAY['https://img.youtube.com/vi/QKg_GayyA2w/hqdefault.jpg'],
  '{"octopus": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4-6: Sc in each st around (18)", "R7 (FLO): [sl st, (ch 2, 2 dc in same st, ch 2, sl st)] x 8", "R8 (BLO of R6): [1 sc, dec] x 6 (12)", "R9: Dec x 6 (6)"]}'
),
(
  'Plush Sea Turtle',
  'Beginner',
  'Super Bulky Plush (#6)',
  '5.0mm',
  '10mm',
  'Sea Life',
  'https://www.youtube.com/embed/o_rsQnKVCEw',
  ARRAY['https://img.youtube.com/vi/o_rsQnKVCEw/hqdefault.jpg'],
  '{"shell": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4: [2 sc, inc] x 6 (24)", "R5: Sc in each st around (24)"], "limbs_and_belly": ["R6 (FLO): Head [ch 4, 3 dc, sl st], Fin 1 [ch 5, 3 tr, sl st], 4 sc, Back Fin 1 [ch 4, 2 dc, sl st], 2 sc, Back Fin 2 [ch 4, 2 dc, sl st], 4 sc, Fin 2 [ch 5, 3 tr, sl st]", "R7 (BLO): [2 sc, dec] x 6 (18)", "R8: [1 sc, dec] x 6 (12)", "R9: Dec x 6 (6)"]}'
),
(
  'No-Sew Ghost',
  'Beginner',
  'Worsted (#4)',
  '3.5mm',
  '10mm',
  'Seasonal & Fantasy',
  'https://www.youtube.com/embed/aJeId0PhbTU',
  ARRAY['https://img.youtube.com/vi/aJeId0PhbTU/hqdefault.jpg'],
  '{"ghost": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4: [2 sc, inc] x 6 (24)", "R5-12: Sc in each st around (24)", "R13: 6 sc, Arm 1 [ch 4, 3 sl st], 10 sc, Arm 2 [ch 4, 3 sl st], 4 sc (24)", "R14-16: Sc in each st around (24)", "R17 (FLO): [sl st, 3 dc in next st, sl st] x 8", "R18 (BLO of R16): [2 sc, dec] x 6 (18)", "R19: [1 sc, dec] x 6 (12)", "R20: Dec x 6 (6)"]}'
),
(
  'No-Sew Mini Dino',
  'Beginner',
  'Worsted (#4)',
  '3.5mm',
  '6mm',
  'Animals & Bugs',
  'https://www.youtube.com/embed/3klQ0qFmr_8',
  ARRAY['https://img.youtube.com/vi/3klQ0qFmr_8/hqdefault.jpg'],
  '{"dino": ["R1: 6 sc in MR (6)", "R2: Inc in each st around (12)", "R3: [1 sc, inc] x 6 (18)", "R4-7: Sc in each st around (18)", "R8: 4 sc, Arm 1 [ch 4, 3 sl st], 6 sc, Arm 2 [ch 4, 3 sl st], 6 sc (18)", "R9: [1 sc, dec] x 6 (12)", "R10: [1 sc, inc] x 6 (18)", "R11: 4 sc, Leg 1 [ch 4, 3 sl st], 6 sc, Leg 2 [ch 4, 3 sl st], 6 sc (18)", "R12: [1 sc, dec] x 6 (12)", "R13: Dec x 6 (6)"], "spikes": ["Attach accent yarn at top of head: [sl st, (ch 2, dc, sl st) in next st] repeat down spine."]}'
);
```

#### **3.3 Dual-Environment Storage Adapter (`src/lib/storageAdapter.ts`)**

* **Environment Detection:** On app initialization, `storageAdapter` probes `GET /api/health` (`1500ms` timeout).  
  * **Replit Mode (`apiAvailable = true`):** All auth, pattern, favorite, project, and gallery methods call the Express REST endpoints (`/api/*`), persisting directly to Replit's built-in PostgreSQL database.  
  * **Google AI Studio Mode (`apiAvailable = false`):** All methods read and write to namespaced `window.localStorage` keys (`stitchcraft_users`, `stitchcraft_session`, `stitchcraft_projects`, `stitchcraft_favorites`, `stitchcraft_gallery_posts`) pre-populated with `SEED_PATTERNS`, sample gallery posts, and the default demo account (`demo@stitchcraft.local`).

### **4\. Technical Architecture, API Routes, Auth & Domain Logic**

#### **4.1 Unified Repository Folder Structure**

```
stitchcraft/
├── index.html                      # Vite SPA entry point
├── package.json                    # Scripts: "dev" (Vite + Express concurrently), "build", "start"
├── vite.config.ts                  # Proxies /api/* to localhost:3001 during Replit dev
├── server/
│   ├── index.ts                    # Express server (serves /api/* and built dist/ in production)
│   ├── db.ts                       # Replit PostgreSQL connection pool (pg) + auto-schema/seed runner
│   ├── schema.sql                  # PostgreSQL DDL tables (7 tables)
│   └── seed.sql                    # 8 seed patterns + demo user + sample gallery posts
├── src/
│   ├── main.tsx                    # React DOM entry
│   ├── App.tsx                     # React Router routes (/, /login, /patterns, /patterns/:id, /projects, /gallery, /compare, /calculator)
│   ├── context/
│   │   ├── AuthContext.tsx         # Unified user session & 1-click Demo Crafter login
│   │   └── ThemeContext.tsx        # Light/Dark mode persisted in localStorage
│   ├── pages/
│   │   ├── HomePage.tsx            # View 0: Craft Studio Dashboard
│   │   ├── LoginPage.tsx           # Self-contained Sign In / Register / Demo Crafter login
│   │   ├── PatternLibraryPage.tsx  # View 1: Pattern Library & Directory
│   │   ├── PatternReaderPage.tsx   # View 2: Interactive Pattern Reader
│   │   ├── ProjectTrackerPage.tsx  # View 3: Amigurumi Project Tracker (Protected)
│   │   ├── ComparisonPage.tsx      # View 4: Supplies & Eye Comparison Tool
│   │   ├── CalculatorPage.tsx      # View 5: Pattern Resizer & Safety Eye Sizer
│   │   └── CommunityGalleryPage.tsx# View 6: Community Showcase & Social Feed
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── PatternThumbnail.tsx    # Renders pattern.image_urls[0] (and gallery) with onError yarn-ball fallback
│   │   └── FloatingRowCounter.tsx  # Sticky hands-free row counter (WakeLock, Speech, Project Sync)
│   ├── hooks/
│   │   ├── useWakeLock.ts          # Screen Wake Lock API hook with iframe try/catch guard
│   │   └── useSpeechRecognition.ts # Web Speech API voice listener hook with graceful fallback
│   ├── lib/
│   │   ├── seedData.ts             # TypeScript mirror of the 8 seed patterns + initial gallery posts
│   │   ├── suppliesData.ts         # Deterministic dataset for /compare (washers, yarns, stuffing)
│   │   ├── storageAdapter.ts       # Dual-mode bridge (Replit Express API <-> AI Studio localStorage)
│   │   ├── imageCompressor.ts      # Client-side HTML5 <canvas> image resizer/compressor (zero 3rd-party)
│   │   └── amigurumiMath.ts        # Scaling math, row-range parser, YouTube link formatter, progress helpers
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces
```

#### **4.2 Express API Route Mapping (`server/index.ts`)**

| Method | Endpoint | Description | Protected | Request / Response Contract |
| :---- | :---- | :---- | :---- | :---- |
| `GET` | `/api/health` | Runtime check for `storageAdapter` | No | Returns `{ ok: true, mode: 'replit-pg' }` |
| `POST` | `/api/auth/register` | Create local user account | No | Body: `{ email, username, password }` $\rightarrow$ sets `stitchcraft_session` HTTP-only cookie |
| `POST` | `/api/auth/login` | Authenticate user or demo account | No | Body: `{ email, password }` or `{ demo: true }` $\rightarrow$ sets cookie |
| `POST` | `/api/auth/logout` | Clear session cookie | No | Clears `stitchcraft_session` cookie |
| `GET` | `/api/auth/me` | Fetch active user session | No | Returns `{ user: User or null }` |
| `GET` | `/api/patterns` | Catalog search & category filter | No | Query: `?q=search&category=Sea+Life` $\rightarrow$ returns `Pattern[]` |
| `GET` | `/api/patterns/:id` | Fetch single pattern | No | Param: `id` $\rightarrow$ returns `Pattern` |
| `GET` | `/api/projects` | Fetch logged-in user's projects | Yes | Returns `UserProject[]` ordered by `updated_at DESC` |
| `POST` | `/api/projects` | Create new plushie project | Yes | Body: `{ pattern_id, project_name, target_yarn, target_hook, target_eye_size, part_progress }` |
| `PUT` | `/api/projects/:id` | Update progress, status, or notes | Yes | Body: `{ part_progress, overall_completion, status, personal_notes }` |
| `DELETE` | `/api/projects/:id` | Delete/frog a project | Yes | Param: `id` $\rightarrow$ returns `{ deleted: true }` |
| `GET` | `/api/favorites` | Get user's favorited pattern IDs | Yes | Returns `string[]` (`pattern_id` list) |
| `POST` | `/api/favorites` | Toggle pattern favorite status | Yes | Body: `{ pattern_id }` $\rightarrow$ returns `{ favorited: boolean }` |
| `GET` | `/api/gallery` | Fetch community showcase posts | No | Query: `?pattern_id=...&sort=newest` or `popular` $\rightarrow$ returns `CommunityPost[]` with likes & comments |
| `POST` | `/api/gallery` | Publish finished plushie post | Yes | Body: `{ pattern_id, custom_pattern_name, photo_data_url, caption, yarn_used, hook_used }` |
| `DELETE` | `/api/gallery/:id` | Delete own showcase post | Yes | Param: `id` $\rightarrow$ returns `{ deleted: true }` |
| `POST` | `/api/gallery/:id/like` | Toggle like on a showcase post | Yes | Param: `id` $\rightarrow$ returns `{ liked: boolean, like_count: number }` |
| `POST` | `/api/gallery/:id/comments` | Add comment to showcase post | Yes | Body: `{ body }` $\rightarrow$ returns `PostComment` |
| `DELETE` | `/api/gallery/:id/comments/:commentId` | Delete own comment | Yes | Params: `id`, `commentId` $\rightarrow$ returns `{ deleted: true }` |

#### **4.3 User Flows, State Rules & Edge-Case Behavior**

1. **SQL Pattern Thumbnails & Direct YouTube Tutorial Navigation (`PatternThumbnail` & `toYouTubeWatchUrl`):**  
   * Always display the pattern's SQL `image_urls` (`pattern.image_urls[0]`) via `PatternThumbnail.tsx` on Dashboard cards, Pattern Library cards, the Pattern Reader showcase, and linked Project Tracker cards (falling back to a simple inline yarn-ball SVG only if `onError` fires or for custom unlinked projects).  
   * Never render an embedded `<iframe>` player.  
   * On `/patterns/:id`, render a prominent **"Watch Video Tutorial on YouTube ↗"** button (`<a href={toYouTubeWatchUrl(pattern.video_url)} target="_blank" rel="noopener noreferrer">`). `toYouTubeWatchUrl` converts `https://www.youtube.com/embed/efHO6S5txaM` into `https://www.youtube.com/watch?v=efHO6S5txaM`, taking the user straight to the video on YouTube without player configuration errors while keeping their written pattern open in StitchCraft.  
2. **Community Showcase & Photo Compression (`imageCompressor.ts` & `/gallery`):**  
   * Anyone (including guests) can browse, filter, and read comments in `/gallery`.  
   * Uploading a photo, liking a post, or posting a comment prompts guest users with the **"1-Click Demo Crafter Sign-In"** or **"Sign In / Register"** flow.  
   * When a user selects a photo file (`<input type="file" accept="image/*" />`), `compressImageToDataUrl(file)` draws it onto an off-screen HTML5 `<canvas>` scaled to a maximum width of `800px` and exports a lightweight JPEG Data URL (`quality: 0.8`), keeping payloads small (\~80–120 KB) for PostgreSQL and `localStorage` with zero external storage providers.  
   * Completed projects in `/projects` (`overall_completion === 100` or `status === 'Completed'`) display a **"Share to Gallery"** button that navigates to `/gallery` and opens the post composer pre-filled with that project's pattern, yarn, and hook.  
3. **Authentication & Guest Favorites:**  
   * Navigating to `/projects` when signed out redirects to `/login?next=/projects`.  
   * Clicking a Favorite heart icon on `/patterns` or `/patterns/:id` when signed out opens a compact prompt with a **"1-Click Demo Crafter Sign-In"** button and a **"Sign In / Register"** link rather than failing silently.  
4. **Row Counter Synchronization (`FloatingRowCounter` on `/patterns/:id`):**  
   * Displays a **Body Part Selector** populated from the pattern's `instructions` keys and an **Active Project Selector** showing any of the user's `user_projects` matching that `pattern_id` (plus a `"Standalone (Session Only)"` option).  
   * When linked to a project, tapping `+` or `-` (or speaking `"Next"` / `"Count"` / `"Back"` / `"Previous"`) updates that part's `current_row`, recalculates `overall_completion`, and persists via `storageAdapter.updateProject()` (debounced `500ms`).  
   * When unlinked or signed out, counts persist in `sessionStorage` keyed by `pattern.id` and `partName`.  
5. **Auto-Completion Rules:**  
   * Whenever a body part's `current_row` reaches or exceeds `total_rows`, its `completed` flag automatically sets to `true` (and reverts to `false` if decremented below `total_rows`).  
   * Whenever `calculateOverallProgress(part_progress)` equals `100`, the project's `status` automatically updates to `'Completed'` (unless the user explicitly sets it to `'Frogged'`).  
6. **CSV Export Format (`Feature #11`):**  
   * Clicking **"Export Projects to CSV"** generates `stitchcraft_projects.csv` client-side with exact headers: `project_name,status,target_yarn,target_hook,target_eye_size,overall_completion,parts_summary,personal_notes,updated_at`

#### **4.4 Wake Lock & Hands-Free Web Speech API Spec**

* **Screen Wake Lock API (`src/hooks/useWakeLock.ts`):** Calls `navigator.wakeLock.request('screen')` when toggled on, wrapped in `try/catch` so sandboxed iframes never throw uncaught errors and instead display a tooltip: *"Wake Lock unavailable in embedded preview; touch controls active."*  
* **Web Speech API (`src/hooks/useSpeechRecognition.ts`):** Uses `window.SpeechRecognition || window.webkitSpeechRecognition` with `continuous = true`. Recognizes `"next"` or `"count"` (`+1` row) and `"back"` or `"previous"` (`-1` row). Automatically hides the mic toggle with a clean fallback badge if unsupported by the browser.  
* **Touch Ergonomics:** `+` and `-` buttons are rendered at `64px x 64px` minimum with high-contrast `--color-accent` fill for effortless single-tap operation while holding yarn.

#### **4.5 Deterministic Mathematical & Parsing Logic (`src/lib/amigurumiMath.ts`)**

```ts
export interface PartProgressItem {
  current_row: number;
  total_rows: number;
  completed: boolean;
}

const YARN_WEIGHT_MAP: Record<string, { weight: number; baseHook: number; baseEye: number }> = {
  'Fingering Cotton (#1)': { weight: 1, baseHook: 2.0, baseEye: 6 },
  'Sport Cotton (#2)': { weight: 2, baseHook: 2.5, baseEye: 8 },
  'DK / Worsted (#3 / #4)': { weight: 3.5, baseHook: 3.25, baseEye: 6 },
  'Worsted (#4)': { weight: 4, baseHook: 3.5, baseEye: 8 },
  'Worsted Plush (#4)': { weight: 4, baseHook: 4.0, baseEye: 8 },
  'Chunky Plush (#5)': { weight: 5, baseHook: 5.0, baseEye: 12 },
  'Super Bulky Plush (#6)': { weight: 6, baseHook: 5.0, baseEye: 10 },
};

export function toYouTubeWatchUrl(videoUrl: string): string {
  return videoUrl.replace('/embed/', '/watch?v=');
}

export function parsePatternInstructionsToParts(
  instructions: Record<string, string[]>
): Record<string, PartProgressItem> {
  const result: Record<string, PartProgressItem> = {};

  for (const [partName, lines] of Object.entries(instructions)) {
    let totalRows = 0;
    for (const line of lines) {
      const rangeMatch = line.trim().match(/^R(\d+)(?:-(\d+))?/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;
        totalRows += Math.max(1, end - start + 1);
      } else {
        totalRows += 1;
      }
    }
    result[partName] = {
      current_row: 0,
      total_rows: Math.max(1, totalRows),
      completed: false,
    };
  }

  return result;
}

export function calculateAmigurumiScale(
  originalYarnKey: string,
  targetYarnKey: string,
  originalEyeSizeMm: number
) {
  const orig = YARN_WEIGHT_MAP[originalYarnKey] || YARN_WEIGHT_MAP['Worsted (#4)'];
  const target = YARN_WEIGHT_MAP[targetYarnKey] || YARN_WEIGHT_MAP['Super Bulky Plush (#6)'];

  const scaleRatio = target.weight / orig.weight;
  const estimatedSizeMultiplier = Math.round(Math.pow(scaleRatio, 0.75) * 100) / 100;
  const recommendedEyeSize = Math.round(originalEyeSizeMm * Math.sqrt(scaleRatio));

  return {
    scaleRatio: estimatedSizeMultiplier,
    recommendedHook: `${target.baseHook}mm`,
    recommendedEyeSize: `${recommendedEyeSize}mm`,
    stuffingMultiplier: Math.round(Math.pow(scaleRatio, 1.5) * 100) / 100,
  };
}

export function calculateOverallProgress(
  partProgress: Record<string, PartProgressItem>
): number {
  const parts = Object.values(partProgress);
  if (parts.length === 0) return 0;

  const totalRowsSum = parts.reduce((sum, p) => sum + Math.max(1, p.total_rows), 0);
  const currentRowsSum = parts.reduce(
    (sum, p) => sum + Math.min(p.current_row, p.total_rows),
    0
  );

  return Math.min(100, Math.round((currentRowsSum / totalRowsSum) * 100));
}
```

#### **4.6 Deterministic Comparison Dataset (`src/lib/suppliesData.ts`)**

Used by `/compare` (`Feature #09`) so no comparison data is guessed:

* **Safety Eye Washers:**  
  1. `Standard Flat Plastic Washer` — Grip: Moderate; Best For: Tight cotton/worsted stitches (`#1`–`#4`); Installation: Snap flat side toward eye post; Risk Note: Can slip through wide plush loops.  
  2. `Sinker / Cupped Safety Washer` — Grip: High (recesses eye into head); Best For: Chunky & Super Bulky plush chenille (`#5`–`#6`); Installation: Cupped rim faces away from eye post to pull eye inward; Risk Note: Requires firm thumb pressure or washer tool.  
  3. `Metal Locking Star Washer` — Grip: Maximum (permanent teeth); Best For: Display pieces requiring rigid hold; Installation: Press flat with hollow tube; Risk Note: Cannot be removed once seated.  
* **Yarn Weights & Stitch Density:**  
  1. `Fingering / Sport Cotton (#1–#2)` — Stitch Definition: Crisp & architectural; Stuffing Visibility: Nearly zero; Best Hook: `2.0mm–2.5mm`.  
  2. `Worsted Acrylic / Cotton (#4)` — Stitch Definition: Balanced & beginner-friendly; Stuffing Visibility: Low with `3.5mm` hook; Best Hook: `3.5mm–4.0mm`.  
  3. `Super Bulky Plush Chenille (#6)` — Stitch Definition: Soft & fuzzy (harder to see loops); Stuffing Visibility: Moderate if tension is loose; Best Hook: `5.0mm–6.0mm`.  
* **Stuffing Materials:**  
  1. `Standard Poly-Fil Fiberfill` — Loft: Medium-high; Washability: Machine washable; Best For: General plushies & limbs.  
  2. `Cluster Fiberfill (Silicone-Coated)` — Loft: High bounce, resists clumping; Washability: Machine washable; Best For: Large plush toys (`#5`–`#6` yarn).  
  3. `Weighted Poly-Pellets (in Nylon Pouch)` — Loft: Zero (adds base weight); Washability: Hand wash; Best For: Sitting plushies (Frog, Dino, Octopus).

### **5\. Feature Implementation Matrix**

| Feature \# | Feature Name | Integrated Location | Technical Implementation |
| :---- | :---- | :---- | :---- |
| **\#01** | Search Bar | Pattern Library (`/patterns`) | Filters Replit PostgreSQL (`ILIKE '%query%'`) or AI Studio `localStorage` by `title`. |
| **\#02** | Category Filters | Pattern Library (`/patterns`) | Multi-select pills (`Animals & Bugs`, `Sea Life`, `Seasonal & Fantasy`) \+ Favorites filter. |
| **\#03** | Pattern Favorites | Cards & Pattern Reader | Toggles `user_favorites` in Replit PostgreSQL or AI Studio `localStorage` (with demo sign-in prompt if signed out). |
| **\#04** | SQL Image Gallery | Pattern Cards & Reader (`/patterns/:id`) | Renders the exact `pattern.image_urls` from the SQL seed script (with an inline yarn-ball SVG fallback only on error or for custom projects). |
| **\#05** | Direct YouTube Tutorial Link | Pattern Reader (`/patterns/:id`) | Outbound **"Watch Video Tutorial on YouTube ↗"** button converting `video_url` via `toYouTubeWatchUrl()` and opening directly on YouTube in a new tab (zero `<iframe>` errors). |
| **\#06** | Theme Toggle | Global Navbar | Tailwind `dark` class synced with browser `localStorage`. |
| **\#07** | Interactive Row Counter | Pattern Reader (`/patterns/:id`) | Screen Wake Lock API \+ Web Speech API listener \+ $64\times 64\text{px}$ touch buttons \+ active project/part sync. |
| **\#08** | Dynamic Progress Bar | Project Tracker (`/projects`) | Calculated dynamically via `calculateOverallProgress()` with automatic part/project completion. |
| **\#09** | Eye & Supply Matrix | Comparison View (`/compare`) | Side-by-side matrix powered by `suppliesData.ts` \+ inline SVG washer cross-section diagram. |
| **\#10** | Dynamic Accordions | Pattern Reader (`/patterns/:id`) | Collapsible accordions displaying the full round-by-round written pattern generated from `patterns.instructions` JSON keys. |
| **\#11** | Stash & Project CSV Export | Project Tracker (`/projects`) | Client-side CSV generator downloading `stitchcraft_projects.csv` with formatted part progress. |
| **\#12** | Community Showcase & Social Feed | Community Gallery (`/gallery`) & Project Tracker (`/projects`) | Photo upload compressed via HTML5 `<canvas>` (zero 3rd-party), pattern tagging (8 StitchCraft patterns or custom), heart likes, threaded comments, and 1-click "Share to Gallery" from completed projects. |

## **PART III: 6-PHASE FEATURE-BRANCH IMPLEMENTATION ROADMAP**

### **Phase 1 — Branch: `phase-1-foundation` (Database, Storage Adapter & Self-Contained Auth)**

* Initialize unified **Vite \+ React \+ TypeScript** frontend and **Express** backend (`server/index.ts`) with `package.json` scripts configured for Replit (`concurrently` running Vite \+ Express on port `5000` with `/api` proxy) and Google AI Studio (standard `vite` preview).  
* Create `server/schema.sql` (all 7 tables including `community_posts`, `post_likes`, and `post_comments`), `server/seed.sql` (using the exact 8-pattern SQL seed script in Section 3.2 \+ demo user \+ 3 sample gallery posts), and `src/lib/seedData.ts` mirroring those records for AI Studio mode.  
* Build `server/db.ts` (`pg` pool auto-initializing schema & seed data when `DATABASE_URL` is present) and `src/lib/storageAdapter.ts` (`/api/health` auto-detection bridging Replit PostgreSQL and AI Studio `localStorage`).  
* Implement self-contained authentication (`bcryptjs` \+ `jose` JWT HTTP-only cookie in Express, mirrored in `AuthContext.tsx` with 1-click **Demo Crafter** login).  
* **End-of-Phase Action:** Stop and instruct the user to merge `phase-1-foundation` into `main` on GitHub and create branch `phase-2-pattern-reader`.

### **Phase 2 — Branch: `phase-2-pattern-reader` (Dashboard, Pattern Library & Interactive Pattern Reader)**

* Implement Express endpoints `GET /api/patterns`, `GET /api/patterns/:id`, `GET /api/favorites`, and `POST /api/favorites`.  
* Build `PatternThumbnail.tsx` rendering `pattern.image_urls[0]` (and multi-image gallery in `/patterns/:id`) directly from the SQL data, with an `onError` inline yarn-ball SVG fallback.  
* Build `HomePage.tsx` (`/`), `PatternLibraryPage.tsx` (`/patterns`), and `PatternReaderPage.tsx` (`/patterns/:id`) featuring the direct outbound **"Watch Video Tutorial on YouTube ↗"** button (`toYouTubeWatchUrl`), crochet abbreviation decoder bar, and dynamic written-pattern accordions parsed from `instructions` JSON keys.  
* **End-of-Phase Action:** Stop and instruct the user to merge `phase-2-pattern-reader` into `main` on GitHub and create branch `phase-3-row-counter`.

### **Phase 3 — Branch: `phase-3-row-counter` (Hands-Free Ergonomics, Voice Controls & Project Sync)**

* Build `useWakeLock.ts` (with iframe `try/catch` safety) and `useSpeechRecognition.ts` (listening for `"Next"`, `"Count"`, `"Back"`, `"Previous"`).  
* Build `FloatingRowCounter.tsx` with $64\times 64\text{px}$ touch targets, body part selector, linked project selector (syncing debounced updates to `storageAdapter`), and `sessionStorage` fallback for unlinked sessions.  
* **End-of-Phase Action:** Stop and instruct the user to merge `phase-3-row-counter` into `main` on GitHub and create branch `phase-4-project-tracker`.

### **Phase 4 — Branch: `phase-4-project-tracker` (Project Tracker CRUD, Row-Range Parser & CSV Export)**

* Implement `parsePatternInstructionsToParts()`, `calculateOverallProgress()`, and auto-completion rules in `src/lib/amigurumiMath.ts`.  
* Build Express endpoints `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id`, and `DELETE /api/projects/:id`.  
* Build `ProjectTrackerPage.tsx` (`/projects`) with template & custom project creation modal, per-part row increment/decrement controls, inline notes, and `stitchcraft_projects.csv` download.  
* **End-of-Phase Action:** Stop and instruct the user to merge `phase-4-project-tracker` into `main` on GitHub and create branch `phase-5-domain-tools`.

### **Phase 5 — Branch: `phase-5-domain-tools` (Domain Tools & Contrast Audit)**

* Build `ComparisonPage.tsx` (`/compare`) powered by `src/lib/suppliesData.ts` and an inline SVG diagram comparing Flat vs. Sinker safety eye washers.  
* Build `CalculatorPage.tsx` (`/calculator`) with pattern preset auto-fill and all 4 output cards (Dimension Scale, Safety Eye mm, Recommended Hook, and Poly-fil Stuffing Multiplier).  
* Execute light/dark theme contrast audit (`#FDFBF7` vs. `#1A1D20`).  
* **End-of-Phase Action:** Stop and instruct the user to merge `phase-5-domain-tools` into `main` on GitHub and create branch `phase-6-community-gallery`.

### **Phase 6 — Branch: `phase-6-community-gallery` (Community Showcase, Social Feed & Final Sync)**

* Build `src/lib/imageCompressor.ts` using HTML5 `<canvas>` to resize and compress user-uploaded plushie photos (`maxWidth: 800px`, JPEG `0.8`) into lightweight Data URLs with zero third-party storage.  
* Implement Express endpoints `GET /api/gallery`, `POST /api/gallery`, `DELETE /api/gallery/:id`, `POST /api/gallery/:id/like`, `POST /api/gallery/:id/comments`, and `DELETE /api/gallery/:id/comments/:commentId` (plus `storageAdapter` `localStorage` fallback).  
* Build `CommunityGalleryPage.tsx` (`/gallery`) with pattern filter, sort toggle (`Newest` / `Most Liked`), photo upload modal, clickable pattern tags, heart likes, and threaded comments, plus a 1-click **"Share to Gallery"** button on completed projects in `/projects`.  
* Verify identical behavior across **Google AI Studio** and **Replit** via GitHub sync.  
* **End-of-Phase Action:** Stop and instruct the user to merge `phase-6-community-gallery` into `main` on GitHub for final release.