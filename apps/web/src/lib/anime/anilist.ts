const ANILIST_API = 'https://graphql.anilist.co';

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
          image { large medium }
        }
        voiceActors(sort: RELEVANCE) {
          id
          name { full native }
          image { large medium }
          languageV2
        }
      }
    }
    staff(page: 1, perPage: 5) {
      edges {
        node {
          id
          name { full native }
          image { large medium }
          primaryOccupations
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title { romaji english }
          coverImage { large medium }
          format
        }
      }
    }
    recommendations(page: 1, perPage: 5, sort: RATING_DESC) {
      edges {
        node {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large medium }
            averageScore
          }
        }
      }
    }
  }
}`;

const TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC]) {
      id idMal
      title { romaji english native }
      coverImage { large medium extraLarge color }
      bannerImage
      description
      episodes duration
      status season seasonYear format
      genres
      averageScore meanScore popularity trending
      nextAiringEpisode { airingAt timeUntilAiring episode }
      rankings { rank type context year season }
    }
  }
}`;

const POPULAR_THIS_SEASON_QUERY = `
query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC]) {
      id idMal
      title { romaji english native }
      coverImage { large medium extraLarge color }
      episodes
      format
      genres
      averageScore
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`;

function getCurrentSeason(): { season: string; year: number } {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const season = month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL';
  return { season, year };
}

async function fetchGraphQL<T>(query: string, variables: Record<string, any>): Promise<T> {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error');
  return json.data as T;
}

export function searchAnime(query: string, page = 1, perPage = 20) {
  return fetchGraphQL<{ Page: { pageInfo: any; media: any[] } }>(SEARCH_QUERY, {
    search: query, page, perPage,
  });
}

export function searchAnimeAdvanced(params: {
  search?: string;
  genre?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  page?: number;
  perPage?: number;
}) {
  return fetchGraphQL<{ Page: { pageInfo: any; media: any[] } }>(SEARCH_QUERY, {
    search: params.search,
    genre: params.genre,
    season: params.season || undefined,
    seasonYear: params.seasonYear || undefined,
    format: params.format || undefined,
    page: params.page || 1,
    perPage: params.perPage || 20,
  });
}

export function getAnimeDetail(id: number) {
  return fetchGraphQL<{ Media: any }>(DETAIL_QUERY, { id });
}

export function getTrendingAnime(page = 1, perPage = 12) {
  return fetchGraphQL<{ Page: { pageInfo: any; media: any[] } }>(TRENDING_QUERY, { page, perPage });
}

export function getPopularThisSeason(page = 1, perPage = 12) {
  const { season, year } = getCurrentSeason();
  return fetchGraphQL<{ Page: { pageInfo: any; media: any[] } }>(POPULAR_THIS_SEASON_QUERY, {
    page, perPage, season, seasonYear: year,
  });
}

export function getTopRatedAnime(page = 1, perPage = 12) {
  return fetchGraphQL<{ Page: { pageInfo: any; media: any[] } }>(SEARCH_QUERY, {
    page, perPage, sort: ['SCORE_DESC'],
  } as any);
}

export function guessAnimeFromTitle(input: string): Promise<{ Page: { pageInfo: any; media: any[] } }> {
  const clean = input.replace(/[Ee][Pp]?\s*\d+/g, '').replace(/[-\d]{4,}/g, '').trim();
  return searchAnime(clean, 1, 5);
}

export async function detectAnimeFromUrl(url: string): Promise<{ media: any; episode?: number } | null> {
  const pathname = new URL(url).pathname;
  const patterns = [
    /\/anime\/(\d+)\/([\w-]+)/i,
    /\/watch\/([\w-]+)/i,
    /\/category\/([\w-]+)/i,
    /([\w-]+)-episode-(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match) {
      const slug = match[1] || match[0];
      const result = await searchAnime(slug.replace(/[-_]/g, ' '), 1, 3);
      if (result.Page.media.length > 0) {
        return { media: result.Page.media[0], episode: match[2] ? parseInt(match[2]) : undefined };
      }
    }
  }
  return null;
}

export const anilist = {
  search: searchAnime,
  searchAdvanced: searchAnimeAdvanced,
  detail: getAnimeDetail,
  trending: getTrendingAnime,
  popularThisSeason: getPopularThisSeason,
  topRated: getTopRatedAnime,
  guess: guessAnimeFromTitle,
  detectFromUrl: detectAnimeFromUrl,
};
