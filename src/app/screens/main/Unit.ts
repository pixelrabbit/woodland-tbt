import { Container, Sprite, Texture, FederatedPointerEvent, Graphics, Text, Assets } from "pixi.js";
import { animate } from "motion";
import { Tile } from "./Tile";
import { getReachableTiles, getAttackableTiles, getShortestPath } from "../../utils/coordinates";
import { C } from "../../common";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  tank = "tank",
  recon = "recon",
  artillery = "artillery",
}

interface IUnit {
  health: number;
  moveType: "foot" | "treads" | "tires" | "air";
  moveRange: number;
  attackRange: number;
  damage: Record<string, { primary: number; secondary: number }>;
}

export const UNIT: Record<U, IUnit> = {
  infantry: {
    health: 100,
    moveType: "foot",
    moveRange: 3,
    attackRange: 1,
    damage: {
      infantry: { primary: 0, secondary: 55 },
      commando: { primary: 0, secondary: 45 },
      tank: { primary: 0, secondary: 5 },
      recon: { primary: 0, secondary: 12 },
      artillery: { primary: 0, secondary: 15 },
    },
  },
  commando: {
    health: 100,
    moveType: "foot",
    moveRange: 3,
    attackRange: 1,
    damage: {
      infantry: { primary: 0, secondary: 65 },
      commando: { primary: 0, secondary: 55 },
      tank: { primary: 55, secondary: 6 },
      recon: { primary: 0, secondary: 20 },
      artillery: { primary: 0, secondary: 25 },
    },
  },
  tank: {
    health: 100,
    moveType: "treads",
    moveRange: 5,
    attackRange: 1,
    damage: {
      infantry: { primary: 0, secondary: 75 },
      commando: { primary: 0, secondary: 65 },
      tank: { primary: 0, secondary: 55 },
      recon: { primary: 0, secondary: 85 },
      artillery: { primary: 0, secondary: 70 },
    },
  },
  recon: {
    health: 100,
    moveType: "tires",
    moveRange: 8,
    attackRange: 1,
    damage: {
      infantry: { primary: 0, secondary: 70 },
      commando: { primary: 0, secondary: 65 },
      tank: { primary: 0, secondary: 6 },
      recon: { primary: 0, secondary: 35 },
      artillery: { primary: 0, secondary: 45 },
    },
  },
  artillery: {
    health: 100,
    moveType: "treads",
    moveRange: 5,
    attackRange: 3,
    damage: {
      infantry: { primary: 0, secondary: 90 },
      commando: { primary: 0, secondary: 85 },
      tank: { primary: 0, secondary: 70 },
      recon: { primary: 0, secondary: 80 },
      artillery: { primary: 0, secondary: 75 },
    },
  },
};

export class Unit extends Container {
  sprite: Sprite;
  public teamBg: Graphics;
  private isDragging: boolean = false;
  private isRightDragging: boolean = false;
  private healthText?: Text;
  private healthBg?: Graphics;
  private _health: number = 100;
  moveRange: number;
  moveType: "foot" | "treads" | "tires" | "air";
  attackRange: number = 1;
  private _team: "blue" | "red" = "blue";
  public boardTiles?: Map<string, Tile>;
  public boardGrid?: Container;
  private hoveredTile: Tile | null = null;
  private currentPath: Tile[] = [];
  private reachableTiles: Set<Tile> = new Set();
  private pathGraphics?: Graphics;
  hasMoved: boolean = false;
  hasAttacked: boolean = false;
  public isDead: boolean = false;
  public unitType: U;

  get team(): "blue" | "red" {
    return this._team;
  }

  set team(value: "blue" | "red") {
    this._team = value;
    const color = value === "blue" ? C.blue : C.red;
    if (this.teamBg) {
      this.teamBg.clear().circle(0, 0, 21).fill(color);
    }
    if (this.healthBg) {
      this.healthBg.clear().rect(8, 16, 24, 16).fill(color);
    }
    if (this.sprite) {
      this.sprite.scale.x = value === "red" ? -Math.abs(this.sprite.scale.x) : Math.abs(this.sprite.scale.x);
    }
  }

