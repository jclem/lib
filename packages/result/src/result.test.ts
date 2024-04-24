import { describe, expect, it } from "bun:test";
import {
  Err,
  Left,
  None,
  Ok,
  Right,
  Some,
  UnwrapError,
  tryCatch,
  tryCatchAsync,
  unwrapEither,
  unwrapOption,
  unwrapResult,
} from "./result.js";

describe("Either", () => {
  describe("Left", () => {
    it("creates a left value", () => {
      expect(Left(42)).toEqual({ type: "left", value: 42 });
    });
  });

  describe("Right", () => {
    it("creates a right value", () => {
      expect(Right(42)).toEqual({ type: "right", value: 42 });
    });
  });

  describe("unwrapEither", () => {
    it("returns the value if it is the correct side", () => {
      const either = Right(42);
      expect(unwrapEither("right", either)).toEqual(42);
    });

    it("throws an error if the value is the wrong side", () => {
      const either = Right(42);
      const expectedError = new UnwrapError(42);
      expect(() => unwrapEither("left", either)).toThrow(expectedError);
    });
  });
});

describe("Option", () => {
  describe("Some", () => {
    it("creates a some value", () => {
      expect(Some(42)).toEqual({ type: "some", value: 42 });
    });
  });

  describe("None", () => {
    it("creates a none value", () => {
      expect(None()).toEqual({ type: "none" });
    });
  });

  describe("unwrapOption", () => {
    it("returns the value if it is some", () => {
      const option = Some(42);
      expect(unwrapOption(option)).toEqual(42);
    });

    it("throws an error if the value is none", () => {
      const option = None();
      const expectedError = new UnwrapError(None());
      expect(() => unwrapOption(option)).toThrow(expectedError);
    });
  });
});

describe("Result", () => {
  describe("Ok", () => {
    it("creates an ok value", () => {
      expect(Ok(42)).toEqual({ ok: true, value: 42 });
    });
  });

  describe("Err", () => {
    it("creates an err value", () => {
      expect(Err("no")).toEqual({ ok: false, value: "no" });
    });
  });

  describe("unwrapResult", () => {
    it("returns the value if it is ok", () => {
      const result = Ok(42);
      expect(unwrapResult(result)).toEqual(42);
    });

    it("throws an error if the value is err", () => {
      const result = Err("no");
      const expectedError = new UnwrapError("no");
      expect(() => unwrapResult(result)).toThrow(expectedError);
    });
  });

  describe("tryCatch", () => {
    it("returns an ok value if the function succeeds", () => {
      const result = tryCatch(() => 42);
      expect(result).toEqual(Ok(42));
    });

    it("returns an err value if the function fails", () => {
      const result = tryCatch(() => {
        throw new Error("no");
      });
      expect(result).toEqual(Err(new Error("no")));
    });
  });

  describe("tryCatchAsync", () => {
    it("returns an ok value if the function succeeds", async () => {
      const result = await tryCatchAsync(async () => 42);
      expect(result).toEqual(Ok(42));
    });

    it("returns an err value if the function fails", async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error("no");
      });
      expect(result).toEqual(Err(new Error("no")));
    });
  });
});
