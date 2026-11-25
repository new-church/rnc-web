import { test } from "node:test";
import assert from "node:assert/strict";
import { countryIso, countryOptions, countryOfNumber, e164Of, phoneForPlanningCenter, splitPhone } from "../src/lib/phone";
import { addressFromComponents } from "../src/lib/address";
import { parseExtra } from "../src/lib/members/validate";

const ok = (country: string, input: string) => {
  const r = phoneForPlanningCenter(country, input);
  assert.ok(r.ok, `${country} ${input}`);
  return r as { ok: true; number: string; e164: string };
};

test("Australian numbers are written the way existing records are stored (national)", () => {
  assert.deepEqual(ok("AU", "0412345678"), { ok: true, number: "0412 345 678", e164: "+61412345678" });
  assert.equal(ok("AU", "(02) 9913 8075").number, "(02) 9913 8075");
  assert.equal(ok("AU", "+61 412 345 678").number, "0412 345 678", "typed in international form is still read as Australian");
});

test("other countries are written in full international form so Planning Center picks the country", () => {
  assert.equal(ok("NZ", "021 123 4567").number, "+64 21 123 4567");
  assert.equal(ok("GB", "07123 456789").number, "+44 7123 456789");
  assert.equal(ok("US", "(201) 555-0123").number, "+1 201 555 0123");
  assert.equal(ok("AU", "+64 21 123 4567").e164, "+64211234567", "a + number wins over the dropdown");
  assert.equal(ok("AU", "0064 21 123 4567").e164, "+64211234567", "00 is read as +");
});

test("rejects things that are not phone numbers", () => {
  for (const bad of ["", "123", "call me", "0412 345"]) assert.equal(phoneForPlanningCenter("AU", bad).ok, false, bad);
});

test("spacing differences are not a change, and a stored record shows its country and national number", () => {
  assert.equal(e164Of("0412345678", "AU"), e164Of("0412 345 678", "AU"));
  assert.equal(countryOfNumber("+64 21 123 4567"), "NZ");
  assert.deepEqual(splitPhone({ number: "+64 21 123 4567", e164: "+64211234567", national: "021 123 4567", country_code: "NZ" }), { country: "NZ", national: "021 123 4567" });
  assert.deepEqual(splitPhone({ number: "0408 202 130" }), { country: "AU", national: "0408 202 130" }, "a number Planning Center couldn't parse still shows, as Australian");
});

test("country menus start with Australia, then NZ, UK, US, Canada", () => {
  assert.deepEqual(countryOptions().priority.map((c) => c.iso), ["AU", "NZ", "GB", "US", "CA"]);
  assert.ok(countryOptions().rest.length > 150);
  assert.equal(countryIso("Australia"), "AU");
  assert.equal(countryIso("nz"), "NZ");
  assert.equal(countryIso("Atlantis"), "");
});

test("Google's address parts become the form's fields: unit/number, short road name, suburb, state and country codes", () => {
  const c = (type: string, longText: string, shortText = longText) => ({ types: [type], longText, shortText });
  assert.deepEqual(
    addressFromComponents([c("subpremise", "10"), c("street_number", "70"), c("route", "Chandos Street", "Chandos St"), c("locality", "St Leonards"), c("administrative_area_level_1", "New South Wales", "NSW"), c("country", "Australia", "AU"), c("postal_code", "2065")]),
    { street1: "10/70 Chandos St", street2: "", city: "St Leonards", state: "NSW", zip: "2065", country: "AU" },
  );
  assert.equal(addressFromComponents([c("street_number", "4"), c("route", "Shirley Road", "Shirley Rd"), c("postal_town", "London"), c("country", "United Kingdom", "GB")]).city, "London", "UK towns come from postal_town");
  assert.equal(addressFromComponents([]).country, "AU");
});

test("the form reads the phone with its country and the address with a country that exists", () => {
  const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return parseExtra(f); };
  const a = fd({ phoneCountry: "NZ", phone: "021 123 4567" });
  assert.ok(a.ok && a.value.phone === "+64 21 123 4567");
  assert.equal(fd({ phoneCountry: "AU", phone: "nope" }).ok, false);
  assert.equal(fd({ street1: "1 A St", city: "X", zip: "2000", country: "ZZ" }).ok, false);
  const b = fd({ street1: "1 A St", city: "Auckland", zip: "1010", country: "NZ" });
  assert.ok(b.ok && b.value.address?.country === "NZ", "non-Australian postcodes aren't forced to four digits");
});
