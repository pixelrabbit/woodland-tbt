import { Graphics, Sprite, Text, Assets, Container, Texture } from "pixi.js";

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
const textureGrass = await Assets.load("assets/main/grass.jpg");
const textureWater = await Assets.load("assets/main/water.jpg");
const textureMountain = await Assets.load("assets/main/mountain.png");
const textureForest = await Assets.load("assets/main/forest.png");

const TILE_DATA: Record<TileType, TileData> = {
  [TileType.P]: { defense: 1, movementCost: { foot: 1, treads: 1, tires: 2, air: 1 }, texture: textureGrass },
  [TileType.C]: { defense: 3, movementCost: { foot: 1, treads: 1, tires: 1, air: 1 }, texture: textureGrass }, // Default/placeholder values
  [TileType.M]: { defense: 4, movementCost: { foot: 2, treads: 100, tires: 100, air: 1 }, texture: textureMountain },
  [TileType.W]: { defense: 0, movementCost: { foot: 100, treads: 100, tires: 100, air: 1 }, texture: textureWater },
  [TileType.F]: { defense: 2, movementCost: { foot: 1, treads: 2, tires: 3, air: 1 }, texture: textureForest },
};

export class Tile extends Container {
  public readonly tileType: TileType;
  public readonly id: string;
  public readonly gridX: number;
  public readonly gridY: number;
  public static readonly TILE_SIZE = 64;
  public readonly movementCost: MovementCost;
  public static showCoordinates = false;
  private _state = "default";
  private highlight: Graphics;
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
    this.cursor = "pointer";

    this.sprite = new Sprite(TILE_DATA[type]?.texture || textureWater);
    this.sprite.anchor.set(0);
    this.sprite.width = 64;
    this.sprite.height = 64;
    this.addChild(this.sprite);

    if (Tile.showCoordinates) {
      const coordinatesText = new Text({
        text: `${x},${y}`,
        style: {
          fontSize: 10,
          fill: 0xffffff,
          fontFamily: "Arial",
        },
      });
      coordinatesText.anchor.set(1, 1);
      coordinatesText.position.set(Tile.TILE_SIZE - 2, Tile.TILE_SIZE - 2);
      this.addChild(coordinatesText);
    }

    // movable highlight
    this.highlight = new Graphics().rect(0, 0, Tile.TILE_SIZE, Tile.TILE_SIZE).fill({ color: 0xffff00, alpha: 0.25 });
    this.highlight.visible = false;
    this.addChild(this.highlight);
  }

  public get state() {
    return this._state;
  }

  public set state(value: string) {
    this._state = value;
    if (value === "canMoveTo") {
      this.highlight.tint = 0xffffff;
      this.highlight.visible = true;
    } else if (value === "hover") {
      this.highlight.tint = 0xff0000;
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }
}
