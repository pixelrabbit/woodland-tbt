import { Tile } from "../screens/main/Tile";

/**
 * Returns an array of Tile objects matching the provided coordinates.
 * @param coordinates Array of {x, y} objects representing grid positions.
 */
export function getTilesByCoordinates(tiles: Tile[], coordinates: { x: number; y: number }[]): Tile[] {
  const ids = new Set(coordinates.map((c) => `${c.x}_${c.y}`));
  return tiles.filter((tile) => ids.has(tile.id));
}
