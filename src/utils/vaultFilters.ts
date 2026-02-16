import type { VaultItem } from '../../shared/types/vault';
import { fuzzyMatch, fuzzyMatchAny } from './fuzzySearch';

export type VaultSortField = 'title' | 'updatedAt' | 'riskLevel';
export type VaultSortDirection = 'asc' | 'desc';

export interface VaultFilters {
  searchQuery: string;
  category: string | null;
  tags: string[];
  hasAttachments: boolean | null;
  hasUnusedCodes: boolean | null;
  sortBy: VaultSortField;
  sortDir: VaultSortDirection;
}

export const DEFAULT_FILTERS: VaultFilters = {
  searchQuery: '',
  category: null,
  tags: [],
  hasAttachments: null,
  hasUnusedCodes: null,
  sortBy: 'updatedAt',
  sortDir: 'desc',
};

export function filterVaultItems(items: VaultItem[], filters: VaultFilters): VaultItem[] {
  let result = [...items];

  // Fuzzy search on title, domain, tags, usernames
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim();
    result = result.filter((item) => {
      const haystack = [
        item.title,
        item.domain,
        ...(item.tags ?? []),
        ...(item.usernames ?? []),
        item.category,
      ];
      return fuzzyMatchAny(q, haystack) >= 0;
    });
  }

  // Category filter
  if (filters.category) {
    result = result.filter((item) => item.category === filters.category);
  }

  // Tags filter (item must have ALL selected tags)
  if (filters.tags.length > 0) {
    const tagSet = new Set(filters.tags);
    result = result.filter((item) => {
      const itemTags = new Set(item.tags ?? []);
      return filters.tags.every((t) => itemTags.has(t));
    });
  }

  // Has attachments
  if (filters.hasAttachments === true) {
    result = result.filter((item) => (item.attachments?.length ?? 0) > 0);
  } else if (filters.hasAttachments === false) {
    result = result.filter((item) => (item.attachments?.length ?? 0) === 0);
  }

  // Has unused recovery codes
  if (filters.hasUnusedCodes === true) {
    result = result.filter((item) => {
      const codes = item.recoveryCodes ?? [];
      return codes.some((c) => c.status === 'unused');
    });
  } else if (filters.hasUnusedCodes === false) {
    result = result.filter((item) => {
      const codes = item.recoveryCodes ?? [];
      return !codes.some((c) => c.status === 'unused');
    });
  }

  // Sort
  result.sort((a, b) => {
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    switch (filters.sortBy) {
      case 'title':
        return dir * (a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      case 'updatedAt':
        return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      case 'riskLevel': {
        const order = { high: 3, medium: 2, low: 1 };
        const aVal = a.riskLevel ? order[a.riskLevel] ?? 0 : 0;
        const bVal = b.riskLevel ? order[b.riskLevel] ?? 0 : 0;
        if (aVal !== bVal) return dir * (aVal - bVal);
        return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      }
      default:
        return 0;
    }
  });

  return result;
}

/** Extract all unique tags from items */
export function extractAllTags(items: VaultItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const t of item.tags ?? []) {
      if (t?.trim()) set.add(t.trim());
    }
  }
  return Array.from(set).sort();
}
