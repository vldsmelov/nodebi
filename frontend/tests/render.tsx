import { render as testingRender } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";

/** Existing behavior scenarios explicitly use English; locale scenarios exercise the Russian default. */
export const render = (ui: ReactNode) => testingRender(ui, {
  wrapper: ({ children }) => <I18nProvider initialLocale="en">{children}</I18nProvider>,
});
