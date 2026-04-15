import { Container, Sprite, Texture, FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { animate } from "motion";
import { Tile } from "../Tile";
import { getReachableTiles, getAttackableTiles } from "../../../utils/coordinates";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  tankLight = "tankLight",
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
      tankLight: { primary: 0, secondary: 5 },
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
      tankLight: { primary: 55, secondary: 6 },
    },
  },
  tankLight: {
    health: 100,
    moveType: "treads",
    moveRange: 4,
    attackRange: 3,
    damage: {
      infantry: { primary: 35, secondary: 75 },
      commando: { primary: 30, secondary: 70 },
      tankLight: { primary: 55, secondary: 6 },
    },
  },
};

export class Unit extends Container {
  sprite: Sprite;
  private isDragging: boolean = false;
  private isRightDragging: boolean = false;
  private healthText?: Text;
  private _health: number = 10;
  moveRange: number;
  moveType: "foot" | "treads" | "tires" | "air";
  attackRange: number = 1;
  public team: "blue" | "red" = "blue";
  public boardTiles?: Map<string, Tile>;
  public boardGrid?: Container;
  private hoveredTile: Tile | null = null;
  hasMoved: boolean = false;
  hasAttacked: boolean = false;

  constructor(type: U, x: number, y: number, texture?: Texture) {
    super();

    this.moveRange = UNIT[type].moveRange;
    this.moveType = UNIT[type].moveType;
    this.attackRange = UNIT[type].attackRange;
    this.health = UNIT[type].health;

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
      text: Math.max(this._health / 10).toString(),
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
    this.on("rightdown", this.onRightDragStart, this);
    this.on("rightup", this.onRightDragEnd, this);
    this.on("rightupoutside", this.onRightDragEnd, this);
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
    if ((this.isDragging || this.isRightDragging) && this.boardGrid && this.boardTiles) {
      const localPos = this.boardGrid.toLocal(e.global);
      const col = Math.floor(localPos.x / Tile.TILE_SIZE);
      const row = Math.floor(localPos.y / Tile.TILE_SIZE);
      const tileId = `${col}_${row}`;
      const tile = this.boardTiles.get(tileId);

      if (this.hoveredTile && this.hoveredTile !== tile) {
        if (this.hoveredTile.state === "hover") {
          this.hoveredTile.state = "canMoveTo"; // Revert to regular highlight
        } else if (this.hoveredTile.state === "attackHover") {
          this.hoveredTile.state = "canAttack";
        }
        this.hoveredTile = null;
      }

      if (tile) {
        if (this.isDragging && tile.state === "canMoveTo") {
          tile.state = "hover";
          this.hoveredTile = tile;
        } else if (this.isRightDragging && tile.state === "canAttack") {
          tile.state = "attackHover";
          this.hoveredTile = tile;
        }
      }

      this.emit("dragMove", this, e.global);
    }
  };

  private onDragEnd = (e: FederatedPointerEvent) => {
    if (e.button !== 0) return; // Only process left clicks
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
            await animate(this as Container, { x: targetX }, { duration: distTilesX * 0.1, ease: "linear" });
          }
          if (distTilesY > 0) {
            await animate(this as Container, { y: targetY }, { duration: distTilesY * 0.1, ease: "linear" });
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
      this.healthText.text = value.toString();
    }
  }
}
