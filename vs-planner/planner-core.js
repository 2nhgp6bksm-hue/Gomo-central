(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GomoVSCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "4.0.0";
  const VERIFIED_ON = "2026-08-07";
  const MINIMUM_TARGET = 7_200_000;
  const DEFAULT_MARGIN = 100_000;

  const resource = (id, labelKey, icon, unitKey, points, options = {}) => ({
    id,
    labelKey,
    icon,
    unitKey,
    points,
    bundle: options.bundle || 1,
    group: options.group || "main",
    priority: Number.isFinite(options.priority) ? options.priority : 100,
    dailyMax: Number.isFinite(options.dailyMax) ? options.dailyMax : null,
    rare: Boolean(options.rare),
    warningKey: options.warningKey || "",
    tier: options.tier || null
  });

  const speed = (id, labelKey, options = {}) => resource(id, labelKey, "⏱️", "minute", 150, options);
  const troopSeries = (prefix, labelKey, start, step, group, options = {}) =>
    Array.from({ length: 10 }, (_, index) => resource(
      `${prefix}${index + 1}`,
      labelKey,
      options.icon || "🪖",
      "troop",
      start + step * index,
      { ...options, group, tier: index + 1, priority: (options.priority || 100) + index }
    ));

  const DAYS = [
    {
      id: 1,
      key: "radar",
      resources: [
        resource("stamina", "stamina", "⚡", "stamina", 375, { priority: 10 }),
        resource("radarTasks", "radarTasks", "📡", "mission", 30_000, { priority: 5 }),
        resource("heroExp", "heroExp", "⭐", "exp", 2.5, { bundle: 660, priority: 80 }),
        resource("droneData", "droneData", "💾", "data", 7.5, { priority: 45 }),
        resource("droneParts", "droneParts", "⚙️", "part", 6_250, { priority: 50, rare: true }),
        resource("packDiamonds", "packDiamonds", "💎", "diamond", 30, { priority: 150, rare: true }),
        resource("foodLots", "foodHarvest", "🌾", "lot100", 50, { priority: 20 }),
        resource("ironLots", "ironHarvest", "🔩", "lot100", 50, { priority: 21 }),
        resource("coinLots", "coinHarvest", "🪙", "lot60", 50, { priority: 22 }),
        resource("skillChipPremium", "skillChipPremium", "🧩", "chest", 2_812.5, { priority: 55 }),
        resource("urShards", "urShards", "🟨", "shard", 25_000, { priority: 160, rare: true }),
        resource("ssrShards", "ssrShards", "🟪", "shard", 8_750, { priority: 100, rare: true }),
        resource("rareShards", "rareShards", "🔷", "shard", 2_500, { priority: 70 })
      ]
    },
    {
      id: 2,
      key: "base",
      resources: [
        speed("constructionSpeed", "constructionSpeed", { priority: 20 }),
        speed("universalSpeed", "universalSpeed", { priority: 120, rare: true }),
        resource("buildingPower", "buildingPower", "🏗️", "power", 30, { priority: 15 }),
        resource("urTrucks", "urTrucks", "🚚", "truck", 300_000, { priority: 1, dailyMax: 5, warningKey: "urOnly" }),
        resource("legendTasks", "legendTasks", "📋", "mission", 225_000, { priority: 2, warningKey: "urOnly" }),
        resource("packDiamonds", "packDiamonds", "💎", "diamond", 80, { priority: 150, rare: true }),
        resource("survivorRecruit", "survivorRecruit", "👥", "ticket", 4_500, { priority: 60 })
      ]
    },
    {
      id: 3,
      key: "science",
      resources: [
        speed("researchSpeed", "researchSpeed", { priority: 20 }),
        speed("universalSpeed", "universalSpeed", { priority: 120, rare: true }),
        resource("techPower", "techPower", "🔬", "power", 30, { priority: 15 }),
        resource("valorBadges", "valorBadges", "🛡️", "badge", 750, { priority: 55, rare: true }),
        resource("radarTasks", "radarTasks", "📡", "mission", 30_000, { priority: 5 }),
        resource("packDiamonds", "packDiamonds", "💎", "diamond", 80, { priority: 150, rare: true }),
        ...[2_750, 8_250, 25_000, 75_000, 225_000, 675_000, 2_025_000].map((points, index) =>
          resource(`droneChest${index + 1}`, "droneChest", "🎁", "chest", points, {
            group: "droneChests",
            tier: index + 1,
            priority: 65 + index,
            rare: index >= 4
          })
        )
      ]
    },
    {
      id: 4,
      key: "heroes",
      resources: [
        resource("eliteTickets", "eliteTickets", "🎟️", "ticket", 4_500, { priority: 10 }),
        resource("heroExp", "heroExp", "⭐", "exp", 2.5, { bundle: 660, priority: 35 }),
        resource("urShards", "urShards", "🟨", "shard", 25_000, { priority: 150, rare: true }),
        resource("ssrShards", "ssrShards", "🟪", "shard", 8_750, { priority: 90, rare: true }),
        resource("rareShards", "rareShards", "🔷", "shard", 2_500, { priority: 60 }),
        resource("skillMedals", "skillMedals", "🏅", "medal", 25, { priority: 40 }),
        resource("packDiamonds", "packDiamonds", "💎", "diamond", 80, { priority: 160, rare: true }),
        resource("weaponShards", "weaponShards", "🔧", "shard", 25_000, { priority: 170, rare: true })
      ]
    },
    {
      id: 5,
      key: "mobilization",
      resources: [
        resource("radarTasks", "radarTasks", "📡", "mission", 30_000, { priority: 5 }),
        speed("constructionSpeed", "constructionSpeed", { priority: 30 }),
        speed("researchSpeed", "researchSpeed", { priority: 31 }),
        speed("trainingSpeed", "trainingSpeed", { priority: 20 }),
        speed("universalSpeed", "universalSpeed", { priority: 120, rare: true }),
        resource("buildingPower", "buildingPower", "🏗️", "power", 30, { priority: 15 }),
        resource("techPower", "techPower", "🔬", "power", 30, { priority: 16 }),
        ...troopSeries("trainT", "trainedTroops", 60, 30, "trainedTroops", { priority: 40, icon: "🪖" })
      ]
    },
    {
      id: 6,
      key: "enemy",
      resources: [
        resource("urTrucks", "urTrucks", "🚚", "truck", 300_000, { priority: 1, dailyMax: 5, warningKey: "urOnly" }),
        resource("legendTasks", "legendTasks", "📋", "mission", 225_000, { priority: 2, warningKey: "urOnly" }),
        speed("constructionSpeed", "constructionSpeed", { priority: 40 }),
        speed("researchSpeed", "researchSpeed", { priority: 41 }),
        speed("trainingSpeed", "trainingSpeed", { priority: 30 }),
        speed("healingSpeed", "healingSpeed", { priority: 20 }),
        speed("universalSpeed", "universalSpeed", { priority: 120, rare: true }),
        ...troopSeries("rivalKillT", "rivalKilled", 30, 15, "rivalKills", { priority: 10, icon: "⚔️" }),
        ...troopSeries("otherKillT", "otherKilled", 6, 3, "otherKills", { priority: 80, icon: "🗡️" }),
        ...troopSeries("lostT", "lostTroops", 5, 2.5, "ownLosses", { priority: 200, icon: "🩹", rare: true }),
        resource("packDiamonds", "packDiamonds", "💎", "diamond", 80, { priority: 190, rare: true })
      ]
    }
  ];

  function getDay(dayId) {
    return DAYS.find((day) => day.id === Number(dayId)) || DAYS[0];
  }

  function valueKey(dayId, itemId) {
    return `${Number(dayId)}:${itemId}`;
  }

  function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function getPointValue(dayId, item, overrides = {}) {
    const override = Number(overrides[valueKey(dayId, item.id)]);
    return Number.isFinite(override) && override > 0 ? override : item.points;
  }

  function usableQuantity(item, rawStock) {
    let quantity = Math.floor(finiteNonNegative(rawStock));
    if (item.dailyMax !== null) quantity = Math.min(quantity, item.dailyMax);
    const bundle = Math.max(1, Number(item.bundle) || 1);
    return Math.floor(quantity / bundle) * bundle;
  }

  function pointsForQuantity(dayId, item, quantity, overrides = {}) {
    const usable = usableQuantity({ ...item, dailyMax: null }, quantity);
    const bundles = usable / Math.max(1, item.bundle || 1);
    return bundles * getPointValue(dayId, item, overrides);
  }

  function calculatePotential({ dayId, stocks = {}, overrides = {}, enabled = {} }) {
    const day = getDay(dayId);
    return day.resources.reduce((total, item) => {
      if (enabled[valueKey(day.id, item.id)] === false) return total;
      return total + pointsForQuantity(day.id, item, usableQuantity(item, stocks[item.id]), overrides);
    }, 0);
  }

  function calculatePlan({
    dayId,
    currentPoints = 0,
    minimumTarget = MINIMUM_TARGET,
    safetyMargin = DEFAULT_MARGIN,
    stocks = {},
    overrides = {},
    enabled = {}
  }) {
    const day = getDay(dayId);
    const current = finiteNonNegative(currentPoints);
    const minimum = Math.max(0, finiteNonNegative(minimumTarget) || MINIMUM_TARGET);
    const margin = finiteNonNegative(safetyMargin);

    if (current >= minimum) {
      return {
        version: VERSION,
        dayId: day.id,
        current,
        minimum,
        goal: current,
        margin,
        actions: [],
        added: 0,
        total: current,
        minimumReached: true,
        goalReached: true,
        missing: 0
      };
    }

    const goal = minimum + margin;
    let remaining = goal - current;
    const actions = [];
    const sorted = [...day.resources].sort((a, b) => a.priority - b.priority || (b.points / b.bundle) - (a.points / a.bundle));

    for (const item of sorted) {
      const key = valueKey(day.id, item.id);
      if (enabled[key] === false || remaining <= 0) continue;

      const available = usableQuantity(item, stocks[item.id]);
      if (!available) continue;

      const pointValue = getPointValue(day.id, item, overrides);
      if (!Number.isFinite(pointValue) || pointValue <= 0) continue;

      const bundle = Math.max(1, item.bundle || 1);
      const availableBundles = Math.floor(available / bundle);
      const neededBundles = Math.ceil(remaining / pointValue);
      const usedBundles = Math.min(availableBundles, neededBundles);
      const quantity = usedBundles * bundle;
      const points = usedBundles * pointValue;

      if (!quantity || !points) continue;
      actions.push({ itemId: item.id, quantity, points, pointValue, bundle });
      remaining -= points;
    }

    const added = actions.reduce((sum, action) => sum + action.points, 0);
    const total = current + added;

    return {
      version: VERSION,
      dayId: day.id,
      current,
      minimum,
      goal,
      margin,
      actions,
      added,
      total,
      minimumReached: total >= minimum,
      goalReached: total >= goal,
      missing: Math.max(0, goal - total)
    };
  }

  return {
    VERSION,
    VERIFIED_ON,
    MINIMUM_TARGET,
    DEFAULT_MARGIN,
    DAYS,
    getDay,
    valueKey,
    getPointValue,
    usableQuantity,
    pointsForQuantity,
    calculatePotential,
    calculatePlan
  };
});
