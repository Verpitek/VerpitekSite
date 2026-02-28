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

import { Block, ItemStack, system, world } from "@minecraft/server";

export type BreakerStates = "IDLE" | "BREAKING" | "STUCK";

export function getItemsFromBrokenBlock(block: Block) {
    const manager = world.getLootTableManager();

    const diamondPickaxe = new ItemStack("diamond_pickaxe");

    return manager.generateLootFromBlockPermutation(block.permutation, diamondPickaxe);
}

export function setBreakerState(block: Block, state: BreakerStates) {
    block.setPermutation(block.permutation.withState("lunatech:breaker_state", state));
}

export function incrementBreakStage(block: Block, stage?: number) {
    if (stage === undefined) {
        stage = block.permutation.getState("lunatech:breaking_state") + 1;
    }

    block.setPermutation(block.permutation.withState("lunatech:breaking_state", stage));

    const blockId = `${block.dimension.id}:${block.location.x}:${block.location.y}:${block.location.z}`;
    const data = BREAKER_DATA[blockId];

    data.lastIncTick = system.currentTick;

    return stage;
}

// Stores the Block Type ID of the last block in front of the breaker, used to dictate if the block is different from the next
const BREAKER_DATA: Record<string, { lastBlockId: string, lastIncTick?: number }> = {};
export function isCurrentBlockDifferent(block: Block, targetBlock: Block) {
    const targetId = targetBlock.typeId;
    const blockId = `${block.dimension.id}:${block.location.x}:${block.location.y}:${block.location.z}`;

    const lastBlock = BREAKER_DATA[blockId]?.lastBlockId;

    if (lastBlock !== targetId) {
        BREAKER_DATA[blockId] = { lastBlockId: targetId };

        if (lastBlock === undefined) {
            return false;
        }

        return true;
    }

    return false;
}

export function isBreakerReadyToInc(block: Block) {
    const blockId = `${block.dimension.id}:${block.location.x}:${block.location.y}:${block.location.z}`;
    const data = BREAKER_DATA[blockId];

    const tick = system.currentTick;

    // Check if its been 20 TPS since the last inc

    return data.lastIncTick === undefined || (tick - data.lastIncTick >= 20);
}

export function getTargetBlock(block: Block): Block {
    const facing = block.permutation.getState("minecraft:cardinal_direction");

    return block[facing]()
}