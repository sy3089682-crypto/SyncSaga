# Graph Report - SyncSaga  (2026-06-03)

## Corpus Check
- 230 files · ~73,100 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1280 nodes · 1827 edges · 93 communities (71 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]

## God Nodes (most connected - your core abstractions)
1. `useAppStore` - 36 edges
2. `logger` - 31 edges
3. `cn()` - 31 edges
4. `RedisService` - 29 edges
5. `UniversalVideoSync` - 29 edges
6. `useAuth()` - 22 edges
7. `verifyToken()` - 21 edges
8. `compilerOptions` - 21 edges
9. `Analytics` - 20 edges
10. `api` - 18 edges

## Surprising Connections (you probably didn't know these)
- `getAiRouter()` --calls--> `getEnv()`  [INFERRED]
  apps/api/src/services/ai.service.ts → packages/config/src/env.ts
- `bootstrap()` --calls--> `getEnv()`  [INFERRED]
  apps/api/src/index.ts → packages/config/src/env.ts
- `createServer()` --calls--> `getEnv()`  [INFERRED]
  apps/api/src/server.ts → packages/config/src/env.ts
- `securityMiddleware()` --calls--> `isProduction()`  [INFERRED]
  apps/api/src/middleware/security.ts → packages/config/src/env.ts
- `csrfProtection()` --calls--> `isProduction()`  [INFERRED]
  apps/api/src/middleware/security.ts → packages/config/src/env.ts

## Import Cycles
- None detected.