  constructor(type: U, x: number, y: number, texture?: Texture) {
    super();

    this.moveRange = UNIT[type].moveRange;
    this.moveType = UNIT[type].moveType;
    this.attackRange = UNIT[type].attackRange;
    this.health = UNIT[type].health;
    this.unitType = type;

    this.position.set(x, y);

    // Team color background circle (66% diameter, centered)
    this.teamBg = new Graphics().circle(0, 0, 21).fill(this._team === "blue" ? C.blue : C.red);
    this.addChild(this.teamBg);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.setSize(Tile.TILE_SIZE);
    this.addChild(this.sprite);

    // Health indicator background (16x16 box placed at the bottom right)
    this.healthBg = new Graphics().rect(8, 16, 24, 16).fill(0x000000);
    this.addChild(this.healthBg);

    this.healthText = new Text({
      text: Math.ceil(this._health / 10).toString(),
      style: {
        fontSize: 16,
        fill: 0xffffff,
        fontFamily: "Jersey 25",
      },
    });
    this.healthText.anchor.set(0.5);
    this.healthText.position.set(20, 24); // Centered within the 16x16 box
    this.addChild(this.healthText);

    // Make unit interactive
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerdown", this.onDragStart, this);
    this.on("globalpointermove", this.onDragMove, this);
    this.on("pointerup", this.onDragEnd, this);
    this.on("pointerupoutside", this.onDragEnd, this);
    this.on("requestMove", this.showMovementRange, this);
    this.on("rightdown", this.onRightDragStart, this);
    this.on("rightup", this.onRightDragEnd, this);
    this.on("rightupoutside", this.onRightDragEnd, this);
  }

  public showMovementRange() {
    if (!this.boardTiles) return;
    const parentTile = this.parent as Tile;
    const reachable = getReachableTiles(
      parentTile.gridX,
      parentTile.gridY,
      this.moveRange,
      this.moveType,
      this.boardTiles
    );
    this.reachableTiles = new Set(reachable);
    this.currentPath = [parentTile];
    this.updatePathVisuals();
  }

  private onDragStart = (e: FederatedPointerEvent) => {
    if (e.button !== 0 || this.hasMoved) return; // Only process left clicks for movement
    this.isDragging = true;
    this.showMovementRange();
    this.emit("dragStart", this);
  };

  private onRightDragStart = () => {
    if (this.hasAttacked) return;
    this.isRightDragging = true;
    if (this.boardTiles) {
      const parentTile = this.parent as Tile;
      this.boardTiles.forEach((t) => (t.state = "default"));
      getAttackableTiles(parentTile.gridX, parentTile.gridY, this.attackRange, this.boardTiles).forEach((t) => {
        t.state = "canAttack";
      });
    }
  };

  private onDragMove = (e: FederatedPointerEvent) => {
    if (this.isDragging && this.boardGrid && this.boardTiles) {
      const localPos = this.boardGrid.toLocal(e.global);
      const col = Math.floor(localPos.x / Tile.TILE_SIZE);
      const row = Math.floor(localPos.y / Tile.TILE_SIZE);
      const tileId = `${col}_${row}`;
      const tile = this.boardTiles.get(tileId);
      const parentTile = this.parent as Tile;

      if (tile && this.currentPath.length > 0) {
        const lastTile = this.currentPath[this.currentPath.length - 1];

        if (tile !== lastTile) {
          const isOccupied = tile.children.some((child) => child instanceof Unit && child !== this);

          if (this.currentPath.includes(tile)) {
            // User backtracked to an earlier tile in the path
            const idx = this.currentPath.indexOf(tile);
            this.currentPath = this.currentPath.slice(0, idx + 1);
            this.updatePathVisuals();
          } else if (!isOccupied) {
            const isAdjacent = Math.abs(tile.gridX - lastTile.gridX) + Math.abs(tile.gridY - lastTile.gridY) === 1;
            const cost = tile.movementCost[this.moveType];
            const currentCost = this.currentPath.slice(1).reduce((acc, t) => acc + t.movementCost[this.moveType], 0);

            if (isAdjacent && cost < 100 && currentCost + cost <= this.moveRange) {
              // Adjacent tile within movement range
              this.currentPath.push(tile);
              this.updatePathVisuals();
            } else if (this.reachableTiles.has(tile)) {
              // Mouse moved fast or jumped: compute shortest path avoiding occupied tiles
              const newPath = getShortestPath(
                parentTile.gridX,
                parentTile.gridY,
                tile.gridX,
                tile.gridY,
                this.moveRange,
                this.moveType,
                this.boardTiles
              );
              if (newPath) {
                this.currentPath = newPath;
                this.updatePathVisuals();
              }
            }
          }
        }
      }

      this.emit("dragMove", this, e.global);
    } else if (this.isRightDragging && this.boardGrid && this.boardTiles) {
      const localPos = this.boardGrid.toLocal(e.global);
      const col = Math.floor(localPos.x / Tile.TILE_SIZE);
      const row = Math.floor(localPos.y / Tile.TILE_SIZE);
      const tileId = `${col}_${row}`;
      const tile = this.boardTiles.get(tileId);

      if (this.hoveredTile && this.hoveredTile !== tile) {
        if (this.hoveredTile.state === "attackHover") {
          this.hoveredTile.state = "canAttack";
        }
        this.hoveredTile = null;
      }

      if (tile && tile.state === "canAttack") {
        tile.state = "attackHover";
        this.hoveredTile = tile;
      }

      this.emit("dragMove", this, e.global);
    }
  };

