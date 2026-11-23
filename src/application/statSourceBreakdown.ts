import { innerWayEffectRulesFor, selectedMartialArtEffects, setEffectsFor } from "@/application/characterComposition"
import type { CalculatorSettings, PathId, SetupSelections } from "@/application/contracts"
import { currentCombatDefinitions, type CombatDefinitions } from "@/application/gameData/previews"
import {
  arsenalEffectFor,
  baseAttributeEffects,
  bowRingSetEffectFor,
  breakthroughProfile,
  divinecraftEffectFor,
  scriptEffectFor,
  typedArmorSetDefinitions,
  typedSystemStats,
  typedWeaponSetDefinitions,
} from "@/application/gameData/setup"
import { globalEffectDefinitions } from "@/application/gameData/skills"
import { resolveSegmentValue } from "@/calculations/dynamicValues"
import {
  applyStatEffects,
  calculateRawStats,
  resolveFormulaValue,
  resolveRawStatFormulas,
  requirementIsUnconditional,
  type EffectiveStatEffectContainer,
  type FormulaStatValue,
  type SegmentStatValue,
  type StatEffectContainer,
  type StatEffectValues,
} from "@/calculations/statEffects"
import { effectForSoloLevel } from "@/data/soloLevelEffects"
import { emptyStats } from "@/data/statDefinitions"
import { equippedGearPieceStatEffects, gearData, type BuildSetup, type GearInventory } from "@/gear"
import { dataText, gameText } from "@/i18n"
import type { CharacterStats } from "@/types"

export type OrdinaryStatSourceGroup = {
  id: string
  /** Catalog key resolved by the caller with `t()`, when no ready-made label is supplied. */
  labelKey?: string
  /** Pre-resolved label for sources that are not catalog keys (equipped gear pieces). */
  label?: string
  effects: Array<StatEffectContainer & EffectiveStatEffectContainer>
}

export type OrdinaryStatSourceContribution = { id: string; labelKey?: string; label?: string; amount: number }

export type GearSourcePiece = { id: string; label: string; effect: StatEffectContainer }

type LabeledEffect = StatEffectContainer & EffectiveStatEffectContainer

function effectTouchesOrdinaryStats(effect: LabeledEffect) {
  return Boolean(effect.rawStat || effect.stat)
}

function pushGroup(
  groups: OrdinaryStatSourceGroup[],
  id: string,
  label: { labelKey?: string; label?: string },
  effects: LabeledEffect[],
) {
  const ordinary = effects.filter(effectTouchesOrdinaryStats)
  if (!ordinary.length) return
  groups.push({ id, ...label, effects: ordinary })
}

function gearSourcePieces(
  inventory: GearInventory | undefined,
  settings: CalculatorSettings,
  enforceGearCompatibility: boolean,
): GearSourcePiece[] {
  if (!inventory) return []
  return equippedGearPieceStatEffects(inventory, settings.weapons, enforceGearCompatibility).map(piece => {
    const definition = gearData.gear[piece.item.definitionId]
    const slotLabel = dataText(`system.gearSlot.${piece.slot}`, gearData.slots[piece.slot])
    const gearName = gameText(definition?.name) || slotLabel
    return {
      id: `gear:${piece.slot}:${piece.item.id}`,
      label: `${slotLabel}: ${gearName}`,
      effect: { rawStat: piece.stats },
    }
  })
}

/**
 * The same unconditional ordinary contributions that build the character sheet, split into
 * labeled sources so a white-stat field can say where its value came from. Food and other
 * effective-only inputs are omitted: they change derived attack, not the editable sheet value.
 */
