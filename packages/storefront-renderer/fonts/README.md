# Shared storefront fonts

Inter and Roboto variable TrueType fonts are bundled for the Gallery, Builder,
and live storefront through `../styles.css`. Arial and Georgia use system fonts.
Each font is licensed under SIL Open Font License 1.1; the corresponding license
files are included here. Normal weights 100–900 are available; italic text uses
the browser's normal synthesis behavior.

Downloaded 2026-10-08 from the Google Fonts repository:

- https://github.com/google/fonts/tree/main/ofl/inter
- https://github.com/google/fonts/tree/main/ofl/roboto

Both applications bundle the same bytes. No Google Fonts stylesheet or external
font request is needed at runtime. Fonts are fetched only when used by a page.
