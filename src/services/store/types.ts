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
   * Watch the whole collection. Returns an unsubscribe.
   *
   * On-device this polls; in the cloud it is a live listener. Screens no
   * longer run their own `setInterval`, which means they get realtime for
   * free the moment Firebase is configured, with no change to the screen.
   */
  subscribe(cb: (items: T[]) => void): () => void
}

/**
 * A cheap fingerprint used to decide whether anything actually changed.
 *
 * Without it the polling backend hands the screen a brand-new array every
 * tick and React re-renders a list of photos two or three times a second for
 * no reason. Each domain says which fields matter.
 */
export type Signature<T> = (item: T) => string