export function ordinaryStatSourceGroups(
  settings: CalculatorSettings,
  gearSources: GearSourcePiece[],
  buildSetup: BuildSetup,
  selections: SetupSelections,
  pathId: PathId,
  definitions: CombatDefinitions = currentCombatDefinitions,
): OrdinaryStatSourceGroup[] {
  const breakthrough = breakthroughProfile(settings)
  const groups: OrdinaryStatSourceGroup[] = []

  const globalEffects = globalEffectDefinitions.flatMap(definition =>
    definition.global === true ||
    (typeof definition.global === "object" && settings.weapons.includes(definition.global.equippedMartialArt))
      ? ((definition.effect ?? []) as LabeledEffect[])
      : [],
  )
  pushGroup(groups, "global", { labelKey: "ui.app.statSource.global" }, globalEffects)

  pushGroup(groups, "base", { labelKey: "ui.app.statSource.base" }, [typedSystemStats.baseStats])
  pushGroup(
    groups,
    "enhancement",
    { labelKey: "ui.app.statSource.enhancement" },
    typedSystemStats.enhancementStats.map(effect => effectForSoloLevel(effect, breakthrough.soloLevel, "Enhancement")),
  )
  const talents = typedSystemStats.talentStatsBySoloLevel[String(breakthrough.soloLevel)]
  if (talents) pushGroup(groups, "talents", { labelKey: "ui.app.statSource.talents" }, [talents])

  const oddityEffects = Object.values(typedSystemStats.oddityStats).filter(
    effect => effect.minBreakthrough === undefined || Number(breakthrough.name) >= effect.minBreakthrough,
  )
  pushGroup(groups, "oddity", { labelKey: "ui.app.statSource.oddity" }, oddityEffects)

  pushGroup(groups, "attributes", { labelKey: "ui.app.statSource.attributes" }, baseAttributeEffects)
  pushGroup(groups, "breakthrough", { labelKey: "ui.app.breakthrough" }, [breakthrough.levelBonusStats])
  pushGroup(
    groups,
    "martialArts",
    { labelKey: "ui.app.statSource.martialArts" },
    selectedMartialArtEffects(settings, definitions),
  )
  for (const piece of gearSources) {
    pushGroup(groups, piece.id, { label: piece.label }, [piece.effect])
  }
  pushGroup(groups, "arsenal", { labelKey: "ui.app.arsenal" }, [arsenalEffectFor(buildSetup.arsenal, settings)])
  pushGroup(groups, "bowRingSet", { labelKey: "ui.app.bowRingSet" }, [
    bowRingSetEffectFor(buildSetup.bowRingSet, settings),
  ])
  pushGroup(
    groups,
    "weaponSet",
    { labelKey: "ui.app.weaponSet" },
    setEffectsFor(buildSetup.weaponSets, typedWeaponSetDefinitions, settings, pathId),
  )
  pushGroup(
    groups,
    "armorSet",
    { labelKey: "ui.app.armorSet" },
    setEffectsFor(buildSetup.armorSets, typedArmorSetDefinitions, settings, pathId),
  )
  pushGroup(groups, "script", { labelKey: "ui.app.script" }, [scriptEffectFor(selections.script)])
  pushGroup(groups, "divinecraft", { labelKey: "ui.app.divinecraft" }, [divinecraftEffectFor(selections.divinecraft)])

  const innerWayEffects = innerWayEffectRulesFor(buildSetup.innerWays, breakthrough.soloLevel, pathId, definitions)
    .filter(
      rule =>
        requirementIsUnconditional(rule.requirement) &&
        (rule.effect.rawStat || rule.effect.stat || rule.effect.effectiveStat),
    )
    .map(rule => rule.effect as LabeledEffect)
  pushGroup(groups, "innerWays", { labelKey: "ui.app.innerWays" }, innerWayEffects)

  return groups
}

function addContribution(
  totals: Partial<Record<keyof CharacterStats, number>>,
  key: keyof CharacterStats,
  amount: number,
) {
  if (!Number.isFinite(amount) || amount === 0) return
  totals[key] = (totals[key] ?? 0) + amount
}

function accountFixedValues(
  totals: Partial<Record<keyof CharacterStats, number>>,
  values: StatEffectValues | undefined,
) {
  if (!values) return
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "number" && key in emptyStats) addContribution(totals, key as keyof CharacterStats, value)
  }
}

function accountResolvedValues(
  totals: Partial<Record<keyof CharacterStats, number>>,
  values: StatEffectValues | undefined,
  sources: CharacterStats,
) {
  if (!values) return
  for (const [key, value] of Object.entries(values)) {
    if (!(key in emptyStats) || !value || typeof value !== "object") continue
    const resolved =
      "formula" in value
        ? resolveFormulaValue((value as FormulaStatValue).formula, sources)
        : resolveSegmentValue(value as SegmentStatValue, sources)
    if (resolved === undefined) continue
    addContribution(totals, key as keyof CharacterStats, resolved)
  }
}

