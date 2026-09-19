# Real banknote photographs go here

Drop `500.jpg`, `200.jpg`, `100.jpg`, `50.jpg`, `20.jpg`, `10.jpg` in this
folder and `components/PriceInNotes.tsx` uses them instead of the drawn notes.
No other change: Vite picks them up at build time, hashes them, and the
service worker precaches them.

Two things to check before you do.

**Watermarks.** Most banknote photographs on an image search are stock-library
scans with "alamy" or "shutterstock" printed across them. On a projector, in
front of judges, that is worse than no photograph at all. RBI publishes its
own images of every current note at <https://paisaboltahai.rbi.org.in>.

**Size.** These render at 44 to 56 pixels wide. That is smaller than a
thumbnail: the portrait becomes three grey pixels and the numeral disappears.
What identifies a note to a person at that size is its COLOUR and its big
numeral, which is exactly what the drawn note in `components/RupeeNote.tsx`
keeps and a photograph loses. Crop tight — the numeral corner rather than the
whole note — if you use photographs at all.
