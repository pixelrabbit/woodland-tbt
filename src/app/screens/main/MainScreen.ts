import type { Ticker } from "pixi.js";
import { Container, Graphics, Text } from "pixi.js";
import { animate } from "motion";
import { waitFor } from "../../../engine/utils/waitFor";
import { engine } from "../../getEngine";
import { Tile, TileType } from "./Tile";
import { Infantry, Commando, Tank, Recon, Artillery } from "./Unit";
import { Unit } from "./Unit";
import { BattlePane } from "./Battle";
import { Hud } from "./HUD";
import { C } from "../../common";
import { PausePopup } from "../../popups/PausePopup";

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
  private credits: Record<"blue" | "red", number> = { blue: 100, red: 200 };
  private hud!: Hud;
  private battlePane!: BattlePane;

  constructor() {
    super();

    // Prevent the default browser right-click menu from appearing
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Toggle pause with Keypad 0 TODO: not working
    window.addEventListener("keydown", (e) => {
      if (e.code === "Numpad0") {
        const nav = engine().navigation;
        if (nav.currentPopup instanceof PausePopup) {
          nav.dismissPopup();
        } else if (!nav.currentPopup) {
          nav.presentPopup(PausePopup);
        }
      }
    });

    this.mainContainer = new Container();
    this.mainContainer.sortableChildren = true;
    this.addChild(this.mainContainer);

    this.gridContainer = new Container();
    this.mainContainer.addChild(this.gridContainer);

    this.createGrid();
    this.placeUnits();
    this.createUI();
    this.updateUnitInteractivity();

    this.battlePane = new BattlePane();

    this.addChild(this.battlePane);
  }

  private createUI() {
    this.hud = new Hud(() => this.endTurn());
    this.hud.update(this.currentTurn, this.credits[this.currentTurn]);
    this.addChild(this.hud);
  }

  private createGrid() {
    const { W, G, M, F, C, R } = TileType;
    const grid: TileType[][] = [
      [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
      [W, G, G, G, W, G, G, G, G, G, G, W, W, G, G, G, G, G, G, G, G, G, G, W],
      [W, G, G, G, W, M, M, M, G, G, G, W, W, G, G, G, M, M, M, G, G, G, G, W],
      [W, G, G, G, W, M, M, G, G, G, G, G, G, G, G, G, M, M, G, G, G, G, G, W],
      [W, G, G, G, W, M, G, G, G, G, G, G, G, G, G, G, M, G, G, G, G, G, G, W],
      [W, G, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, G, W],
      [W, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, W],
      [W, G, G, G, G, G, G, G, G, F, F, F, F, F, F, F, F, G, G, G, G, G, G, W],
      [W, G, G, G, G, G, G, G, F, F, F, G, G, G, G, G, G, G, G, F, F, F, G, W],
      [W, G, G, G, G, G, G, G, F, F, F, W, C, G, G, G, G, G, G, F, F, F, G, W],
      [W, G, G, G, W, G, G, G, F, F, F, W, W, G, G, G, G, G, G, F, F, F, G, W],
      [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    ];

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        const tileType = grid[row][col];
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
        unit.on("attack", async (attacker: Unit, target: Unit) => {
          await this.battlePane.battle(attacker, target);
          this.checkCityOccupancy();
          this.updateUnitInteractivity();
        });

        const tileId = `${u.x}_${u.y}`;
        const tile = this.tiles.get(tileId);
        if (tile) {
          unit.boardTiles = this.tiles;
          unit.boardGrid = this.gridContainer;
          tile.addChild(unit);
        }
      });
    };

    placeTeamUnits(blue, "blue");
    placeTeamUnits(red, "red");
  }

  private checkCityOccupancy() {
    this.tiles.forEach((tile) => {
      if (tile.tileType === TileType.C) {
        const occupant = tile.children.find((child) => child instanceof Unit && !child.isDead) as Unit | undefined;
        if (!occupant) {
          tile.setCaptureProgress(null, 0);
        }
      }
    });
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
    this.checkCityOccupancy();
    this.updateUnitInteractivity();
  }

  private async endTurn() {
    this.currentTurn = this.currentTurn === "blue" ? "red" : "blue";
    this.allUnits.forEach((u) => {
      if (u.team === this.currentTurn) {
        u.hasMoved = false;
        u.hasAttacked = false;
      }
    });

    if (this.hud) {
      this.hud.update(this.currentTurn, this.credits[this.currentTurn]);
    }
    this.updateUnitInteractivity();

    // 1. Show turn banner and wait until it fully fades out
    await this.showTurnBanner(this.currentTurn);

    // 2. After banner fades out, advance city capture progress for occupying units
    const capturePromises: Promise<void>[] = [];
    this.tiles.forEach((tile) => {
      if (tile.tileType === TileType.C) {
        const occupant = tile.children.find((child) => child instanceof Unit && !child.isDead) as Unit | undefined;

        if (occupant && occupant.team === this.currentTurn) {
          if (tile.captureTeam === this.currentTurn) {
            capturePromises.push(tile.setCaptureProgress(this.currentTurn, tile.capturePoints + 1));
          } else if (tile.captureTeam && tile.capturePoints > 0) {
            capturePromises.push(tile.setCaptureProgress(tile.captureTeam, tile.capturePoints - 1));
          } else {
            capturePromises.push(tile.setCaptureProgress(this.currentTurn, 1));
          }
        }
      }
    });

    if (capturePromises.length > 0) {
      await Promise.all(capturePromises);
    }

    // 3. Add 1000 credits for each captured city (both boxes full) and trigger floating income animation
    let cityIncome = 0;
    this.tiles.forEach((tile) => {
      if (tile.tileType === TileType.C && tile.owner === this.currentTurn) {
        cityIncome += 1000;
        tile.animateIncome(1000);
      }
    });

    if (cityIncome > 0) {
      this.credits[this.currentTurn] += cityIncome;
      if (this.hud) {
        this.hud.update(this.currentTurn, this.credits[this.currentTurn]);
      }
    }
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
      style: { fill: 0xffffff, fontSize: 64, fontWeight: "bold", fontFamily: "Jersey 25" },
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

    if (this.hud) {
      this.hud.resize(width, height);
    }

    if (this.battlePane) {
      this.battlePane.resize(width, height);
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
    this.credits = { blue: 100, red: 200 };
    if (this.hud) {
      this.hud.update(this.currentTurn, this.credits[this.currentTurn]);
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
