/**
 * One small interface over both storage backends.
 *
 * Products, orders and messages all need exactly these five operations, so we
 * define them once and implement them twice — on-device and in the cloud —
 * rather than writing the same branch in three domain files.
 */
export interface Stored { id: string }

export interface Collection<T extends Stored> {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
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

/** A single equality filter. Enough for "whose is this?" and nothing more. */
export interface Where { field: string; equals: string }

/**
 * A cheap fingerprint used to decide whether anything actually changed.
 *
 * Without it the polling backend hands the screen a brand-new array every
 * tick and React re-renders a list of photos two or three times a second for
 * no reason. Each domain says which fields matter.
 */
export type Signature<T> = (item: T) => string
