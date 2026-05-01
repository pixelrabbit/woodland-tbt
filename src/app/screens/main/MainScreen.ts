import type { Ticker } from "pixi.js";
import { Container, Graphics, Text } from "pixi.js";
import { animate } from "motion";
import { waitFor } from "../../../engine/utils/waitFor";
import { engine } from "../../getEngine";
import { Tile, TileType } from "./Tile";
import { Infantry, Commando, Tank, Recon, Artillery } from "./units/Unit";
import { Unit } from "./units/Unit";
import { BattleModal } from "./Battle";
import { C } from "../../common";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen  */
  public static assetBundles = ["main", "default"];

  public mainContainer: Container;
  private gridContainer: Container;
  private tiles: Map<string, Tile> = new Map();
  private paused = false;
  private currentTurn: "blue" | "red" = "blue";
  private allUnits: Unit[] = [];
  private endTurnButton!: Container;
  private turnText!: Text;
  private hudBg!: Graphics;
  private battleModal!: BattleModal;

  constructor() {
    super();

    // Prevent the default browser right-click menu from appearing
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    this.mainContainer = new Container();
    this.mainContainer.sortableChildren = true;
    this.addChild(this.mainContainer);

    this.gridContainer = new Container();
    this.mainContainer.addChild(this.gridContainer);

    this.createGrid();
    this.placeUnits();
    this.createUI();
    this.updateUnitInteractivity();

    this.battleModal = new BattleModal();

    this.addChild(this.battleModal);
  }

  private createUI() {
    //end turn button
    this.endTurnButton = new Container();
    const bg = new Graphics().rect(0, 0, 150, 50).fill(0x333333).stroke({ width: 2, color: 0xffffff });
    const text = new Text({
      text: "End Turn",
      style: { fill: 0xffffff, fontSize: 24, fontWeight: "bold", fontFamily: "Allerta Stencil" },
    });
    text.anchor.set(0.5);
    text.position.set(75, 25);
    this.endTurnButton.addChild(bg, text);
    this.endTurnButton.eventMode = "static";
    this.endTurnButton.cursor = "pointer";
    this.endTurnButton.on("pointerdown", () => this.endTurn());
    this.addChild(this.endTurnButton);

    //HUD
    const hudContainer = new Container();
    this.hudBg = new Graphics()
      .poly([
        -4,
        -4, // Top Left
        250,
        -4, // Top Right
        250,
        40, // Right before cut
        210,
        80, // Bottom after cut
        -4,
        80, // Bottom Left
      ])
      .fill(this.currentTurn === "blue" ? C.blue : C.red)
      .stroke({ width: 4, color: 0xffffff });

    hudContainer.addChild(this.hudBg);

    this.turnText = new Text({
      text: "BLUE",
      style: { fill: 0xffffff, fontSize: 32, fontWeight: "bold", fontFamily: "Allerta Stencil" },
    });
    this.turnText.position.set(20, 15);
    hudContainer.addChild(this.turnText);

    this.addChild(hudContainer);
  }

  private createGrid() {
    const grid = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 2, 2, 2, 1, 1, 1, 0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 0, 0, 1, 1, 1, 1, 1, 1, 3, 3, 3, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 3, 3, 3, 0, 0, 1, 1, 1, 1, 1, 1, 3, 3, 3, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
          case 3:
            tileType = TileType.F;
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

    // Center the logical grid rather than the visual bounds
    this.gridContainer.pivot.set((grid[0].length * Tile.TILE_SIZE) / 2, (grid.length * Tile.TILE_SIZE) / 2);
  }

  private placeUnits() {
    const blue = [
      { type: Infantry, x: 12, y: 6 },
      { type: Infantry, x: 11, y: 6 },
      { type: Commando, x: 12, y: 5 },
      { type: Tank, x: 11, y: 5 },
      { type: Recon, x: 10, y: 6 },
      { type: Artillery, x: 10, y: 7 },
    ];

    const red = [
      { type: Infantry, x: 15, y: 6 },
      { type: Infantry, x: 16, y: 6 },
      { type: Commando, x: 14, y: 5 },
      { type: Tank, x: 15, y: 5 },
      { type: Recon, x: 17, y: 6 },
      { type: Artillery, x: 17, y: 7 },
    ];

    const placeTeamUnits = (
      team: {
        type: typeof Infantry | typeof Commando | typeof Tank | typeof Recon | typeof Artillery;
        x: number;
        y: number;
      }[],
      color: number,
      teamName: "blue" | "red"
    ) => {
      team.forEach((u) => {
        const x = Tile.TILE_SIZE / 2;
        const y = Tile.TILE_SIZE / 2;

        let unit;
        switch (u.type) {
          case Commando:
            unit = new Commando(x, y);
            break;
          case Tank:
            unit = new Tank(x, y);
            break;
          case Recon:
            unit = new Recon(x, y);
            break;
          case Artillery:
            unit = new Artillery(x, y);
            break;
          case Infantry:
          default:
            unit = new Infantry(x, y);
            break;
        }

        unit.team = teamName;
        this.allUnits.push(unit);
        unit.on("moved", () => this.onUnitMoved());
        unit.on("attack", (attacker: Unit, target: Unit) => {
          this.battleModal.battle(attacker, target);
          this.updateUnitInteractivity();
        });

        const outline = new Graphics().rect(-32, -32, 64, 64).stroke({ width: 2, color, alignment: 1 });
        unit.addChild(outline);

        const tileId = `${u.x}_${u.y}`;
        const tile = this.tiles.get(tileId);
        if (tile) {
          unit.boardTiles = this.tiles;
          unit.boardGrid = this.gridContainer;
          tile.addChild(unit);
        }
      });
    };

    placeTeamUnits(blue, C.blueAlt, "blue");
    placeTeamUnits(red, C.redAlt, "red");
  }

  private updateUnitInteractivity() {
    let allMoved = true;
    this.allUnits.forEach((u) => {
      if (u.team === this.currentTurn) {
        if (u.hasMoved && u.hasAttacked) {
          u.eventMode = "none";
          u.alpha = 0.5;
        } else {
          u.eventMode = "static";
          u.alpha = 1;
          allMoved = false;
        }
      } else {
        u.eventMode = "none";
        u.alpha = 1;
      }
    });

    // if (allMoved && this.allUnits.length > 0) {
    //   this.turnText.text = `${this.currentTurn.toUpperCase()} Team - All units moved!`;
    // }
    console.log(allMoved);
  }

  private onUnitMoved() {
    this.updateUnitInteractivity();
  }

  private endTurn() {
    this.currentTurn = this.currentTurn === "blue" ? "red" : "blue";
    this.allUnits.forEach((u) => {
      if (u.team === this.currentTurn) {
        u.hasMoved = false;
        u.hasAttacked = false;
      }
    });
    if (this.hudBg) {
      this.hudBg
        .clear()
        .poly([
          -4,
          -4, // Top Left
          250,
          -4, // Top Right
          250,
          40, // Right before cut
          210,
          80, // Bottom after cut
          -4,
          80, // Bottom Left
        ])
        .fill(this.currentTurn === "blue" ? C.blue : C.red)
        .stroke({ width: 4, color: 0xffffff });
    }

    if (this.turnText) {
      this.turnText.text = `${this.currentTurn.toUpperCase()}`;
    }
    this.updateUnitInteractivity();
    this.showTurnBanner(this.currentTurn);
  }

  // TURN BANNER
  private async showTurnBanner(team: "blue" | "red") {
    const banner = new Container();
    banner.eventMode = "static"; // Block clicks underneath during the animation

    const w = engine().renderer.width;
    const h = engine().renderer.height;
    const bannerHeight = h / 3;
    const startY = (h - bannerHeight) / 2;

    const blocker = new Graphics().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0 });
    const bg = new Graphics()
      .rect(0, startY, w, bannerHeight)
      .fill({ color: team === "blue" ? C.blue : C.red, alpha: 0.85 });

    const text = new Text({
      text: `${team.toUpperCase()} TEAM BEGIN`,
      style: { fill: 0xffffff, fontSize: 64, fontWeight: "bold", fontFamily: "Allerta Stencil" },
    });
    text.anchor.set(0.5);
    text.position.set(w / 2, h / 2);

    banner.addChild(blocker, bg, text);
    banner.alpha = 0;
    this.addChild(banner);

    await animate(banner as Container, { alpha: 1 }, { duration: 0.3 });
    await waitFor(1.5);
    await animate(banner as Container, { alpha: 0 }, { duration: 0.3 });
    banner.destroy();
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

    if (this.endTurnButton) {
      this.endTurnButton.x = width - 170;
      this.endTurnButton.y = height - 70;
    }

    if (this.battleModal) {
      this.battleModal.resize(width, height);
    }
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
    this.allUnits = [];
    this.currentTurn = "blue";
    if (this.turnText) {
      this.turnText.text = "BLUE Team's Turn";
      this.turnText.style.fill = 0x0000ff;
    }
    this.createGrid();
    this.placeUnits();
    this.updateUnitInteractivity();
    this.showTurnBanner(this.currentTurn);
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
