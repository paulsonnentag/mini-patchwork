import { describe, it, expect } from "vitest";
import { Context } from "../src/lib/core/context";
import { defineField } from "../src/lib/core/fields";

class FakeRef<Obj = any> {
  #key: string;
  #value: Obj;
  constructor(key: string, value: Obj) {
    this.#key = key;
    this.#value = value;
  }
  toKey(): string {
    return this.#key;
  }
  get value(): Obj {
    return this.#value;
  }
}

describe("Context: add fields and retract", () => {
  it("adds object with fields, exposes them, and retracts correctly", () => {
    const ctx = new Context();
    const obj = new FakeRef("doc://1|[]", { id: 1 });

    const Title = defineField<string>("title");
    const Count = defineField<number>("count");

    const undo = ctx.change((m) => {
      m.add(obj as any)
        .with(Title("Hello"))
        .with(Count(5));
    });

    expect(ctx.getField(obj as any, Title)).toBe("Hello");
    expect(ctx.getField(obj as any, Count)).toBe(5);

    const refs = ctx.getAllObjRefs();
    expect(refs.length).toBe(1);
    expect(refs[0].toKey()).toBe(obj.toKey());

    const dump = ctx.dump();
    expect(dump).toContainEqual([obj.value, "title", "Hello"]);
    expect(dump).toContainEqual([obj.value, "count", 5]);

    undo();

    expect(ctx.getField(obj as any, Title)).toBeUndefined();
    expect(ctx.getField(obj as any, Count)).toBeUndefined();
    expect(ctx.getAllObjRefs().length).toBe(0);
    expect(ctx.dump()).toEqual([]);
  });
});

describe("Context: objects added multiple times", () => {
  it("keeps object while one of multiple transactions is active, removes after all retract", () => {
    const ctx = new Context();
    const obj = new FakeRef("doc://multi|[]", { id: 42 });

    const undoA = ctx.change((m) => {
      m.add(obj as any);
    });
    const undoB = ctx.change((m) => {
      m.add(obj as any);
    });

    // Object is present (count=2 internally, but unique ref returned once)
    expect(ctx.getAllObjRefs().length).toBe(1);

    // Retract one addition; object should still be present (count=1)
    undoB();
    expect(ctx.getAllObjRefs().length).toBe(1);

    // Retract the other; object should be gone (count=0)
    undoA();
    expect(ctx.getAllObjRefs().length).toBe(0);
  });

  it("adds same object twice in a single change and fully retracts it", () => {
    const ctx = new Context();
    const obj = new FakeRef("doc://single-change|[]", { id: 7 });

    const undo = ctx.change((m) => {
      m.add(obj as any);
      m.add(obj as any);
    });

    expect(ctx.getAllObjRefs().length).toBe(1);

    undo();

    expect(ctx.getAllObjRefs().length).toBe(0);
  });
});
