import { Container, Sprite, Texture, FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { animate } from "motion";
import { Tile } from "../Tile";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  Artillery = "artillery",
  Tank = "tank",
}

export class Unit extends Container {
  private sprite: Sprite;
  private isDragging: boolean = false;
  private healthText?: Text;
  private _health: number = 10;
  moveRange: number;
  moveType: "foot" | "treads" | "tires" | "air";
  public boardTiles?: Map<string, Tile>;
  public boardGrid?: Container;
  private hoveredTile: Tile | null = null;
  public team: "blue" | "red" = "blue";
  public hasMoved: boolean = false;

  constructor(_type: U, x: number, y: number, texture?: Texture) {
    super();

    this.moveRange = 3; // TODO: match health approach
    this.moveType = "foot";

    this.position.set(x, y);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = 64;
    this.sprite.height = 64;
    this.addChild(this.sprite);

    // Health indicator background (16x16 box placed at the bottom right)
    const healthBg = new Graphics().rect(16, 16, 16, 16).fill(0x000000);
    this.addChild(healthBg);

    this.healthText = new Text({
      text: this._health.toString(),
      style: {
        fontSize: 12,
        fill: 0xffffff,
      },
    });
    this.healthText.anchor.set(0.5);
    this.healthText.position.set(24, 24); // Centered within the 16x16 box
    this.addChild(this.healthText);

    // Make unit interactive
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerdown", this.onDragStart, this);
    this.on("globalpointermove", this.onDragMove, this);
    this.on("pointerup", this.onDragEnd, this);
    this.on("pointerupoutside", this.onDragEnd, this);
    this.on("requestMove", this.showMovementRange, this);
  }

  public showMovementRange() {
    if (!this.boardTiles) return;

    const parentTile = this.parent as Tile;
    this.boardTiles.forEach((t) => (t.state = "default"));
    getReachableTiles(parentTile.gridX, parentTile.gridY, this.moveRange, this.moveType, this.boardTiles).forEach(
      (t) => {
        t.state = "canMoveTo";
      }
    );
  }

  private onDragStart = () => {
    this.isDragging = true;
    this.showMovementRange();
    this.emit("dragStart", this);
  };

  private onDragMove = (e: FederatedPointerEvent) => {
    if (this.isDragging && this.boardGrid && this.boardTiles) {
      const localPos = this.boardGrid.toLocal(e.global);
      const col = Math.floor(localPos.x / Tile.TILE_SIZE);
      const row = Math.floor(localPos.y / Tile.TILE_SIZE);
      const tileId = `${col}_${row}`;
      const tile = this.boardTiles.get(tileId);

      if (this.hoveredTile && this.hoveredTile !== tile) {
        if (this.hoveredTile.state === "hover") {
          this.hoveredTile.state = "canMoveTo"; // Revert to regular highlight
        }
        this.hoveredTile = null;
      }

      if (tile && tile.state === "canMoveTo") {
        tile.state = "hover";
        this.hoveredTile = tile;
      }

      this.emit("dragMove", this, e.global);
    }
  };

  private onDragEnd = (e: FederatedPointerEvent) => {
    if (this.isDragging) {
      this.isDragging = false;

      if (this.hoveredTile && this.hoveredTile.state === "hover" && this.boardGrid && this.boardTiles) {
        const parentTile = this.parent as Tile;
        const targetTile = this.hoveredTile;

        // Calculate position relative to gridContainer
        const startX = parentTile.x + Tile.TILE_SIZE / 2;
        const startY = parentTile.y + Tile.TILE_SIZE / 2;
        const targetX = targetTile.x + Tile.TILE_SIZE / 2;
        const targetY = targetTile.y + Tile.TILE_SIZE / 2;

        // Re-parent the unit to the gridContainer to render above all tiles during animation
        this.boardGrid.addChild(this);
        this.position.set(startX, startY);

        const runAnimation = async () => {
          this.eventMode = "none"; // Prevent dragging during animation
          const distTilesX = Math.abs(targetX - startX) / Tile.TILE_SIZE;
          const distTilesY = Math.abs(targetY - startY) / Tile.TILE_SIZE;

          if (distTilesX > 0) {
            await animate(this as any, { x: targetX }, { duration: distTilesX * 0.1, ease: "linear" });
          }
          if (distTilesY > 0) {
            await animate(this as any, { y: targetY }, { duration: distTilesY * 0.1, ease: "linear" });
          }

          // Re-parent back to the target tile after animation
          targetTile.addChild(this);
          this.position.set(Tile.TILE_SIZE / 2, Tile.TILE_SIZE / 2);
          this.eventMode = "static";

          if (targetTile !== parentTile) {
            this.hasMoved = true;
            this.emit("moved", this);
          }
        };
        runAnimation();
      }

      this.hoveredTile = null;
      if (this.boardTiles) {
        this.boardTiles.forEach((t) => (t.state = "default"));
      }

      this.emit("dragEnd", this, e.global);
    }
  };

  get health(): number {
    return this._health;
  }

  set health(value: number) {
    this._health = value;
    if (this.healthText) {
      this.healthText.text = value.toString();
    }
  }
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

  return Array.from(reachable);
}