## Communities (93 total, 22 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (24): useRetention(), colors, icons, Toast, ToastContainer(), ToastContext, ToastContextValue, ToastProvider() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (45): dependencies, clsx, framer-motion, livekit-client, @livekit/components-react, lucide-react, next, posthog-js (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (33): supabase, env, generateAccessToken(), generateRefreshToken(), JwtPayload, RefreshJwtPayload, revokeAllRefreshTokens(), revokeRefreshToken() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): Core Concepts, Drift Correction, Events, Host, Implementing OSP, Message Format, Minimum Viable Implementation (Browser Extension), Overview (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (35): AI, anime:set_episode (host only), API Documentation, Auth, Auth Flow, Authentication, Base URL, chat:message (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (20): AppError, ErrorCodes, errorHandler(), csrfProtection(), RATE_LIMIT_TIERS, rateLimitMiddleware(), SAFE_METHODS, securityMiddleware() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): dependencies, csstype, description, devDependencies, husky, lint-staged, prettier, turbo (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (3): SyncMessage, UniversalVideoSync, VideoState

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): action, default_icon, default_popup, default_title, background, service_worker, type, browser_specific_settings (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (22): AuthCallbackPage(), AiRecap(), AiRecapProps, RecapData, Recommendation, TasteGraph(), ClipsPage(), CreateRoomPage() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (20): TwoFactorSetupPage(), GlobalShortcuts(), InnerProviders(), SocketInitializer(), supabase, useAuth(), Shortcut, useKeyboardShortcuts() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (29): 1.1 Capture Layer, 1.2 Fingerprint Algorithm (Shazam-derived), 1.3 Fingerprint Database, 1.4 Matching Algorithm, 1. Audio Fingerprinting Pipeline, 2.1 Purpose, 2.2 Dual Approach, 2.3 Theme Song Database (+21 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (29): dependencies, compression, cookie-parser, cors, csrf, dotenv, express, helmet (+21 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (14): chatHandler(), presenceHandler(), roomHandler(), DRIFT_SLIGHT, DRIFT_SYNCED, HEARTBEAT_INTERVAL, logicalClocks, rttMap (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (18): AnimeInfoSidebar(), AnimeInfoSidebarProps, EpisodePicker(), EpisodePickerProps, jikan, ClipCapture(), formatTime(), EmbedRoomPage() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (20): checkMessage(), detectPersonalInfo(), detectSpam(), ModerationResult, PROFANITY_WORDS, profanityPattern, sanitizeContent(), AiRouter (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (9): Activity, activityColors, activityIcons, activityLabels, FriendsFeed(), api, ApiError, Button (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (17): REACTION_TYPES, ReactionBar(), TimelineReaction, TimelineReactions(), CinemaMode, CinemaOverlay(), modes, VirtualCinema() (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (18): CloudflareConfig, CloudflareProvider, createCloudflareProvider(), EmbeddingResponse, TextGenerationResponse, createGeminiProvider(), GeminiConfig, GeminiProvider (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, declaration, experimentalDecorators, inlineSourceMap, inlineSources, lib, module (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (20): AnimeCharacter, AnimeEpisode, AnimeMedia, AnimeSong, AnimeStaff, AnimeTheme, ClientToServerEvents, Friend (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (19): dependencies, drizzle-orm, postgres, devDependencies, drizzle-kit, @types/node, typescript, main (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (18): background_color, categories, description, dir, display, display_override, icons, lang (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (18): compilerOptions, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (15): chatMessageSchema, chatReactionSchema, chatTypingSchema, kickBanSchema, presenceUpdateSchema, reactionAddSchema, roomJoinSchema, roomLeaveSchema (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (15): activityFeed, apiKeys, auditLogs, clips, embedConfigs, friendships, messages, notifications (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (15): Architecture, Client (apps/web/src/hooks/useSyncEngine.ts), Correction Strategies, Drift Calculation, Drift Status Badges, Host Failover, Host Heartbeat, Implementation Details (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (14): dependencies, zod, devDependencies, @types/node, typescript, main, name, private (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (6): DiagnosticResult, ExtensionDiagnostics(), Badge, BadgeProps, Card, CardProps

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, tsx, @types/compression, @types/cookie-parser, @types/cors, @types/csrf, @types/express (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (13): Backend (Render), Cloudflare, Deployment Guide, Environment Variables, Environment Variables, Frontend (Vercel), Official Stack, PWA Distribution (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (5): router, FeatureFlag, FeatureService, FlagConfig, FLAGS

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (13): dependsOn, outputs, cache, persistent, globalDependencies, dependsOn, $schema, tasks (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (12): apps/api, apps/web, Architecture Standards, Backend Cleanup, Definition of Phase 1 Complete, Developer Experience, Frontend Cleanup, Goal (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (11): description, devDependencies, esbuild, sharp, name, scripts, build, dev (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (11): devDependencies, @types/node, typescript, main, name, scripts, build, dev (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.35
Nodes (10): detectAnimeFromUrl(), fetchGraphQL(), getAnimeDetail(), getCurrentSeason(), getPopularThisSeason(), getTopRatedAnime(), getTrendingAnime(), guessAnimeFromTitle() (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (4): createRoomSchema, requireAuth(), router, RoomService

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (9): anilist, ContinueWatching, DashboardPage(), DiscoverRoom, TrendingAnime, useAnalytics(), useStreakDisplay(), EmptyState() (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.35
Nodes (10): fetchJikan(), getAnimeCharacters(), getAnimeEpisodes(), getAnimeFullById(), getAnimeNews(), getAnimeRecommendations(), getAnimeStaff(), getAnimeThemes() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, typecheck (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (9): 1. Content Script ↔ Web App (chrome.runtime), 2. Content Script ↔ Server (WebSocket), Architecture, Communication Flow, Extension API, MutationObserver & SPA Support, Overlay UI, Popup UI (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 54 - "Community 54"
Cohesion: 0.36
Nodes (6): SettingsPage(), Theme, ThemeConfig, themes, ThemeState, useThemeStore

### Community 56 - "Community 56"
Cohesion: 0.25
Nodes (7): Deployment, Key Features, License, Project Structure, Quick Start, SyncSaga, Tech Stack

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (7): Manifest, MessageCallback, MessageResponse, MessageSender, StorageArea, Tab, Window

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (4): { cpSync, mkdirSync, existsSync, rmSync }, dist, { execSync }, { join }

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (4): inter, metadata, viewport, Providers()

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (4): mockDel, mockGet, mockKeys, mockSet

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (4): { execSync }, { existsSync, mkdirSync, copyFileSync }, iconsDir, { join }

## Knowledge Gaps
- **644 isolated node(s):** `name`, `version`, `private`, `description`, `workspaces` (+639 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `Community 13` to `Community 64`, `Community 2`, `Community 5`, `Community 15`, `Community 19`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 14` to `Community 9`, `Community 10`, `Community 46`, `Community 17`, `Community 18`, `Community 54`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `Community 9` to `Community 0`, `Community 10`, `Community 46`, `Community 14`, `Community 17`, `Community 18`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _644 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06802721088435375 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08362369337979095 - nodes in this community are weakly interconnected._