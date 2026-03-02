/**
 * Search utilities for wiki items and blocks
 */

export interface SearchableItem {
  identifier: string;
  name: string;
  description: string;
  type: 'item' | 'block';
}

export interface SearchResult extends SearchableItem {
  relevance: number;
  matchedFields: string[];
}

/**
 * Index a searchable item for fast lookups
 */
function indexItem(item: SearchableItem): Record<string, string> {
  return {
    identifier: item.identifier.toLowerCase(),
    name: item.name.toLowerCase(),
    description: item.description.toLowerCase(),
  };
}

/**
 * Calculate relevance score for a search result
 * Higher scores = better matches
 */
function calculateRelevance(
  query: string,
  indexed: Record<string, string>,
  matchedFields: string[]
): number {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Exact name match gets highest priority
  if (indexed.name === queryLower) {
    score += 100;
  }
  // Name contains query gets high priority
  else if (indexed.name.includes(queryLower)) {
    score += 50;
  }

  // Identifier matches
  if (indexed.identifier.includes(queryLower)) {
    score += 30;
  }

  // Description matches (lower priority)
  if (indexed.description.includes(queryLower)) {
    score += 10;
  }

  // Word-based matching in name (for partial matches)
  const words = indexed.name.split(/\s+/);
  const matchingWords = words.filter((word) => word.includes(queryLower)).length;
  score += matchingWords * 5;

  return score;
}

/**
 * Search through items and blocks
 */
export function search(
  query: string,
  items: any[],
  blocks: any[]
): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const allItems: SearchableItem[] = [
    ...items.map((item) => ({
      identifier: item.identifier,
      name: item.name,
      description: item.description,
      type: 'item' as const,
    })),
    ...blocks.map((block) => ({
      identifier: block.identifier,
      name: block.name,
      description: block.description,
      type: 'block' as const,
    })),
  ];

  const results: SearchResult[] = [];

  for (const item of allItems) {
    const indexed = indexItem(item);
    const matchedFields: string[] = [];

    // Check which fields match
    if (indexed.name.includes(query.toLowerCase())) {
      matchedFields.push('name');
    }
    if (indexed.identifier.includes(query.toLowerCase())) {
      matchedFields.push('identifier');
    }
    if (indexed.description.includes(query.toLowerCase())) {
      matchedFields.push('description');
    }

    // Only include if there's a match
    if (matchedFields.length > 0) {
      const relevance = calculateRelevance(query, indexed, matchedFields);
      results.push({
        ...item,
        relevance,
        matchedFields,
      });
    }
  }

  // Sort by relevance (highest first)
  results.sort((a, b) => b.relevance - a.relevance);

  return results;
}

/**
 * Get filter by category
 */
export function getCategoryFromIdentifier(identifier: string): string {
  const parts = identifier.split(':');
  if (parts.length > 1) {
    const categoryPart = parts[1];
    // Extract category from identifier like "lunatech:raw_copper_powder"
    if (categoryPart.includes('_')) {
      const category = categoryPart.split('_')[0];
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  return 'Other';
}
