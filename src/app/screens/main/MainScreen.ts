import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";

import { engine } from "../../getEngine";

import { Tile, TileType } from "./Tile";
import { Infantry } from "./units/Infantry";
import { Commando } from "./units/commando";
import { Unit, getPointsAtDistance } from "./units/Unit";
import { getTilesByCoordinates } from "../../utils/coordinates";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  public mainContainer: Container;
  private gridContainer: Container;
  private tiles: Map<string, Tile> = new Map();
  private paused = false;

  constructor() {
    super();

    this.mainContainer = new Container();
    this.addChild(this.mainContainer);

    this.gridContainer = new Container();
    this.mainContainer.addChild(this.gridContainer);

    this.createGrid();
    this.placeUnits();
  }

  private createGrid() {
    const grid = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        const tileValue = grid[row][col];
        let tileType: TileType;
        switch (tileValue) {
          case 1:
            tileType = TileType.P;
            break;
          case 2:
            tileType = TileType.M;
            break;
          default:
            tileType = TileType.W;
            break;
        }
        const tile = new Tile(tileType, col, row);

        tile.x = col * Tile.TILE_SIZE;
        tile.y = row * Tile.TILE_SIZE;

        this.gridContainer.addChild(tile);
        this.tiles.set(tile.id, tile);
      }
    }

    // Center the grid
    this.gridContainer.pivot.set(
      this.gridContainer.width / 2,
      this.gridContainer.height / 2,
    );
  }

  private placeUnits() {
    const unitsToPlace = [
      { type: Infantry, col: 6, row: 6 },
      { type: Infantry, col: 7, row: 6 },
      { type: Commando, col: 7, row: 5 },
    ];

    unitsToPlace.forEach((u) => {
      const x = Tile.TILE_SIZE / 2;
      const y = Tile.TILE_SIZE / 2;

      let unit;
      switch (u.type) {
        case Commando:
          unit = new Commando(x, y);
          break;
        case Infantry:
        default:
          unit = new Infantry(x, y);
          break;
      }

      const tileId = `${u.col}_${u.row}`;
      const tile = this.tiles.get(tileId);
      if (tile) {
        tile.addChild(unit);

        unit.on("requestMove", (selectedUnit: Unit) => {
          const parentTile = selectedUnit.parent as Tile;
          // Clear previous highlights
          this.tiles.forEach((t) => (t.state = "default"));
          const possibleMoveCoordinates = getPointsAtDistance(parentTile.gridX, parentTile.gridY, 3);
          getTilesByCoordinates(
            Array.from(this.tiles.values()),
            possibleMoveCoordinates).forEach((t) => {
              t.state = "canMoveTo";
            });
        });
      }
    });
  }

  /** Prepare the screen just before showing */
  // public prepare() { }

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    if (this.paused) return;
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.mainContainer.x = width / 2;
    this.mainContainer.y = height / 2;
  }

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {
    this.mainContainer.interactiveChildren = false;
    this.paused = true;
  }

  /** Resume gameplay */
  public async resume() {
    this.mainContainer.interactiveChildren = true;
    this.paused = false;
  }

  /** Fully reset */
  public reset() {
    this.gridContainer.removeChildren();
    this.tiles.clear();
    this.createGrid();
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    // engine().audio.bgm.play("main/sounds/bgm-main.mp3", { volume: 0.5 });
  }

  /** Hide screen with animations */
  // public async hide() { }

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      // engine().navigation.presentPopup(PausePopup);
    }
  }
}
