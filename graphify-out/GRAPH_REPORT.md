# Graph Report - syncsga-repo  (2026-06-16)

## Corpus Check
- 194 files · ~60,790 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1364 nodes · 2258 edges · 98 communities (81 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d4fccb3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `useAppStore` - 43 edges
2. `cn()` - 40 edges
3. `logger` - 33 edges
4. `RedisService` - 30 edges
5. `api` - 30 edges
6. `UniversalVideoSync` - 29 edges
7. `useAuth()` - 28 edges
8. `PageSkeleton()` - 27 edges
9. `ErrorPage()` - 23 edges
10. `verifyToken()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --calls--> `getEnv()`  [INFERRED]
  apps/api/src/index.ts → packages/config/src/env.ts
- `createServer()` --calls--> `getEnv()`  [INFERRED]
  apps/api/src/server.ts → packages/config/src/env.ts
- `getAiRouter()` --calls--> `getEnv()`  [INFERRED]
  apps/api/src/services/ai.service.ts → packages/config/src/env.ts
- `securityMiddleware()` --calls--> `isProduction()`  [INFERRED]
  apps/api/src/middleware/security.ts → packages/config/src/env.ts
- `csrfProtection()` --calls--> `isProduction()`  [INFERRED]
  apps/api/src/middleware/security.ts → packages/config/src/env.ts

## Import Cycles
- None detected.

## Communities (98 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (15): inter, metadata, viewport, GlobalShortcuts(), InnerProviders(), Providers(), SocketInitializer(), Shortcut (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (27): dependencies, compression, cookie-parser, cors, csrf, dotenv, express, helmet (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (24): useRetention(), colors, icons, Toast, ToastContainer(), ToastContext, ToastContextValue, ToastProvider() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (43): dependencies, autoprefixer, clsx, framer-motion, livekit-client, @livekit/components-react, lucide-react, next (+35 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (39): Core Concepts, Drift Correction, Events, Host, Implementing OSP, Message Format, Minimum Viable Implementation (Browser Extension), Overview (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (35): AI, anime:set_episode (host only), API Documentation, Auth, Auth Flow, Authentication, Base URL, chat:message (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (3): SyncMessage, UniversalVideoSync, VideoState

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (30): action, default_icon, default_popup, default_title, background, service_worker, type, browser_specific_settings (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (21): scripts, build, clean, db:generate, db:migrate, db:studio, dev, format (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (29): 1.1 Capture Layer, 1.2 Fingerprint Algorithm (Shazam-derived), 1.3 Fingerprint Database, 1.4 Matching Algorithm, 1. Audio Fingerprinting Pipeline, 2.1 Purpose, 2.2 Dual Approach, 2.3 Theme Song Database (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (12): chatHandler(), presenceHandler(), roomHandler(), heartbeatIntervals, logicalClocks, recentEvents, rttMap, syncHandler() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (13): RootLoading(), ClipsLoading(), CreateRoomLoading(), DashboardLoading(), DiagnosticsLoading(), DiscoverLoading(), FriendsLoading(), AnimeDetailLoading() (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (21): CloudflareConfig, CloudflareProvider, createCloudflareProvider(), EmbeddingResponse, TextGenerationResponse, createGeminiProvider(), GeminiConfig, GeminiProvider (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (18): AiCache, checkMessage(), detectPersonalInfo(), detectSpam(), ModerationResult, PROFANITY_WORDS, profanityPattern, sanitizeContent() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (25): supabase, verifyToken(), env, rateLimitMiddleware(), getUser(), router, getUser(), router (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (20): AnimeCharacter, AnimeEpisode, AnimeMedia, AnimeSong, AnimeStaff, AnimeTheme, ClientToServerEvents, Friend (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (21): compilerOptions, alwaysStrict, declaration, experimentalDecorators, inlineSourceMap, inlineSources, lib, module (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (9): ClipsError(), CreateRoomError(), DashboardError(), DiagnosticsError(), DiscoverError(), AnimeDetailError(), ClipDetailError(), SettingsError() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (18): env, generateAccessToken(), generateRefreshToken(), JwtPayload, RefreshJwtPayload, revokeAllRefreshTokens(), revokeRefreshToken(), rotateRefreshToken() (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (13): anilist, AnimeInfoSidebar(), AnimeInfoSidebarProps, jikan, CreateRoomPage(), AnimeDetailPage(), EmbedRoomPage(), cn() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.19
Nodes (18): background_color, categories, description, dir, display, display_override, icons, lang (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (18): dependencies, drizzle-orm, postgres, devDependencies, drizzle-kit, typescript, main, name (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (18): compilerOptions, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (20): cache, cache, dependsOn, pipeline, dependsOn, outputs, dependsOn, cache (+12 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (19): EpisodePicker(), EpisodePickerProps, Recommendation, TasteGraph(), REACTION_TYPES, ReactionBar(), TimelineReaction, TimelineReactions() (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): Activity, activityColors, activityIcons, activityLabels, FriendsFeed()

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (15): chatMessageSchema, chatReactionSchema, chatTypingSchema, kickBanSchema, presenceUpdateSchema, reactionAddSchema, roomJoinSchema, roomLeaveSchema (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (15): activityFeed, apiKeys, auditLogs, clips, embedConfigs, friendships, messages, notifications (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (3): RATE_LIMIT_TIERS, SAFE_METHODS, RedisService

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (15): Architecture, Client (apps/web/src/hooks/useSyncEngine.ts), Correction Strategies, Drift Calculation, Drift Status Badges, Host Failover, Host Heartbeat, Implementation Details (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (7): DiagnosticsPage(), DiagnosticResult, ExtensionDiagnostics(), Badge, BadgeProps, Card, CardProps

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (6): TwoFactorLoading(), ForgotPasswordLoading(), LoginLoading(), RegisterLoading(), ResetPasswordLoading(), LoadingSpinner()

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (8): supabase, useAuth(), AuthGuard(), publicPaths, signInWithOAuth(), LoginPage(), ProfilePage(), RegisterPage()

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (19): AuthCallbackPage(), AiRecap(), AiRecapProps, RecapData, ClipCapture(), formatTime(), useSocket(), SyncState (+11 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (13): Backend (Render), Cloudflare, Deployment Guide, Environment Variables, Environment Variables, Frontend (Vercel), Official Stack, PWA Distribution (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (13): dependencies, zod, devDependencies, typescript, main, name, private, scripts (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (12): csrfProtection(), securityMiddleware(), router, FeatureFlag, FeatureService, FlagConfig, FLAGS, Env (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (12): apps/api, apps/web, Architecture Standards, Backend Cleanup, Definition of Phase 1 Complete, Developer Experience, Frontend Cleanup, Goal (+4 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (11): description, devDependencies, esbuild, sharp, name, scripts, build, dev (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.35
Nodes (10): fetchJikan(), getAnimeCharacters(), getAnimeEpisodes(), getAnimeFullById(), getAnimeNews(), getAnimeRecommendations(), getAnimeStaff(), getAnimeThemes() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.35
Nodes (10): detectAnimeFromUrl(), fetchGraphQL(), getAnimeDetail(), getCurrentSeason(), getPopularThisSeason(), getTopRatedAnime(), getTrendingAnime(), guessAnimeFromTitle() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.30
Nodes (9): ContinueWatching, DashboardPage(), DiscoverPage(), DiscoverRoom, TrendingAnime, useAnalytics(), useStreakDisplay(), EmptyState() (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (10): devDependencies, typescript, main, name, scripts, build, dev, typecheck (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (16): description, engines, node, lint-staged, *.{ts,tsx,js,jsx}, *.{ts,tsx,js,jsx,json,css,md}, name, packageManager (+8 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): 1. Content Script ↔ Web App (chrome.runtime), 2. Content Script ↔ Server (WebSocket), Architecture, Communication Flow, Extension API, MutationObserver & SPA Support, Overlay UI, Popup UI (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (6): TwoFactorSetupPage(), RootError(), ForgotPasswordPage(), RoomError(), Button, ButtonProps

### Community 53 - "Community 53"
Cohesion: 0.23
Nodes (6): ClipsPage(), ClipPage(), api, ApiError, formatTime(), ResetPasswordPage()

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): Manifest, MessageCallback, MessageResponse, MessageSender, StorageArea, Tab, Window

### Community 57 - "Community 57"
Cohesion: 0.39
Nodes (4): CallbackLoading(), RoomLoading(), LoadingScreen(), QUOTES

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (4): { cpSync, mkdirSync, existsSync, rmSync }, dist, { execSync }, { join }

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, tsx, @types/cors, @types/csrf, @types/express, @types/jsonwebtoken, @types/node (+4 more)

### Community 64 - "Community 64"
Cohesion: 0.40
Nodes (4): mockDel, mockGet, mockKeys, mockSet

### Community 65 - "Community 65"
Cohesion: 0.60
Nodes (3): features, LandingPage(), testimonials

### Community 67 - "Community 67"
Cohesion: 1.00
Nodes (3): $(), getDashboardUrl(), setConnected()

### Community 74 - "Community 74"
Cohesion: 0.20
Nodes (11): devDependencies, husky, lint-staged, prettier, turbo, vitest, devDependencies, lint-staged (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (3): postcssPath, tailwindPath, config

### Community 77 - "Community 77"
Cohesion: 0.39
Nodes (6): SettingsPage(), Theme, ThemeConfig, themes, ThemeState, useThemeStore

### Community 78 - "Community 78"
Cohesion: 0.36
Nodes (5): FriendsPage(), Avatar(), AvatarProps, sizeMap, statusColors

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (7): Deployment, Key Features, License, Project Structure, Quick Start, SyncSaga, Tech Stack

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

### Community 82 - "Community 82"
Cohesion: 0.60
Nodes (3): name, private, version

### Community 83 - "Community 83"
Cohesion: 0.40
Nodes (3): AppError, ErrorCodes, errorHandler()

### Community 84 - "Community 84"
Cohesion: 0.40
Nodes (5): dependsOn, outputs, dependsOn, outputs, build

## Knowledge Gaps
- **551 isolated node(s):** `dev`, `build`, `start`, `lint`, `typecheck` (+546 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 20` to `Community 0`, `Community 39`, `Community 77`, `Community 78`, `Community 47`, `Community 52`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `Community 39` to `Community 0`, `Community 2`, `Community 38`, `Community 78`, `Community 47`, `Community 20`, `Community 53`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `logger` connect `Community 10` to `Community 33`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 83`, `Community 19`, `Community 63`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `dev`, `build`, `start` to the rest of the system?**
  _551 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06826241134751773 - nodes in this community are weakly interconnected._