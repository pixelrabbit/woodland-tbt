import { Graphics, Sprite, Text, Assets, Container, Texture, type ColorSource } from "pixi.js";
import { animate } from "motion";
import { C, TILE_SIZE } from "../../common";

export enum TileType {
  G = "grass",
  C = "city",
  M = "mountain",
  W = "water",
  F = "forest",
  R = "road",
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
const textureGrass = await Assets.load("assets/tiles/grass.png");
const textureWater = await Assets.load("assets/tiles/water.jpg");
const textureMountain = await Assets.load("assets/tiles/mountain.png");
const textureForest = await Assets.load("assets/tiles/forest.png");
const textureCity = await Assets.load("assets/tiles/city.png");
const textureRoad = await Assets.load("assets/tiles/road.png");

export const TILE_DATA: Record<TileType, TileData> = {
  [TileType.G]: {
    defense: 1,
    movementCost: {
      foot: 1,
      treads: 1,
      tires: 2,
      air: 1,
    },
    texture: textureGrass,
  },
  [TileType.R]: {
    defense: 0,
    movementCost: {
      foot: 1,
      treads: 1,
      tires: 1,
      air: 1,
    },
    texture: textureRoad,
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

class CaptureBoxIndicator extends Container {
  private baseBg: Graphics;
  private teamBg: Graphics;
  private whiteOverlay: Graphics;
  public readonly boxSize: number;

  constructor(size: number = 12) {
    super();
    this.boxSize = size;

    this.baseBg = new Graphics().rect(0, 0, size, size).fill({ h: 0, s: 0, l: 20 });
    this.teamBg = new Graphics().rect(0, 0, size, size).fill({ h: 0, s: 0, l: 20 });
    this.teamBg.alpha = 0;
    this.whiteOverlay = new Graphics().rect(0, 0, size, size).fill(0xffffff);
    this.whiteOverlay.alpha = 0;

    this.addChild(this.baseBg, this.teamBg, this.whiteOverlay);
  }

  public async transitionToColor(color: ColorSource) {
    this.teamBg.clear().rect(0, 0, this.boxSize, this.boxSize).fill(color);
    this.teamBg.alpha = 1;

    // 1. Transition smoothly into white
    await animate(this.whiteOverlay as Container, { alpha: [0, 1] }, { duration: 0.18, ease: "easeIn" });
    // 2. Transition smoothly from white to team color
    await animate(this.whiteOverlay as Container, { alpha: [1, 0] }, { duration: 0.22, ease: "easeOut" });
  }

  public setColorDirect(color: ColorSource | null) {
    if (color) {
      this.teamBg.clear().rect(0, 0, this.boxSize, this.boxSize).fill(color);
      this.teamBg.alpha = 1;
    } else {
      this.teamBg.alpha = 0;
    }
    this.whiteOverlay.alpha = 0;
  }
}

export class Tile extends Container {
  public readonly tileType: TileType;
  public readonly id: string;
  public readonly gridX: number;
  public readonly gridY: number;
  public static readonly TILE_SIZE = TILE_SIZE;
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
  private box1?: CaptureBoxIndicator;
  private box2?: CaptureBoxIndicator;
  private captureBoxesContainer?: Container;

  public get owner(): "blue" | "red" | null {
    return this._owner;
  }

  public set owner(value: "blue" | "red" | null) {
    this._owner = value;
    this.captureTeam = value;
    this.capturePoints = value ? 2 : 0;
    this.updateCaptureBoxes();
  }

  private initCaptureBoxes() {
    if (this.tileType !== TileType.C || this.captureBoxesContainer) return;

    this.captureBoxesContainer = new Container();
    this.captureBoxesContainer.zIndex = 50;
    this.captureBoxesContainer.position.set(2, 2);

    this.box1 = new CaptureBoxIndicator(12);
    this.box1.position.set(0, 0);

    this.box2 = new CaptureBoxIndicator(12);
    this.box2.position.set(0, 14); // 12 + 2 spacing

    this.captureBoxesContainer.addChild(this.box1, this.box2);
    this.addChild(this.captureBoxesContainer);
  }

  public async setCaptureProgress(team: "blue" | "red" | null, points: number) {
    this.initCaptureBoxes();

    const oldPoints = this.capturePoints;
    const oldTeam = this.captureTeam;

    const newPoints = Math.max(0, Math.min(2, points));
    const newTeam = newPoints === 0 ? null : team;

    // Detect which boxes are changing to a new team color
    const box1Changed = newPoints >= 1 && newTeam && (oldPoints < 1 || oldTeam !== newTeam);
    const box2Changed = newPoints >= 2 && newTeam && (oldPoints < 2 || oldTeam !== newTeam);

    this.captureTeam = newTeam;
    this.capturePoints = newPoints;
    if (this.capturePoints === 2 && this.captureTeam) {
      this._owner = this.captureTeam;
    } else {
      this._owner = null;
      if (this.capturePoints === 0) {
        this.captureTeam = null;
      }
    }

    const teamColor = newTeam ? (newTeam === "blue" ? C.blue : C.red) : null;

    const transitions: Promise<void>[] = [];

    if (box1Changed && this.box1 && teamColor) {
      transitions.push(this.box1.transitionToColor(teamColor));
    } else if (this.box1) {
      this.box1.setColorDirect(newPoints >= 1 && teamColor ? teamColor : null);
    }

    if (box2Changed && this.box2 && teamColor) {
      transitions.push(this.box2.transitionToColor(teamColor));
    } else if (this.box2) {
      this.box2.setColorDirect(newPoints >= 2 && teamColor ? teamColor : null);
    }

    if (transitions.length > 0) {
      await Promise.all(transitions);
    }
  }

  public updateCaptureBoxes() {
    this.initCaptureBoxes();
    const teamColor = this.captureTeam ? (this.captureTeam === "blue" ? C.blue : C.red) : null;
    if (this.box1) {
      this.box1.setColorDirect(this.capturePoints >= 1 && teamColor ? teamColor : null);
    }
    if (this.box2) {
      this.box2.setColorDirect(this.capturePoints >= 2 && teamColor ? teamColor : null);
    }
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
