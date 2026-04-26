import { useEffect, useState } from "react";

interface TmdbPosterResult {
  posterPath: string | null;
  posterUrl: string | null;
  tmdbId: number | null;
}

const memoryCache = new Map<string, TmdbPosterResult>();
const inflight = new Map<string, Promise<TmdbPosterResult>>();

function storageKey(title: string, year?: number) {
  return `cinematch_tmdb_poster::${title.toLowerCase()}::${year ?? ""}`;
}

function readSession(key: string): TmdbPosterResult | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TmdbPosterResult;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: TmdbPosterResult) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / disabled — ignore */
  }
}

export async function fetchTmdbPoster(title: string, year?: number): Promise<TmdbPosterResult> {
  const key = storageKey(title, year);
  const mem = memoryCache.get(key);
  if (mem) return mem;
  const sess = readSession(key);
  if (sess) {
    memoryCache.set(key, sess);
    return sess;
  }
  const existing = inflight.get(key);
  if (existing) return existing;

  const params = new URLSearchParams({ title });
  if (year) params.set("year", String(year));
  const promise = fetch(`/api/tmdb/poster?${params.toString()}`)
    .then(r => (r.ok ? r.json() : { posterPath: null, posterUrl: null, tmdbId: null }))
    .then((data: TmdbPosterResult) => {
      memoryCache.set(key, data);
      writeSession(key, data);
      inflight.delete(key);
      return data;
    })
    .catch(() => {
      const empty: TmdbPosterResult = { posterPath: null, posterUrl: null, tmdbId: null };
      inflight.delete(key);
      return empty;
    });
  inflight.set(key, promise);
  return promise;
}

function resolveInitial(title: string | undefined, year: number | undefined, fallbackUrl: string | null): string | null {
  if (!title) return fallbackUrl;
  const key = storageKey(title, year);
  const cached = memoryCache.get(key) ?? readSession(key);
  return cached?.posterUrl ?? fallbackUrl;
}

/**
 * Resolve a film's poster URL from TMDB at runtime, with a hardcoded
 * fallback used as the initial value while the live result loads
 * (and as a long-term fallback if the lookup fails).
 */
export function useTmdbPoster(
  title: string | undefined,
  year: number | undefined,
  fallbackPosterPath?: string,
): string | null {
  const fallbackUrl = fallbackPosterPath
    ? `https://image.tmdb.org/t/p/w500${fallbackPosterPath}`
    : null;

  const [url, setUrl] = useState<string | null>(() => resolveInitial(title, year, fallbackUrl));

  useEffect(() => {
    // Reset synchronously to the cached/fallback value for the new film so we
    // never briefly display the previous film's poster while the lookup runs.
    setUrl(resolveInitial(title, year, fallbackUrl));
    if (!title) return;
    let cancelled = false;
    fetchTmdbPoster(title, year).then(result => {
      if (cancelled) return;
      setUrl(result.posterUrl ?? fallbackUrl);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, year, fallbackPosterPath]);

  return url;
}
