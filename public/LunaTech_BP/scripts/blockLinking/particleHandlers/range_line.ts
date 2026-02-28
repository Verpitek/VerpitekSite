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

import { Dimension, MolangVariableMap, Player, Vector3 } from "@minecraft/server";

export function drawBoxAroundBlock(player: Player, location: Vector3, particle: string) {
    /**
 * To create a cube out of lines there needs to be a total of 12 particles spawned
 */

    const LINE_LENGTH = 1;
    const range = 0.5;

    // Creating the variable maps used for the 12 lines of the box

    // Math.ceil any addition, Math.floor and subtraction

    // Lines in -X, -Z, and -Y
    const origin0 = {
        x: Math.ceil(location.x + range),
        y: Math.ceil(location.y + range),
        z: Math.ceil(location.z + range),
    }

    let MOD_LINE_LENGTH = LINE_LENGTH;
    if (Math.floor(location.y - range) < -64) {
        MOD_LINE_LENGTH = LINE_LENGTH - (-64 - Math.floor(location.y - range));
    }

    // Origin 0 -X Line
    const o0LineXVMap = new MolangVariableMap();
    o0LineXVMap.setFloat("dir_x", 0 - LINE_LENGTH);
    o0LineXVMap.setFloat("dir_y", 0);
    o0LineXVMap.setFloat("dir_z", 0);
    o0LineXVMap.setFloat("width", 0.05);

    // Origin 0 -Z Line
    const o0LineZVMap = new MolangVariableMap();
    o0LineZVMap.setFloat("dir_x", 0);
    o0LineZVMap.setFloat("dir_y", 0);
    o0LineZVMap.setFloat("dir_z", 0 - LINE_LENGTH);
    o0LineZVMap.setFloat("width", 0.05);

    // Origin 0 -Y Line
    const o0LineYVMap = new MolangVariableMap();
    o0LineYVMap.setFloat("dir_x", 0);
    o0LineYVMap.setFloat("dir_y", 0 - MOD_LINE_LENGTH);
    o0LineYVMap.setFloat("dir_z", 0);
    o0LineYVMap.setFloat("width", 0.05);

    // Lines in -X and -Y
    const origin1 = {
        x: Math.ceil(location.x + range),
        y: Math.ceil(location.y + range),
        z: Math.floor(location.z - range),
    }

    // Origin 1 -X Line
    const o1LineXVMap = new MolangVariableMap();
    o1LineXVMap.setFloat("dir_x", 0 - LINE_LENGTH);
    o1LineXVMap.setFloat("dir_y", 0);
    o1LineXVMap.setFloat("dir_z", 0);
    o1LineXVMap.setFloat("width", 0.05);

    // Origin 1 -Y Line
    const o1LineYVMap = new MolangVariableMap();
    o1LineYVMap.setFloat("dir_x", 0);
    o1LineYVMap.setFloat("dir_y", 0 - MOD_LINE_LENGTH);
    o1LineYVMap.setFloat("dir_z", 0);
    o1LineYVMap.setFloat("width", 0.05);

    // Lines in -Z and -Y
    const origin2 = {
        x: Math.floor(location.x - range),
        y: Math.ceil(location.y + range),
        z: Math.ceil(location.z + range),
    }

    // Origin 2 -Z Line
    const o2LineZVMap = new MolangVariableMap();
    o2LineZVMap.setFloat("dir_x", 0);
    o2LineZVMap.setFloat("dir_y", 0);
    o2LineZVMap.setFloat("dir_z", 0 - LINE_LENGTH);
    o2LineZVMap.setFloat("width", 0.05);

    // Origin 2 -Y Line
    const o2LineYVMap = new MolangVariableMap();
    o2LineYVMap.setFloat("dir_x", 0);
    o2LineYVMap.setFloat("dir_y", 0 - MOD_LINE_LENGTH);
    o2LineYVMap.setFloat("dir_z", 0);
    o2LineYVMap.setFloat("width", 0.05);

    // Lines in -X and -Zs
    const origin3 = {
        x: Math.ceil(location.x + range),
        y: Math.floor(location.y - range),
        z: Math.ceil(location.z + range),
    }

    if (MOD_LINE_LENGTH !== LINE_LENGTH) {
        origin3.y = -64;
    }

    // If the Y of this origin is below the world limit, modify the LINE_LENGTH and origin value

    // Origin 3 -X Line
    const o3LineXVMap = new MolangVariableMap();
    o3LineXVMap.setFloat("dir_x", 0 - LINE_LENGTH);
    o3LineXVMap.setFloat("dir_y", 0);
    o3LineXVMap.setFloat("dir_z", 0);
    o3LineXVMap.setFloat("width", 0.05);

    // Origin 3 -Z Line
    const o3LineZVMap = new MolangVariableMap();
    o3LineZVMap.setFloat("dir_x", 0);
    o3LineZVMap.setFloat("dir_y", 0);
    o3LineZVMap.setFloat("dir_z", 0 - LINE_LENGTH);
    o3LineZVMap.setFloat("width", 0.05);

    // Lines in +X, +Z, and +Y
    const origin4 = {
        x: Math.floor(location.x - range),
        y: origin3.y,
        z: Math.floor(location.z - range),
    }

    // Origin 4 +X Line
    const o4LineXVMap = new MolangVariableMap();
    o4LineXVMap.setFloat("dir_x", LINE_LENGTH);
    o4LineXVMap.setFloat("dir_y", 0);
    o4LineXVMap.setFloat("dir_z", 0);
    o4LineXVMap.setFloat("width", 0.05);

    // Origin 4 +Z Line
    const o4LineZVMap = new MolangVariableMap();
    o4LineZVMap.setFloat("dir_x", 0);
    o4LineZVMap.setFloat("dir_y", 0);
    o4LineZVMap.setFloat("dir_z", LINE_LENGTH);
    o4LineZVMap.setFloat("width", 0.05);

    // Origin 4 +Y Line
    const o4LineYVMap = new MolangVariableMap();
    o4LineYVMap.setFloat("dir_x", 0);
    o4LineYVMap.setFloat("dir_y", MOD_LINE_LENGTH);
    o4LineYVMap.setFloat("dir_z", 0);
    o4LineYVMap.setFloat("width", 0.05);

    // Spawning all 12 particles for the target player
    player.spawnParticle(particle, origin0, o0LineXVMap);
    player.spawnParticle(particle, origin0, o0LineYVMap);
    player.spawnParticle(particle, origin0, o0LineZVMap);

    player.spawnParticle(particle, origin1, o1LineXVMap);
    player.spawnParticle(particle, origin1, o1LineYVMap);

    player.spawnParticle(particle, origin2, o2LineZVMap);
    player.spawnParticle(particle, origin2, o2LineYVMap);

    player.spawnParticle(particle, origin3, o3LineXVMap);
    player.spawnParticle(particle, origin3, o3LineZVMap);

    player.spawnParticle(particle, origin4, o4LineXVMap);
    player.spawnParticle(particle, origin4, o4LineYVMap);
    player.spawnParticle(particle, origin4, o4LineZVMap);
}