  private drawArrowPath(path: Tile[]) {
    if (!this.pathGraphics) {
      this.pathGraphics = new Graphics();
      this.pathGraphics.zIndex = 5000;
    }
    if (this.boardGrid && this.pathGraphics.parent !== this.boardGrid) {
      this.boardGrid.addChild(this.pathGraphics);
    }

    this.pathGraphics.clear();

    if (path.length < 2) return;

    const points = path.map((tile) => ({
      x: tile.gridX * Tile.TILE_SIZE + Tile.TILE_SIZE / 2,
      y: tile.gridY * Tile.TILE_SIZE + Tile.TILE_SIZE / 2,
    }));

    const n = points.length;
    const pPrev = points[n - 2];
    const pLast = points[n - 1];

    const dx = Math.sign(pLast.x - pPrev.x);
    const dy = Math.sign(pLast.y - pPrev.y);
    const perpX = -dy;
    const perpY = dx;

    // Arrowhead geometry (rounded triangle shape)
    const headLength = 18;
    const headWidth = 16;

    const tipX = pLast.x + dx * 14;
    const tipY = pLast.y + dy * 14;
    const baseX = tipX - dx * headLength;
    const baseY = tipY - dy * headLength;

    const wing1X = baseX + perpX * headWidth;
    const wing1Y = baseY + perpY * headWidth;
    const wing2X = baseX - perpX * headWidth;
    const wing2Y = baseY - perpY * headWidth;

    // Start line at the border edge between the starting unit tile and the next tile
    const startEdgeX = (points[0].x + points[1].x) / 2;
    const startEdgeY = (points[0].y + points[1].y) / 2;

    // 1. Draw 4-pixel drop shadow below path (Y + 4)
    this.pathGraphics.moveTo(startEdgeX, startEdgeY + 4);
    for (let i = 1; i < n - 1; i++) {
      this.pathGraphics.lineTo(points[i].x, points[i].y + 4);
    }
    this.pathGraphics.lineTo(baseX, baseY + 4);
    this.pathGraphics.stroke({ color: 0x000000, alpha: 0.35, width: 22, cap: "butt", join: "round" });

    this.pathGraphics
      .poly([
        { x: tipX, y: tipY + 4 },
        { x: wing1X, y: wing1Y + 4 },
        { x: wing2X, y: wing2Y + 4 },
      ])
      .fill({ color: 0x000000, alpha: 0.35 })
      .stroke({ color: 0x000000, alpha: 0.35, width: 8, join: "round", cap: "round" });

    // 2. Draw main chunky white path line
    this.pathGraphics.moveTo(startEdgeX, startEdgeY);
    for (let i = 1; i < n - 1; i++) {
      this.pathGraphics.lineTo(points[i].x, points[i].y);
    }
    this.pathGraphics.lineTo(baseX, baseY);
    this.pathGraphics.stroke({ color: 0xffffff, width: 22, cap: "butt", join: "round" });

    // 3. Draw solid rounded triangle white arrowhead at destination
    this.pathGraphics
      .poly([
        { x: tipX, y: tipY },
        { x: wing1X, y: wing1Y },
        { x: wing2X, y: wing2Y },
      ])
      .fill(0xffffff)
      .stroke({ color: 0xffffff, width: 8, join: "round", cap: "round" });
  }

  private updatePathVisuals() {
    if (!this.boardTiles) return;
    this.boardTiles.forEach((t) => (t.state = "default"));
    // Highlight all reachable tiles in yellow
    this.reachableTiles.forEach((t) => {
      t.state = "canMoveTo";
    });
    // Set destination tile to hover (displays hover reticle)
    if (this.currentPath.length > 0) {
      const targetTile = this.currentPath[this.currentPath.length - 1];
      targetTile.state = "hover";
    }
    // Draw the arrow path
    this.drawArrowPath(this.currentPath);
  }

