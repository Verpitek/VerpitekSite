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

import { Dimension, system, Vector3 } from "@minecraft/server";
import { getOffsetForBlock, getOffsetForId } from "./offset";
import { MachineCustomComponent } from "../../machines/component";

export type LINE_DRAW_FUNC = (startPoint: Vector3, endPoint: Vector3, dim: Dimension) => void;

const LineDrawReg: Record<string, LINE_DRAW_FUNC> = {};

export function registerLineDraw(id: string, func: LINE_DRAW_FUNC) {
    LineDrawReg[id] = func;
}

const SOURCE_LAST_DRAW: Record<string, number> = {};

MachineCustomComponent.registerTickEvent((ev) => {

    const loc = ev.block.location;
    const blockId = `${ev.dimension.id}${loc.x}${loc.y}${loc.z}`;

    // Get the last time this block drew lines
    const lastDrawTime = SOURCE_LAST_DRAW[blockId];
    if (lastDrawTime !== undefined && (system.currentTick - lastDrawTime) < 20) {
        // Not yet time to draw more link lines
        return;
    }

    // Get all blocks linked to this machine
    const linkedBlockDatas = MachineCustomComponent.getAllLoadedLinkedBlocks(ev.block, true);

    const centerPos = ev.block.center();

    let didDraw: boolean = false;

    // Draw a line to each loaded block based on the link's specified particle type
    for (const linkedBlockData of Object.values(linkedBlockDatas)) {
        const partId = linkedBlockData.linkData.linkParticle

        // Get the offset for the startPos
        const offset = getOffsetForBlock(ev.block, linkedBlockData.linkData.linkTag);

        const startPos = {
            x: centerPos.x + offset.x,
            y: centerPos.y + offset.y,
            z: centerPos.z + offset.z,
        }

        const drawFunc = LineDrawReg[partId];

        if (drawFunc === undefined) {
            // No visual for this link
            continue;
        }

        for (const block of linkedBlockData.blocks) {
            const offset = getOffsetForBlock(block, linkedBlockData.linkData.linkTag);
            const centerPos = block.center();

            const targetPos = {
                x: centerPos.x + offset.x,
                y: centerPos.y + offset.y,
                z: centerPos.z + offset.z
            }

            didDraw = true;
            drawFunc(startPos, targetPos, ev.dimension);
        }
    }

    if (didDraw) {
        SOURCE_LAST_DRAW[blockId] = system.currentTick;
    } else {
    }
})