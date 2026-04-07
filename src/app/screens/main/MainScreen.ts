import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
import { animate } from "motion";

import { engine } from "../../getEngine";
import { Tile, TileType } from "./Tile";
import { Infantry } from "./units/Infantry";
import { Commando } from "./units/CommandoTest";
import { Unit, getPointsAtDistance } from "./units/Unit";
import { getTilesByCoordinates } from "../../utils/coordinates";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen  */
  public static assetBundles = ["main"];

  public mainContainer: Container;
  private gridContainer: Container;
  private tiles: Map<string, Tile> = new Map();
  private paused = false;
  private draggingUnit: Unit | null = null;
  private hoveredTile: Tile | null = null;

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
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 2, 2, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
    this.gridContainer.pivot.set(this.gridContainer.width / 2, this.gridContainer.height / 2);
  }

  private placeUnits() {
    const unitsToPlace = [
      { type: Infantry, x: 6, y: 6 },
      { type: Infantry, x: 7, y: 6 },
      { type: Commando, x: 7, y: 5 },
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

      const tileId = `${u.x}_${u.y}`;
      const tile = this.tiles.get(tileId);
      if (tile) {
        tile.addChild(unit);

        unit.on("requestMove", (selectedUnit: Unit) => {
          const parentTile = selectedUnit.parent as Tile;
          // Clear previous highlights
          this.tiles.forEach((t) => (t.state = "default"));
          const possibleMoveCoordinates = getPointsAtDistance(
            parentTile.gridX,
            parentTile.gridY,
            selectedUnit.moveRange
          );
          getTilesByCoordinates(Array.from(this.tiles.values()), possibleMoveCoordinates).forEach((t) => {
            t.state = "canMoveTo";
          });
        });

        unit.on("dragStart", (selectedUnit: Unit) => {
          this.draggingUnit = selectedUnit;
          const parentTile = selectedUnit.parent as Tile;
          this.tiles.forEach((t) => (t.state = "default"));
          const possibleMoves = getPointsAtDistance(parentTile.gridX, parentTile.gridY, selectedUnit.moveRange);
          getTilesByCoordinates(Array.from(this.tiles.values()), possibleMoves).forEach((t) => {
            t.state = "canMoveTo";
          });
        });

        unit.on("dragMove", (selectedUnit: Unit, globalPos: { x: number; y: number }) => {
          if (!this.draggingUnit) return;

          const localPos = this.gridContainer.toLocal(globalPos);
          const col = Math.floor(localPos.x / Tile.TILE_SIZE);
          const row = Math.floor(localPos.y / Tile.TILE_SIZE);
          const tileId = `${col}_${row}`;
          const tile = this.tiles.get(tileId);

          if (this.hoveredTile && this.hoveredTile !== tile) {
            if (this.hoveredTile.state === "hover") {
              this.hoveredTile.state = "canMoveTo"; // Revert to regular highlight
            }
            this.hoveredTile = null;
          }

          if (tile && tile.state === "canMoveTo") {
            tile.state = "hover";
            this.hoveredTile = tile;
          }
        });

        unit.on("dragEnd", (selectedUnit: Unit) => {
          if (this.draggingUnit === selectedUnit) {
            if (this.hoveredTile && this.hoveredTile.state === "hover") {
              const parentTile = selectedUnit.parent as Tile;
              const targetTile = this.hoveredTile;

              // Calculate position relative to gridContainer
              const startX = parentTile.x + Tile.TILE_SIZE / 2;
              const startY = parentTile.y + Tile.TILE_SIZE / 2;
              const targetX = targetTile.x + Tile.TILE_SIZE / 2;
              const targetY = targetTile.y + Tile.TILE_SIZE / 2;

              // Re-parent the unit to the gridContainer to render above all tiles during animation
              this.gridContainer.addChild(selectedUnit);
              selectedUnit.position.set(startX, startY);

              const runAnimation = async () => {
                selectedUnit.eventMode = "none"; // Prevent dragging during animation
                const distTilesX = Math.abs(targetX - startX) / Tile.TILE_SIZE;
                const distTilesY = Math.abs(targetY - startY) / Tile.TILE_SIZE;

                if (distTilesX > 0) {
                  await animate(selectedUnit, { x: targetX }, { duration: distTilesX * 0.1, ease: "linear" });
                }
                if (distTilesY > 0) {
                  await animate(selectedUnit, { y: targetY }, { duration: distTilesY * 0.1, ease: "linear" });
                }

                // Re-parent back to the target tile after animation
                targetTile.addChild(selectedUnit);
                selectedUnit.position.set(Tile.TILE_SIZE / 2, Tile.TILE_SIZE / 2);
                selectedUnit.eventMode = "static";
              };
              runAnimation();
            }
            this.draggingUnit = null;
            this.hoveredTile = null;
            this.tiles.forEach((t) => (t.state = "default"));
          }
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
