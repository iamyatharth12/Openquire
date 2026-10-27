# Openquire Research Product Specification

This specification describes user-visible behavior to guide an independent research product. It is informed by public Perplexity product documentation and by inspection of Openquire's current implementation; it does not claim knowledge of Perplexity's proprietary internals.

## Publicly documented reference behavior

- Search returns a synthesized answer grounded in web material, with inline citations that users can open to inspect supporting sources. Perplexity describes citations as clickable and frames source checking as part of the answer experience. [Getting started](https://www.perplexity.ai/en-GB/hub/getting-started) · [Search vs Computer](https://www.perplexity.ai/en-GB/hub/academy/search-vs-computer)
- Users can continue research in a thread, ask follow-up questions, and inspect sources while retaining conversational context. Perplexity's public product material describes source panels and follow-ups grounded in selected evidence. [Source exploration](https://www.perplexity.ai/en-GB/changelog/role-based-access-controls-api-credentials-and-brain-for-max)
- Deep Research is presented as a multi-source, multi-step workflow that returns a cited report; product documentation distinguishes it from a single focused answer. [Getting started](https://www.perplexity.ai/en-GB/hub/getting-started) · [Deep Research](https://www.perplexity.ai/en-GB/changelog/what-we-shipped---february-13-2026)
- Model and source controls may depend on account tier and context. The exact controls, quotas, source access, and workflow can change over time. Openquire should describe only controls it implements and can verify.

These are documented product descriptions, not a claim that every interaction was independently browser-tested in this session. Loading, cancellation, responsive layouts, and exact UI interaction details remain implementation requirements derived for Openquire, rather than claims about hidden Perplexity behavior.

## Openquire behavior requirements

### Search and conversation

1. The composer accepts a query by Enter or the submit button through one submission path. Shift+Enter inserts a line break. Empty input does not start a request.
2. Submission immediately creates or selects a conversation and shows a meaningful pending state. Each request has a visible success, empty-result, failure, or cancelled state.
3. Search results must come from the configured live search provider. Preserve retrieved sources if synthesis fails, and explain that synthesis did not complete.
4. A follow-up is appended to the conversation and retains earlier messages as context if the chosen model workflow supports it. Do not imply context that was not sent to the provider.
5. Persist conversation messages and citations together. After refresh, restore the answer and source links that were actually saved.

### Evidence and citations

1. Every displayed source has a title, canonical URL, domain, and real snippet or retrieved passage from that URL.
2. Citation markers link to the matching source; source inspection keeps the answer context available and clearly identifies the cited passage when available.
3. Validate citation indices against the exact source set supplied to the model. Invalid or missing citations must not be presented as verified.
4. If a page cannot be retrieved, preserve the search snippet and disclose retrieval status. A source search result alone is not proof that a page's contents were read.

### Deep Research and progress

1. Show only work that has actually started or completed: query planning, each search request, source retrieval, deduplication, synthesis, and report rendering.
2. Disclose whether planning is deterministic or model-generated. Do not label templated query variants as autonomous reasoning.
3. A report is complete only after synthesis succeeds against the collected sources. If there is no model key, no source set, or synthesis fails, show sources and a specific next step; do not fabricate a report or key takeaways.
4. Cancellation aborts outstanding requests, stops progress, and prevents late results from replacing a newer run.

### Models, keys, storage, and authentication

1. Show only providers and models backed by working adapters. Mark planned providers as unavailable, and prevent their IDs from being sent to another provider.
2. BYOK keys remain in browser-side storage and are sent only to the selected provider over HTTPS in the provider's supported authorization header. Never put keys in URLs, logs, conversation records, or Openquire/Supabase requests.
3. IndexedDB upgrades create missing stores without deleting existing stores or records; the application uses one coordinated database name/version policy.
4. Authentication and remote conversation sync require verified user identity and row-level data isolation. Report the feature as unavailable until live configuration and isolation are tested.

### Accessibility and responsive use

1. Keyboard users can submit, navigate source links, change modes/models, cancel work, and use dialogs without losing focus.
2. Loading/error states are announced accessibly; controls have accessible names and visible focus indicators.
3. Composer, navigation, source panels, reports, and dialogs fit narrow viewports without horizontal page overflow. Test the requested viewport matrix from 320×568 through 1440×900.
4. Both themes maintain readable text, focus, border, and interactive-state contrast.

## Repository audit at repair start

Status reflects code inspection only; a status of WORKING means the code path exists, not that a live integration was exercised.

| Area | Status | Evidence and limits |
|---|---|---|
| Landing composer Enter/button | WORKING in code; browser UNVERIFIED | Both route through `handleFormSubmit`; Enter invokes that handler and the form button submits the same form. |
| Live search | WORKING in code; live provider UNVERIFIED | `/api/search` calls configured Brave, Tavily, SearXNG, or DuckDuckGo provider. This session could not install dependencies or run the app. |
| Gemini grounded synthesis | WORKING in code; live API UNVERIFIED | Uses browser vault key, search/retrieval endpoints, and Gemini generation. Other providers do not share this implementation. |
| Deep Research | BROKEN before repair | Artificial delays, synthetic progress claims, and canned fallback report after synthesis errors. Repair now bases synthesis on collected real search results and reports errors without generating fallback conclusions. |
| OpenAI, Anthropic, OpenRouter | UNAVAILABLE / PARTIAL | Adapters explicitly say these integrations are in development. They are not working provider implementations. |
| IndexedDB vault | PARTIAL | Shared v2 opener creates credentials, preferences, and conversations stores and closes on version change. No migration conflict was reproduced because browser tooling and dependencies were unavailable. |
| Conversation persistence | PARTIAL | Local conversation service and Supabase synchronization code exist. Persistence after browser refresh and live cross-user isolation were not exercised. |
| Supabase auth | UNVERIFIED | Server code targets project `nfyrssyydowzsyicxkzn` and validates user requests through `@supabase/server`; no live credentials/authentication test was performed. |
| Uploads, theme, mobile layout | UNVERIFIED | UI and storage code exist; no browser-level interaction or viewport checks were run. |

## Follow-up verification

- Runtime/package manager: Node `v24.21.0`, npm `11.19.0`, Bun `1.4.4` (run from the npm cache because Bun was not initially installed).
- Dependency mismatch: `package.json` declared direct `esbuild@^0.25.0`; the lock pinned Vite `8.3.4`, whose optional esbuild peer accepts `^0.27.0 || ^0.28.0`. The same lock already contained esbuild `0.28.2` for `tsx`. The direct range was updated to `^0.28.0`; Bun updated the existing lockfile to resolve both uses to `0.28.2`.
- `bun install --frozen-lockfile`: passed after the lock update; Bun reported 204 installs checked across 289 packages without further lock changes.
- `npm run lint`: passed (`tsc --noEmit`). `npm run build`: passed with the existing Vite `__dirname` and large-chunk warnings.
- Focused research/source checks: 16 passed, 0 failed. They cover missing and invalid keys, exact provider model selection, using supplied sources without repeating search, source provenance conversion, citation validation, and key transport through the authorization header.
- Full `bun test`: 91 passed, 13 failed across 104 tests. Remaining failures are in profile/onboarding tests that reach the unavailable Supabase service and Supabase auth tests run without required URL/configuration. This is not a clean full-suite pass.
- The configured `npm test` script stops before running tests because this host's Node `os.userInfo()` fails with `uv_os_get_passwd returned ENOMEM`. A temporary compatibility preload allowed a run to start, but profile/onboarding tests still depended on blocked Supabase requests; the preload was removed afterward.
- Real-browser checks on the local app: Enter and the submit button both started the research view. DuckDuckGo was rate-limited; with a temporary local Wikipedia provider override, six real pages were retrieved and their full text was marked retrieved. Gemini provider validation succeeded and the API returned model choices. The key is stored in the browser's IndexedDB vault.
- Live Gemini synthesis did not complete. `gemini-2.5-flash` and `gemini-2.5-pro` returned `MODEL_NOT_FOUND` for this key; `gemini-flash-latest` and `gemini-3.8-flash` returned a high-demand provider error. No answer or citations were fabricated. Retrying from displayed evidence now passes the retained source set directly to synthesis rather than re-querying the rate-limited search provider.
- The user-provided key is not present in the tracked diff; the key-pattern scan only matched mock test credentials. The browser displayed a Supabase 401/RLS warning while saving guest conversations, so remote sync was not verified. Uploads, dark mode, refresh persistence, and the requested viewport matrix remain unverified.
- `git diff --check`: passed. `origin` is configured, but `git ls-remote --heads origin` could not connect to GitHub from this environment. Git `user.name` and `user.email` are unset; no identity was invented and no commit or push was made.

## Open questions

- Which search providers are reachable and permitted in the production deployment, and what are their real response characteristics?
- Does the configured Supabase project have the expected redirect URLs, deployed schema, and row-level policies?
- Which provider/model combinations have usable keys and quotas in a user's environment?
- Do the actual browser layouts pass keyboard, contrast, and requested viewport checks?
