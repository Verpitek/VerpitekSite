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

import { registerRecipe } from "../recipeManager";

registerRecipe([
    {
        craftingTags: ["lunatech:compressor"],
        inputItem: {
            id: "minecraft:redstone",
            amount: 9
        },
        outputItem: {
            id: "lunatech:redstone_isotope_tier1",
            amount: 1
        }
    },
    // Rubber Related Recipes
    {
        craftingTags: ["lunatech:compressor"],
        inputItem: {
            id: "minecraft:resin_clump",
            amount: 1,
        },
        outputItem: {
            id: "lunatech:rubber",
            amount: 1
        }
    }
])