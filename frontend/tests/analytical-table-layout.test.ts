import { expect, it } from "vitest";
import { tablePinning } from "@/features/dashboard/analytical-table-layout";

it("reserves a full measure column and restores the requested pins when expanded", () => {
  expect(tablePinning(null, 3)).toEqual({ rowLevel: true, columns: 3 });
  expect(tablePinning(348, 3)).toEqual({ rowLevel: false, columns: 0 });
  expect(tablePinning(359, 3)).toEqual({ rowLevel: false, columns: 0 });
  expect(tablePinning(360, 3)).toEqual({ rowLevel: true, columns: 0 });
  expect(tablePinning(559, 3)).toEqual({ rowLevel: true, columns: 0 });
  expect(tablePinning(560, 3)).toEqual({ rowLevel: true, columns: 1 });
  expect(tablePinning(960, 3)).toEqual({ rowLevel: true, columns: 3 });
  expect(tablePinning(1400, 1)).toEqual({ rowLevel: true, columns: 1 });
  expect(tablePinning(1400, 0)).toEqual({ rowLevel: true, columns: 0 });
});
