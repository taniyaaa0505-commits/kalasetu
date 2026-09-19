# The banknote photographs

These are the Reserve Bank of India's own SPECIMEN images of the current
Mahatma Gandhi (New) series, via Wikimedia Commons, every one of them under
**GODL-India** (Government Open Data License – India), which permits reuse
with attribution. That licence is why these and not the first images an image
search returns: those are stock-library scans with "alamy" printed across
them, and a watermark on a projector in front of judges is worse than no
photograph at all.

They carry RBI's red SPECIMEN overprint. That is deliberate and it stays: it
is what makes reproducing a banknote in an app unambiguous.

Resized to 360px wide and about 23 KB each — 148 KB for all six, which the
service worker precaches with the rest of the shell. They render at 48–64px,
so anything larger is bytes on a metered phone for pixels nobody sees.

`components/PriceInNotes.tsx` picks them up by filename at build time. Delete
one and that denomination falls back to the drawn note in
`components/RupeeNote.tsx`, which is still the offline-proof version.

## Attribution

- **₹500** — India new 500 INR, MG series, 2016, obverse.jpg
  GODL-India · Reserve Bank of India · https://commons.wikimedia.org/wiki/File:India_new_500_INR,_MG_series,_2016,_obverse.jpg
- **₹200** — India, 200 INR, 2018, obverse.jpg
  GODL-India · Reserve Bank of India · https://commons.wikimedia.org/wiki/File:India,_200_INR,_2018,_obverse.jpg
- **₹100** — India new 100 INR, Mahatma Gandhi New Series, 2018, obverse.jpg
  GODL-India · Reserve Bank of India · https://commons.wikimedia.org/wiki/File:India_new_100_INR,_Mahatma_Gandhi_New_Series,_2018,_obverse.jpg
- **₹50** — India new 50 INR, MG series, 2018, obverse.jpg
  GODL-India · Reserve Bank of India · https://commons.wikimedia.org/wiki/File:India_new_50_INR,_MG_series,_2018,_obverse.jpg
- **₹20** — India new 20 INR, MG series, 2019, obverse.jpg
  GODL-India · Reserve Bank of India · https://commons.wikimedia.org/wiki/File:India_new_20_INR,_MG_series,_2019,_obverse.jpg
- **₹10** — India new 10 INR, MG series, 2018, obverse.jpg
  GODL-India · Reserve Bank of India · https://commons.wikimedia.org/wiki/File:India_new_10_INR,_MG_series,_2018,_obverse.jpg
