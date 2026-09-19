/**
 * The QR code, drawn as SVG.
 *
 * Printed on a paper tag and tied to the pot, so anyone holding the object
 * can reach its card. That is the point of the whole feature: the code lives
 * ON the product, not in an app she has to be signed into.
 *
 * SVG rather than canvas because it is sharp on a thermal printer, on a
 * phone, and in a screenshot of a slide, and because it costs no pixels to
 * store. `qrcode-generator` is ~14 KB, MIT, and does nothing but arithmetic —
 * no network, so a tag can be made with no signal at all.
 */
import qr from 'qrcode-generator'

export default function QrCode({ text, className = '' }: { text: string; className?: string }) {
  // Type 0 = smallest that fits; 'M' = 15% of the code can be dirt, ink
  // bleed or a thumbprint and it still reads. A tag lives in a workshop.
  const code = qr(0, 'M')
  code.addData(text)
  code.make()

  const n = code.getModuleCount()
  const quiet = 2                 // the mandatory white margin; without it, scanners refuse
  const size = n + quiet * 2

  // One path for every dark module. A path per square rather than a <rect>
  // per square keeps the markup small enough to inline.
  let d = ''
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (code.isDark(row, col)) d += `M${col + quiet} ${row + quiet}h1v1h-1z`
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label="QR code">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#101A2E" />
    </svg>
  )
}
