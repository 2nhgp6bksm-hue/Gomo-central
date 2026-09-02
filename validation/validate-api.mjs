import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2] || "validation-results";
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}`, "utf8"));
const members = read("api-members.json");
const power = read("api-power.json");
const fixture = read("fixture.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(members.ok === true, "Members API did not return ok=true");
assert(power.ok === true, "Power API did not return ok=true");
assert(Array.isArray(members.members) && members.members.length > 0, "Members API returned no members");
assert(members.memberCount === members.members.length, "Members API memberCount mismatch");
assert(power.memberCount === power.members.length, "Power API memberCount mismatch");
assert(power.memberCount === members.memberCount, "Members and Power counts differ");

const memberKeys = ["gomoId", "name", "rank", "hq", "power", "heroPower", "avatarUrl", "active", "membershipStatus"];
const powerKeys = ["gomoId", "name", "rank", "hq", "power", "heroPower", "active", "membershipStatus"];
for (const member of members.members) {
  for (const key of memberKeys) assert(Object.hasOwn(member, key), `Members API missing ${key}`);
}
for (const member of power.members) {
  for (const key of powerKeys) assert(Object.hasOwn(member, key), `Power API missing ${key}`);
}

const target = fixture.target;
const targetMember = members.members.find((member) => member.gomoId === target.gomoId || member.name === target.name);
const targetPower = power.members.find((member) => member.gomoId === target.gomoId || member.name === target.name);
assert(targetMember, "Controlled fixture member is missing from Members API");
assert(targetPower, "Controlled fixture member is missing from Power API");
assert(Number(targetMember.power) === Number(target.after), "Members API did not expose the controlled change");
assert(Number(targetPower.power) === Number(target.after), "Power API did not expose the controlled change");

const summary = {
  ok: true,
  memberCount: members.memberCount,
  activeCount: members.members.filter((member) => member.active).length,
  archivedCountReturned: members.members.filter((member) => !member.active || member.membershipStatus === "departed").length,
  avatarUrlCount: members.members.filter((member) => Boolean(member.avatarUrl)).length,
  hqPresentCount: members.members.filter((member) => member.hq !== null && member.hq !== undefined).length,
  birthdayFieldCount: members.members.filter((member) => Object.hasOwn(member, "birthday") || Object.hasOwn(member, "birthDate")).length,
  assistantContract: {
    compatible: true,
    requiredFields: memberKeys,
    avatarContractVersion: members.avatarContractVersion ?? null,
    avatarStats: members.avatarStats ?? null,
  },
  powerContract: { compatible: true, requiredFields: powerKeys },
  controlledChangeVisible: {
    gomoId: targetMember.gomoId,
    name: targetMember.name,
    before: target.before,
    after: targetMember.power,
  },
};

writeFileSync(`${dir}/api-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
