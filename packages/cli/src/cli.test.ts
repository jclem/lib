import { describe, expect, it } from "bun:test";
import { parseArgs } from "./cli";

describe(".parseArgs", () => {
  it("parses positional arguments", () => {
    const args = ["foo", "bar"];
    const result = parseArgs(args);

    expect(result).toEqual({ positional: ["foo", "bar"], flags: {} });
  });

  it("parses --flag=value arguments", () => {
    const args = ["--foo=bar"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: ["bar"] },
    });
  });

  it("parses --flag value arguments", () => {
    const args = ["--foo", "bar"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: ["bar"] },
    });
  });

  it("parses -f=value arguments", () => {
    const args = ["-f=bar"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: ["bar"] },
    });
  });

  it("parses -f value arguments", () => {
    const args = ["-f", "bar"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: ["bar"] },
    });
  });

  it("parses -fvalue arguments", () => {
    const args = ["-fbar"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: ["bar"] },
    });
  });

  it("parses --flag arguments", () => {
    const args = ["--foo"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: [true] },
    });
  });

  it("parses -f arguments", () => {
    const args = ["-f"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: [true] },
    });
  });

  it("parses repeated --flag=value arguments", () => {
    const args = ["--foo=bar", "--foo=baz"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: ["bar", "baz"] },
    });
  });

  it("parses repeated --flag value arguments", () => {
    const args = ["--foo", "bar", "--foo", "baz"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: ["bar", "baz"] },
    });
  });

  it("parses repeated -f=value arguments", () => {
    const args = ["-f=bar", "-f=baz"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: ["bar", "baz"] },
    });
  });

  it("parses repeated -f value arguments", () => {
    const args = ["-f", "bar", "-f", "baz"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: ["bar", "baz"] },
    });
  });

  it("parses repeated -fvalue arguments", () => {
    const args = ["-fbar", "-fbaz"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: ["bar", "baz"] },
    });
  });

  it("parses repeated --flag arguments", () => {
    const args = ["--foo", "--foo"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: [true, true] },
    });
  });

  it("parses repeated -f arguments", () => {
    const args = ["-f", "-f"];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { f: [true, true] },
    });
  });

  it("parses quoted args", () => {
    const args = ['--foo="bar baz"'];
    const result = parseArgs(args);

    expect(result).toEqual({
      positional: [],
      flags: { foo: ["bar baz"] },
    });
  });

  it("parses mixed args", () => {
    const args = [
      "0",
      "--a=a",
      "1",
      "--b",
      "b",
      "2",
      "--b",
      "b2",
      "3",
      "-c=c",
      "4",
      "-d",
      "d",
      "5",
      "-d",
      "d2",
      "6",
    ];

    const result = parseArgs(args);

    expect(result).toEqual({
      positional: ["0", "1", "2", "3", "4", "5", "6"],
      flags: { a: ["a"], b: ["b", "b2"], c: ["c"], d: ["d", "d2"] },
    });
  });
});
