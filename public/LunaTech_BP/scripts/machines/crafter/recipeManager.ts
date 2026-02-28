/**
 * ============================================================================
 * Copyright (c) 2026 Verpitek, MB. All rights reserved.
 *
 * This code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this material is strictly prohibited.
 *
 * Project: LunaTech Bedrock Add-On
 * ============================================================================
 */

export type LunaTechRecipeItem = {
    id: string,
    amount: number,
}

export type LunaTechRecipe = {
    inputItem: LunaTechRecipeItem,
    outputItem: LunaTechRecipeItem,
    craftingTags: string[],
}

const RECIPE_REGISTRY: Record<string, Record<string, LunaTechRecipe>> = {};

export function registerRecipe(recipes: LunaTechRecipe[]) {
    for (const recipe of recipes) {
        for (const tag of recipe.craftingTags) {
            let recipeReg = RECIPE_REGISTRY[tag];
            if (recipeReg === undefined) {
                recipeReg = { [recipe.inputItem.id]: recipe };
                RECIPE_REGISTRY[tag] = recipeReg;
            } else {
                recipeReg[recipe.inputItem.id] = recipe;
            }
        }
    }
}

export function getOutputForItem(itemId: string, craftingTag: string): LunaTechRecipe | undefined {
    const recipeGroup = RECIPE_REGISTRY[craftingTag];

    return recipeGroup[itemId];
}