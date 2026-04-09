import { Assets } from "pixi.js";
import { Unit, U } from "./Unit";

const texture = await Assets.load("assets/main/soldier.png");

export class Infantry extends Unit {
  constructor(x: number, y: number) {
    // Call the parent Unit constructor, hardcoding the Infantry type and passing the texture
    super(U.Infantry, x, y, texture);
    this.moveRange = 3;
    this.health = 10;
    this.attackRange = 1;
  }
}
