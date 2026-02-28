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

import { BlockComponentTickEvent, world } from "@minecraft/server";
import { MachineCustomComponent } from "../../component";
import { BreakerStates, getItemsFromBrokenBlock, setBreakerState, isCurrentBlockDifferent, incrementBreakStage, isBreakerReadyToInc, getTargetBlock } from "../blockBreaker/tools";

MachineCustomComponent.registerTickEvent((ev) => {
    // Check the breaker's current state
    const state = ev.block.permutation.getState("lunatech:breaker_state") as BreakerStates;

    switch (state) {
        case "IDLE":
            handleIdle(ev);
            break;
        case "STUCK":
            handleStuck(ev);
            break;
        case "BREAKING":
            handleBreaking(ev);
            break;
    }
}, {
    machineId: "lunatech:block_breaker"
})

function handleIdle(ev: BlockComponentTickEvent & {
    firstTick: boolean;
}) {
    // Check if machine has enough power to break the next block
    const machine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (machine.currentEnergy < 33) {
        // Not enough energy to function
        return;
    }

    // IDLE can't exist without switching state so no need to update the current block
    const brokenBlock = getTargetBlock(ev.block);

    // Check if the block to the north is breakable
    const items = getItemsFromBrokenBlock(brokenBlock);

    if (brokenBlock.typeId === "minecraft:air" || items === undefined) {
        // Can't break block placed in front, enter stuck
        setBreakerState(ev.block, "STUCK");
        return;
    }

    // Has a block in front that can be broken, progress into the breaking stage
    setBreakerState(ev.block, "BREAKING");
}

function handleStuck(ev: BlockComponentTickEvent & {
    firstTick: boolean;
}) {
    // Check if the block in front of the controller is different
    const targetBlock = getTargetBlock(ev.block);

    if (isCurrentBlockDifferent(ev.block, targetBlock)) {
        // Block in front changed
        setBreakerState(ev.block, "IDLE");
        return;
    }
}

function handleBreaking(ev: BlockComponentTickEvent & {
    firstTick: boolean;
}) {
    const targetBlock = getTargetBlock(ev.block);

    // Check if the block is different from what it was last tick
    if (isCurrentBlockDifferent(ev.block, targetBlock)) {
        // Return to IDLE and reset breaking progress
        incrementBreakStage(ev.block, 0);
        setBreakerState(ev.block, "IDLE");
        return;
    }

    // Check if the machine still has enough energy
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kwMachine.currentEnergy < 33 || !isBreakerReadyToInc(ev.block)) {
        // Can't inc this tick, skip
        return;
    }

    // Take away energy and increment break progress
    kwMachine.removeEnergy(33);
    const currentStage = incrementBreakStage(ev.block);

    const loc = targetBlock.center();

    if (currentStage <= 2) {
        // Block not yet broken
        ev.dimension.playSound("hit.stone", loc);
        return;
    }

    ev.dimension.playSound("dig.stone", loc);

    const items = getItemsFromBrokenBlock(targetBlock);

    targetBlock.setType("minecraft:air");

    for (const item of items) {
        targetBlock.dimension.spawnItem(item, loc);
    }

    // Block broken, reset break stage and return to IDLE
    incrementBreakStage(ev.block, 0);
    setBreakerState(ev.block, "IDLE");

    return;
}