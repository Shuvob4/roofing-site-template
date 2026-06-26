/**
 * Module Filter Utility
 *
 * Pure TypeScript utility for filtering navigation items and determining
 * module visibility based on boolean flags. No side effects, no Astro imports.
 *
 * Validates: Requirements 1.8, 15.7, 15.8, 16.6, 16.7, 17.5, 17.6,
 *            18.6, 18.7, 19.6, 19.7, 20.5, 20.6, 21.6, 21.7, 22.5, 22.6,
 *            23.6, 23.7
 */

export interface NavItem {
  moduleName: string; // matches key in ModuleFlags
  label: string;
  href: string;
  order: number;
}

export interface ModuleFlags {
  stormDamage: boolean;
  financing: boolean;
  warranty: boolean;
  maintenance: boolean;
  insuranceClaims: boolean;
  assessment: boolean;
  materials: boolean;
  energyEfficiency: boolean;
  neighborhoods: boolean;
  [key: string]: boolean; // allow arbitrary module names
}

/**
 * Returns true if the flag exists and is true.
 * Returns false if the flag doesn't exist or is false.
 */
export function isModuleEnabled(moduleName: string, flags: ModuleFlags): boolean {
  return flags[moduleName] === true;
}

/**
 * Returns array of module names where flag is true, sorted alphabetically.
 */
export function getEnabledModules(flags: ModuleFlags): string[] {
  return Object.entries(flags)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .sort();
}

/**
 * Returns only NavItems whose corresponding module flag is true.
 * Items where moduleName doesn't exist in flags are EXCLUDED
 * (conservative — only show explicitly enabled).
 * Sorted by order field ascending.
 */
export function getNavItems(flags: ModuleFlags, allNavItems: NavItem[]): NavItem[] {
  return allNavItems
    .filter((item) => isModuleEnabled(item.moduleName, flags))
    .sort((a, b) => a.order - b.order);
}