export function drawRangeDisplay(player: Player, originPoint: Vector3, range: number) {
    /**
     * To create a cube out of lines there needs to be a total of 12 particles spawned
     */

    const LINE_LENGTH = (range * 2) + 1;

    // Creating the variable maps used for the 12 lines of the box

    // Math.ceil any addition, Math.floor and subtraction

    // Lines in -X, -Z, and -Y
    const origin0 = {
        x: Math.ceil(originPoint.x + range),
        y: Math.ceil(originPoint.y + range),
        z: Math.ceil(originPoint.z + range),
    }

    let MOD_LINE_LENGTH = LINE_LENGTH;
    if (Math.floor(originPoint.y - range) < -64) {
        MOD_LINE_LENGTH = LINE_LENGTH - (-64 - Math.floor(originPoint.y - range));
    }

    // Origin 0 -X Line
    const o0LineXVMap = new MolangVariableMap();
    o0LineXVMap.setFloat("dir_x", 0 - LINE_LENGTH);
    o0LineXVMap.setFloat("dir_y", 0);
    o0LineXVMap.setFloat("dir_z", 0);
    o0LineXVMap.setFloat("width", 0.1);

    // Origin 0 -Z Line
    const o0LineZVMap = new MolangVariableMap();
    o0LineZVMap.setFloat("dir_x", 0);
    o0LineZVMap.setFloat("dir_y", 0);
    o0LineZVMap.setFloat("dir_z", 0 - LINE_LENGTH);
    o0LineZVMap.setFloat("width", 0.1);

    // Origin 0 -Y Line
    const o0LineYVMap = new MolangVariableMap();
    o0LineYVMap.setFloat("dir_x", 0);
    o0LineYVMap.setFloat("dir_y", 0 - MOD_LINE_LENGTH);
    o0LineYVMap.setFloat("dir_z", 0);
    o0LineYVMap.setFloat("width", 0.1);

    // Lines in -X and -Y
    const origin1 = {
        x: Math.ceil(originPoint.x + range),
        y: Math.ceil(originPoint.y + range),
        z: Math.floor(originPoint.z - range),
    }

    // Origin 1 -X Line
    const o1LineXVMap = new MolangVariableMap();
    o1LineXVMap.setFloat("dir_x", 0 - LINE_LENGTH);
    o1LineXVMap.setFloat("dir_y", 0);
    o1LineXVMap.setFloat("dir_z", 0);
    o1LineXVMap.setFloat("width", 0.1);

    // Origin 1 -Y Line
    const o1LineYVMap = new MolangVariableMap();
    o1LineYVMap.setFloat("dir_x", 0);
    o1LineYVMap.setFloat("dir_y", 0 - MOD_LINE_LENGTH);
    o1LineYVMap.setFloat("dir_z", 0);
    o1LineYVMap.setFloat("width", 0.1);

    // Lines in -Z and -Y
    const origin2 = {
        x: Math.floor(originPoint.x - range),
        y: Math.ceil(originPoint.y + range),
        z: Math.ceil(originPoint.z + range),
    }

    // Origin 2 -Z Line
    const o2LineZVMap = new MolangVariableMap();
    o2LineZVMap.setFloat("dir_x", 0);
    o2LineZVMap.setFloat("dir_y", 0);
    o2LineZVMap.setFloat("dir_z", 0 - LINE_LENGTH);
    o2LineZVMap.setFloat("width", 0.1);

    // Origin 2 -Y Line
    const o2LineYVMap = new MolangVariableMap();
    o2LineYVMap.setFloat("dir_x", 0);
    o2LineYVMap.setFloat("dir_y", 0 - MOD_LINE_LENGTH);
    o2LineYVMap.setFloat("dir_z", 0);
    o2LineYVMap.setFloat("width", 0.1);

    // Lines in -X and -Zs
    const origin3 = {
        x: Math.ceil(originPoint.x + range),
        y: Math.floor(originPoint.y - range),
        z: Math.ceil(originPoint.z + range),
    }

    if (MOD_LINE_LENGTH !== LINE_LENGTH) {
        origin3.y = -64;
    }

    // If the Y of this origin is below the world limit, modify the LINE_LENGTH and origin value

    // Origin 3 -X Line
    const o3LineXVMap = new MolangVariableMap();
    o3LineXVMap.setFloat("dir_x", 0 - LINE_LENGTH);
    o3LineXVMap.setFloat("dir_y", 0);
    o3LineXVMap.setFloat("dir_z", 0);
    o3LineXVMap.setFloat("width", 0.1);

    // Origin 3 -Z Line
    const o3LineZVMap = new MolangVariableMap();
    o3LineZVMap.setFloat("dir_x", 0);
    o3LineZVMap.setFloat("dir_y", 0);
    o3LineZVMap.setFloat("dir_z", 0 - LINE_LENGTH);
    o3LineZVMap.setFloat("width", 0.1);

    // Lines in +X, +Z, and +Y
    const origin4 = {
        x: Math.floor(originPoint.x - range),
        y: origin3.y,
        z: Math.floor(originPoint.z - range),
    }

    // Origin 4 +X Line
    const o4LineXVMap = new MolangVariableMap();
    o4LineXVMap.setFloat("dir_x", LINE_LENGTH);
    o4LineXVMap.setFloat("dir_y", 0);
    o4LineXVMap.setFloat("dir_z", 0);
    o4LineXVMap.setFloat("width", 0.1);

    // Origin 4 +Z Line
    const o4LineZVMap = new MolangVariableMap();
    o4LineZVMap.setFloat("dir_x", 0);
    o4LineZVMap.setFloat("dir_y", 0);
    o4LineZVMap.setFloat("dir_z", LINE_LENGTH);
    o4LineZVMap.setFloat("width", 0.1);

    // Origin 4 +Y Line
    const o4LineYVMap = new MolangVariableMap();
    o4LineYVMap.setFloat("dir_x", 0);
    o4LineYVMap.setFloat("dir_y", MOD_LINE_LENGTH);
    o4LineYVMap.setFloat("dir_z", 0);
    o4LineYVMap.setFloat("width", 0.1);

    // Spawning all 12 particles for the target player
    player.spawnParticle("lunatech:range_line", origin0, o0LineXVMap);
    player.spawnParticle("lunatech:range_line", origin0, o0LineYVMap);
    player.spawnParticle("lunatech:range_line", origin0, o0LineZVMap);

    player.spawnParticle("lunatech:range_line", origin1, o1LineXVMap);
    player.spawnParticle("lunatech:range_line", origin1, o1LineYVMap);

    player.spawnParticle("lunatech:range_line", origin2, o2LineZVMap);
    player.spawnParticle("lunatech:range_line", origin2, o2LineYVMap);

    player.spawnParticle("lunatech:range_line", origin3, o3LineXVMap);
    player.spawnParticle("lunatech:range_line", origin3, o3LineZVMap);

    player.spawnParticle("lunatech:range_line", origin4, o4LineXVMap);
    player.spawnParticle("lunatech:range_line", origin4, o4LineYVMap);
    player.spawnParticle("lunatech:range_line", origin4, o4LineZVMap);
}
