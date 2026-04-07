import { Graphics, Sprite, Text, Assets } from "pixi.js";

export enum TileType {
  P = "plain",
  C = "city",
  M = "mountain",
  W = "water",
}

// A cache for generated textures
const textureGrass = await Assets.load("assets/main/grass.jpg");
const textureWater = await Assets.load("assets/main/water.jpg");
const textureMountain = await Assets.load("assets/main/mountain.png");

export class Tile extends Sprite {
  public readonly tileType: TileType;
  public readonly id: string;
  public readonly gridX: number;
  public readonly gridY: number;
  public static readonly TILE_SIZE = 60;
  public static showCoordinates = false;
  private _state = "default";
  private highlight: Graphics;
  sprite: Sprite;

  constructor(type: TileType, x: number, y: number) {
    super();
    // id
    this.id = `${x}_${y}`;
    this.gridX = x;
    this.gridY = y;

    this.tileType = type;
    this.interactive = true;
    this.sortableChildren = true;
    this.cursor = "pointer";

    let texture;
    switch (type) {
      case TileType.P:
        texture = textureGrass;
        break;
      case TileType.M:
        texture = textureMountain;
        break;
      default:
        texture = textureWater;
        break;
    }
    this.sprite = new Sprite(texture);
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