/**
 * Attributes ordinary (white) sheet stats to labeled sources by replaying the same fixed-then-formula
 * order the shared pipeline uses. Effective-only bonuses are ignored on purpose.
 */
export function ordinaryStatSourceBreakdown(
  groups: OrdinaryStatSourceGroup[],
): Partial<Record<keyof CharacterStats, OrdinaryStatSourceContribution[]>> {
  const contributions = new Map<string, Partial<Record<keyof CharacterStats, number>>>()
  for (const group of groups) contributions.set(group.id, {})

  const allEffects = groups.flatMap(group => group.effects)
  const rawStats = calculateRawStats(emptyStats, allEffects)

  for (const group of groups) {
    const totals = contributions.get(group.id)!
    for (const effect of group.effects) accountFixedValues(totals, effect.rawStat)
  }
  for (const group of groups) {
    const totals = contributions.get(group.id)!
    for (const effect of group.effects) accountResolvedValues(totals, effect.rawStat, rawStats)
  }

  const resolvedEffects = allEffects.map(effect =>
    effect.statStage === "talent" ? resolveRawStatFormulas(effect, rawStats) : effect,
  )
  const ordinaryAfterRaw = applyStatEffects(
    rawStats,
    resolvedEffects.map(effect => ({ stat: effect.stat })),
  )

  // Talent formulas were frozen against raw inputs; attribute ordinary `stat` contributions against
  // the post-raw sheet the same way `applyStatEffects` does (fixed values first, then formulas).
  for (const group of groups) {
    const totals = contributions.get(group.id)!
    for (const effect of group.effects) {
      const resolved = effect.statStage === "talent" ? resolveRawStatFormulas(effect, rawStats) : effect
      accountFixedValues(totals, resolved.stat)
    }
  }
  for (const group of groups) {
    const totals = contributions.get(group.id)!
    for (const effect of group.effects) {
      const resolved = effect.statStage === "talent" ? resolveRawStatFormulas(effect, rawStats) : effect
      if (!resolved.stat) continue
      for (const [key, value] of Object.entries(resolved.stat)) {
        if (!(key in emptyStats) || !value || typeof value !== "object") continue
        if ("formula" in value) {
          const formula = (value as FormulaStatValue).formula
          const sourceKeys = typeof formula.source === "string" ? [formula.source] : formula.source.max
          // Derived-only formulas (not backed by character stats) are applied later against
          // effective fields; white-stat hover covers the editable sheet only.
          if (!sourceKeys.every(sourceKey => sourceKey in emptyStats)) continue
        }
        const resolvedValue =
          "formula" in value
            ? resolveFormulaValue((value as FormulaStatValue).formula, ordinaryAfterRaw)
            : resolveSegmentValue(value as SegmentStatValue, ordinaryAfterRaw)
        if (resolvedValue === undefined) continue
        addContribution(totals, key as keyof CharacterStats, resolvedValue)
      }
    }
  }

  const result: Partial<Record<keyof CharacterStats, OrdinaryStatSourceContribution[]>> = {}
  for (const group of groups) {
    const totals = contributions.get(group.id)!
    for (const [key, amount] of Object.entries(totals) as [keyof CharacterStats, number][]) {
      if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) continue
      const rows = result[key] ?? (result[key] = [])
      rows.push({ id: group.id, labelKey: group.labelKey, label: group.label, amount })
    }
  }
  for (const rows of Object.values(result)) {
    rows?.sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount) || left.id.localeCompare(right.id))
  }
  return result
}

export function ordinaryStatSourceBreakdownForCharacter(input: {
  settings: CalculatorSettings
  gearInventory?: GearInventory
  enforceGearCompatibility?: boolean
  /** Fallback when inventory is unavailable; kept for tests that inject a single gear blob. */
  gearSources?: GearSourcePiece[]
  buildSetup: BuildSetup
  setupSelections: SetupSelections
  pathId: PathId
}): Partial<Record<keyof CharacterStats, OrdinaryStatSourceContribution[]>> {
  const gearSources =
    input.gearSources ?? gearSourcePieces(input.gearInventory, input.settings, input.enforceGearCompatibility !== false)
  return ordinaryStatSourceBreakdown(
    ordinaryStatSourceGroups(input.settings, gearSources, input.buildSetup, input.setupSelections, input.pathId),
  )
}
