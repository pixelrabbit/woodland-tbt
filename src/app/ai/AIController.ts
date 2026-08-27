import { waitFor } from "../../engine/utils/waitFor";
import { Tile, TILE_DATA, TileType } from "../screens/main/Tile";
import { Unit, UNIT, U } from "../screens/main/Unit";
import { getReachableTiles, getShortestPath } from "../utils/coordinates";
import type { MainScreen } from "../screens/main/MainScreen";

/** Unit strategic priority and threat values */
const UNIT_VALUES: Record<U, number> = {
  [U.tank]: 120,
  [U.artillery]: 100,
  [U.Commando]: 80,
  [U.recon]: 60,
  [U.Infantry]: 40,
};

export interface AIProfile {
  name: string;
  aggressiveness: number; // Multiplier for attack damage / desire (default 1.0)
  defensiveness: number; // Multiplier for terrain cover valuation (default 1.0)
  caution: number; // Penalty for counter-damage and unit loss (default 1.0)
  cityPriority: number; // Weight for capturing unowned/enemy cities (default 1.0)
  stepDelay: number; // Delay in seconds between unit actions (default 0.3)
}

export const AI_PRESETS: Record<string, AIProfile> = {
  balanced: {
    name: "Balanced",
    aggressiveness: 1.0,
    defensiveness: 1.0,
    caution: 1.0,
    cityPriority: 1.0,
    stepDelay: 0.3,
  },
  aggressive: {
    name: "Aggressive",
    aggressiveness: 1.8,
    defensiveness: 0.5,
    caution: 0.4,
    cityPriority: 0.7,
    stepDelay: 0.25,
  },
  defensive: {
    name: "Defensive",
    aggressiveness: 0.8,
    defensiveness: 2.0,
    caution: 1.8,
    cityPriority: 1.3,
    stepDelay: 0.35,
  },
  rusher: {
    name: "City Rusher",
    aggressiveness: 1.1,
    defensiveness: 0.8,
    caution: 0.7,
    cityPriority: 2.5,
    stepDelay: 0.25,
  },
};

export interface AIAction {
  unit: Unit;
  destinationTile: Tile;
  path: Tile[];
  targetEnemy: Unit | null;
  score: number;
}

/** Check if AI mode is enabled via URL query parameter `?ai`, `?ai=true`, `?ai=aggressive` etc. */
export function isAIEnabled(): boolean {
  if (typeof window === "undefined" || !window.location) return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("ai")) return false;
  const aiParam = (urlParams.get("ai") ?? "").toLowerCase().trim();
  return aiParam !== "false" && aiParam !== "0" && aiParam !== "off" && aiParam !== "no";
}

/**
 * Returns the active AI profile resolved from URL parameters.
 * Defaults to `balanced` if just `?ai`, `?ai=true`, or an unknown preset name is provided.
 */
export function getAIProfile(): AIProfile {
  if (typeof window === "undefined" || !window.location) return { ...AI_PRESETS.balanced };
  const urlParams = new URLSearchParams(window.location.search);

  // Check preset name from ?personality=... or ?profile=... or ?ai=aggressive/defensive/etc.
  const aiVal = (urlParams.get("ai") ?? "").toLowerCase().trim();
  const personalityVal = (urlParams.get("personality") ?? urlParams.get("profile") ?? "").toLowerCase().trim();

  const selectedPreset = AI_PRESETS[personalityVal] || AI_PRESETS[aiVal] || AI_PRESETS.balanced;

  const profile: AIProfile = { ...selectedPreset };

  // Allow fine-grained numeric overrides via URL parameters
  const parseNum = (val: string | null): number | null => {
    if (!val) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  };

  const customAggression = parseNum(urlParams.get("aggressiveness") ?? urlParams.get("aggression"));
  if (customAggression !== null) profile.aggressiveness = customAggression;

  const customDefense = parseNum(urlParams.get("defensiveness") ?? urlParams.get("defense"));
  if (customDefense !== null) profile.defensiveness = customDefense;

  const customCaution = parseNum(urlParams.get("caution"));
  if (customCaution !== null) profile.caution = customCaution;

  const customCity = parseNum(urlParams.get("cityPriority") ?? urlParams.get("city"));
  if (customCity !== null) profile.cityPriority = customCity;

  const customDelay = parseNum(urlParams.get("delay") ?? urlParams.get("speed"));
  if (customDelay !== null) profile.stepDelay = customDelay;

  return profile;
}

