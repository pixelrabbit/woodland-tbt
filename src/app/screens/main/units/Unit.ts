import { Container, Sprite, Texture, FederatedPointerEvent } from "pixi.js";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  Artillery = "artillery",
  Tank = "tank",
}

export class Unit extends Container {
  private sprite: Sprite;
  public readonly moveRange: number;
  private isDragging: boolean = false;

  constructor(type: U, x: number, y: number, moveRange: number = 3, texture?: Texture) {
    super();
    console.log(type);
    this.moveRange = moveRange;
    this.position.set(x, y);

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = 64;
    this.sprite.height = 64;
    this.addChild(this.sprite);

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
