import { animate } from "motion";
import { Container, Graphics, Text } from "pixi.js";

import { engine } from "../getEngine";
import type { TileType } from "../screens/main/Tile";

export class TilePopup extends Container {
  private background: Graphics;
  private message: Text;

  constructor(tileType: TileType) {
    super();

    this.background = new Graphics();
    this.background.beginFill(0x000000, 0.8);
    this.background.drawRoundedRect(0, 0, 350, 120, 16);
    this.background.endFill();
    this.addChild(this.background);

    this.message = new Text(`This is a ${tileType} tile.`, {
      fill: 0xffffff,
      fontSize: 28,
      fontFamily: "Arial",
      align: "center",
      wordWrap: true,
      wordWrapWidth: 330,
    });
    this.message.anchor.set(0.5);
    this.message.position.set(
      this.background.width / 2,
      this.background.height / 2,
    );
    this.addChild(this.message);

    this.pivot.set(this.width / 2, this.height / 2);

    // Make it dismissable by clicking anywhere on the popup
    this.interactive = true;
    this.cursor = "pointer";
    this.on("pointertap", () => engine().navigation.dismissPopup());
  }

  /** Resize the popup, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.position.set(width / 2, height / 2);
  }

  /** Show screen with animations */
  public async show() {
    this.alpha = 0;
    this.scale.set(0.8);
    animate(this, { alpha: 1, scale: 1 }, { duration: 0.3, easing: "ease-out" });
  }

  /** Hide screen with animations */
  public async hide() {
    await animate(this, { alpha: 0, scale: 0.8 }, { duration: 0.2, easing: "ease-in" });
  }
}