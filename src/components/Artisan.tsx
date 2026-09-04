/**
 * A woman knitting, for the two places where the app has nothing to show:
 * the first screen of the tour, and a home screen with no products on it.
 *
 * This is the illustration from the team's UI mockup, lifted at the mockup's
 * own resolution — 280x206 — and doubled to 560px so it holds up on a phone.
 * It is soft on a 3x screen. Getting it properly crisp needs the illustration
 * re-exported at size, or drawn as a vector; both are outside what a crop of a
 * screenshot can give us, and a redraw by hand did not look as good.
 *
 * JPEG, not PNG: the mint ground is a gradient, and quantising it to a palette
 * banded it into visible blotches. 34 KB at q88 against 130 KB for a clean PNG,
 * and this file is precached onto a metered phone.
 *
 * The size is fixed by `width` rather than filling its container, so it never
 * blows up past its own resolution and turns to mush.
 */
export default function Artisan({ width = 300 }: { width?: number }) {
  return (
    <img
      src="./artisan.jpg"
      alt="A woman knitting a shawl"
      width={width} height={Math.round(width * (206 / 280))}
      className="block max-w-full rounded-2xl"
    />
  )
}
