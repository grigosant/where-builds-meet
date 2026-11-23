import type { OrdinaryStatSourceContribution } from "@/application/statSourceBreakdown"

import type { CharacterStatOverrides } from "../../calculations/statEffects"
import type { StatDefinition, CharacterStats } from "../../types"
import { StatField } from "./StatField"

export function CalculatedStatField({
  definition,
  derivedLabel,
  derivedValue,
  derivedUnit,
  compact,
  stats,
  statOverrides,
  onStatChange,
  onStatReset,
  sources,
}: {
  definition: StatDefinition
  derivedLabel?: string
  derivedValue?: number
  derivedUnit?: string
  compact?: boolean
  stats: CharacterStats
  statOverrides: CharacterStatOverrides
  onStatChange: (key: keyof CharacterStats, value: number) => void
  onStatReset: (key: keyof CharacterStats) => void
  sources?: OrdinaryStatSourceContribution[]
}) {
  function updateStat(key: keyof CharacterStats, value: number) {
    onStatChange(key, Number.isFinite(value) ? value : 0)
  }

  return (
    <StatField
      definition={definition}
      stats={stats}
      onChange={updateStat}
      modified={Object.prototype.hasOwnProperty.call(statOverrides, definition.key)}
      onReset={() => onStatReset(definition.key)}
      derivedLabel={derivedLabel}
      derivedValue={derivedValue}
      derivedUnit={derivedUnit}
      compact={compact}
      sources={sources}
    />
  )
}
