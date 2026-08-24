import { Graphics, Sprite, Text, Assets, Container, Texture } from "pixi.js";
import { animate } from "motion";
import { C } from "../../common";

export enum TileType {
  P = "plain",
  C = "city",
  M = "mountain",
  W = "water",
  F = "forest",
}

export interface MovementCost {
  foot: number;
  treads: number;
  tires: number;
  air: number;
}

export interface TileData {
  defense: number;
  movementCost: MovementCost;
  texture: Texture;
}

// A cache for generated textures
const textureGrass = await Assets.load("assets/main/grass.png");
const textureWater = await Assets.load("assets/main/water.jpg");
const textureMountain = await Assets.load("assets/main/mountain.png");
const textureForest = await Assets.load("assets/main/forest.png");
const textureCity = await Assets.load("assets/main/city.png");

export const TILE_DATA: Record<TileType, TileData> = {
  [TileType.P]: {
    defense: 1,
    movementCost: {
      foot: 1,
      treads: 1,
      tires: 2,
      air: 1,
    },
    texture: textureGrass,
  },
  [TileType.C]: {
    defense: 3,
    movementCost: {
      foot: 1,
      treads: 1,
      tires: 1,
      air: 1,
    },
    texture: textureCity,
  },
  [TileType.M]: {
    defense: 4,
    movementCost: {
      foot: 2,
      treads: 100,
      tires: 100,
      air: 1,
    },
    texture: textureMountain,
  },
  [TileType.W]: {
    defense: 0,
    movementCost: {
      foot: 100,
      treads: 100,
      tires: 100,
      air: 1,
    },
    texture: textureWater,
  },
  [TileType.F]: {
    defense: 2,
    movementCost: {
      foot: 1,
      treads: 2,
      tires: 3,
      air: 1,
    },
    texture: textureForest,
  },
};

export class Tile extends Container {
  public readonly tileType: TileType;
  public readonly id: string;
  public readonly gridX: number;
  public readonly gridY: number;
  public static readonly TILE_SIZE = 84;
  public readonly movementCost: MovementCost;
  public static showCoordinates = false;
  private _state = "default";
  private _isHovered = false;
  private highlight: Graphics;
  private hoverReticle: Graphics;
  // private hoverOutline: Graphics;
  sprite: Sprite;

  constructor(type: TileType, x: number, y: number) {
    super();
    // id
    this.id = `${x}_${y}`;
    this.gridX = x;
    this.gridY = y;

    this.tileType = type;
    this.movementCost = TILE_DATA[type].movementCost;
    this.interactive = true;
    this.sortableChildren = true;
    this.cursor = "default";

    this.sprite = new Sprite(TILE_DATA[type]?.texture || textureWater);
    this.sprite.anchor.set(0);
    this.sprite.setSize(Tile.TILE_SIZE);
    this.addChild(this.sprite);

    if (Tile.showCoordinates) {
      const coordinatesText = new Text({
        text: `${x},${y}`,
        style: {
          fontSize: 10,
          fill: 0xffffff,
          fontFamily: "Jersey 25",
        },
      });
      coordinatesText.anchor.set(1, 1);
      coordinatesText.position.set(Tile.TILE_SIZE - 2, Tile.TILE_SIZE - 2);
      this.addChild(coordinatesText);
    }

    // range highlight
    this.highlight = new Graphics().rect(0, 0, Tile.TILE_SIZE, Tile.TILE_SIZE).fill({ color: 0xffffff, alpha: 0.35 });
    this.highlight.visible = false;
    this.addChild(this.highlight);

    // hover reticle
    const length = 16;
    const s = Tile.TILE_SIZE;
    const offset = 2; // Keep it slightly inside the tile boundaries
    this.hoverReticle = new Graphics()
      .moveTo(offset, offset + length)
      .lineTo(offset, offset)
      .lineTo(offset + length, offset)
      .moveTo(s - offset - length, offset)
      .lineTo(s - offset, offset)
      .lineTo(s - offset, offset + length)
      .moveTo(s - offset, s - offset - length)
      .lineTo(s - offset, s - offset)
      .lineTo(s - offset - length, s - offset)
      .moveTo(offset + length, s - offset)
      .lineTo(offset, s - offset)
      .lineTo(offset, s - offset - length)
      .stroke({ color: 0xffffff, width: 3 });
    this.hoverReticle.pivot.set(s / 2, s / 2);
    this.hoverReticle.position.set(s / 2, s / 2);
    this.hoverReticle.visible = false;
    this.hoverReticle.zIndex = 10000;
    this.addChild(this.hoverReticle);

    // Wire up pointer events for hovering
    this.on("pointerenter", () => {
      this._isHovered = true;
      this.updateVisuals();
    });

    this.on("pointerleave", () => {
      this._isHovered = false;
      this.updateVisuals();
    });

    if (this.tileType === TileType.C) {
      this.updateCaptureBoxes();
    }
  }

