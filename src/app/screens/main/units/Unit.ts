import { Container, Sprite, Texture, FederatedPointerEvent, Graphics, Text, Assets } from "pixi.js";
import { animate } from "motion";
import { Tile } from "../Tile";
import { getReachableTiles, getAttackableTiles } from "../../../utils/coordinates";
import { C } from "../../../common";

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
    moveRange: 4,
    attackRange: 3,
    damage: {
      infantry: { primary: 35, secondary: 75 },
      commando: { primary: 30, secondary: 70 },
      tank: { primary: 55, secondary: 6 },
      recon: { primary: 45, secondary: 65 },
      artillery: { primary: 45, secondary: 65 },
    },
  },
  recon: {
    health: 100,
    moveType: "tires",
    moveRange: 6,
    attackRange: 2,
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
    moveRange: 3,
    attackRange: 5,
    damage: {
      infantry: { primary: 65, secondary: 0 },
      commando: { primary: 60, secondary: 0 },
      tank: { primary: 55, secondary: 0 },
      recon: { primary: 60, secondary: 0 },
      artillery: { primary: 55, secondary: 0 },
    },
  },
};

export class Unit extends Container {
  sprite: Sprite;
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
  hasMoved: boolean = false;
  hasAttacked: boolean = false;
  private isDead: boolean = false;
  public unitType: U;

  get team(): "blue" | "red" {
    return this._team;
  }

  set team(value: "blue" | "red") {
    this._team = value;
    if (this.healthBg) {
      this.healthBg
        .clear()
        .rect(8, 16, 24, 16)
        .fill(value === "blue" ? C.blue : C.red);
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

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = 64;
    this.sprite.height = 64;
    this.addChild(this.sprite);

    // Health indicator background (16x16 box placed at the bottom right)
    this.healthBg = new Graphics().rect(8, 16, 24, 16).fill(0x000000);
    this.addChild(this.healthBg);

    this.healthText = new Text({
      text: Math.max(this._health).toString(),
      style: {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: "Allerta Stencil",
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
