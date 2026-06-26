/**
 * Navigation Utility
 *
 * Loads nav config from the content collection and filters module-controlled
 * items based on enabled module flags. All navigation components use this
 * single source of truth — no hardcoded nav arrays in components.
 *
 * Validates: Config-driven navigation requirement
 */
import { getEntry } from 'astro:content';
import { getNavItems, type ModuleFlags, type NavItem } from './module-filter';

export interface CoreNavItem {
  label: string;
  href: string;
  order: number;
}

export interface NavigationData {
  /** Core nav items (always visible) */
  core: CoreNavItem[];
  /** CTA items (styled as buttons in header, links in mobile) */
  cta: CoreNavItem[];
  /** Module nav items that are currently enabled */
  modules: CoreNavItem[];
  /** Combined: core + enabled modules, sorted by order */
  all: CoreNavItem[];
}

/**
 * Loads navigation data from the nav content collection and filters
 * module items based on the modules content collection flags.
 */
export async function getNavigation(): Promise<NavigationData> {
  const navEntry = await getEntry('nav', 'nav');
  const modulesEntry = await getEntry('modules', 'modules');

  const navConfig = navEntry!.data;
  const moduleFlags = modulesEntry!.data as ModuleFlags;

  // Filter module nav items based on enabled flags
  const moduleNavItems = navConfig.modules as NavItem[];
  const enabledModuleItems = getNavItems(moduleFlags, moduleNavItems);

  // Convert to CoreNavItem format
  const enabledModuleNavItems: CoreNavItem[] = enabledModuleItems.map((item) => ({
    label: item.label,
    href: item.href,
    order: item.order,
  }));

  const core = [...navConfig.core].sort((a, b) => a.order - b.order);
  const cta = [...(navConfig.cta || [])].sort((a, b) => a.order - b.order);

  // Combined: core + enabled modules, all sorted by order
  const all = [...core, ...enabledModuleNavItems].sort((a, b) => a.order - b.order);

  return { core, cta, modules: enabledModuleNavItems, all };
}