/** Calculate predicted combat damage dealt to target */
export function predictDamage(
  attackerType: U,
  attackerHealth: number,
  targetType: U,
  targetTileType: TileType
): number {
  const damageTable = UNIT[attackerType]?.damage?.[targetType];
  if (!damageTable) return 0;
  const maxDamage = Math.max(damageTable.primary, damageTable.secondary);
  const defenseRating = TILE_DATA[targetTileType]?.defense ?? 0;
  const defenseMultiplier = Math.max(0, 1 - defenseRating * 0.1);
  return Math.floor((attackerHealth / 100) * maxDamage * defenseMultiplier);
}

/** Manhattan distance between two tiles */
function getDistance(t1: Tile, t2: Tile): number {
  return Math.abs(t1.gridX - t2.gridX) + Math.abs(t1.gridY - t2.gridY);
}

export class AIController {
  /**
   * Plans and executes a full turn for the AI (Red Team)
   */
  public static async runTurn(mainScreen: MainScreen): Promise<void> {
    const profile = getAIProfile();
    // Wait brief pause after turn banner before AI starts acting
    await waitFor(profile.stepDelay + 0.2);

    const tiles = mainScreen.getBoardTiles();
    const redUnits = mainScreen.getAllUnits().filter((u) => u.team === "red" && !u.isDead);

    // Track simulated occupied tiles to prevent multiple AI units choosing the same destination
    const occupiedTileIds = new Set<string>();
    mainScreen.getAllUnits().forEach((u) => {
      if (!u.isDead && u.parent instanceof Tile) {
        occupiedTileIds.add(u.parent.id);
      }
    });

    // Evaluate best action for each Red unit
    const plannedActions: AIAction[] = [];

    for (const unit of redUnits) {
      if (unit.hasMoved && unit.hasAttacked) continue;
      const action = this.evaluateBestAction(unit, tiles, mainScreen.getAllUnits(), occupiedTileIds, profile);
      if (action) {
        plannedActions.push(action);
        // Reserve the chosen destination tile for this turn
        const parentTile = unit.parent as Tile;
        if (parentTile) occupiedTileIds.delete(parentTile.id);
        occupiedTileIds.add(action.destinationTile.id);
      }
    }

    // Sort actions: prioritize lethal strikes, artillery bombardment, high-damage attacks, then movement
    plannedActions.sort((a, b) => b.score - a.score);

    // Execute actions sequentially
    for (const action of plannedActions) {
      const { unit, path, targetEnemy } = action;
      if (unit.isDead) continue;

      // 1. Move unit if path has more than 1 step
      if (path.length > 1) {
        await unit.moveToTile(path);
        await waitFor(profile.stepDelay);
      } else {
        unit.hasMoved = true;
      }

      // 2. Attack target enemy if alive and still in range
      if (targetEnemy && !targetEnemy.isDead && !unit.isDead) {
        const currentTile = unit.parent as Tile | undefined;
        const enemyTile = targetEnemy.parent as Tile | undefined;

        if (currentTile && enemyTile) {
          const dist = getDistance(currentTile, enemyTile);
          const inRange = unit.attackRange === 1 ? dist === 1 : dist > 0 && dist <= unit.attackRange;

          if (inRange) {
            await mainScreen.executeBattle(unit, targetEnemy);
            await waitFor(profile.stepDelay + 0.1);
          }
        }
      }

      unit.hasAttacked = true;
      unit.alpha = 0.5;
      mainScreen.checkCityOccupancy();
      await waitFor(profile.stepDelay);
    }

    await waitFor(profile.stepDelay + 0.1);

    // End AI turn and switch back to player
    await mainScreen.aiEndTurn();
  }

