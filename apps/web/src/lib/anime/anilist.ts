const ANILIST_API = '/api/anilist';

const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int, $genre: String, $season: MediaSeason, $seasonYear: Int, $format: MediaFormat) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage perPage }
    media(
      search: $search
      genre: $genre
      season: $season
      seasonYear: $seasonYear
      format: $format
      type: ANIME
      sort: [POPULARITY_DESC, SCORE_DESC]
    ) {
      id idMal
      title { romaji english native }
      coverImage { large medium extraLarge color }
      bannerImage
      description
      episodes duration
      status season seasonYear format
      genres
      averageScore meanScore popularity trending
      studios { nodes { id name isAnimationStudio } }
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { airingAt timeUntilAiring episode }
      synonyms
      isAdult
      siteUrl
      trailer { id site thumbnail }
      rankings { rank type context year season }
    }
  }
}`;

const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id idMal
    title { romaji english native }
    coverImage { large medium extraLarge color }
    bannerImage
    description
    episodes duration
    status season seasonYear format
    genres
    averageScore meanScore popularity trending
    studios { nodes { id name isAnimationStudio } }
    startDate { year month day }
    endDate { year month day }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    airingSchedule { nodes { id airingAt episode } }
    synonyms
    isAdult
    siteUrl
    trailer { id site thumbnail }
    rankings { rank type context year season }
    characters(page: 1, perPage: 10, role: MAIN) {
      edges {
        id
        role
        node {
          id
          name { full native }
          image { large }
        }
      }
    }
    staff(page: 1, perPage: 10, role: DIRECTOR) {
      edges {
        id
        role
        node {
          id
          name { full native }
          image { large }
        }
      }
    }
  }
}`;

async function fetchAniList(query: string, variables: Record<string, any> = {}) {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors.map((e: any) => e.message).join(', '));
  }

  return data.data;
}

// Import Jikan as fallback
import { jikan } from './jikan';

let useFallback = false;

export const anilist = {
  async search(search: string, page = 1, perPage = 20, filters: any = {}) {
    if (useFallback) return jikan.search(search, page, perPage);
    
    try {
      const variables: any = { search, page, perPage, ...filters };
      return await fetchAniList(SEARCH_QUERY, variables);
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.search(search, page, perPage);
    }
  },

  async searchAdvanced(params: any) {
    if (useFallback) return jikan.searchAdvanced(params);
    
    try {
      return await fetchAniList(SEARCH_QUERY, params);
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.searchAdvanced(params);
    }
  },

  async trending(page = 1, perPage = 20) {
    if (useFallback) return jikan.trending(page, perPage);
    
    try {
      return await fetchAniList(SEARCH_QUERY, { page, perPage, sort: ['TRENDING_DESC'] });
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.trending(page, perPage);
    }
  },

  async popularSeason(page = 1, perPage = 20, season?: string, seasonYear?: number) {
    if (useFallback) return jikan.popularSeason(page, perPage, season, seasonYear);
    
    try {
      const variables: any = { page, perPage };
      if (season) variables.season = season.toUpperCase() as any;
      if (seasonYear) variables.seasonYear = seasonYear;
      return await fetchAniList(SEARCH_QUERY, variables);
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.popularSeason(page, perPage, season, seasonYear);
    }
  },

  async popularThisSeason(page = 1, perPage = 20, season?: string, seasonYear?: number) {
    return this.popularSeason(page, perPage, season, seasonYear);
  },

  async getDetails(id: number) {
    if (useFallback) return jikan.getDetails(id);
    
    try {
      return await fetchAniList(DETAIL_QUERY, { id });
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.getDetails(id);
    }
  },

  async detail(id: number) {
    return this.getDetails(id);
  },

  async guess(search: string, page = 1, perPage = 10) {
    if (useFallback) return jikan.guess(search, page, perPage);
    
    try {
      return await fetchAniList(SEARCH_QUERY, { search, page, perPage });
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.guess(search, page, perPage);
    }
  },

  async getRecommendations(id: number, perPage = 10) {
    if (useFallback) return jikan.getRecommendations(id, perPage);
    
    const RECOMMENDATIONS_QUERY = `
      query ($id: Int, $perPage: Int) {
        Media(id: $id, type: ANIME) {
          recommendations(perPage: $perPage) {
            edges {
              node {
                id
                title { romaji english native }
                coverImage { large medium color }
                averageScore
                status
                episodes
                format
              }
              rating
            }
          }
        }
      }
    `;
    try {
      return await fetchAniList(RECOMMENDATIONS_QUERY, { id, perPage });
    } catch (error) {
      console.warn('AniList failed, falling back to Jikan:', error);
      useFallback = true;
      return jikan.getRecommendations(id, perPage);
    }
  },
};
