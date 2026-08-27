import { Container, Graphics, Text, Sprite, Assets, Texture, ColorMatrixFilter, type ColorSource } from "pixi.js";
import { animate } from "motion";
import { waitFor } from "../../../engine/utils/waitFor";
import { C } from "../../common";
import { Unit, UNIT } from "./Unit";
import { Tile, TILE_DATA, TileType } from "./Tile";

export const BATTLE_WIDTH = 1200;
export const BATTLE_HEIGHT = 800;
export const PANE_WIDTH = BATTLE_WIDTH / 2;
export const PANEL_HEIGHT = BATTLE_HEIGHT;
export const BORDER_WIDTH = 8;

const bgGrass = await Assets.load("/assets/main/pane-grass.png");
const bgForest = await Assets.load("/assets/main/pane-forest.png");
const bgMountain = await Assets.load("/assets/main/pane-mountain.png");
const bgCity = await Assets.load("/assets/main/pane-city.png");

const TERRAIN_BG: Partial<Record<TileType, Texture>> = {
  [TileType.G]: bgGrass,
  [TileType.F]: bgForest,
  [TileType.M]: bgMountain,
  [TileType.C]: bgCity,
  [TileType.R]: bgGrass,
};

export interface SlotCoordinate {
  x: number;
  y: number;
}

/**
 * Manually configured slot coordinates for each terrain pane type.
 * Defined for a standard left pane (600x800). Right pane automatically mirrors X coordinates.
 */
export const TERRAIN_SLOT_POSITIONS: Record<TileType, SlotCoordinate[]> = {
  [TileType.G]: [
    { x: 400, y: 350 },
    { x: 400, y: 500 },
    { x: 400, y: 650 },
    { x: 200, y: 425 },
    { x: 200, y: 575 },
  ],
  [TileType.R]: [
    { x: 400, y: 350 },
    { x: 400, y: 500 },
    { x: 400, y: 650 },
    { x: 200, y: 425 },
    { x: 200, y: 575 },
  ],
  [TileType.F]: [
    { x: 400, y: 350 },
    { x: 400, y: 500 },
    { x: 400, y: 650 },
    { x: 200, y: 425 },
    { x: 200, y: 575 },
  ],
  [TileType.M]: [
    { x: 400, y: 350 },
    { x: 400, y: 500 },
    { x: 400, y: 650 },
    { x: 200, y: 425 },
    { x: 200, y: 575 },
  ],
  [TileType.C]: [
    { x: 400, y: 350 },
    { x: 400, y: 500 },
    { x: 400, y: 650 },
    { x: 200, y: 425 },
    { x: 200, y: 575 },
  ],
  [TileType.W]: [
    { x: 400, y: 350 },
    { x: 400, y: 500 },
    { x: 400, y: 650 },
    { x: 200, y: 425 },
    { x: 200, y: 575 },
  ],
};

export interface ShakeOptions {
  blink?: boolean;
  blinkStrength?: number;
}

export async function shake(element: Container, intensity = 18, duration = 0.3, options: ShakeOptions = {}) {
  const baseX = element.x;
  const baseY = element.y;
  const steps = 10;
  const stepDuration = duration / steps;

  let yellowFilter: ColorMatrixFilter | null = null;
  if (options.blink) {
    yellowFilter = new ColorMatrixFilter();
    // Balanced yellow damage flash (distinct hit-impact without harsh blowout)
    yellowFilter.matrix = [1.35, 0, 0, 0, 0.18, 0, 1.35, 0, 0, 0.18, 0, 0, 0.3, 0, 0, 0, 0, 0, 1, 0];
    yellowFilter.alpha = options.blinkStrength ?? 0.75;
  }

  for (let i = 0; i < steps; i++) {
    const decay = (steps - i) / steps;
    const dir = i % 2 === 0 ? 1 : -1;
    const offsetX = dir * intensity * decay * (0.6 + Math.random() * 0.4);
    const offsetY = (Math.random() * 2 - 1) * (intensity * 0.4) * decay;
    element.x = baseX + offsetX;
    element.y = baseY + offsetY;

    if (yellowFilter) {
      element.filters = i % 2 === 0 ? [yellowFilter] : [];
    }

    await waitFor(stepDuration);
  }

  element.x = baseX;
  element.y = baseY;
  if (yellowFilter) {
    element.filters = [];
  }
}