  /**
   * Evaluates all candidate moves and attack opportunities for a single AI unit using the active profile.
   */
  private static evaluateBestAction(
    unit: Unit,
    tiles: Map<string, Tile>,
    allUnits: Unit[],
    occupiedTileIds: Set<string>,
    profile: AIProfile
  ): AIAction | null {
    const parentTile = unit.parent as Tile | undefined;
    if (!parentTile) return null;

    const livingBlueUnits = allUnits.filter((u) => u.team === "blue" && !u.isDead);
    const reachable = getReachableTiles(parentTile.gridX, parentTile.gridY, unit.moveRange, unit.moveType, tiles);

    // Candidate destination tiles: reachable tiles + current tile
    const candidateTiles = [parentTile, ...reachable].filter((tile) => {
      // Must not be occupied by another unit (unless it's the current tile of this unit)
      return tile === parentTile || !occupiedTileIds.has(tile.id);
    });

    let bestAction: AIAction | null = null;
    let highestScore = -Infinity;

    for (const destTile of candidateTiles) {
      // Pre-calculate path to this destination
      let path: Tile[] = [parentTile];
      if (destTile !== parentTile) {
        const shortest = getShortestPath(
          parentTile.gridX,
          parentTile.gridY,
          destTile.gridX,
          destTile.gridY,
          unit.moveRange,
          unit.moveType,
          tiles
        );
        if (!shortest) continue;
        path = shortest;
      }

      const destDefense = TILE_DATA[destTile.tileType]?.defense ?? 0;
      const terrainScore = destDefense * 25 * profile.defensiveness; // Value high-defense tiles

      // City objective bonus
      let cityBonus = 0;
      if (destTile.tileType === TileType.C && destTile.owner !== "red") {
        cityBonus = (unit.unitType === U.Infantry || unit.unitType === U.Commando ? 150 : 60) * profile.cityPriority;
      }

      // Check all possible attacks from this destination
      let foundAttack = false;

      for (const enemy of livingBlueUnits) {
        const enemyTile = enemy.parent as Tile | undefined;
        if (!enemyTile) continue;

        const dist = getDistance(destTile, enemyTile);
        const canAttack = unit.attackRange === 1 ? dist === 1 : dist > 0 && dist <= unit.attackRange;

        if (canAttack) {
          foundAttack = true;

          // Damage Red deals to Blue
          const damageDealt = predictDamage(unit.unitType, unit.health, enemy.unitType, enemyTile.tileType);
          const isLethal = damageDealt >= enemy.health;

          // Counter-damage Blue deals to Red
          let counterDamage = 0;
          if (!isLethal) {
            // Ranged units don't receive melee counter if attacking from range
            const canEnemyCounter = enemy.attackRange === 1 ? dist === 1 : dist <= enemy.attackRange;
            if (canEnemyCounter) {
              const remainingEnemyHealth = enemy.health - damageDealt;
              counterDamage = predictDamage(enemy.unitType, remainingEnemyHealth, unit.unitType, destTile.tileType);
            }
          }

          // Offense score: damage * target value
          const targetValue = UNIT_VALUES[enemy.unitType] ?? 50;
          const attackerValue = UNIT_VALUES[unit.unitType] ?? 50;

          const damageScore = (damageDealt / 100) * targetValue * 4 * profile.aggressiveness;
          const lethalBonus = isLethal ? (600 + targetValue * 2) * profile.aggressiveness : 0;
          const counterPenalty = (counterDamage / 100) * attackerValue * 2.5 * profile.caution;

          // Matchup specific tactical bonuses
          let matchupBonus = 0;
          if (unit.unitType === U.Commando && enemy.unitType === U.tank) {
            matchupBonus += 120 * profile.aggressiveness; // Commando hard-counters Tank
          }
          if (unit.unitType === U.tank && (enemy.unitType === U.recon || enemy.unitType === U.Infantry)) {
            matchupBonus += 90 * profile.aggressiveness; // Tank crushes Recon and Infantry
          }
          if (unit.unitType === U.artillery && dist > 1) {
            matchupBonus += 80 * profile.aggressiveness; // Safe ranged bombardment
          }

          // Penalize suicidal attacks if not trading well
          let suicidePenalty = 0;
          if (counterDamage >= unit.health && !isLethal) {
            suicidePenalty = -400 * profile.caution;
          }

          const attackScore =
            damageScore + lethalBonus + terrainScore + cityBonus + matchupBonus - counterPenalty + suicidePenalty;

          if (attackScore > highestScore) {
            highestScore = attackScore;
            bestAction = {
              unit,
              destinationTile: destTile,
              path,
              targetEnemy: enemy,
              score: attackScore,
            };
          }
        }
      }

      // If no attack from this tile, score it as a positional advance move
      if (!foundAttack && livingBlueUnits.length > 0) {
        // Find nearest enemy to this destination
        let minEnemyDist = Infinity;
        let nearestEnemyVal = 50;
        for (const enemy of livingBlueUnits) {
          const enemyTile = enemy.parent as Tile | undefined;
          if (!enemyTile) continue;
          const d = getDistance(destTile, enemyTile);
          if (d < minEnemyDist) {
            minEnemyDist = d;
            nearestEnemyVal = UNIT_VALUES[enemy.unitType] ?? 50;
          }
        }

        let positioningScore = 0;

        if (unit.unitType === U.artillery) {
          // Artillery wants to stay at range 2-3 from nearest enemy
          const optimalDist = 2;
          const distDiff = Math.abs(minEnemyDist - optimalDist);
          positioningScore = 120 - distDiff * 25 + terrainScore;
        } else {
          // Melee units advance towards nearest enemy
          positioningScore =
            100 - minEnemyDist * 12 * profile.aggressiveness + (nearestEnemyVal / 100) * 20 + terrainScore;
        }

        positioningScore += cityBonus;

        if (positioningScore > highestScore) {
          highestScore = positioningScore;
          bestAction = {
            unit,
            destinationTile: destTile,
            path,
            targetEnemy: null,
            score: positioningScore,
          };
        }
      }
    }

    return bestAction;
  }
}
