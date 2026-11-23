import assert from "node:assert/strict"

import { describe, it } from "vitest"

import { defaultSettings } from "@/application/gameData/setup"
import { ordinaryStatSourceBreakdown, ordinaryStatSourceGroups } from "@/application/statSourceBreakdown"
import { defaultBuildSetup } from "@/gear"

describe("ordinary stat source breakdown", () => {
  it("attributes white attack to individual gear pieces without inventing effective-only sources", () => {
    const groups = ordinaryStatSourceGroups(
      defaultSettings,
      [
        {
          id: "gear:helmet:test-helmet",
          label: "Helmet: Test Helm",
          effect: { rawStat: { minPhys: 100, maxPhys: 200, agility: 40 } },
        },
      ],
      defaultBuildSetup,
      { food: "None", script: "None", divinecraft: "None" },
      "mixed",
    )
    assert.ok(groups.some(group => group.id === "gear:helmet:test-helmet"))
    assert.ok(!groups.some(group => group.id === "food"))

    const breakdown = ordinaryStatSourceBreakdown(groups)
    const minPhys = breakdown.minPhys ?? []
    const gear = minPhys.find(row => row.id === "gear:helmet:test-helmet")
    assert.ok(gear, "gear piece should contribute to minPhys")
    assert.equal(gear.amount, 100)
    assert.equal(gear.label, "Helmet: Test Helm")

    const attributes = minPhys.find(row => row.id === "attributes")
    assert.ok(attributes, "attribute conversion should contribute to minPhys")
    assert.ok(attributes.amount > 0)
  })

  it("keeps base innate minPhys as its own source", () => {
    const breakdown = ordinaryStatSourceBreakdown(
      ordinaryStatSourceGroups(
        defaultSettings,
        [],
        defaultBuildSetup,
        { food: "None", script: "None", divinecraft: "None" },
        "mixed",
      ),
    )
    const base = breakdown.minPhys?.find(row => row.id === "base")
    assert.ok(base)
    assert.equal(base.amount, 263)
  })
})
