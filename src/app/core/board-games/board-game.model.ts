export interface BoardGameCollectionItem {
  id: string;
  name: string;
  level: number;
  purchasedAt: string | null;
  imageUrl: string | null;
}

export type BoardGameDrawQuery =
  | { readonly level: number }
  | { readonly categoryId: string }
  | { readonly mechanicId: string };

export interface CreateBoardGameRequest {
  name: string;
  level: number;
  complexity: number;
  playTimeMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  purchasedAt: string | null;
  imageUrl: string | null;
}

export interface UpdateBoardGameRequest extends CreateBoardGameRequest {
  categoryIds: readonly string[];
  mechanicIds: readonly string[];
}

export interface BoardGame {
  id: string;
  name: string;
  level: number;
  complexity: number;
  playTimeMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  purchasedAt: string | null;
  imageUrl: string | null;
  categoryIds: readonly string[];
  mechanicIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}
