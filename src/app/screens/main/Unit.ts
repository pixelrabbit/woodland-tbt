import { Container, Graphics, Sprite, Text, Assets } from "pixi.js";

// import { engine } from "../../getEngine";

export enum U {
  Infantry = "infantry",
  Commando = "commando",
  Artillery = "artillery",
  Tank = "tank",
}

const soldier = await Assets.load('assets/main/soldier.png');
const commando = await Assets.load('assets/main/commando.png');
// const artillery = await Assets.load('assets/main/artillery.png');
// const tank = await Assets.load('assets/main/tank.png');





export class Unit extends Container {
  private sprite: Sprite;
  private menu: Container;

  constructor(type: U, x: number, y: number, size: number) {
    super();
    this.position.set(x, y);

    let texture;
    switch (type) {
      case U.Infantry:
        texture = soldier;
        break;
      case U.Commando:
        texture = commando;
        break;
    }



    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = size;
    this.sprite.height = size;
    this.addChild(this.sprite);

    // Make unit interactive
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", this.toggleMenu, this);

    // Setup the action menu
    this.menu = new Container();
    this.menu.visible = false;
    this.menu.position.set(20, -20); // Offset slightly from the unit

    const menuBg = new Graphics()
      .rect(0, 0, 80, 60)
      .fill({ color: 0x000000, alpha: 0.8 })
      .stroke({ color: 0xffffff, width: 1 });
    this.menu.addChild(menuBg);

    const moveText = new Text({
      text: "Move",
      style: { fontSize: 16, fill: 0xffffff, fontFamily: "Arial" }
    });
    moveText.position.set(8, 8);
    moveText.eventMode = "static";
    moveText.cursor = "pointer";
    moveText.on("pointertap", (e) => {
      e.stopPropagation();
      console.log(`Move action selected for ${type}`);
      this.menu.visible = false;
      // TODO: Emit move event or enter move state
    });

    const attackText = new Text({
      text: "Attack",
      style: { fontSize: 16, fill: 0xffffff, fontFamily: "Arial" }
    });
    attackText.position.set(8, 32);
    attackText.eventMode = "static";
    attackText.cursor = "pointer";
    attackText.on("pointertap", (e) => {
      e.stopPropagation();
      console.log(`Attack action selected for ${type}`);
      this.menu.visible = false;
      // TODO: Emit attack event or enter attack state
    });

    this.menu.addChild(moveText, attackText);
    this.addChild(this.menu);
  }

  private toggleMenu(e: any) {
    // Prevent click from propagating down to the map/grid
    e.stopPropagation();
    this.menu.visible = !this.menu.visible;
  }
}