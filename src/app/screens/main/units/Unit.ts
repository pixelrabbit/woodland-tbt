import {
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  FederatedPointerEvent
} from "pixi.js";

import { engine } from "../../../getEngine";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  Artillery = "artillery",
  Tank = "tank",
}

export class Unit extends Container {
  private sprite: Sprite;
  private menu: Container;

  constructor(
    type: U,
    x: number,
    y: number,
    moveRange: number = 3,
    texture?: Texture,
  ) {
    super();
    this.position.set(x, y);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = 64;
    this.sprite.height = 64;
    this.addChild(this.sprite);

    // Make unit interactive
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", this.toggleMenu, this);

    // Setup the action menu
    this.menu = new Container();
    this.menu.visible = false;

    const menuBg = new Graphics()
      .rect(0, 0, 80, 60)
      .fill({ color: 0x000000, alpha: 0.8 })
      .stroke({ color: 0xffffff, width: 1 });
    this.menu.addChild(menuBg);

    const moveText = new Text({
      text: "Move",
      style: { fontSize: 16, fill: 0xffffff, fontFamily: "Arial" },
    });
    moveText.position.set(8, 8);
    moveText.eventMode = "static";
    moveText.cursor = "pointer";
    moveText.on("pointertap", (e) => {
      e.stopPropagation();
      console.log(`Move action selected for ${type}`, moveRange);
      this.menu.visible = false;

      this.emit("requestMove", this);
    });

    const attackText = new Text({
      text: "Attack",
      style: { fontSize: 16, fill: 0xffffff, fontFamily: "Arial" },
    });
    attackText.position.set(8, 32);
    attackText.eventMode = "static";
    attackText.cursor = "pointer";
    attackText.on("pointertap", (e) => {
      e.stopPropagation();
      console.log(`Attack action selected for ${type}`);
      this.menu.visible = false;
      this.emit("requestAttack", this);
    });

    this.menu.addChild(moveText, attackText);
  }

  private toggleMenu(e: FederatedPointerEvent) {
    // Prevent click from propagating down to the map/grid
    e.stopPropagation();
    const stage = engine().navigation.container;
    if (stage) {
      stage.addChild(this.menu);
      const globalPos = this.getGlobalPosition();
      this.menu.position.set(globalPos.x, globalPos.y);
    }
    this.menu.visible = !this.menu.visible;
  }
}

export function getPointsAtDistance(
  startX: number,
  startY: number,
  steps: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let dx = -steps; dx <= steps; dx++) {
    for (let dy = -steps; dy <= steps; dy++) {
      // Calculate Manhattan distance (4-way movement)
      if (Math.abs(dx) + Math.abs(dy) <= steps) {
        points.push({ x: startX + dx, y: startY + dy });
      }
    }
  }

  return points;
}
