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
   `featured` (a number puts it on the home page, lowest first), `page` (a hand-built page to link to instead),
   `image`, `imageAlt`, `zoomlink`, `buttons`. The text below the front matter is the page.
4. Calendar events with no file here still appear; they link to a simple page built from the calendar entry.
5. Announce a cancellation by renaming that one occurrence in Outlook so the title starts "Cancelled:". It then shows
   in red on the website. Deleting an event just removes it, which is right for tidying up.
6. Put what people need in the Outlook entry too, plus the web address of the page, so people who only use the
   calendar subscription still see it. Use `npm run calendar -- details` to fill that in from these files.

Files starting with an underscore (like this one) are ignored by the website.
