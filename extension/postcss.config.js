// Tailwind v4 uses an explicit PostCSS plugin entry. No `tailwind.config.js`
// is required for v4 — config lives in CSS via `@theme`/`@plugin` directives.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
