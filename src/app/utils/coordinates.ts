import { Tile, TileType } from "../screens/main/Tile";
import { Unit } from "../screens/main/Unit";

/**
 * Returns an array of Tile objects matching the provided coordinates.
 * @param coordinates Array of {x, y} objects representing grid positions.
 */
export function getTilesByCoordinates(tiles: Tile[], coordinates: { x: number; y: number }[]): Tile[] {
  const ids = new Set(coordinates.map((c) => `${c.x}_${c.y}`));
  return tiles.filter(
    (tile) => ids.has(tile.id) && tile.tileType !== TileType.W && !tile.children.some((child) => child instanceof Unit)
  );
}

/**
 * Uses Dijkstra's algorithm to find all reachable tiles based on movement range, move type, and terrain costs.
 */
export function getReachableTiles(
  startX: number,
  startY: number,
  moveRange: number,
  moveType: "foot" | "treads" | "tires" | "air",
  tiles: Map<string, Tile>
): Tile[] {
  const reachable = new Set<Tile>();
  const costs = new Map<string, number>();

  const startId = `${startX}_${startY}`;
  costs.set(startId, 0);

  // Simple priority queue approach using an array
  const queue = [{ x: startX, y: startY, cost: 0 }];

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    // Sort to ensure we always expand the lowest cost node first
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborId = `${nx}_${ny}`;
      const neighborTile = tiles.get(neighborId);

      if (!neighborTile) continue;

      // Cannot move into a tile already occupied by a unit
      const hasUnit = neighborTile.children.some((child) => child instanceof Unit);
      if (hasUnit && neighborId !== startId) continue;

      const cost = neighborTile.movementCost[moveType];
      const newCost = current.cost + cost;

      if (newCost <= moveRange) {
        if (!costs.has(neighborId) || newCost < costs.get(neighborId)!) {
          costs.set(neighborId, newCost);
          reachable.add(neighborTile);
          queue.push({ x: nx, y: ny, cost: newCost });
        }
      }
    }
  }

  const startTile = tiles.get(startId);
  if (startTile) {
    reachable.delete(startTile);
  }

  return Array.from(reachable);
}

/**
 * Gets all tiles within attack range using Manhattan distance.
 */
export function getAttackableTiles(
  startX: number,
  startY: number,
  attackRange: number,
  tiles: Map<string, Tile>
): Tile[] {
  const attackable: Tile[] = [];
  for (let dx = -attackRange; dx <= attackRange; dx++) {
    for (let dy = -attackRange; dy <= attackRange; dy++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist > 0 && dist <= attackRange) {
        const tile = tiles.get(`${startX + dx}_${startY + dy}`);
        if (tile) attackable.push(tile);
      }
    }
  }
  return attackable;
}

/**
 * Uses Dijkstra's algorithm to find the shortest path from start to target based on moveRange, moveType, and terrain costs.
 * Avoids any tiles occupied by other units.
 */
export function getShortestPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  moveRange: number,
  moveType: "foot" | "treads" | "tires" | "air",
  tiles: Map<string, Tile>
): Tile[] | null {
  const startId = `${startX}_${startY}`;
  const targetId = `${targetX}_${targetY}`;

  const startTile = tiles.get(startId);
  const targetTile = tiles.get(targetId);
  if (!startTile || !targetTile) return null;

  if (startId === targetId) {
    return [startTile];
  }

  // Target cannot be occupied by a unit
  if (targetTile.children.some((child) => child instanceof Unit)) {
    return null;
  }

  const costs = new Map<string, number>();
  const previous = new Map<string, string>();
  costs.set(startId, 0);

  const queue = [{ x: startX, y: startY, cost: 0 }];

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    const currentId = `${current.x}_${current.y}`;

    if (currentId === targetId) {
      const path: Tile[] = [];
      let curr: string | undefined = targetId;
      while (curr) {
        const t = tiles.get(curr);
        if (t) path.unshift(t);
        curr = previous.get(curr);
      }
      return path;
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const neighborId = `${nx}_${ny}`;
      const neighborTile = tiles.get(neighborId);

      if (!neighborTile) continue;

      // Cannot move into a tile already occupied by a unit
      const hasUnit = neighborTile.children.some((child) => child instanceof Unit);
      if (hasUnit && neighborId !== startId) continue;

      const cost = neighborTile.movementCost[moveType];
      const newCost = current.cost + cost;

      if (newCost <= moveRange) {
        if (!costs.has(neighborId) || newCost < costs.get(neighborId)!) {
          costs.set(neighborId, newCost);
          previous.set(neighborId, currentId);
          queue.push({ x: nx, y: ny, cost: newCost });
        }
      }
    }
  }

  return null;
}
