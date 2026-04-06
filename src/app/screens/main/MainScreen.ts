import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";

import { engine } from "../../getEngine";

import { Tile, TileType } from "./Tile";
import { Unit, U } from "./Unit";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  public mainContainer: Container;
  private gridContainer: Container;
  private tiles: Tile[] = [];
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
        this.tiles.push(tile);
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
      { type: U.Infantry, col: 6, row: 6 },
      { type: U.Commando, col: 7, row: 5 },
    ];

    unitsToPlace.forEach(u => {
      const x = u.col * Tile.TILE_SIZE + Tile.TILE_SIZE / 2;
      const y = u.row * Tile.TILE_SIZE + Tile.TILE_SIZE / 2;
      const unit = new Unit(u.type, x, y, Tile.TILE_SIZE);
      this.gridContainer.addChild(unit);
    });
  }

  /** Prepare the screen just before showing */
  public prepare() { }

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
    this.tiles = [];
    this.createGrid();
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    // engine().audio.bgm.play("main/sounds/bgm-main.mp3", { volume: 0.5 });
  }

  /** Hide screen with animations */
  public async hide() { }

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!engine().navigation.currentPopup) {
      // engine().navigation.presentPopup(PausePopup);
    }
  }
}