class BattleModal extends Container {
  public bg: Graphics;
  public bgSprite: Sprite;
  public border: Graphics;
  public unitsContainer: Container;
  public paneMask: Graphics;
  public healthText: Text;
  public defenseContainer: Container;
  private defenseBg: Graphics;
  public defenseText: Text;
  private defenseValue: number = 0;
  public unitSprites: Sprite[] = [];
  public bgColor: ColorSource = 0x000000;
  public borderColor: ColorSource = 0x000000;
  private originalTint: number = 0xffffff;
  private _currentHealth: number = 0;
  private targetHealth: number = 0;
  private currentTerrain: TileType = TileType.G;
  private isFlipped = false;

  get currentHealth(): number {
    return this._currentHealth;
  }

  set currentHealth(value: number) {
    this._currentHealth = value;
    if (this.healthText) {
      this.healthText.text = `${Math.ceil(value / 10)}`;
    }
  }

  public setFlipped(flipped: boolean) {
    this.isFlipped = flipped;
    this.updateBgLayout();
    this.positionSprites(PANE_WIDTH, PANEL_HEIGHT);
    this.updateDefenseBadgeLayout();
  }

  private updateBgLayout() {
    this.bgSprite.width = PANE_WIDTH;
    this.bgSprite.height = PANEL_HEIGHT;
    if (this.isFlipped) {
      this.bgSprite.scale.x = -Math.abs(this.bgSprite.scale.x);
      this.bgSprite.x = PANE_WIDTH;
    } else {
      this.bgSprite.scale.x = Math.abs(this.bgSprite.scale.x);
      this.bgSprite.x = 0;
    }
  }

  constructor() {
    super();

    this.bg = new Graphics().rect(0, 0, PANE_WIDTH, PANEL_HEIGHT);
    this.addChild(this.bg);

    this.bgSprite = new Sprite(bgGrass);
    this.updateBgLayout();
    this.addChild(this.bgSprite);

    this.paneMask = new Graphics().rect(0, 0, PANE_WIDTH, PANEL_HEIGHT).fill(0xffffff);
    this.addChild(this.paneMask);

    this.unitsContainer = new Container();
    this.unitsContainer.mask = this.paneMask;
    this.addChild(this.unitsContainer);

    this.border = new Graphics()
      .rect(0, 0, PANE_WIDTH, PANEL_HEIGHT)
      .stroke({ width: BORDER_WIDTH, color: this.borderColor, alignment: 1 });
    this.addChild(this.border);

    for (let i = 0; i < 5; i++) {
      const sprite = new Sprite();
      sprite.anchor.set(0.5);
      this.unitSprites.push(sprite);
      this.unitsContainer.addChild(sprite);
    }

    const centerX = PANE_WIDTH / 2;

    const textStyle = { fill: 0xffffff, fontSize: 24, fontFamily: "Jersey 25" };

    // HEALTH
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

    // DEFENSE BADGE
    this.defenseContainer = new Container();
    this.defenseBg = new Graphics();
    this.defenseText = new Text({
      text: "DEF 0",
      style: {
        fill: 0xffffff,
        fontSize: 24,
        fontFamily: "Jersey 25",
        fontWeight: "bold",
      },
    });
    this.defenseText.anchor.set(0.5);
    this.defenseContainer.addChild(this.defenseBg, this.defenseText);
    this.addChild(this.defenseContainer);
  }

