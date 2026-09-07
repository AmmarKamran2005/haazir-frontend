/* Where the data comes from.
 *
 * `NEXT_PUBLIC_HAAZIR_API` set  → every handler in lib/api.ts talks to the real backend.
 * unset                        → the in-process mock engine, exactly as before.
 *
 * The switch exists because both modes are genuinely wanted. The mock path keeps the
 * prototype's offline property — it opens on a laptop with no network and no backend, which
 * during a demo is not a hypothetical. The real path is the product. Neither is a stub of
 * the other: they satisfy the same signatures and the pages cannot tell them apart.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_HAAZIR_API || '').replace(/\/+$/, '');

export const USE_REAL_API = API_BASE.length > 0;

/** Karachi. Used when a surface needs an origin and the browser gave us no geolocation. */
export const DEFAULT_ORIGIN = { lat: 24.8615, lng: 67.018 };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
