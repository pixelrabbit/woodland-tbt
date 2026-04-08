import { Container, Sprite, Texture, FederatedPointerEvent, Graphics, Text } from "pixi.js";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  Artillery = "artillery",
  Tank = "tank",
}

export class Unit extends Container {
  private sprite: Sprite;
  private isDragging: boolean = false;
  private healthText?: Text;
  private _health: number = 10;
  moveRange: number;

  constructor(type: U, x: number, y: number, texture?: Texture) {
    super();
    console.log(type);

    this.moveRange = 3; // TODO: match health approach

    this.position.set(x, y);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = 64;
    this.sprite.height = 64;
    this.addChild(this.sprite);

    // Health indicator background (16x16 box placed at the bottom right)
    const healthBg = new Graphics().rect(16, 16, 16, 16).fill(0x000000);
    this.addChild(healthBg);

    this.healthText = new Text({
      text: this._health.toString(),
      style: {
        fontSize: 12,
        fill: 0xffffff,
      },
    });
    this.healthText.anchor.set(0.5);
    this.healthText.position.set(24, 24); // Centered within the 16x16 box
    this.addChild(this.healthText);

    // Make unit interactive
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerdown", this.onDragStart, this);
    this.on("globalpointermove", this.onDragMove, this);
    this.on("pointerup", this.onDragEnd, this);
    this.on("pointerupoutside", this.onDragEnd, this);
  }

  private onDragStart = () => {
    this.isDragging = true;
    this.emit("dragStart", this);
    console.log(this.moveRange);
  };

  private onDragMove = (e: FederatedPointerEvent) => {
    if (this.isDragging) {
      this.emit("dragMove", this, e.global);
    }
  };

  private onDragEnd = (e: FederatedPointerEvent) => {
    if (this.isDragging) {
      this.isDragging = false;
      this.emit("dragEnd", this, e.global);
    }
  };

  get health(): number {
    return this._health;
  }

  set health(value: number) {
    this._health = value;
    if (this.healthText) {
      this.healthText.text = value.toString();
    }
  }
}

export function getPointsAtDistance(startX: number, startY: number, steps: number): { x: number; y: number }[] {
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
