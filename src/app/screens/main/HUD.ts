import { Container, Graphics, Text } from "pixi.js";
import { C } from "../../common";

export class Hud extends Container {
  private hudBg: Graphics;
  private turnText: Text;
  private creditsText: Text;
  private endTurnButton: Container;
  private currentTeam: "blue" | "red" | null = null;
  private displayedCredits: number = 0;
  private countAnimationId: number = 0;

  constructor(onEndTurn: () => void) {
    super();

    // End Turn Button
    this.endTurnButton = new Container();
    const btnBg = new Graphics().rect(0, 0, 150, 50).fill(0x333333).stroke({ width: 2, color: 0xffffff });
    const btnText = new Text({
      text: "End Turn",
      style: { fill: 0xffffff, fontSize: 24, fontFamily: "Jersey 25" },
    });
    btnText.anchor.set(0.5);
    btnText.position.set(75, 25);
    this.endTurnButton.addChild(btnBg, btnText);
    this.endTurnButton.eventMode = "static";
    this.endTurnButton.cursor = "pointer";
    this.endTurnButton.on("pointerdown", onEndTurn);
    this.addChild(this.endTurnButton);

    // Team Label HUD
    const teamBadgeContainer = new Container();

    // Box for team credits (under team badge)
    const creditsBox = new Container();
    creditsBox.position.set(160, -4);

    const creditsBg = new Graphics()
      // Hard drop shadow
      .poly([6, 6, 106, 6, 106, 26, 90, 42, 6, 42])
      .fill({ color: 0x000000, alpha: 0.33 })
      // Box fill with cut bottom-right corner
      .poly([0, 0, 100, 0, 100, 20, 84, 36, 0, 36])
      .fill({ color: 0xffffff })
      .stroke({ width: 4, color: 0xffffff });
    creditsBox.addChild(creditsBg);

    this.creditsText = new Text({
      text: "0",
      style: { fill: { h: 360, s: 0, l: 30 }, fontSize: 28, fontWeight: "bold", fontFamily: "Jersey 25" },
    });
    this.creditsText.anchor.set(0.5);
    this.creditsText.position.set(48, 20);
    creditsBox.addChild(this.creditsText);

    teamBadgeContainer.addChild(creditsBox);

    this.hudBg = new Graphics();
    teamBadgeContainer.addChild(this.hudBg);

    this.turnText = new Text({
      text: "BLUE",
      style: { fill: 0xffffff, fontSize: 48, fontFamily: "Jersey 25" },
    });
    this.turnText.position.set(20, 15);
    teamBadgeContainer.addChild(this.turnText);

    this.addChild(teamBadgeContainer);
  }

  public update(team: "blue" | "red", credits: number) {
    const colors =
      team === "blue" ? { main: C.blue, dark: { ...C.blue, l: 20 } } : { main: C.red, dark: { ...C.red, l: 20 } };

    this.hudBg
      .clear()
      // 1. Hard Drop Shadow
      .poly([-4 + 6, -4 + 6, 160 + 6, -4 + 6, 160 + 6, 40 + 6, 120 + 6, 80 + 6, -4 + 6, 80 + 6])
      .fill({ color: 0x000000, alpha: 0.33 })
      // 2. Bevel Base (Darker Fill)
      .poly([-4, -4, 160, -4, 160, 40, 120, 80, -4, 80])
      .fill(colors.dark)
      // 3. Raised Main Face
      .poly([-4, -4, 160 - 6, -4, 160 - 6, 38, 116, 74, -4, 74])
      .fill(colors.main)
      // 4. Hard Outer Border
      .poly([-4, -4, 160, -4, 160, 40, 120, 80, -4, 80])
      .stroke({ width: 4, color: 0xffffff });

    this.turnText.text = team.toUpperCase();

    // If switching to a new team, instantly show that team's current credits
    if (this.currentTeam !== team) {
      this.currentTeam = team;
      this.countAnimationId++;
      this.displayedCredits = credits;
      this.creditsText.text = `${credits}`;
      return;
    }

    // If credits changed for the active team, animate count to the new value
    if (this.displayedCredits !== credits) {
      const startValue = this.displayedCredits;
      const endValue = credits;
      const animId = ++this.countAnimationId;
      const duration = 600; // ms
      const startTime = performance.now();

      const animateStep = () => {
        if (this.countAnimationId !== animId) return;
        const now = performance.now();
        const progress = Math.min(1, (now - startTime) / duration);
        // Smooth cubic ease-out
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (endValue - startValue) * ease);
        this.displayedCredits = current;
        this.creditsText.text = `${current}`;

        if (progress < 1) {
          requestAnimationFrame(animateStep);
        } else {
          this.displayedCredits = endValue;
          this.creditsText.text = `${endValue}`;
        }
      };

      requestAnimationFrame(animateStep);
    }
  }

  public resize(width: number, height: number) {
    this.endTurnButton.position.set(width - 170, height - 70);
  }
}
