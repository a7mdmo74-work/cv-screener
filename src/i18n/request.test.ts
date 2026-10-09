import { expect, it, vi } from "vitest";
import { configuredLocale } from "./locale";

it("uses the middleware locale and does not read root params", async () => {
  const readSegment = vi.fn();
  await expect(configuredLocale({ explicit: undefined, requestLocale: Promise.resolve("ar"), readSegment, readCookie: async () => "en" })).resolves.toBe("ar");
  expect(readSegment).not.toHaveBeenCalled();
});

it("still resolves a locale when root params throw inside a server action", async () => {
  const readSegment = vi.fn(async () => { throw new Error("`import('next/root-params').locale()` was used inside a Server Action."); });
  await expect(configuredLocale({ explicit: undefined, requestLocale: Promise.resolve(undefined), readSegment, readCookie: async () => "ar" })).resolves.toBe("ar");
});

it("falls back to the default locale when no request locale is available", async () => {
  const readSegment = vi.fn(async () => { throw new Error("used inside a Server Action"); });
  await expect(configuredLocale({ explicit: undefined, requestLocale: Promise.resolve(undefined), readSegment, readCookie: async () => undefined })).resolves.toBe("en");
});
