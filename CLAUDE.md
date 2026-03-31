# GhostReview VSCode Extension — Claude Code Instructions

## Project Overview
GhostReview is an AI-powered code review VSCode extension.
It reads git diffs and sends them to Groq for review via three personas.
Stack: TypeScript, VSCode Extension API, Groq SDK, esbuild bundler.

## Project Structure
```
src/
├── extension.ts          # activate/deactivate, registers provider + command
├── panels/
│   └── GhostReviewPanel.ts  # WebviewViewProvider, handles all messaging
├── services/
│   ├── gitService.ts     # reads git diff via child_process.execSync
│   ├── groqService.ts    # streams review via Groq SDK
│   └── dashboardService.ts  # sends completed reviews to dashboard API
├── config/
│   └── personas.ts       # PERSONA_CONFIGS + PERSONA_PROMPTS
└── webview/
    └── index.html        # full sidebar UI
```

## Commands
- Build: `npm run compile`
- Watch: `npm run watch`
- Package: `npx @vscode/vsce package`
- Publish: `npx @vscode/vsce publish -p [TOKEN]`

## VSCode Extension Settings
Defined in package.json under `contributes.configuration`:
- `ghostreview.groqApiKey` — Groq API key
- `ghostreview.defaultPersona` — default persona
- `ghostreview.apiToken` — GhostReview dashboard API token (gr_...)

## Code Rules — MUST follow every time

### TypeScript
- Strict mode always — no `any` types ever
- Define interfaces for all data shapes
- Named exports everywhere

### Architecture
- All VS Code API calls go through the panel or extension.ts
- All external HTTP calls go through services/
- Never make fetch calls directly in GhostReviewPanel.ts
- Never make fetch calls directly in extension.ts
- dashboardService.ts is the only file that talks to the dashboard API

### Error Handling
- Dashboard API calls must NEVER throw or interrupt the review flow
- Always wrap dashboard calls in try/catch and fail silently
- Never show dashboard errors to the user — review output is the priority
- Groq errors should be shown to the user clearly

### Dashboard Integration Rules
- Dashboard API URL: https://ghost-review-dashboard.vercel.app
- Use environment-aware URL via a constant — never hardcode inline
- If ghostreview.apiToken is not set — skip the API call silently
- If the API call fails for any reason — skip silently, never throw

### Webview (index.html)
- All styles inline in the HTML file — this is a webview constraint
- No external CSS files in webviews
- Use VSCode CSS variables for theming where possible
- GhostReview brand colors defined as CSS variables at top of style block

## Auth & Free Tier
- `authService.ts` handles JWT storage and OAuth flow
- JWT stored in `vscode.SecretStorage` under key `ghostreview.jwt`
- Free review count stored in `globalState` under key `ghostreview.freeReviewCount`
- Banner dismissed timestamp stored in `globalState` under key `ghostreview.bannerDismissedAt`
- Review routing: JWT → `POST /api/review`, Groq key → Groq direct stream, neither → `POST /api/free-review`
- `dashboardService.ts` is the only file that calls dashboard APIs (includes `callDashboardReview`, `callFreeReview`, `saveReview`)

## Do Not Touch
- `dist/` — build output, never edit manually
- `node_modules/` — never edit
- `.vscodeignore` — controls what gets packaged

## Brand
- Product name: GhostReview (capital G, capital R)
- Never mention Claude, Claude Code, or Anthropic anywhere
  in code, comments, or UI copy
- Dashboard URL: https://ghost-review-dashboard.vercel.app
