import { Graphics, Sprite, Text, Texture } from "pixi.js";

import { engine } from "../../getEngine";

export enum TileType {
  P = "plain",
  C = "city",
  M = "mountain",
  W = "water",
}

// A cache for generated textures
const textureCache: Partial<Record<TileType, Texture>> = {};

function getTileTexture(type: TileType): Texture {
  if (textureCache[type]) {
    return textureCache[type]!;
  }

  const TILE_SIZE = 60;
  const graphics = new Graphics();
  let color: number;

  switch (type) {
    case TileType.P:
      color = 0x8fbc8f; // DarkSeaGreen
      break;
    case TileType.C:
      color = 0x708090; // SlateGray
      break;
    case TileType.M:
      color = 0xd2b48c; // Tan
      break;
    case TileType.W:
      color = 0x4682b4; // SteelBlue
      break;
  }

  graphics
    .rect(0, 0, TILE_SIZE, TILE_SIZE)
    .fill(color)

  const texture = engine().renderer.generateTexture(graphics);
  textureCache[type] = texture;
  graphics.destroy();

  return texture;
}

export class Tile extends Sprite {
  public readonly tileType: TileType;
  public static readonly TILE_SIZE = 60;
  public static showCoordinates = true;

  constructor(type: TileType, x: number, y: number) {
    super(getTileTexture(type));
    this.tileType = type;
    this.interactive = true;
    // this.cursor = "pointer";

    if (Tile.showCoordinates) {
      const coordinatesText = new Text(`${x},${y}`, {
        fontSize: 10,
        fill: 0xffffff,
        fontFamily: "Arial",
      });
      coordinatesText.anchor.set(1, 1);
      coordinatesText.position.set(Tile.TILE_SIZE - 2, Tile.TILE_SIZE - 2);
      this.addChild(coordinatesText);
    }
  }
}