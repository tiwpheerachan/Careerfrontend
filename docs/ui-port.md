# Porting the public pages (frontend/ → app/[locale])

The look must not change. Decisions (agreed with the project owner):

1. **Tailwind 3 → 4, look locked.** Sources were run through the official `@tailwindcss/upgrade`
   (shadow-sm→shadow-xs, backdrop-blur→backdrop-blur-sm, outline-none→outline-hidden, `!x`→`x!`,
   `bg-gradient-*`→`bg-linear-*`, `z-[60]`→`z-60` …). The 15 classes v3 never generated
   (`bg-black/18`, `bg-white/14|28|78|82|88|92`, `border-white/14|16`, `hover:bg-black/26`,
   `hover:bg-white/14|16`, `ring-white/12`, `sm:py-18`, `via-white/26`) were removed.
   v3 defaults v4 changed (hover on touch, ring colour, border colour, placeholder, button cursor)
   are restored in `app/globals.css`. Upgraded sources: see the porting notes in the PR.
2. **shadcn where behaviour is the same** — every `<select>` becomes shadcn `Select`; Dialog,
   Sheet, Tabs, Accordion, Pagination, Checkbox, Skeleton, Popover where they replace hand-made
   equivalents. Custom visuals (globe, marquee, orbit, flip cards, typing, bento) stay custom.
3. **Fix what was broken** — missing translation keys, raw keys on screen, empty sections, 404
   images (sections keep their current look; the missing file is simply not requested), the Jobs
   filters, the scroll-past-the-hero jump, hooks inside IIFEs, components defined inside render.
4. **Assets** — only files the pages use are copied to `public/` (same paths). Images through
   `next/image` where they are `<img>`; videos load lazily.

## Rules for ported code

- `cx` (lib/cx.ts, clsx without tailwind-merge) in ported markup — what the old `cn` did.
  `cn` (lib/utils.ts) only in shadcn components and new code.
- Data comes from the server: pages are server components that call `store()` repositories;
  interactive parts are small client components that receive data as props.
- Text comes from `messages/{th,en,zh}.json` via next-intl (`useTranslations` / `getTranslations`);
  arrays and objects via `t.raw()`. No hard-coded user-facing strings.
- Links via `Link` from `@/lib/i18n/navigation` (keeps the /th /en /zh prefix).
- Country names via `countryName(code, locale)` (lib/countries.ts) — jobs store ISO codes.
- Page-only CSS (keyframes, the old inline `<style>` blocks) goes in a CSS module beside the page.
