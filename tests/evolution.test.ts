import { describe, expect, it } from "vitest";
import { evolutionState, FORMS, heroBackSpriteId } from "@/lib/evolution/evolution";
import { LABS } from "@/lib/labs/catalog";
import { spriteById } from "@/game/sprites/roster";

const exists = new Set(["linear-gd", "forge-value"]);
const pass = { passed: true, assisted: false };

describe("evolutionState", () => {
  it("starts before any form with the Perceptron next", () => {
    const s = evolutionState({}, exists);
    expect(s.current).toBe(-1);
    expect(s.next?.form.id).toBe("perceptron");
    expect(s.nextProgress).toBe(0);
  });

  it("evolves to Perceptron on an unassisted pass of linear-gd", () => {
    const s = evolutionState({ "linear-gd": pass }, exists);
    expect(s.current).toBe(0);
    expect(s.next?.form.id).toBe("multilayer");
  });

  it("an assisted pass or a failed run does not count", () => {
    expect(evolutionState({ "linear-gd": { passed: true, assisted: true } }, exists).current).toBe(-1);
    expect(evolutionState({ "linear-gd": { passed: false, assisted: false } }, exists).current).toBe(-1);
  });

  it("reports partial progress and marks planned Labs unavailable", () => {
    const s = evolutionState({ "linear-gd": pass, "forge-value": pass }, exists);
    expect(s.current).toBe(0);
    expect(s.nextProgress).toBe(0.5);
    expect(s.next?.requirements.map((r) => [r.labId, r.done, r.available])).toEqual([["forge-value", true, true], ["forge-mlp", false, false]]);
  });

  it("forms are strictly ordered: a later form needs every earlier one", () => {
    const labs = { "forge-conv": pass, "forge-rnn": pass };
    const s = evolutionState(labs, exists);
    expect(s.forms[2]!.met).toBe(true);
    expect(s.forms[2]!.reached).toBe(false);
    expect(s.current).toBe(-1);
  });

  it("reaches Foundation when everything is passed", () => {
    const labs = Object.fromEntries(FORMS.flatMap((f) => f.requires).map((id) => [id, pass]));
    const s = evolutionState(labs, exists);
    expect(s.current).toBe(FORMS.length - 1);
    expect(s.next).toBeNull();
    expect(s.nextProgress).toBe(1);
  });

  it("has unique form ids and non-empty requirements", () => {
    expect(new Set(FORMS.map((f) => f.id)).size).toBe(FORMS.length);
    for (const f of FORMS) expect(f.requires.length).toBeGreaterThan(0);
  });

  it("reaches Multilayer on the Forge Labs and switches the battle sprite", () => {
    const all = new Set(["linear-gd", "forge-value", "forge-mlp"]);
    expect(heroBackSpriteId({ "linear-gd": pass }, all)).toBe("neuron-pup-perceptron-back");
    expect(heroBackSpriteId({}, all)).toBe("neuron-pup-perceptron-back");
    const s = evolutionState({ "linear-gd": pass, "forge-value": pass, "forge-mlp": pass }, all);
    expect(s.forms[1]!.form.sprite).toBe("neuron-pup-multilayer");
    expect(heroBackSpriteId({ "linear-gd": pass, "forge-value": pass, "forge-mlp": pass }, all)).toBe("neuron-pup-multilayer-back");
  });

  it("reaches Convling after the Forge conv Lab and switches the battle sprite", () => {
    const all = new Set(["linear-gd", "forge-value", "forge-mlp", "forge-conv"]);
    const labs = { "linear-gd": pass, "forge-value": pass, "forge-mlp": pass };
    expect(heroBackSpriteId(labs, all)).toBe("neuron-pup-multilayer-back");
    expect(heroBackSpriteId({ ...labs, "forge-conv": pass }, all)).toBe("neuron-pup-convling-back");
    // conv alone is not enough: forms are ordered
    expect(heroBackSpriteId({ "linear-gd": pass, "forge-conv": pass }, all)).toBe("neuron-pup-perceptron-back");
    expect(FORMS[2]!.sprite).toBe("neuron-pup-convling");
  });

  it("reaches Recurrent after the Forge rnn Lab and switches the battle sprite", () => {
    const all = new Set(["linear-gd", "forge-value", "forge-mlp", "forge-conv", "forge-rnn"]);
    const labs = { "linear-gd": pass, "forge-value": pass, "forge-mlp": pass, "forge-conv": pass };
    expect(heroBackSpriteId(labs, all)).toBe("neuron-pup-convling-back");
    expect(heroBackSpriteId({ ...labs, "forge-rnn": pass }, all)).toBe("neuron-pup-recurrent-back");
    expect(FORMS[3]!.sprite).toBe("neuron-pup-recurrent");
  });

  it("reaches Transformer only after all three Atoll Labs, unassisted", () => {
    const atoll = ["forge-embed-pos", "forge-attention", "forge-block"];
    const all = new Set(["linear-gd", "forge-value", "forge-mlp", "forge-conv", "forge-rnn", ...atoll]);
    const labs: Record<string, { passed: boolean; assisted: boolean }> = { "linear-gd": pass, "forge-value": pass, "forge-mlp": pass, "forge-conv": pass, "forge-rnn": pass };
    expect(FORMS[4]!.requires).toEqual(atoll);
    expect(heroBackSpriteId({ ...labs, "forge-attention": pass, "forge-block": pass }, all)).toBe("neuron-pup-recurrent-back");
    expect(heroBackSpriteId({ ...labs, "forge-embed-pos": pass, "forge-attention": pass, "forge-block": { passed: true, assisted: true } }, all)).toBe("neuron-pup-recurrent-back");
    const s = evolutionState({ ...labs, "forge-embed-pos": pass, "forge-attention": pass }, all);
    expect(s.next?.form.id).toBe("transformer");
    expect(heroBackSpriteId({ ...labs, "forge-embed-pos": pass, "forge-attention": pass, "forge-block": pass }, all)).toBe("neuron-pup-transformer-back");
    expect(FORMS[4]!.sprite).toBe("neuron-pup-transformer");
  });

  it("every requirement of a form with art names a Lab that ships, and its sprites exist", () => {
    const ids = new Set(LABS.map((l) => l.id));
    for (const f of FORMS.filter((x) => x.sprite)) {
      for (const r of f.requires) expect(ids.has(r), `${f.id} needs ${r}`).toBe(true);
      expect(spriteById(f.sprite!), f.sprite!).toBeDefined();
      expect(spriteById(`${f.sprite!}-back`), `${f.sprite!}-back`).toBeDefined();
    }
  });
});
