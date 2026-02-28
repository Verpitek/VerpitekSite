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

import { MolangVariableMap, system, type Vector3, world } from "@minecraft/server";
import { registerScriptEvent, registerWorldLoadEvent } from "../events";
import { type UUID, generateUUID } from "../tools/uuid";

interface LineData {
    dimId: string,
    width: number,
    location: Vector3,
    offsetPos: Vector3,
    persistent: boolean,
}

const LINE_STORAGE: Record<UUID, LineData> = {};

/**
 * Registers a new line for drawing between the two provided points.
 * 
 * Returns an ID that can be used to manage this line
 */
function makePeristentLine(startPos: Vector3, targetPos: Vector3, width: number): UUID {
    const id = generateUUID();

    LINE_STORAGE[id] = {
        dimId: "overworld",
        width,
        location: startPos,
        persistent: true,
        offsetPos: {
            x: targetPos.x - startPos.x,
            y: targetPos.y - startPos.y,
            z: targetPos.z - startPos.z,
        }
    }

    return id;
}

export function makeLine(startPos: Vector3, targetPos: Vector3, dimId: string, width: number) {
    // Spawn particle at location in dimension
    const dim = world.getDimension(dimId);
    if (dim === undefined) {
        throw new Error("Invalid dimension");
    }

    const oX = targetPos.x - startPos.x;
    const oY = targetPos.y - startPos.y;
    const oZ = targetPos.z - startPos.z;

    const varMap = new MolangVariableMap();
    varMap.setFloat("dir_x", oX);
    varMap.setFloat("dir_y", oY);
    varMap.setFloat("dir_z", oZ);
    varMap.setFloat("width", width);

    // Spawn particle
    dim.spawnParticle("lunatech:energy_line", startPos, varMap);
}

function removeLine(id: UUID) {
    delete LINE_STORAGE[id];
}

export function startInterval() {
    // TODO: Proper runJobed system based on time interval
    system.runInterval(() => {
        drawLines();
    })
}

function drawLines() {
    for (const line of Object.values(LINE_STORAGE)) {
        if (!line.persistent) {
            continue;
        }

        // Spawn particle at location in dimension
        const dim = world.getDimension(line.dimId);
        if (dim === undefined) {
            // Line is unloaded
            continue;
        }

        const varMap = new MolangVariableMap();
        varMap.setFloat("dir_x", line.offsetPos.x);
        varMap.setFloat("dir_y", line.offsetPos.y);
        varMap.setFloat("dir_z", line.offsetPos.z);

        // Spawn particle
        dim.spawnParticle("lunatech:energy_line", line.location, varMap);
    }
}

registerWorldLoadEvent(() => {
    startInterval();
})