  private updateDefenseBadgeLayout() {
    const badgeWidth = 80;
    const badgeHeight = 40;
    const padding = 0;

    const x = this.isFlipped ? PANE_WIDTH - badgeWidth - padding : padding;
    const y = PANEL_HEIGHT - badgeHeight - padding;
    this.defenseContainer.position.set(x, y);

    this.defenseText.text = `DEF ${this.defenseValue}`;
    this.defenseText.position.set(badgeWidth / 2, badgeHeight / 2 - 2);

    this.defenseBg.clear().rect(0, 0, badgeWidth, badgeHeight).fill(this.bgColor);
  }

  private removedSpritesToAnimate: Sprite[] = [];
  private activeSprites: Sprite[] = [];

  public update(unit: Unit, initialize: boolean = false) {
    if (initialize) {
      this.removedSpritesToAnimate = [];
      this.currentHealth = unit.health;
    }
    this.targetHealth = unit.health;

    const tile = unit.parent as Tile | undefined;
    if (tile && tile.tileType && TILE_DATA[tile.tileType]) {
      this.currentTerrain = tile.tileType;
      this.defenseValue = TILE_DATA[tile.tileType].defense;
    } else {
      this.defenseValue = 0;
    }

    if (unit.sprite) {
      this.originalTint = unit.sprite.tint;
    }

    const numSprites = Math.max(0, Math.ceil(unit.health / 20));

    if (initialize) {
      this.activeSprites = [...this.unitSprites.slice(0, numSprites)];
    } else if (numSprites < this.activeSprites.length) {
      const countToRemove = this.activeSprites.length - numSprites;
      for (let i = 0; i < countToRemove; i++) {
        const randomIndex = Math.floor(Math.random() * this.activeSprites.length);
        const [removedSprite] = this.activeSprites.splice(randomIndex, 1);
        this.removedSpritesToAnimate.push(removedSprite);
      }
    }

    this.unitSprites.forEach((sprite) => {
      if (unit.sprite && unit.sprite.texture) {
        sprite.texture = unit.sprite.texture;
        sprite.tint = this.originalTint;
      }
      if (this.activeSprites.includes(sprite)) {
        sprite.visible = true;
        sprite.alpha = 1;
      } else if (!this.removedSpritesToAnimate.includes(sprite)) {
        sprite.visible = false;
        sprite.alpha = 0;
      }
    });

    if (initialize) {
      this.positionSprites(PANE_WIDTH, PANEL_HEIGHT);
    }

    this.bgColor = unit.team === "blue" ? C.blue : C.red;
    this.borderColor = this.bgColor;
    this.bg.clear().rect(0, 0, PANE_WIDTH, PANEL_HEIGHT).fill({ color: this.bgColor });
    this.border
      .clear()
      .rect(0, 0, PANE_WIDTH, PANEL_HEIGHT)
      .stroke({ width: BORDER_WIDTH, color: this.borderColor, alignment: 1 });

    const bgTexture = TERRAIN_BG[this.currentTerrain];
    this.bgSprite.visible = !!bgTexture;
    this.bg.visible = !bgTexture;
    if (bgTexture) {
      this.bgSprite.texture = bgTexture;
      this.updateBgLayout();
    }

    this.updateDefenseBadgeLayout();
  }

  private getSpritePosition(index: number, width: number, height: number, terrain: TileType) {
    const terrainSlots = TERRAIN_SLOT_POSITIONS[terrain];
    if (terrainSlots && terrainSlots[index]) {
      const slot = terrainSlots[index];
      const scaleX = width / PANE_WIDTH;
      const scaleY = height / PANEL_HEIGHT;
      return {
        x: slot.x * scaleX,
        y: slot.y * scaleY,
      };
    }

    const total = 5;
    const spacingX = width / (total + 1);
    return {
      x: spacingX * (index + 1),
      y: height / 2,
    };
  }

  private positionSprites(modalWidth: number, height: number) {
    const spriteSize = 160;
    this.unitSprites.forEach((sprite, index) => {
      const { x: baseSlotX, y: targetY } = this.getSpritePosition(index, modalWidth, height, this.currentTerrain);
      const targetX = this.isFlipped ? modalWidth - baseSlotX : baseSlotX;

      sprite.setSize(spriteSize);
      sprite.position.set(targetX, targetY);
      if (this.isFlipped) {
        sprite.scale.x = -Math.abs(sprite.scale.x);
      } else {
        sprite.scale.x = Math.abs(sprite.scale.x);
      }
    });
  }

