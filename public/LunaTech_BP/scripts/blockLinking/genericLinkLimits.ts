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

// (source: Block, target: Block) => boolean

import { Block } from "@minecraft/server";

export function limitLinkLocationsForQuarryBaseBlocks(source: Block, target: Block): boolean {
    const sourceLocation = source.location;
    const targetLocation = target.location;

    // Ensure Y level is equal for both
    if (sourceLocation.y !== targetLocation.y) {
        return false;
    }

    // Ensure X OR Z level is equal
    if (
        sourceLocation.x !== targetLocation.x &&
        sourceLocation.z !== targetLocation.z
    ) {
        return false;
    }

    // TODO: Check links on source/target to ensure specific direction is allowed
    return true;
}