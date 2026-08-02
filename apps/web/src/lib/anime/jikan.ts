const JIKAN_API = 'https://api.jikan.moe/v4';

async function fetchJikan(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${JIKAN_API}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Jikan API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

function mapJikanToAniList(jikan: any) {
  return {
    id: jikan.mal_id,
    idMal: jikan.mal_id,
    title: {
      romaji: jikan.title,
      english: jikan.title_english,
      native: jikan.title_japanese,
    },
    coverImage: {
      large: jikan.images?.jpg?.large_image_url || jikan.images?.jpg?.image_url,
      medium: jikan.images?.jpg?.image_url,
      extraLarge: jikan.images?.jpg?.large_image_url,
      color: null,
    },
    bannerImage: jikan.trailer?.images?.large_image_url,
    description: jikan.synopsis,
    episodes: jikan.episodes,
    duration: jikan.duration,
    status: jikan.status,
    season: jikan.season,
    seasonYear: jikan.year,
    format: jikan.type,
    genres: jikan.genres?.map((g: any) => g.name) || [],
    averageScore: jikan.score ? Math.round(jikan.score * 10) : null,
    meanScore: jikan.score ? Math.round(jikan.score * 10) : null,
    popularity: jikan.popularity,
    trending: null,
    studios: { nodes: jikan.studios?.map((s: any) => ({ id: s.mal_id, name: s.name, isAnimationStudio: true })) || [] },
    startDate: jikan.aired?.from ? { 
      year: new Date(jikan.aired.from).getFullYear(),
      month: new Date(jikan.aired.from).getMonth() + 1,
      day: new Date(jikan.aired.from).getDate()
    } : null,
    endDate: jikan.aired?.to ? { 
      year: new Date(jikan.aired.to).getFullYear(),
      month: new Date(jikan.aired.to).getMonth() + 1,
      day: new Date(jikan.aired.to).getDate()
    } : null,
    nextAiringEpisode: null,
    synonyms: jikan.titles?.map((t: any) => t.title).filter((t: string) => t !== jikan.title) || [],
    isAdult: jikan.rating?.includes('Rx') || jikan.rating?.includes('Hentai'),
    siteUrl: jikan.url,
    trailer: jikan.trailer ? {
      id: jikan.trailer.youtube_id,
      site: 'youtube',
      thumbnail: jikan.trailer.images?.large_image_url,
    } : null,
    rankings: [],
  };
}

export const jikan = {
  async search(search: string, page = 1, perPage = 20) {
    const data = await fetchJikan('/anime', { q: search, page: page.toString(), limit: perPage.toString() });
    return { 
      Page: { 
        media: data.map(mapJikanToAniList),
        pageInfo: { currentPage: page, perPage, hasNextPage: data.length === perPage }
      }
    };
  },

  async trending(page = 1, perPage = 20) {
    const data = await fetchJikan('/top/anime', { page: page.toString(), limit: perPage.toString(), filter: 'airing' });
    return { 
      Page: { 
        media: data.map(mapJikanToAniList),
        pageInfo: { currentPage: page, perPage, hasNextPage: data.length === perPage }
      }
    };
  },

  async popularSeason(page = 1, perPage = 20, season?: string, seasonYear?: number) {
    const year = seasonYear || new Date().getFullYear();
    const data = await fetchJikan('/seasons/now', { page: page.toString(), limit: perPage.toString() });
    return { 
      Page: { 
        media: data.map(mapJikanToAniList),
        pageInfo: { currentPage: page, perPage, hasNextPage: data.length === perPage }
      }
    };
  },

  async popularThisSeason(page = 1, perPage = 20, season?: string, seasonYear?: number) {
    return this.popularSeason(page, perPage, season, seasonYear);
  },

  async getDetails(id: number) {
    const data = await fetchJikan(`/anime/${id}/full`);
    return { Media: mapJikanToAniList(data) };
  },

  async detail(id: number) {
    return this.getDetails(id);
  },

  async searchAdvanced(params: any) {
    const { search, page = 1, perPage = 20, genre, format, season, seasonYear } = params;
    const data = await fetchJikan('/anime', { 
      q: search || '', 
      page: page.toString(), 
      limit: perPage.toString(),
      ...(genre && { genres: genre }),
      ...(format && { type: format }),
      ...(season && { season: season.toLowerCase() }),
      ...(seasonYear && { year: seasonYear.toString() }),
    });
    return { 
      Page: { 
        media: data.map(mapJikanToAniList),
        pageInfo: { currentPage: page, perPage, hasNextPage: data.length === perPage }
      }
    };
  },

  async guess(search: string, page = 1, perPage = 10) {
    return this.search(search, page, perPage);
  },

  async getRecommendations(id: number, perPage = 10) {
    const data = await fetchJikan(`/anime/${id}/recommendations`);
    return { 
      Media: { 
        recommendations: { 
          edges: data.slice(0, perPage).map((r: any) => ({
            node: mapJikanToAniList(r.entry),
            rating: 0,
          }))
        }
      }
    };
  },

  async episodes(id: number) {
    const data = await fetchJikan(`/anime/${id}/episodes`);
    return data || [];
  },

  async characters(id: number) {
    const data = await fetchJikan(`/anime/${id}/characters`);
    return data?.characters || data || [];
  },
};
