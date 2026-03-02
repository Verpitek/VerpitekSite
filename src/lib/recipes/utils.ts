/**
 * Recipe Utilities - Helper functions for recipe rendering
 */

import type { RecipeItem } from "./types";

/**
 * Mapping of item identifiers to their texture file names
 * Some items have different internal names than their texture file names
 */
const TEXTURE_NAME_MAP: Record<string, string> = {
  "minecraft:redstone": "redstone_dust",
  "minecraft:glass": "glass_block",
  "minecraft:glass_pane": "glass_pane",
  "copper_ingot": "copper_ingot", // LunaTech addon items
};

/**
 * Get texture path for an item identifier from items and blocks
 * Falls back to vanilla item textures from items/ directory
 * Note: Paths should NOT include leading slash as ItemIcon adds it
 */
export function getTexturePath(
  identifier: string,
  items: RecipeItem[],
  blocks?: RecipeItem[]
): string | null {
  const item = items.find((item) => item.identifier === identifier);
  if (item) return item.texturePath;

  if (blocks) {
    const block = blocks.find((block) => block.identifier === identifier);
    if (block) return block.texturePath;
  }

  // Fallback to vanilla item texture
  // Check if there's a custom mapping for this identifier
  if (TEXTURE_NAME_MAP[identifier]) {
    return `items/${TEXTURE_NAME_MAP[identifier]}.png`;
  }

  // Extract item name from identifier (e.g., "minecraft:iron_ingot" -> "iron_ingot")
  const itemName = identifier.includes(":") ? identifier.split(":")[1] : identifier;
  return `items/${itemName}.png`;
}

/**
 * Get display name for an item identifier
 */
export function getItemName(
  identifier: string,
  items: RecipeItem[],
  blocks?: RecipeItem[]
): string {
  const item = items.find((item) => item.identifier === identifier);
  if (item) return item.name;

  if (blocks) {
    const block = blocks.find((block) => block.identifier === identifier);
    if (block) return block.name;
  }

  // Fallback: extract name from identifier and format it nicely
  const itemName = identifier.split(":")[1] || identifier;
  // Convert snake_case to Title Case (e.g., "iron_ingot" -> "Iron Ingot")
  return itemName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Normalize result to array format
 */
export function normalizeResult(
  result:
    | { item: string; count?: number }
    | Array<{ item: string; count?: number }>
    | string
): Array<{ item: string; count: number }> {
  if (typeof result === "string") {
    return [{ item: result, count: 1 }];
  }

  if (Array.isArray(result)) {
    return result.map((r) => ({
      item: r.item,
      count: r.count || 1,
    }));
  }

  return [
    {
      item: result.item,
      count: result.count || 1,
    },
  ];
}

/**
 * Parse item identifier string
 */
export function parseItemIdentifier(id: string): string {
  return id.split(":")[1] || id;
}
