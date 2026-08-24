import { Container, Graphics, Text, Sprite, Assets } from "pixi.js";
import { animate } from "motion";
import { waitFor } from "../../../engine/utils/waitFor";
import { C } from "../../common";
import { Unit, UNIT } from "./Unit";
import { Tile, TILE_DATA, TileType } from "./Tile";

export const BATTLE_WIDTH = 1200;
export const BATTLE_HEIGHT = 800;
export const PANEL_WIDTH = BATTLE_WIDTH / 2;
export const PANEL_HEIGHT = BATTLE_HEIGHT;
export const BORDER_WIDTH = 8;

const bgPlain = await Assets.load("assets/main/pane-grass.png");
const bgForest = await Assets.load("assets/main/pane-forest.png");

class BattleModal extends Container {
  public bg: Graphics;
  public bgSprite: Sprite;
  public border: Graphics;
  // public typeText: Text;
  public healthText: Text;
  // public terrainText: Text;
  public defenseText: Text;
  public unitSprites: Sprite[] = [];
  public bgColor = 0x000000;
  public borderColor = 0x000000;
  private currentNumSprites = 1;
  private originalTint: number = 0xffffff;
  private _currentHealth: number = 0;
  private targetHealth: number = 0;
  private currentTerrain: TileType = TileType.P;

  get currentHealth(): number {
    return this._currentHealth;
  }

  set currentHealth(value: number) {
    this._currentHealth = value;
    if (this.healthText) {
      this.healthText.text = `${Math.round(value / 10)}`;
    }
  }

  constructor() {
    super();

    this.bg = new Graphics().rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    this.addChild(this.bg);

    this.bgSprite = new Sprite(bgPlain);
    this.bgSprite.width = PANEL_WIDTH;
    this.bgSprite.height = PANEL_HEIGHT;
    this.addChild(this.bgSprite);

    this.border = new Graphics()
      .rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT)
      .stroke({ width: BORDER_WIDTH, color: this.borderColor, alignment: 1 });
    this.addChild(this.border);

    for (let i = 0; i < 3; i++) {
      const sprite = new Sprite();
      sprite.anchor.set(0.5);
      this.unitSprites.push(sprite);
      this.addChild(sprite);
    }

    const centerX = PANEL_WIDTH / 2;

    const textStyle = { fill: 0xffffff, fontSize: 24, fontFamily: "Allerta Stencil" };

    // this.typeText = new Text({
    //   text: "Type:",
    //   style: { ...textStyle, fontSize: 32, fontWeight: "bold" },
    // });
    // this.typeText.anchor.set(0.5, 0);
    // this.typeText.position.set(centerX, 80);
    // this.addChild(this.typeText);

    this.healthText = new Text({
      style: {
        ...textStyle,
        fontSize: 84,
        stroke: { color: 0x000000, width: 8 },
      },
    });
    this.healthText.anchor.set(0.5, 0);
    this.healthText.position.set(centerX, 24);
    this.addChild(this.healthText);

    // this.terrainText = new Text({ text: "Terrain:", style: textStyle });
    // this.terrainText.anchor.set(0.5, 0);
    // this.terrainText.position.set(centerX, 180);
    // this.addChild(this.terrainText);

