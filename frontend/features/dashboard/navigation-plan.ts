import type { Dashboard, DashboardParameter, NavigationAction, NavigationValue } from "./api";
import { checkedValue } from "./view-state";

export type NavigationField = { column_id: string; display_name: string; engine_name?: string; logical_type?: string };
export const compatibleNavigationType = (source: string | undefined, target: string) => source === target || source === "integer" && target === "float";

export function suggestNavigation(action: NavigationAction, target: Dashboard, parameters: DashboardParameter[], fields: NavigationField[]): NavigationAction {
  const values = { ...action.values };
  for (const definition of target.configuration?.parameters ?? []) {
    if (values[definition.name]) continue;
    const candidates: NavigationValue[] = [
      ...parameters.filter(item => item.name === definition.name && compatibleNavigationType(item.logical_type, definition.logical_type)).map(item => ({ source: "parameter" as const, name: item.name })),
      ...fields.filter(item => [item.column_id, item.engine_name, item.display_name].includes(definition.name) && compatibleNavigationType(item.logical_type, definition.logical_type)).map(item => ({ source: "field" as const, name: item.column_id })),
    ];
    if (candidates.length === 1) values[definition.name] = candidates[0];
  }
  return { ...action, values };
}

export function navigationIssues(action: NavigationAction | null, target: Dashboard | undefined, parameters: DashboardParameter[], fields: NavigationField[]) {
  if (!action) return [];
  if (!target) return [{ parameter: "", message: "The navigation dashboard is unavailable." }];
  const definitions = target.configuration?.parameters ?? [];
  const issues = Object.keys(action.values ?? {}).filter(name => !definitions.some(item => item.name === name)).map(parameter => ({ parameter, message: "An undeclared dashboard parameter was supplied." }));
  for (const definition of definitions) {
    const value = action.values?.[definition.name];
    let message = "";
    if (!value || value.source === "constant") {
      try {
        const checked = checkedValue(definition, value ? value.value : definition.default);
        if (definition.required && checked === null) message = "Choose a value for this required destination parameter.";
      } catch { message = "The mapped value has an incompatible type."; }
    } else {
      const source = value.source === "field" ? fields.find(item => item.column_id === value.name) : parameters.find(item => item.name === value.name);
      if (!source) message = "The navigation field or parameter is unavailable.";
      else if (!compatibleNavigationType(source.logical_type, definition.logical_type)) message = "The mapped value has an incompatible type.";
    }
    if (message) issues.push({ parameter: definition.label || definition.name, message });
  }
  return issues;
}