  public async animateDamage(damageAmount: number) {
    const promises: Promise<void>[] = [];
    const centerX = PANE_WIDTH / 2;

    const damageText = new Text({
      text: `-${Math.floor(damageAmount / 10)}`,
      style: { fill: 0xffffff, fontSize: 48, fontFamily: "Jersey 25", fontWeight: "bold" },
    });
    damageText.anchor.set(0.5);
    const startY = PANEL_HEIGHT / 2 - 50;
    damageText.position.set(centerX, startY);
    this.addChild(damageText);

    promises.push(
      (async () => {
        await animate(damageText as Container, { y: [startY, startY - 100], alpha: [1, 0] }, { duration: 1.0 });
        damageText.destroy();
      })()
    );

    // Unit shakes a little and blinks white when receiving damage
    promises.push(shake(this.unitsContainer, 8, 0.4, { blink: true }));

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
      const targetX = this.isFlipped ? PANE_WIDTH + sprite.width : -sprite.width;

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
      await waitFor(0.2);
    }
  }

  public resize() {
    this.bg.clear().rect(0, 0, PANE_WIDTH, PANEL_HEIGHT).fill({ color: this.bgColor });
    this.updateBgLayout();
    this.paneMask.clear().rect(0, 0, PANE_WIDTH, PANEL_HEIGHT).fill(0xffffff);
    this.border
      .clear()
      .rect(0, 0, PANE_WIDTH, PANEL_HEIGHT)
      .stroke({ width: BORDER_WIDTH, color: this.borderColor, alignment: 1 });

    const centerX = PANE_WIDTH / 2;
    this.positionSprites(PANE_WIDTH, PANEL_HEIGHT);
    this.healthText.position.set(centerX, 24);
    this.updateDefenseBadgeLayout();
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

  private get panes() {
    return {
      left: this.attackerOnLeft ? this.attackerModal : this.targetModal,
      right: this.attackerOnLeft ? this.targetModal : this.attackerModal,
    };
  }

  private getOffscreenPositions() {
    const width = Math.max(PANE_WIDTH + 200, Math.abs(this.panelBaseX) + PANE_WIDTH + 200);
    return {
      left: -width,
      right: PANE_WIDTH + width,
    };
  }

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
      if (attackerTile.gridX === targetTile.gridX) {
        this.attackerOnLeft = attacker.team === "blue";
      } else {
        this.attackerOnLeft = attackerTile.gridX < targetTile.gridX;
      }
    }

    const { left: leftPane, right: rightPane } = this.panes;
    const offscreen = this.getOffscreenPositions();

    leftPane.setFlipped(false);
    rightPane.setFlipped(true);

    this.attackerModal.update(attacker, true);
    this.targetModal.update(target, true);

    leftPane.x = offscreen.left;
    rightPane.x = offscreen.right;
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
      animate(leftPane as Container, { x: [offscreen.left, 0], alpha: [0, 1] }, { duration: 0.35, ease: "easeOut" }),
      animate(
        rightPane as Container,
        { x: [offscreen.right, PANE_WIDTH], alpha: [0, 1] },
        { duration: 0.35, ease: "easeOut" }
      ),
    ]);

    // Shake the modal upon collision
    await shake(this.panelContainer, 18, 0.3);

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
    const { left: leftPane, right: rightPane } = this.panes;
    const offscreen = this.getOffscreenPositions();

    await Promise.all([
      animate(leftPane as Container, { x: [0, offscreen.left], alpha: [1, 0] }, { duration: 0.3, ease: "easeIn" }),
      animate(
        rightPane as Container,
        { x: [PANE_WIDTH, offscreen.right], alpha: [1, 0] },
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
      const { left, right } = this.panes;
      left.x = 0;
      right.x = PANE_WIDTH;
      left.setFlipped(false);
      right.setFlipped(true);
    }
  }
}