    this.defenseText = new Text({ text: "Defense:", style: textStyle });
    this.defenseText.anchor.set(0.5, 0);
    this.defenseText.position.set(centerX, 220);
    this.addChild(this.defenseText);
  }

  private removedSpritesToAnimate: Sprite[] = [];

  public update(unit: Unit, initialize: boolean = false) {
    if (initialize) {
      this.removedSpritesToAnimate = [];
      this.currentHealth = unit.health;
    }
    this.targetHealth = unit.health;

    const tile = unit.parent as Tile | undefined;
    if (tile && tile.tileType && TILE_DATA[tile.tileType]) {
      this.currentTerrain = tile.tileType;
      this.defenseText.text = `Defense: ${TILE_DATA[tile.tileType].defense}`;
    }

    if (unit.sprite) {
      this.originalTint = unit.sprite.tint;
    }

    let numSprites = 1;
    if (unit.health > 66) numSprites = 3;
    else if (unit.health > 33) numSprites = 2;

    const previousNumSprites = this.currentNumSprites;
    this.currentNumSprites = numSprites;

    if (!initialize && numSprites < previousNumSprites) {
      for (let i = numSprites; i < previousNumSprites; i++) {
        this.removedSpritesToAnimate.push(this.unitSprites[i]);
      }
    }

    this.unitSprites.forEach((sprite, index) => {
      if (unit.sprite && unit.sprite.texture) {
        sprite.texture = unit.sprite.texture;
        sprite.tint = this.originalTint;
      }
      if (index < numSprites) {
        sprite.visible = true;
        sprite.alpha = 1;
      } else if (!this.removedSpritesToAnimate.includes(sprite)) {
        sprite.visible = false;
        sprite.alpha = 0;
      }
    });

    const isAnimatingDamage = !initialize && this.removedSpritesToAnimate.length > 0;
    this.positionSprites(PANEL_WIDTH, PANEL_HEIGHT, isAnimatingDamage);

    this.bgColor = unit.team === "blue" ? C.blue : C.red;
    this.borderColor = this.bgColor;
    this.bg.clear().rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT).fill({ color: this.bgColor });
    this.border
      .clear()
      .rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT)
      .stroke({ width: BORDER_WIDTH, color: this.borderColor, alignment: 1 });

    if (this.currentTerrain === TileType.P) {
      this.bgSprite.texture = bgPlain;
      this.bgSprite.visible = true;
      this.bg.visible = false;
    } else if (this.currentTerrain === TileType.F) {
      this.bgSprite.texture = bgForest;
      this.bgSprite.visible = true;
      this.bg.visible = false;
    } else {
      this.bgSprite.visible = false;
      this.bg.visible = true;
    }
  }

  private getSpritePosition(index: number, total: number, width: number, height: number, terrain: TileType) {
    const spacingX = width / (total + 1);
    const x = spacingX * (index + 1);
    let y = height / 2;

    switch (terrain) {
      case TileType.M: // Mountain
        y = height / 2 + (index % 2 === 0 ? -30 : 30);
        break;
      case TileType.F: // Forest
        y = height / 2 + (index === 1 ? -40 : 20);
        break;
      case TileType.C: // City
        y = height / 2 + (index % 2 === 0 ? 20 : -20);
        break;
      case TileType.W: // Water
        y = height / 2 + (index * 15 - 15);
        break;
      case TileType.P: // Plain
      default:
        // Default horizontal
        break;
    }
    return { x, y };
  }

  private positionSprites(modalWidth: number, height: number, animated = false) {
    const spriteSize = Math.min(200, modalWidth / this.currentNumSprites);
    let visibleIndex = 0;
    this.unitSprites.forEach((sprite, index) => {
      if (index < this.currentNumSprites) {
        const { x: targetX, y: targetY } = this.getSpritePosition(
          visibleIndex,
          this.currentNumSprites,
          modalWidth,
          height,
          this.currentTerrain
        );
        if (animated) {
          animate(
            sprite as Container,
            { x: targetX, y: targetY, width: spriteSize, height: spriteSize },
            { duration: 0.5 }
          );
        } else {
          sprite.width = spriteSize;
          sprite.height = spriteSize;
          sprite.position.set(targetX, targetY);
        }
        visibleIndex++;
      }
    });
  }

  public async animateDamage(damageAmount: number) {
    const promises: Promise<void>[] = [];
    const centerX = PANEL_WIDTH / 2;

    const damageText = new Text({
      text: `-${Math.floor(damageAmount)}`,
      style: { fill: 0xff0000, fontSize: 48, fontFamily: "Allerta Stencil", fontWeight: "bold" },
    });
    damageText.anchor.set(0.5);
    const startY = PANEL_HEIGHT / 2 - 50;
    damageText.position.set(centerX + 80, startY);
    this.addChild(damageText);

    promises.push(
      (async () => {
        await animate(damageText as Container, { y: [startY, startY - 100], alpha: [1, 0] }, { duration: 1.0 });
        damageText.destroy();
      })()
    );

    const startHealth = this.currentHealth;
    const endHealth = this.targetHealth;
    promises.push(
      (async () => {
        const steps = 20;
        const stepTime = 1.0 / steps;
        for (let i = 1; i <= steps; i++) {
          this.currentHealth = startHealth + (endHealth - startHealth) * (i / steps);
          await waitFor(stepTime);
        }
        this.currentHealth = endHealth;
      })()
    );

    for (const sprite of this.removedSpritesToAnimate) {
      const distLeft = sprite.x;
      const distRight = PANEL_WIDTH - sprite.x;
      const targetX = distLeft < distRight ? -sprite.width : PANEL_WIDTH + sprite.width;

      promises.push(
        (async () => {
          await animate(sprite as Container, { x: [sprite.x, targetX], alpha: [1, 0] }, { duration: 0.5 });
          sprite.visible = false;
        })()
      );
    }
    this.removedSpritesToAnimate = [];

    if (promises.length > 0) {
      await Promise.all(promises);
    } else {
      await waitFor(0.5);
    }
  }

  public resize() {
    this.bg.clear().rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT).fill({ color: this.bgColor });
    this.bgSprite.width = PANEL_WIDTH;
    this.bgSprite.height = PANEL_HEIGHT;
    this.border
      .clear()
      .rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT)
      .stroke({ width: BORDER_WIDTH, color: this.borderColor, alignment: 1 });

    const centerX = PANEL_WIDTH / 2;
    this.positionSprites(PANEL_WIDTH, PANEL_HEIGHT);
    this.healthText.position.set(centerX, 24);
    this.defenseText.position.set(centerX, 220);
  }
}

