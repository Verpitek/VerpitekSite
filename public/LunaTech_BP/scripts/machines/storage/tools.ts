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
import { distanceBetween, MachineCustomComponent } from "../component";

export class StorageMachineTools {
    static isJunction(blk: Block) {
        return blk.hasTag("lunatech:items.junction");
    }

    static resolveRecieverFromLinkedBlock(blk: Block): { reciever?: Block, distanceTravelled: number } {
        if (blk.hasTag("lunatech:items.reciever")) {
            return { reciever: blk, distanceTravelled: 0 };
        }

        if (!blk.hasTag("lunatech:items.junction")) {
            throw new Error("Reciever can't be resolved from pro vided block");
        }

        // Block is a junction, jump through linked blocks until a reciever is found
        let currentJunction = blk;
        let distanceTravelled = 0;

        let visitedJunctions: Record<number, Record<number, Record<number, boolean>>> = {};

        while (true) {
            // Grab blocks linked to junction
            const attachedBlocks = MachineCustomComponent.getLoadedLinkedBlocks(currentJunction, "lunatech:items.junction", true);

            if (attachedBlocks.length > 1) {
                throw new Error("More than 1 junction linked to a single junction");
            }

            const nextTarget = attachedBlocks[0];
            if (nextTarget === undefined) {
                // Unfinished junction chain
                return { distanceTravelled: 0 };
            }

            // Check if the next location is within the list of visited junctions
            const nextLoc = nextTarget.location;
            if (checkIfInLoop(nextLoc, visitedJunctions)) {
                return { distanceTravelled: 0 };
            }

            distanceTravelled += distanceBetween(currentJunction.location, nextTarget.location);

            if (nextTarget.hasTag("lunatech:items.reciever")) {
                // Found the reciever
                return { reciever: nextTarget, distanceTravelled: distanceTravelled };
            }

            // Store data about new current
            currentJunction = nextTarget;
        }
    }
}

function checkIfInLoop(current: Vector3, visited: Record<number, Record<number, Record<number, boolean>>>) {
    const visitedOnX = visited[current.x];

    if (visitedOnX === undefined) {
        // Register as visted
        visited[current.x] = {
            [current.y]: {
                [current.z]: true
            }
        };

        return false;
    }

    const visitedOnY = visited[current.y];

    if (visitedOnY === undefined) {
        // Register as visted
        visited[current.x][current.y] = {
            [current.z]: true
        }

        return false;
    }

    if (visitedOnY[current.z] === undefined) {
        // Register as visted
        visited[current.x][current.y][current.z] = true;

        return false;
    }

    return true;
}