import { useMemo } from "react"

import { formatNumber } from "@/application/formatting"
import type { DerivedStats } from "@/calculations/effectiveStats"
import { t } from "@/i18n"
import { Tooltip } from "@/ui/Tooltip"

function ratePercent(value: number) {
  return `${formatNumber(value * 100)}%`
}

function FinalChanceTooltip({ derivedStats }: { derivedStats: DerivedStats }) {
  const finalChance = derivedStats.critRate + derivedStats.affinityRate
  return (
    <div className="final-chance-tooltip">
      <div className="final-chance-tooltip-header">
        <strong>{ratePercent(finalChance)}</strong>
        <span>{t("ui.app.finalChance")}</span>
      </div>
      <p className="final-chance-tooltip-description">{t("ui.app.finalChanceDescription")}</p>
      <ul className="final-chance-tooltip-list">
        <li>
          <span>{t("ui.app.finalEffectiveCritical")}</span>
          <strong>{ratePercent(derivedStats.critRate)}</strong>
        </li>
        <li>
          <span>{t("ui.app.finalEffectiveAffinity")}</span>
          <strong>{ratePercent(derivedStats.affinityRate)}</strong>
        </li>
        <li>
          <span>{t("ui.app.finalEffectiveAbrasion")}</span>
          <strong>{ratePercent(derivedStats.abrasionRate)}</strong>
        </li>
        <li>
          <span>{t("ui.app.finalEffectiveNormal")}</span>
          <strong>{ratePercent(derivedStats.normalRate)}</strong>
        </li>
      </ul>
    </div>
  )
}

/** Read-only outcome-rate summary matching the in-game Final Chance panel. */
export function FinalChanceField({ derivedStats }: { derivedStats: DerivedStats }) {
  const content = useMemo(() => <FinalChanceTooltip derivedStats={derivedStats} />, [derivedStats])
  // In-game header is crit + affinity (abrasion/normal stay in the breakdown only).
  const finalChance = derivedStats.critRate + derivedStats.affinityRate
  return (
    <div className="field compact-field final-chance-field">
      <Tooltip className="final-chance-tooltip-box" triggerClassName="final-chance-trigger" content={content}>
        <span className="field-label">
          <span>{t("ui.app.finalChance")}</span>
        </span>
      </Tooltip>
      <strong className="inline-derived-value final-chance-value">{ratePercent(finalChance)}</strong>
    </div>
  )
}