export class BattlePane extends Container {
  private panelContainer: Container;
  private blockerBg: Graphics;
  private attackerModal: BattleModal;
  private targetModal: BattleModal;
  private currentShowId = 0;
  private attackerOnLeft = true;
  private panelBaseX = 0;
  private panelBaseY = 0;

  constructor() {
    super();

    this.blockerBg = new Graphics();
    this.blockerBg.eventMode = "static";
    this.addChild(this.blockerBg);

    this.panelContainer = new Container();
    this.addChild(this.panelContainer);

    this.attackerModal = new BattleModal();
    this.targetModal = new BattleModal();

    this.panelContainer.addChild(this.attackerModal);
    this.panelContainer.addChild(this.targetModal);

    // Block clicks from passing through the modal to the game board
    this.eventMode = "static";
    this.visible = false;
    this.alpha = 1;
  }

  public async battle(attacker: Unit, target: Unit) {
    const showId = ++this.currentShowId;

    // figure out if attacker is left or right
    const attackerTile = attacker.parent as Tile | undefined;
    const targetTile = target.parent as Tile | undefined;
    if (attackerTile && targetTile) {
      this.attackerOnLeft = attackerTile.gridX <= targetTile.gridX;
    }

    const leftPane = this.attackerOnLeft ? this.attackerModal : this.targetModal;
    const rightPane = this.attackerOnLeft ? this.targetModal : this.attackerModal;

    this.attackerModal.update(attacker, true);
    this.targetModal.update(target, true);

    // Determine offscreen starting positions
    const offscreenWidth = Math.max(PANEL_WIDTH + 200, Math.abs(this.panelBaseX) + PANEL_WIDTH + 200);
    const offscreenLeft = -offscreenWidth;
    const offscreenRight = PANEL_WIDTH + offscreenWidth;

    leftPane.x = offscreenLeft;
    rightPane.x = offscreenRight;
    leftPane.alpha = 0;
    rightPane.alpha = 0;

    // Reset panel container transform and visibility
    this.panelContainer.x = this.panelBaseX;
    this.panelContainer.y = this.panelBaseY;
    this.panelContainer.alpha = 1;

    this.alpha = 1;
    this.visible = true;

    // Animate blocker fade-in and panes sliding/fading in from left and right
    await Promise.all([
      animate(this.blockerBg as Container, { alpha: [0, 0.5] }, { duration: 0.25 }),
      animate(leftPane as Container, { x: [offscreenLeft, 0], alpha: [0, 1] }, { duration: 0.35, ease: "easeOut" }),
      animate(
        rightPane as Container,
        { x: [offscreenRight, PANEL_WIDTH], alpha: [0, 1] },
        { duration: 0.35, ease: "easeOut" }
      ),
    ]);

    // Shake the modal upon collision
    await this.shake(this.panelContainer, 18, 0.3);

    await waitFor(0.2);

    // initial strike
    await this.executeStrike(attacker, target, this.targetModal);

    // pause
    await waitFor(1);

    // counter strike
    if (target.health > 0) {
      await this.executeStrike(target, attacker, this.attackerModal);
    }

    await waitFor(2);

    if (this.currentShowId === showId) {
      await this.hide();
    }
  }

