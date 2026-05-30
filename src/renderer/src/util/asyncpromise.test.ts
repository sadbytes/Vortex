import { describe, it, expect } from "vitest";

import { each, filter, map, mapSeries, reduce, reflect } from "./asyncpromise";

describe("map", () => {
  it("returns results in input order", async () => {
    const result = await map([1, 2, 3], (n) => Promise.resolve(n * 2));
    expect(result).toEqual([2, 4, 6]);
  });

  it("passes item, index and length", async () => {
    const seen: Array<[number, number, number]> = [];
    await map(["a", "b"], (item, index, length) => {
      seen.push([item.length, index, length]);
      return null;
    });
    expect(seen).toEqual([
      [1, 0, 2],
      [1, 1, 2],
    ]);
  });

  it("respects the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    await map(
      [1, 2, 3, 4, 5, 6],
      async (n) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return n;
      },
      { concurrency: 2 },
    );
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("preserves order under a concurrency limit", async () => {
    const result = await map([10, 1, 5, 2], (n) => new Promise((r) => setTimeout(() => r(n), n)), {
      concurrency: 2,
    });
    expect(result).toEqual([10, 1, 5, 2]);
  });
});

describe("reflect", () => {
  it("captures a fulfilled value", async () => {
    const inspection = await reflect(Promise.resolve(42));
    expect(inspection.isFulfilled()).toBe(true);
    expect(inspection.isRejected()).toBe(false);
    expect(inspection.value()).toBe(42);
  });

  it("captures a rejection reason without throwing", async () => {
    const err = new Error("boom");
    const inspection = await reflect(Promise.reject(err));
    expect(inspection.isRejected()).toBe(true);
    expect(inspection.isFulfilled()).toBe(false);
    expect(inspection.reason()).toBe(err);
  });
});

describe("mapSeries", () => {
  it("returns results in input order", async () => {
    const result = await mapSeries([1, 2, 3], (n) => Promise.resolve(n * 2));
    expect(result).toEqual([2, 4, 6]);
  });

  it("runs one element at a time, in order", async () => {
    const order: number[] = [];
    await mapSeries([10, 5, 1], async (ms, idx) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      order.push(idx);
    });
    // despite descending delays, sequential execution preserves index order
    expect(order).toEqual([0, 1, 2]);
  });

  it("passes item, index and length", async () => {
    const seen: Array<[number, number, number]> = [];
    await mapSeries(["a", "b"], (item, index, length) => {
      seen.push([item.length, index, length]);
      return null;
    });
    expect(seen).toEqual([
      [1, 0, 2],
      [1, 1, 2],
    ]);
  });

  it("resolves to empty array for empty input", async () => {
    expect(await mapSeries([], () => 1)).toEqual([]);
  });
});

describe("each", () => {
  it("resolves to the original list, not the iterator results", async () => {
    const input = [1, 2, 3];
    const result = await each(input, (n) => n * 100);
    expect(result).toBe(input);
  });

  it("executes sequentially", async () => {
    const order: number[] = [];
    await each([10, 5, 1], async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      order.push(ms);
    });
    expect(order).toEqual([10, 5, 1]);
  });
});

describe("reduce", () => {
  it("reduces sequentially with an initial value", async () => {
    const sum = await reduce([1, 2, 3, 4], (acc, n) => Promise.resolve(acc + n), 0);
    expect(sum).toBe(10);
  });

  it("seeds with the first element when no initial value is given", async () => {
    const product = await reduce<number, number>([2, 3, 4], (acc, n) => acc * n);
    expect(product).toBe(24);
  });

  it("threads the accumulator through async steps", async () => {
    const concatenated = await reduce(
      ["a", "b", "c"],
      async (acc, ch) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return acc + ch;
      },
      "",
    );
    expect(concatenated).toBe("abc");
  });
});

describe("filter", () => {
  it("keeps elements whose predicate resolves truthy, preserving order", async () => {
    const evens = await filter([1, 2, 3, 4, 5, 6], (n) => Promise.resolve(n % 2 === 0));
    expect(evens).toEqual([2, 4, 6]);
  });

  it("supports synchronous predicates", async () => {
    const result = await filter(["", "a", "", "b"], (s) => s.length > 0);
    expect(result).toEqual(["a", "b"]);
  });
});
