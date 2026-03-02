/**
 * Recipe Parsers - Parse raw JSON recipe files into typed format
 */

import type { Recipe, ShapedRecipe, ShapelessRecipe, FurnaceRecipe } from "./types";

export function parseRecipeJSON(rawRecipe: Record<string, any>): Recipe | null {
  // Check for shaped recipe
  if (rawRecipe["minecraft:recipe_shaped"]) {
    return parseShaped(rawRecipe["minecraft:recipe_shaped"]);
  }

  // Check for shapeless recipe
  if (rawRecipe["minecraft:recipe_shapeless"]) {
    return parseShapeless(rawRecipe["minecraft:recipe_shapeless"]);
  }

  // Check for furnace recipe
  if (rawRecipe["minecraft:recipe_furnace"]) {
    return parseFurnace(rawRecipe["minecraft:recipe_furnace"]);
  }

  return null;
}

function parseShaped(recipe: any): ShapedRecipe {
  return {
    type: "shaped",
    pattern: recipe.pattern || [],
    key: recipe.key || {},
    result: recipe.result || { item: "" },
  };
}

function parseShapeless(recipe: any): ShapelessRecipe {
  return {
    type: "shapeless",
    ingredients: recipe.ingredients || [],
    result: recipe.result || { item: "" },
  };
}

function parseFurnace(recipe: any): FurnaceRecipe {
  return {
    type: "furnace",
    input: recipe.input || "",
    output: recipe.output || "",
  };
}
