"use strict";

const assert = require("node:assert/strict");
const Core = require("../planner-core.js");

function item(day, id) {
  const found = Core.getDay(day).resources.find((candidate) => candidate.id === id);
  assert.ok(found, `missing D${day}:${id}`);
  return found;
}

function points(day, id) {
  return item(day, id).points;
}

assert.equal(Core.VERSION, "4.0.0");
assert.equal(Core.VERIFIED_ON, "2026-08-07");
assert.equal(Core.DAYS.length, 6);

// Profil GoMo validé : chaque valeur visible dans le fichier source est testée.
assert.deepEqual(
  ["stamina","radarTasks","heroExp","droneData","droneParts","packDiamonds","foodLots","ironLots","coinLots","skillChipPremium","urShards","ssrShards","rareShards"].map((id) => points(1, id)),
  [375,30_000,2.5,7.5,6_250,30,50,50,50,2_812.5,25_000,8_750,2_500]
);
assert.equal(item(1, "heroExp").bundle, 660);

assert.deepEqual(
  ["constructionSpeed","universalSpeed","buildingPower","urTrucks","legendTasks","packDiamonds","survivorRecruit"].map((id) => points(2, id)),
  [150,150,30,300_000,225_000,80,4_500]
);
assert.equal(item(2, "urTrucks").dailyMax, 5);

assert.deepEqual(
  ["researchSpeed","universalSpeed","techPower","valorBadges","radarTasks","packDiamonds"].map((id) => points(3, id)),
  [150,150,30,750,30_000,80]
);
assert.deepEqual(Array.from({length:7}, (_, index) => points(3, `droneChest${index + 1}`)), [2_750,8_250,25_000,75_000,225_000,675_000,2_025_000]);

assert.deepEqual(
  ["eliteTickets","heroExp","urShards","ssrShards","rareShards","skillMedals","packDiamonds","weaponShards"].map((id) => points(4, id)),
  [4_500,2.5,25_000,8_750,2_500,25,80,25_000]
);
assert.equal(item(4, "heroExp").bundle, 660);

assert.deepEqual(
  ["radarTasks","constructionSpeed","researchSpeed","trainingSpeed","universalSpeed","buildingPower","techPower"].map((id) => points(5, id)),
  [30_000,150,150,150,150,30,30]
);
assert.deepEqual(Array.from({length:10}, (_, index) => points(5, `trainT${index + 1}`)), [60,90,120,150,180,210,240,270,300,330]);

assert.deepEqual(
  ["urTrucks","legendTasks","constructionSpeed","researchSpeed","trainingSpeed","healingSpeed","universalSpeed","packDiamonds"].map((id) => points(6, id)),
  [300_000,225_000,150,150,150,150,150,80]
);
assert.deepEqual(Array.from({length:10}, (_, index) => points(6, `rivalKillT${index + 1}`)), [30,45,60,75,90,105,120,135,150,165]);
assert.deepEqual(Array.from({length:10}, (_, index) => points(6, `otherKillT${index + 1}`)), [6,9,12,15,18,21,24,27,30,33]);
assert.deepEqual(Array.from({length:10}, (_, index) => points(6, `lostT${index + 1}`)), [5,7.5,10,12.5,15,17.5,20,22.5,25,27.5]);

// Aucune dépense dès que le minimum est déjà atteint.
const alreadyReached = Core.calculatePlan({ dayId:1, currentPoints:7_200_000, stocks:{radarTasks:999} });
assert.equal(alreadyReached.actions.length, 0);
assert.equal(alreadyReached.total, 7_200_000);
assert.equal(alreadyReached.goalReached, true);

// Limite quotidienne des camions UR et respect strict du stock.
const trucks = Core.calculatePlan({ dayId:2, currentPoints:0, stocks:{urTrucks:99} });
assert.equal(trucks.actions[0].itemId, "urTrucks");
assert.equal(trucks.actions[0].quantity, 5);
assert.equal(trucks.actions[0].points, 1_500_000);

const mixedStocks = { radarTasks:3, stamina:40, heroExp:1_000_000, droneParts:7 };
const mixed = Core.calculatePlan({ dayId:1, currentPoints:5_900_000, stocks:mixedStocks });
for (const action of mixed.actions) {
  assert.ok(action.quantity <= mixedStocks[action.itemId], `${action.itemId} exceeds stock`);
}
assert.equal(mixed.added, mixed.actions.reduce((sum, action) => sum + action.points, 0));
assert.equal(mixed.total, mixed.current + mixed.added);

// Les blocs EXP ne consomment jamais une fraction de 660 EXP.
assert.equal(Core.usableQuantity(item(1, "heroExp"), 1_000), 660);
assert.equal(Core.pointsForQuantity(1, item(1, "heroExp"), 1_000), 2.5);

// Une ressource décochée ne contribue ni au potentiel ni au plan.
const radarKey = Core.valueKey(1, "radarTasks");
const disabled = Core.calculatePlan({ dayId:1, currentPoints:0, stocks:{radarTasks:500}, enabled:{[radarKey]:false} });
assert.equal(disabled.actions.some((action) => action.itemId === "radarTasks"), false);
assert.equal(Core.calculatePotential({dayId:1,stocks:{radarTasks:500},enabled:{[radarKey]:false}}), 0);

// Les modifications de valeur sont appliquées exactement.
const customKey = Core.valueKey(2, "buildingPower");
assert.equal(Core.pointsForQuantity(2, item(2, "buildingPower"), 1_000, {[customKey]:42}), 42_000);

console.log("GoMo VS Planner core: all tests passed");
