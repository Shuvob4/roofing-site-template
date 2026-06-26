import { describe, it, expect } from 'vitest';
import {
  isModuleEnabled,
  getEnabledModules,
  getNavItems,
  type ModuleFlags,
  type NavItem,
} from '@utils/module-filter';

const baseFlags: ModuleFlags = {
  stormDamage: true,
  financing: true,
  warranty: true,
  maintenance: false,
  insuranceClaims: true,
  assessment: true,
  materials: false,
  energyEfficiency: false,
  neighborhoods: false,
};

describe('isModuleEnabled', () => {
  it('returns true for an enabled module', () => {
    expect(isModuleEnabled('stormDamage', baseFlags)).toBe(true);
  });

  it('returns false for a disabled module', () => {
    expect(isModuleEnabled('maintenance', baseFlags)).toBe(false);
  });

  it('returns false for a module name not present in flags', () => {
    expect(isModuleEnabled('nonExistent', baseFlags)).toBe(false);
  });

  it('returns false for empty string module name', () => {
    expect(isModuleEnabled('', baseFlags)).toBe(false);
  });
});

describe('getEnabledModules', () => {
  it('returns only enabled module names', () => {
    const result = getEnabledModules(baseFlags);
    expect(result).toEqual(['assessment', 'financing', 'insuranceClaims', 'stormDamage', 'warranty']);
  });

  it('returns results sorted alphabetically', () => {
    const result = getEnabledModules(baseFlags);
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });

  it('returns empty array when all modules are disabled', () => {
    const allDisabled: ModuleFlags = {
      stormDamage: false,
      financing: false,
      warranty: false,
      maintenance: false,
      insuranceClaims: false,
      assessment: false,
      materials: false,
      energyEfficiency: false,
      neighborhoods: false,
    };
    expect(getEnabledModules(allDisabled)).toEqual([]);
  });

  it('returns all module names when all are enabled', () => {
    const allEnabled: ModuleFlags = {
      stormDamage: true,
      financing: true,
      warranty: true,
      maintenance: true,
      insuranceClaims: true,
      assessment: true,
      materials: true,
      energyEfficiency: true,
      neighborhoods: true,
    };
    const result = getEnabledModules(allEnabled);
    expect(result).toHaveLength(9);
  });

  it('handles flags with arbitrary extra keys', () => {
    const flags: ModuleFlags = {
      ...baseFlags,
      customModule: true,
    };
    const result = getEnabledModules(flags);
    expect(result).toContain('customModule');
  });
});

describe('getNavItems', () => {
  const allNavItems: NavItem[] = [
    { moduleName: 'stormDamage', label: 'Storm Damage', href: '/storm-damage', order: 3 },
    { moduleName: 'financing', label: 'Financing', href: '/financing', order: 2 },
    { moduleName: 'warranty', label: 'Warranty', href: '/warranty', order: 1 },
    { moduleName: 'maintenance', label: 'Maintenance', href: '/maintenance', order: 4 },
    { moduleName: 'materials', label: 'Materials', href: '/materials', order: 5 },
  ];

  it('returns only items whose module is enabled', () => {
    const result = getNavItems(baseFlags, allNavItems);
    const moduleNames = result.map((item) => item.moduleName);
    expect(moduleNames).toContain('stormDamage');
    expect(moduleNames).toContain('financing');
    expect(moduleNames).toContain('warranty');
    expect(moduleNames).not.toContain('maintenance');
    expect(moduleNames).not.toContain('materials');
  });

  it('sorts results by order field ascending', () => {
    const result = getNavItems(baseFlags, allNavItems);
    const orders = result.map((item) => item.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('returns items in correct order', () => {
    const result = getNavItems(baseFlags, allNavItems);
    expect(result[0].moduleName).toBe('warranty'); // order: 1
    expect(result[1].moduleName).toBe('financing'); // order: 2
    expect(result[2].moduleName).toBe('stormDamage'); // order: 3
  });

  it('returns empty array when no modules are enabled', () => {
    const allDisabled: ModuleFlags = {
      stormDamage: false,
      financing: false,
      warranty: false,
      maintenance: false,
      insuranceClaims: false,
      assessment: false,
      materials: false,
      energyEfficiency: false,
      neighborhoods: false,
    };
    expect(getNavItems(allDisabled, allNavItems)).toEqual([]);
  });

  it('returns empty array when nav items list is empty', () => {
    expect(getNavItems(baseFlags, [])).toEqual([]);
  });

  it('excludes items whose moduleName is not present in flags (conservative)', () => {
    const limitedFlags: ModuleFlags = {
      stormDamage: true,
      financing: false,
      warranty: false,
      maintenance: false,
      insuranceClaims: false,
      assessment: false,
      materials: false,
      energyEfficiency: false,
      neighborhoods: false,
    };
    const navWithUnknown: NavItem[] = [
      { moduleName: 'stormDamage', label: 'Storm Damage', href: '/storm-damage', order: 1 },
      { moduleName: 'unknownModule', label: 'Unknown', href: '/unknown', order: 2 },
    ];
    const result = getNavItems(limitedFlags, navWithUnknown);
    expect(result).toHaveLength(1);
    expect(result[0].moduleName).toBe('stormDamage');
  });

  it('handles duplicate order values stably', () => {
    const navWithDuplicateOrders: NavItem[] = [
      { moduleName: 'stormDamage', label: 'Storm Damage', href: '/storm-damage', order: 1 },
      { moduleName: 'financing', label: 'Financing', href: '/financing', order: 1 },
    ];
    const result = getNavItems(baseFlags, navWithDuplicateOrders);
    expect(result).toHaveLength(2);
    // Both should be present with order 1
    expect(result.every((item) => item.order === 1)).toBe(true);
  });
});
