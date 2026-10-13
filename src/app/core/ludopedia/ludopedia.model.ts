export interface LudopediaNamedItem {
  id: number;
  name: string;
}

export interface LudopediaGameSummary {
  id: number;
  name: string;
  originalName: string | null;
  imageUrl: string | null;
  link: string | null;
}

export interface LudopediaGameSearchResponse {
  games: LudopediaGameSummary[];
  total: number;
}

export interface LudopediaGameDetail {
  id: number;
  name: string;
  imageUrl: string | null;
  link: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  publishedYear: number | null;
  minAge: number | null;
  complexity: number | null;
  categories: LudopediaNamedItem[];
  mechanics: LudopediaNamedItem[];
}

export interface LudopediaCategoriesResponse {
  categories: LudopediaNamedItem[];
}

export interface LudopediaMechanicsResponse {
  mechanics: LudopediaNamedItem[];
}
