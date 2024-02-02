import { z } from "zod";

export function isZodRecord(value: unknown): value is Record<string, unknown> {
  return z.record(z.string(), z.unknown()).safeParse(value).success;
}

export function isZodObject(
  value: unknown,
): value is z.ZodObject<z.ZodRawShape> {
  return value instanceof z.ZodObject;
}

export function isZodDefault(value: unknown): value is z.ZodDefault<z.ZodType> {
  return value instanceof z.ZodDefault;
}