  private updateVisuals() {
    this.highlight.visible = false;
    this.hoverReticle.visible = false;
    this.hoverReticle.tint = 0xffffff;

    if (this._state === "canMoveTo" || this._state === "hover" || this._state === "path") {
      this.highlight.tint = 0xffff00;
      this.highlight.visible = true;
    } else if (this._state === "canAttack" || this._state === "attackHover") {
      this.highlight.tint = 0xff0000;
      this.highlight.visible = true;
    }

    if (this._isHovered || this._state === "hover" || this._state === "attackHover") {
      this.hoverReticle.visible = true;
      if (this._state === "attackHover") {
        this.hoverReticle.tint = 0xff0000;
      }
    }
  }

  public get state() {
    return this._state;
  }

  public set state(value: string) {
    this._state = value;
    this.updateVisuals();
  }

  private _owner: "blue" | "red" | null = null;
  public capturePoints: number = 0;
  public captureTeam: "blue" | "red" | null = null;
  private captureBoxesGraphic?: Graphics;

  public get owner(): "blue" | "red" | null {
    return this._owner;
  }

  public set owner(value: "blue" | "red" | null) {
    this._owner = value;
    this.captureTeam = value;
    this.capturePoints = value ? 2 : 0;
    this.updateCaptureBoxes();
  }

  public setCaptureProgress(team: "blue" | "red" | null, points: number) {
    this.captureTeam = team;
    this.capturePoints = Math.max(0, Math.min(2, points));
    if (this.capturePoints === 2 && this.captureTeam) {
      this._owner = this.captureTeam;
    } else {
      this._owner = null;
      if (this.capturePoints === 0) {
        this.captureTeam = null;
      }
    }
    this.updateCaptureBoxes();
  }

  public updateCaptureBoxes() {
    if (this.tileType !== TileType.C) return;

    if (!this.captureBoxesGraphic) {
      this.captureBoxesGraphic = new Graphics();
      this.captureBoxesGraphic.zIndex = 50;
      this.addChild(this.captureBoxesGraphic);
    }

    const g = this.captureBoxesGraphic;
    g.clear();

    const boxSize = 12;
    const spacing = 2;
    const startX = 2;
    const startY = 2;

    const grayColor = { h: 0, s: 0, l: 20 };
    const teamColor = this.captureTeam ? (this.captureTeam === "blue" ? C.blue : C.red) : grayColor;

    // Box 1
    const color1 = this.capturePoints >= 1 && this.captureTeam ? teamColor : grayColor;
    g.rect(startX, startY, boxSize, boxSize).fill(color1);

    // Box 2
    const color2 = this.capturePoints >= 2 && this.captureTeam ? teamColor : grayColor;
    g.rect(startX, startY + boxSize + spacing, boxSize, boxSize).fill(color2);
  }

  public async animateIncome(amount: number) {
    const text = new Text({
      text: `+${amount}`,
      style: {
        fontSize: 26,
        fill: 0xffffff,
        fontFamily: "Jersey 25",
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      },
    });
    text.anchor.set(0.5);
    const startX = Tile.TILE_SIZE / 2;
    const startY = Tile.TILE_SIZE / 2;
    text.position.set(startX, startY);
    text.zIndex = 10000;
    this.addChild(text);

    // Calculate vector towards the upper-left HUD credits badge (approx screen x: 210, y: 14)
    const localTarget = this.toLocal({ x: 210, y: 14 });
    const dx = localTarget.x - startX;
    const dy = localTarget.y - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const travelDist = 80;
    const targetX = startX + (dx / dist) * travelDist;
    const targetY = startY + (dy / dist) * travelDist;

    await animate(
      text as Container,
      { x: [startX, targetX], y: [startY, targetY], alpha: [1, 0] },
      { duration: 1.2, ease: "easeOut" }
    );
    text.destroy();
  }
}
