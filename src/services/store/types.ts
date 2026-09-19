/**
 * One small interface over both storage backends.
 *
 * Products, orders and messages all need exactly these five operations, so we
 * define them once and implement them twice — on-device and in the cloud —
 * rather than writing the same branch in three domain files.
 */
export interface Stored { id: string }

export interface Collection<T extends Stored> {
  /** Everything, or everything matching one field — filtered server-side in
   *  the cloud, so a screen that wants her products does not download the
   *  whole catalogue's photographs to throw most of them away. */
  list(only?: Where): Promise<T[]>
  /**
   * Read one.
   *
   * `from: 'cache'` answers out of the on-device copy when it has it, and only
   * goes to the server on a miss. It is for documents THIS device wrote and is
   * about to write again — every "next" on the golden path patches the product
   * it has just saved — where a server round trip buys nothing and costs her a
   * frozen button on a weak signal. Anything showing someone else's work reads
   * from the server as before.
   */
  get(id: string, from?: 'server' | 'cache'): Promise<T | undefined>
  put(item: T): Promise<void>
  remove(id: string): Promise<void>
  /**
   * Watch the collection. Returns an unsubscribe.
   *
   * On-device this polls; in the cloud it is a live listener. Screens no
   * longer run their own `setInterval`, which means they get realtime for
   * free the moment Firebase is configured, with no change to the screen.
   *
   * `only` narrows it to documents whose field equals a value, and it is a
   * SERVER-side filter in the cloud — not a convenience. Without it every
   * phone downloaded every artisan's products, which was wrong twice over:
   * she saw a stranger's shop as her own, and she paid to download their
   * photographs to do it.
   */
  subscribe(cb: (items: T[]) => void, only?: Where): () => void
}

/**
 * A single equality filter, and optionally a ceiling on how many come back.
 *
 * `max` exists for one screen. The buyer marketplace watched the WHOLE
 * products collection, and every document carries two base64 photographs —
 * measured at 120 KB average, 450 KB at worst. Fifty-four products is six
 * megabytes pulled down before the first card paints, growing with every
 * listing anyone ever makes. A marketplace does not need the whole catalogue
 * on screen at once, and a phone on 3G cannot afford it.
 */
export interface Where { field: string; equals: string; max?: number }

/**
 * A cheap fingerprint used to decide whether anything actually changed.
 *
 * Without it the polling backend hands the screen a brand-new array every
 * tick and React re-renders a list of photos two or three times a second for
 * no reason. Each domain says which fields matter.
 */
export type Signature<T> = (item: T) => string
