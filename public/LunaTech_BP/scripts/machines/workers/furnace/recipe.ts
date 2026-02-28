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

// Keyed by the ID of the input item, value is the ID of the output item

import { ContainerSlot, ItemStack } from "@minecraft/server";
import { VANILLA_RECIPES } from "./vanillaRecipes";

type RecipeItem = { item: string } | { tag: string };
type RecipeOutputItem = { item: string };

const RECIPE_STORAGE: Record<string, string> = {};

const RECIPE_TAG_STORAGE: Record<string, string> = {}

export function tryGetOutputForItem(slot: ContainerSlot): string | undefined {
    const itemId = slot.typeId;

    let outputItem = RECIPE_STORAGE[itemId];

    if (outputItem === undefined) {
        // Check for recipes through every tag on the item
        for (const tag of slot.getTags()) {
            outputItem = RECIPE_TAG_STORAGE[tag];
            if (outputItem !== undefined) {
                break;
            }
        }
    }

    return outputItem;
}

type Recipe = {
    input: RecipeItem,
    output: { item: string },
}

function loadRecipeList(recipes: Recipe[]) {
    for (const recipe of recipes) {
        if (recipe.input["item"] !== undefined) {
            RECIPE_STORAGE[recipe.input["item"]] = recipe.output.item
        } else if (recipe.input["tag"] !== undefined) {
            RECIPE_TAG_STORAGE[recipe.input["TAG"]] = recipe.output.item
        }
    }
}

export function findInputFromOutput(outputItem: ItemStack | ContainerSlot): { ids: string[], tags: string[] } {
    const itemId = outputItem.typeId;

    let ids: string[] = [];
    let tags: string[] = [];

    for (const [inputId, outputId] of Object.entries(RECIPE_STORAGE)) {
        if (outputId === itemId) {
            // Found
            ids.push(inputId);
        }
    }

    // Check based on tags
    for (const [inputTag, outputId] of Object.entries(RECIPE_TAG_STORAGE)) {
        if (outputId === itemId) {
            // Found
            tags.push(inputTag);
        }
    }

    return {
        ids,
        tags,
    }
}

// Load vanilla recipes
loadRecipeList(VANILLA_RECIPES);