  private async shake(element: Container, intensity = 18, duration = 0.3) {
    const baseX = element.x;
    const baseY = element.y;
    const steps = 10;
    const stepDuration = duration / steps;
    for (let i = 0; i < steps; i++) {
      const decay = (steps - i) / steps;
      const dir = i % 2 === 0 ? 1 : -1;
      const offsetX = dir * intensity * decay * (0.6 + Math.random() * 0.4);
      const offsetY = (Math.random() * 2 - 1) * (intensity * 0.4) * decay;
      element.x = baseX + offsetX;
      element.y = baseY + offsetY;
      await waitFor(stepDuration);
    }
    element.x = baseX;
    element.y = baseY;
  }

  private async executeStrike(source: Unit, target: Unit, targetModal: BattleModal) {
    const sourceType = source.unitType;
    const targetType = target.unitType;

    // get damage based on damage rating by unit
    const damageTable = UNIT[sourceType]?.damage?.[targetType];
    if (!damageTable) return;
    const maxDamage = Math.max(damageTable.primary, damageTable.secondary);

    //reduce damage by tile defense rating
    const targetTile = target.parent as Tile | undefined;
    const defenseRating = (targetTile && TILE_DATA[targetTile.tileType]?.defense) ?? 0;
    const defenseMultiplier = Math.max(0, 1 - defenseRating * 0.1); // 10% reduction per defense point
    const damageDealt = Math.floor((source.health / 100) * maxDamage * defenseMultiplier);

    // reduce unit health
    target.health = Math.max(0, target.health - damageDealt);
    targetModal.update(target);

    if (damageDealt > 0) {
      await targetModal.animateDamage(damageDealt);
    }
  }

  public async hide() {
    const offscreenWidth = Math.max(PANEL_WIDTH + 200, Math.abs(this.panelBaseX) + PANEL_WIDTH + 200);
    const offscreenLeft = -offscreenWidth;
    const offscreenRight = PANEL_WIDTH + offscreenWidth;

    const leftPane = this.attackerOnLeft ? this.attackerModal : this.targetModal;
    const rightPane = this.attackerOnLeft ? this.targetModal : this.attackerModal;

    await Promise.all([
      animate(leftPane as Container, { x: [0, offscreenLeft], alpha: [1, 0] }, { duration: 0.3, ease: "easeIn" }),
      animate(
        rightPane as Container,
        { x: [PANEL_WIDTH, offscreenRight], alpha: [1, 0] },
        { duration: 0.3, ease: "easeIn" }
      ),
      animate(this.blockerBg as Container, { alpha: [0.5, 0] }, { duration: 0.3 }),
    ]);

    this.visible = false;
    this.blockerBg.alpha = 0;
  }

  public resize(width: number, height: number) {
    this.blockerBg.clear().rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.5 });

    this.panelBaseX = (width - BATTLE_WIDTH) / 2;
    this.panelBaseY = (height - BATTLE_HEIGHT) / 2;
    this.panelContainer.x = this.panelBaseX;
    this.panelContainer.y = this.panelBaseY;

    this.attackerModal.resize();
    this.targetModal.resize();

    if (!this.visible) {
      this.attackerModal.x = this.attackerOnLeft ? 0 : PANEL_WIDTH;
      this.targetModal.x = this.attackerOnLeft ? PANEL_WIDTH : 0;
    }
  }
}
