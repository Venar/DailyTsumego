# Daily Tsumego public site

This folder is the **public GitHub Pages site** for `Venar/DailyTsumego`. Copy its contents to the repository root (not this folder itself).

The private Google Apps Script publishes four current JSON feeds, a date-addressed archive for each band, and `archive/index.json`. The calendar reads only this static archive; it never calls the Go Problem API.

The public JSON includes solution data and SGF, so answers are accessible before a Recipe's configured reveal time. The reveal setting is a display preference, not access control. Confirm that the puzzle source permits public caching/redistribution before enabling public publishing.

See the separate setup guide for Apps Script, GitHub Pages, DNS, and TRMNL Recipe steps. Do not put the Apps Script source, RapidAPI key, or GitHub token in this repository.
