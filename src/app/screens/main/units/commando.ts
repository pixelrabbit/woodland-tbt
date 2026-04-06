import { Assets } from "pixi.js";
import { Unit, U } from "./Unit";

const texture = await Assets.load('assets/main/commando.png');

export class Commando extends Unit {
  constructor(x: number, y: number) {
    // Call the parent Unit constructor, hardcoding the Infantry type and passing the texture
    super(U.Commando, x, y, 3, texture);
  }
}