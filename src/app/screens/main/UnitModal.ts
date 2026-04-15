import { Container, Graphics, Text, Sprite, Texture } from "pixi.js";
import { animate } from "motion";
import { engine } from "../../getEngine";
import { waitFor } from "../../../engine/utils/waitFor";
import { C } from "../../common";

export interface UnitModalProps {
  attacker: boolean;
  unitType: string;
  health: number;
  terrain: string;
  texture: Texture;
  team: "blue" | "red";
}

export class UnitModal extends Container {
  private bg: Graphics;
  private typeText: Text;
  private healthText: Text;
  private terrainText: Text;
  private unitSprite: Sprite;
  private currentShowId = 0;
  private bgColor = 0x000000;

  constructor() {
    super();

    const stageWidth = engine().renderer.width;
    const stageHeight = engine().renderer.height;
    const modalWidth = stageWidth / 2;

    // Black background covering half the screen
    this.bg = new Graphics().rect(0, 0, modalWidth, stageHeight).fill({ alpha: 0.95 });

    this.addChild(this.bg);

    const centerX = modalWidth / 2;

    // Center the unit sprite
    this.unitSprite = new Sprite();
    this.unitSprite.anchor.set(0.5);
    this.unitSprite.position.set(centerX, stageHeight / 2);
    this.unitSprite.width = 300;
    this.unitSprite.height = 300;

    this.addChild(this.unitSprite);

    // Display Texts
    const textStyle = { fill: 0xffffff, fontSize: 24, fontFamily: "Arial" };

    this.typeText = new Text({
      text: "Type:",
      style: { ...textStyle, fontSize: 32, fontWeight: "bold" },
    });
    this.typeText.anchor.set(0.5, 0);
    this.typeText.position.set(centerX, 80);
    this.addChild(this.typeText);

    this.healthText = new Text({ text: "Health:", style: textStyle });
    this.healthText.anchor.set(0.5, 0);
    this.healthText.position.set(centerX, 140);
    this.addChild(this.healthText);

    this.terrainText = new Text({ text: "Terrain:", style: textStyle });
    this.terrainText.anchor.set(0.5, 0);
    this.terrainText.position.set(centerX, 180);
    this.addChild(this.terrainText);

    // Block clicks from passing through the modal to the game board
    this.eventMode = "static";
    this.visible = false;
  }

  public async show(props: UnitModalProps) {
    const showId = ++this.currentShowId;

    this.typeText.text = `Unit: ${props.unitType.toUpperCase()}`;
    this.healthText.text = `Health: ${props.health / 10}`;
    this.terrainText.text = `Terrain: ${props.terrain.toUpperCase()}`;
    if (props.texture) this.unitSprite.texture = props.texture;
    this.x = props.attacker ? 0 : engine().renderer.width / 2;

    this.bgColor = props.team === "blue" ? C.blue : C.red;
    this.bg
      .clear()
      .rect(0, 0, engine().renderer.width / 2, engine().renderer.height)
      .fill({ color: this.bgColor, alpha: 0.9 });

    this.alpha = 0;
    this.visible = true;

    await animate(this as Container, { alpha: 1 }, { duration: 0.3 });
    await waitFor(2);

    if (this.currentShowId === showId) {
      await this.hide();
    }
  }

  public async hide() {
    await animate(this as Container, { alpha: 0 }, { duration: 0.3 });
    this.visible = false;
  }

  public resize(width: number, height: number) {
    const modalWidth = width / 2;
    this.bg.clear().rect(0, 0, modalWidth, height).fill({ color: this.bgColor, alpha: 0.9 });

    const centerX = modalWidth / 2;
    this.unitSprite.position.set(centerX, height / 2);
    this.typeText.position.set(centerX, 80);
    this.healthText.position.set(centerX, 140);
    this.terrainText.position.set(centerX, 180);
  }
}
