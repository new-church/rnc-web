# How event details work

The church Outlook calendar ("Roseville New Church Events") is the single source of truth for what is on and when.
Dates, times, cancellations and one-off notes all come from there. This folder holds what a calendar entry can't:
the longer write-up, a picture, buttons and links.

1. Add or edit the event in Outlook as normal. Give repeating things the same title each time
   (for example "Meditation", "Talk on Tuesday").
2. To give an event a write-up, add a file here, e.g. `meditation.md`. It is matched to calendar events whose title
   contains the file name (dashes count as spaces) or one of the `match` phrases in the file. The longest match wins.
   An `exclude` list stops a file matching things it shouldn't (e.g. another church's service).
3. Front matter fields: `title`, `shortTitle`, `match`, `exclude`, `summary` (one or two sentences, used on cards
   and in the calendar entry), `category` (Worship, Study or Community), `where` (In person, On Zoom or Online),
   `oneOff` (true for a single event like the Christmas service: the page leads with the date, time and place and has no
   "Coming up" list), `featured` (a number puts it on the home page, lowest first), `page` (a hand-built page to link to instead),
   `image`, `imageAlt`, `zoomlink`, `buttons`. The text below the front matter is the page.
4. Calendar events with no file here still appear; they link to a simple page built from the calendar entry.
5. Announce a cancellation by renaming that one occurrence in Outlook so the title starts "Cancelled:". It then shows
   in red on the website. Deleting an event just removes it, which is right for tidying up.
6. Put what people need in the Outlook entry too, plus the web address of the page, so people who only use the
   calendar subscription still see it. Use `npm run calendar -- details` to fill that in from these files.

7. To promote an event on the home page (a big one that might be months away, like the Christmas service), add a line
   `Pin to home page` to its calendar entry, or run `npm run calendar -- update <eventId> --pin --apply`
   (`--unpin` removes it). The line itself is not shown on the website. Up to three pinned events show, soonest first,
   until they have finished. The picture, wording and any extra button come from the event's file here, so give a
   promoted event its own file (see `christmas-service.md`) with `image`, `summary` and `buttons`. A pinned event
   that is cancelled is not shown.

8. Photos live in `public/images/gallery/`, listed in `src/content/gallery.json` (an id, the file, alt text, a caption and
   tags). To add one, save the picture there (about 1200 pixels on the long side is plenty) and add an entry. To show
   photos on an event's page, list their ids under `gallery:` in its file (see `meditation.md`). The older historical
   photos (foundation stones, plaques) are stored there too, ready for a future history or gallery page.

Files starting with an underscore (like this one) are ignored by the website.
