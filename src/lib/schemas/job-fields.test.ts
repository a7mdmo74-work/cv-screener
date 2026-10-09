import { describe, expect, it } from "vitest";
import {
  GEOGRAPHIC_SCOPE_OPTIONS,
  selectOptions,
} from "@/lib/schemas/job-fields";

describe("selectOptions", () => {
  it("keeps the preset list when the current value is known", () => {
    expect(selectOptions(GEOGRAPHIC_SCOPE_OPTIONS, "Dubai")).toEqual([
      ...GEOGRAPHIC_SCOPE_OPTIONS,
    ]);
  });

  it("prepends a custom current value so clone still works", () => {
    expect(selectOptions(GEOGRAPHIC_SCOPE_OPTIONS, "Muscat")).toEqual([
      "Muscat",
      ...GEOGRAPHIC_SCOPE_OPTIONS,
    ]);
  });
});
