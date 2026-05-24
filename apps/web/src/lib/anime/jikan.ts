const JIKAN_API = 'https://api.jikan.moe/v4';

async function fetchJikan<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN_API}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchJikan<T>(path);
    }
    throw new Error(`Jikan API error: ${res.status}`);
  }
  return (await res.json()).data as T;
}

export function getAnimeFullById(malId: number) {
  return fetchJikan<any>(`/anime/${malId}/full`);
}

export function getAnimeEpisodes(malId: number, page = 1) {
  return fetchJikan<any[]>(`/anime/${malId}/episodes?page=${page}`);
}

export function getAnimeCharacters(malId: number) {
  return fetchJikan<any[]>(`/anime/${malId}/characters`);
}

export function getAnimeStaff(malId: number) {
  return fetchJikan<any[]>(`/anime/${malId}/staff`);
}

export function getAnimeThemes(malId: number) {
  return fetchJikan<{ openings: string[]; endings: string[] }>(`/anime/${malId}/themes`);
}

export function getAnimeNews(malId: number) {
  return fetchJikan<any[]>(`/anime/${malId}/news`);
}

export function getAnimeVideos(malId: number) {
  return fetchJikan<any>(`/anime/${malId}/videos`);
}

export function getAnimeRecommendations(malId: number) {
  return fetchJikan<any[]>(`/anime/${malId}/recommendations`);
}

export function searchAnimeJikan(query: string) {
  return fetchJikan<any[]>(`/anime?q=${encodeURIComponent(query)}&limit=10&sfw`);
}

export const jikan = {
  getFull: getAnimeFullById,
  episodes: getAnimeEpisodes,
  characters: getAnimeCharacters,
  staff: getAnimeStaff,
  themes: getAnimeThemes,
  news: getAnimeNews,
  videos: getAnimeVideos,
  recommendations: getAnimeRecommendations,
  search: searchAnimeJikan,
};
