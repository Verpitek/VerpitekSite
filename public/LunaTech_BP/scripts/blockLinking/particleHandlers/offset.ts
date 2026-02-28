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

import { Block, Vector3 } from "@minecraft/server";

const BLOCK_PART_OFFSETS: Record<string, Vector3> = {
    "lunatech:microcontroller": {
        x: 0,
        y: -0.5,
        z: 0,
    },
};

/**
 * Stores functions that can be used to get the offset for a given block
 */
const DYNAMIC_BLOCK_PART_OFFSETS: Record<string, (blk: Block, linkType: string) => Vector3 | undefined> = {
    "lunatech:item_extractor": itemExtractorOffset,
    "lunatech:item_reciever": itemRecieverOffset
}

export function getOffsetForId(id: string): Vector3 {
    const offset = BLOCK_PART_OFFSETS[id];

    if (offset === undefined) {
        return {
            x: 0,
            y: 0,
            z: 0
        }
    }

    return offset;
}

export function getOffsetForBlock(blk: Block, linkType: string) {
    const blkId = blk.typeId;

    // Check if there is a dynamic block part offset available for this block
    const dynOffsetFunc = DYNAMIC_BLOCK_PART_OFFSETS[blkId];

    if (dynOffsetFunc !== undefined) {
        const res = dynOffsetFunc(blk, linkType);

        if (res !== undefined) {
            return res;
        }
    }

    // Check if there is a static block offset that can be used instead
    let offset = BLOCK_PART_OFFSETS[blkId];

    if (offset === undefined) {
        return {
            x: 0,
            y: 0,
            z: 0
        };
    }

    // Return a Vec of all 0s as no custom offsets have been found

    return offset
}

// Functions used for dynamic offsets
function itemExtractorOffset(blk: Block, linkType: string) {
    const facingDirection = blk.permutation.getState("minecraft:block_face") as "up" | "down" | "north" | "south" | "east" | "west";

    const offset = {
        x: 0,
        y: 0,
        z: 0
    }

    /*
        Below we are checking which kind of link this offset is for.

        If it is an item related link, the offset is at the tip of the extractors model
        Everything else will have the offset be at the base of the extractor
     */
    if (linkType !== "lunatech:items.emitter") {
        // Provide an offset to the base of the extractor
        switch (facingDirection) {
            case "up":
                offset.y -= 0.5;
                break;
            case "down":
                offset.y += 0.5;
                break;
            case "north":
                offset.z += 0.5;
                break;
            case "south":
                offset.z -= 0.5;
                break;
            case "east":
                offset.x -= 0.5;
                break;
            case "west":
                offset.x += 0.5;
                break;
        }
    } else {
        // Provide an offset to the tip of the extractor
        switch (facingDirection) {
            case "up":
                offset.y += 0.4375;
                break;
            case "down":
                offset.y -= 0.4375;
                break;
            case "north":
                offset.z -= 0.4375;
                break;
            case "south":
                offset.z += 0.4375;
                break;
            case "east":
                offset.x += 0.4375;
                break;
            case "west":
                offset.x -= 0.4375;
                break;
        }
    }

    return offset;
}

function itemRecieverOffset(blk: Block) {
    const facingDirection = blk.permutation.getState("minecraft:block_face") as "up" | "down" | "north" | "south" | "east" | "west";

    const offset = {
        x: 0,
        y: 0,
        z: 0
    }

    switch (facingDirection) {
        case "up":
            offset.y -= 0.5;
            break;
        case "down":
            offset.y += 0.5;
            break;
        case "north":
            offset.z += 0.5;
            break;
        case "south":
            offset.z -= 0.5;
            break;
        case "east":
            offset.x -= 0.5;
            break;
        case "west":
            offset.x += 0.5;
            break;
    }

    return offset;
}