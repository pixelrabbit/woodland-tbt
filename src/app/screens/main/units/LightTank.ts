import { Assets } from "pixi.js";
import { Unit, U } from "./Unit";

const texture = await Assets.load("assets/main/tankLight.png");

export class LightTank extends Unit {
  constructor(x: number, y: number) {
    // Call the parent Unit constructor, passing the tankLight type and texture
    super(U.tankLight, x, y, texture);
  }
}