  private onDragEnd = (e: FederatedPointerEvent) => {
    if (e.button !== 0) return; // Only process left clicks
    if (this.isDragging) {
      this.isDragging = false;

      const path = [...this.currentPath];
      this.currentPath = [];
      this.reachableTiles.clear();

      if (this.pathGraphics) {
        this.pathGraphics.clear();
      }

      if (this.boardTiles) {
        this.boardTiles.forEach((t) => (t.state = "default"));
      }

      if (path.length > 1 && this.boardGrid && this.boardTiles) {
        const parentTile = this.parent as Tile;
        const targetTile = path[path.length - 1];

        // Ensure target is not occupied by another unit
        const isOccupied = targetTile.children.some((child) => child instanceof Unit && child !== this);

        if (!isOccupied && targetTile !== parentTile) {
          // Re-parent the unit to the gridContainer to render above all tiles during animation
          const startX = parentTile.x + Tile.TILE_SIZE / 2;
          const startY = parentTile.y + Tile.TILE_SIZE / 2;
          this.boardGrid.addChild(this);
          this.position.set(startX, startY);

          const runAnimation = async () => {
            this.eventMode = "none"; // Prevent dragging during animation
            for (let i = 1; i < path.length; i++) {
              const stepTile = path[i];
              const targetX = stepTile.x + Tile.TILE_SIZE / 2;
              const targetY = stepTile.y + Tile.TILE_SIZE / 2;
              await animate(this as Container, { x: targetX, y: targetY }, { duration: 0.1, ease: "linear" });
            }

            // Re-parent back to the target tile after animation
            targetTile.addChild(this);
            this.position.set(Tile.TILE_SIZE / 2, Tile.TILE_SIZE / 2);
            this.eventMode = "static";

            this.hasMoved = true;
            this.emit("moved", this);
          };
          runAnimation();
        }
      }

      this.emit("dragEnd", this, e.global);
    }
  };

  private onRightDragEnd = () => {
    if (this.isRightDragging) {
      this.isRightDragging = false;

      if (this.hoveredTile && this.hoveredTile.state === "attackHover") {
        const targetTile = this.hoveredTile;
        // Check for opposing team's unit
        const targetUnit = targetTile.children.find((child) => child instanceof Unit) as Unit | undefined;

        if (targetUnit && targetUnit.team !== this.team) {
          this.hasAttacked = true;
          this.emit("attack", this, targetUnit);
        }
      }

      this.hoveredTile = null;
      if (this.boardTiles) {
        this.boardTiles.forEach((t) => (t.state = "default"));
      }
    }
  };

  get health(): number {
    return this._health;
  }

  set health(value: number) {
    this._health = value;
    if (this.healthText) {
      this.healthText.text = Math.ceil(value / 10);
    }

    if (this._health <= 0 && !this.isDead) {
      this.isDead = true;
      this.die();
    }
  }

  private async die() {
    this.eventMode = "none"; // Stop interactions during death animation
    await animate(
      this as Container,
      { width: 0, height: 0 },
      {
        duration: 0.3,
        onComplete: () => {
          this.removeFromParent();
          this.destroy(); // Free up memory
        },
      }
    );
  }
}

const infantrySprite = await Assets.load("assets/main/soldier.png");
export class Infantry extends Unit {
  constructor(x: number, y: number) {
    // Call the parent Unit constructor, hardcoding the Infantry type and passing the texture
    super(U.Infantry, x, y, infantrySprite);
  }
}

const commandoSprite = await Assets.load("assets/main/commando.png");
export class Commando extends Unit {
  constructor(x: number, y: number) {
    // Call the parent Unit constructor, hardcoding the Infantry type and passing the texture
    super(U.Commando, x, y, commandoSprite);
  }
}

const tankSprite = await Assets.load("assets/main/tank.png");
export class Tank extends Unit {
  constructor(x: number, y: number) {
    // Call the parent Unit constructor, passing the tank type and texture
    super(U.tank, x, y, tankSprite);
  }
}

const reconSprite = await Assets.load("assets/main/recon.png");
export class Recon extends Unit {
  constructor(x: number, y: number) {
    super(U.recon, x, y, reconSprite);
    // this.sprite.tint = 0xaaffaa; // Light green tint to differentiate it from the tank since we reused the asset
  }
}

const artillerySprite = await Assets.load("assets/main/artillery.png");
export class Artillery extends Unit {
  constructor(x: number, y: number) {
    super(U.artillery, x, y, artillerySprite);
  }
}
