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

import { Block } from "@minecraft/server";
import { redstoneTools } from "../redstone";

// Redstone Dust
redstoneTools.registerRedPowerGet("minecraft:redstone_wire",
    (blk: Block) => {
        const permutation = blk.permutation;
        return permutation.getState("redstone_signal");
    }
)

// Redstone Block
redstoneTools.registerRedPowerGet("minecraft:redstone_block",
    () => {
        return 15;
    }
)

// Redstone Torch
redstoneTools.registerRedPowerGet("minecraft:redstone_torch",
    () => {
        return 15;
    }
)