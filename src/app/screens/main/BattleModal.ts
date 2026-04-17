import { Container, Graphics, Text, Sprite } from "pixi.js";
import { animate } from "motion";
import { engine } from "../../getEngine";
import { waitFor } from "../../../engine/utils/waitFor";
import { C } from "../../common";
import { Unit, UNIT, U } from "./units/Unit";
import { Tile } from "./Tile";

class BattlePanel extends Container {
  public bg: Graphics;
  public typeText: Text;
  public healthText: Text;
  public terrainText: Text;
  public unitSprite: Sprite;
  public bgColor = 0x000000;
  private isAttacker: boolean;

  constructor(isAttacker: boolean) {
    super();
    this.isAttacker = isAttacker;

    const stageWidth = engine().renderer.width;
    const stageHeight = engine().renderer.height;
    const modalWidth = stageWidth / 2;

    this.bg = new Graphics().rect(0, 0, modalWidth, stageHeight).fill({ alpha: 0.95 });
    this.addChild(this.bg);

    const centerX = modalWidth / 2;

    this.unitSprite = new Sprite();
    this.unitSprite.anchor.set(0.5);
    this.unitSprite.position.set(centerX, stageHeight / 2);
    this.unitSprite.width = 300;
    this.unitSprite.height = 300;
    this.addChild(this.unitSprite);

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

    this.x = isAttacker ? 0 : modalWidth;
  }

  public update(unit: Unit) {
    const tile = unit.parent as Tile;

    this.typeText.text = `Unit: ${unit.constructor.name.toUpperCase()}`;
    this.healthText.text = `Health: ${unit.health / 10}`;
    this.terrainText.text = `Terrain: ${tile.tileType.toUpperCase()}`;
    if (unit.sprite.texture) this.unitSprite.texture = unit.sprite.texture;

    this.bgColor = unit.team === "blue" ? C.blue : C.red;
    this.bg
      .clear()
      .rect(0, 0, engine().renderer.width / 2, engine().renderer.height)
      .fill({ color: this.bgColor, alpha: 0.9 });
  }

  public async animateDamage(damageAmount: number) {
    let blinkCount = 1;
    if (damageAmount > 50) blinkCount = 3;
    else if (damageAmount > 25) blinkCount = 2;

    for (let i = 0; i < blinkCount; i++) {
      this.unitSprite.tint = 0xff0000;
      await waitFor(0.1);
      this.unitSprite.tint = 0xffffff;
      if (i < blinkCount - 1) await waitFor(0.1);
    }
  }

  public resize(width: number, height: number) {
    const modalWidth = width / 2;
    this.bg.clear().rect(0, 0, modalWidth, height).fill({ color: this.bgColor, alpha: 0.9 });

    const centerX = modalWidth / 2;
    this.unitSprite.position.set(centerX, height / 2);
    this.typeText.position.set(centerX, 80);
    this.healthText.position.set(centerX, 140);
    this.terrainText.position.set(centerX, 180);

    this.x = this.isAttacker ? 0 : modalWidth;
  }
}

export class BattleModal extends Container {
  private attackerPanel: BattlePanel;
  private targetPanel: BattlePanel;
  private currentShowId = 0;

  constructor() {
    super();

    this.attackerPanel = new BattlePanel(true);
    this.targetPanel = new BattlePanel(false);

    this.addChild(this.attackerPanel);
    this.addChild(this.targetPanel);

    // Block clicks from passing through the modal to the game board
    this.eventMode = "static";
    this.visible = false;
  }

  public async battle(attacker: Unit, target: Unit) {
    const showId = ++this.currentShowId;

    this.attackerPanel.update(attacker);
    this.targetPanel.update(target);

    this.alpha = 0;
    this.visible = true;

    await animate(this as Container, { alpha: 1 }, { duration: 0.3 });

    // initial
    this.executeStrike(attacker, target, this.targetPanel);

    // pause
    await waitFor(0.5);

    // counter
    if (target.health > 0) {
      this.executeStrike(target, attacker, this.attackerPanel);
    }

    await waitFor(2);

    if (this.currentShowId === showId) {
      await this.hide();
    }
  }

  private executeStrike(source: Unit, target: Unit, targetPanel: BattlePanel) {
    const sourceType = source.constructor.name.toLowerCase() as U;
    const targetType = target.constructor.name.toLowerCase() as U;

    const damageTable = UNIT[sourceType].damage[targetType];
    const maxDamage = Math.max(damageTable.primary, damageTable.secondary);
    const damageDealt = Math.floor((source.health / 100) * maxDamage);

    target.health = Math.max(0, target.health - damageDealt);
    targetPanel.update(target);

    if (damageDealt > 0) {
      targetPanel.animateDamage(damageDealt);
    }
  }

  public async hide() {
    await animate(this as Container, { alpha: 0 }, { duration: 0.3 });
    this.visible = false;
  }

  public resize(width: number, height: number) {
    this.attackerPanel.resize(width, height);
    this.targetPanel.resize(width, height);
  }
}
