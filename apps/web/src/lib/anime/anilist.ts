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

export const anilist = {
  async search(search: string, page = 1, perPage = 20, filters: any = {}) {
    const variables: any = {
      search,
      page,
      perPage,
      ...filters,
    };
    return fetchAniList(SEARCH_QUERY, variables);
  },

  // Alias for search page compatibility
  async searchAdvanced(params: any) {
    return fetchAniList(SEARCH_QUERY, params);
  },

  // Alias for AnimeInfoSidebar compatibility
  async guess(search: string, page = 1, perPage = 10) {
    return fetchAniList(SEARCH_QUERY, { search, page, perPage });
  },

  async trending(page = 1, perPage = 20) {
    return fetchAniList(SEARCH_QUERY, {
      page,
      perPage,
      sort: ['TRENDING_DESC'],
    });
  },

  async popularSeason(page = 1, perPage = 20, season?: string, seasonYear?: number) {
    const variables: any = { page, perPage };
    if (season) variables.season = season.toUpperCase() as any;
    if (seasonYear) variables.seasonYear = seasonYear;
    return fetchAniList(SEARCH_QUERY, variables);
  },

  // Alias for compatibility with search page
  async popularThisSeason(page = 1, perPage = 20, season?: string, seasonYear?: number) {
    const variables: any = { page, perPage };
    if (season) variables.season = season.toUpperCase() as any;
    if (seasonYear) variables.seasonYear = seasonYear;
    return fetchAniList(SEARCH_QUERY, variables);
  },

  async getDetails(id: number) {
    return fetchAniList(DETAIL_QUERY, { id });
  },

  // Alias for compatibility
  async detail(id: number) {
    return fetchAniList(DETAIL_QUERY, { id });
  },

  async getRecommendations(id: number, perPage = 10) {
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
    return fetchAniList(RECOMMENDATIONS_QUERY, { id, perPage });
  },
};
