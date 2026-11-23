import { formatNumber } from "@/application/formatting"
import type { OrdinaryStatSourceContribution } from "@/application/statSourceBreakdown"
import { t } from "@/i18n"
import type { StatDefinition } from "@/types"

/** Literal `t("…")` calls so i18n extract keeps the catalog rows. */
function sourceLabel(id: string) {
  switch (id) {
    case "global":
      return t("ui.app.statSource.global")
    case "base":
      return t("ui.app.statSource.base")
    case "enhancement":
      return t("ui.app.statSource.enhancement")
    case "talents":
      return t("ui.app.statSource.talents")
    case "oddity":
      return t("ui.app.statSource.oddity")
    case "attributes":
      return t("ui.app.statSource.attributes")
    case "breakthrough":
      return t("ui.app.breakthrough")
    case "martialArts":
      return t("ui.app.statSource.martialArts")
    case "gear":
      return t("ui.app.statSource.gear")
    case "arsenal":
      return t("ui.app.arsenal")
    case "bowRingSet":
      return t("ui.app.bowRingSet")
    case "weaponSet":
      return t("ui.app.weaponSet")
    case "armorSet":
      return t("ui.app.armorSet")
    case "script":
      return t("ui.app.script")
    case "divinecraft":
      return t("ui.app.divinecraft")
    case "innerWays":
      return t("ui.app.innerWays")
    default:
      return id
  }
}

export function StatSourceBreakdownContent({
  definition,
  sources,
}: {
  definition: StatDefinition
  sources: OrdinaryStatSourceContribution[]
}) {
  const displayAmount = (amount: number) => {
    const scaled = definition.unit === "%" ? amount * 100 : amount
    const formatted = formatNumber(scaled)
    return definition.unit === "%" ? `${formatted}%` : formatted
  }

  if (!sources.length) {
    return <span className="stat-source-empty">{t("ui.app.statSource.empty")}</span>
  }

  return (
    <div className="stat-source-breakdown">
      <strong className="stat-source-heading">{t("ui.app.statSource.heading")}</strong>
      <ul className="stat-source-list">
        {sources.map(source => (
          <li key={source.id}>
            <span>{source.label ?? sourceLabel(source.id)}</span>
            <strong>{displayAmount(source.amount)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
