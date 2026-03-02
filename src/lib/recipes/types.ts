/**
 * Recipe Types - Minecraft recipe format definitions
 */

export type RecipeType = "shaped" | "shapeless" | "furnace";

export interface RecipeItem {
  identifier: string;
  texturePath: string | null;
  name: string;
}

export interface ShapedRecipe {
  type: "shaped";
  pattern: string[];
  key: Record<string, { item: string }>;
  result: {
    item: string;
    count?: number;
  } | Array<{ item: string; count?: number }>;
}

export interface ShapelessRecipe {
  type: "shapeless";
  ingredients: Array<{ item: string }>;
  result: {
    item: string;
    count?: number;
  } | Array<{ item: string; count?: number }>;
}

export interface FurnaceRecipe {
  type: "furnace";
  input: string;
  output: string;
}

export type Recipe = ShapedRecipe | ShapelessRecipe | FurnaceRecipe;

export interface RecipeRenderProps {
  recipe: Recipe;
  items: RecipeItem[];
  blocks?: RecipeItem[];
}
