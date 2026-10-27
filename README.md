# FamilyVerse AI

A bilingual (English and Arabic) family decision simulator. Each family member is an AI agent with a half-hour routine, needs and three traits. The app simulates many weeks with and without a decision and shows wellbeing, a Family Harmony Index, conflict hotspots and ranked fixes.

Built by Abu Saeed Al Khodrey School (Track 2, Cycle 3) for the 6th Annual COE STEM Programming with AI Competition, theme "AI for Family".

## How the code is organised

Plain HTML, CSS and JavaScript. No framework, no build step, no database. Open `index.html` in a browser to run it.

| File | What it holds |
| --- | --- |
| `index.html` | Page shell: header, hero, step bar and six empty panels. Loads the scripts in order. |
| `styles.css` | All styling. Colours are CSS variables at the top (light and dark themes). Arabic uses `[dir="rtl"]`. |
| `js/engine.js` | The simulation engine: agent routines (48 half-hour slots a day), Monte Carlo weeks with a seeded random generator, wellbeing and harmony scores, hotspot rules, and the fix optimizer (`FIXES`, `optimize`). |
| `js/data.js` | The two example families (`FAMILIES`) and the nine preset decisions (`SCENARIOS`), each a list of effects. |
| `js/strings.js` | Every piece of interface text in English and Arabic (`STR`, `HOT`, `FIX_TXT`, `VOICE`, `GUIDE`, `EFFECT_TXT`). |
| `js/ui.js` | The interface: rendering each step, charts (hand-drawn SVG), the family orbit, events, and the AI features. |

## Rules to keep when changing the app

1. Keep every label bilingual: add new text to `js/strings.js` in both `en` and `ar`, never hard-code it in `ui.js`.
2. Keep the engine deterministic. Random numbers come from `rngFor(run, day, key)`, so "today" and "with the decision" share the same random weeks. Do not use `Math.random()` in the engine.
3. A decision is a list of effects (see `applyEffects` in `engine.js`). New decisions go in `SCENARIOS` in `data.js`.
4. The app must keep working without any AI connection. AI features always have an offline fallback (keyword matching for decisions, template sentences for agent voices).

## The AI features

Two places call a language model, both in `js/ui.js`:

- `understand()` turns a decision typed in Arabic or English into effects. It asks for JSON only and validates the reply with `cleanEffects()`.
- `aiVoices()` writes each agent's first-person voice and a four-step family majlis plan, in English and Arabic.

Both currently use the claude.ai artifact runtime (`window.claude.use('sample')`). Outside claude.ai that is not available, so the app shows "Offline engine" and uses the fallbacks. To use Gemini instead, replace the `S.sample.json(prompt, …)` calls with a Gemini API call that returns the same JSON, and set `S.sample` to an object with a `json(prompt)` method so the rest of the code works unchanged.

## Reference result

With the Al Mansoori family and "Dad takes a new job in Dubai", 60 weeks: harmony 77 today, 68 with the decision, 78 with the two best fixes (work from home Tuesday and Thursday, protected family dinner). If a change moves these numbers, it changed the engine.
