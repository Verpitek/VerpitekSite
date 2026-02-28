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

interface LinkLimiterConstructorData {
    maxLink?: number | ((blk: Block) => number)
    customTests?: ((source: Block, target: Block) => boolean)[]
}

/**
 * A class that represents limits placed on a Link Type.
 * 
 * Unlike its parent "BlockTagLink", it does tests based on the specific block instance being tested against.
 * 
 * It provides:
 * - Dynamic control over the maximum number of links a block is able to have 
 * - Ability to register custom tests that must pass before `BlockTagLink.canLink` succeeds.
 * 
 * Limiter tests are applied against the source block as its the one storing the downstream link
 */
export class LinkLimiter {
    private maxLinkCount: number = -1;

    private customTests: ((source: Block, target: Block) => boolean)[];

    constructor(data: LinkLimiterConstructorData) {
        if (data.maxLink !== undefined) {
            if (typeof data.maxLink === "number") {
                // Static value
                this.maxLinkCount = data.maxLink;
            } else {
                // Dynamic value
                this.getMaxLinkCount = data.maxLink;
            }
        }

        if (data.customTests !== undefined && data.customTests.length > 0) {
            this.customTests = data.customTests

            this.tryCustomTests = (source: Block, target: Block) => {
                for (const test of this.customTests) {
                    const res = test(source, target);

                    if (!res) {
                        return false;
                    }
                }

                return true;
            }
        }
    }

    /**
     * Returns the number of links the provided block is allowed to have in the BlockTagLink this limiter is associated with. 
     * Returns -1 if there is no limit
     */
    getMaxLinkCount(blk: Block) {
        // Default Implementation, can be replaced
        return this.maxLinkCount;
    }

    /**
     * Returns true if the custom test passes
     */
    tryCustomTests(source: Block, target: Block) {
        // Default Implementation, may be replaced if customTests are provided
        return true;
    }
}