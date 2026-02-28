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

import { world, system, Player, MolangVariableMap, Block } from "@minecraft/server";
const SAMPLE_SIZE = 200;

let tickDurationSamples: number[] = [];
let lastTickTime: number = -1;

world.afterEvents.worldLoad.subscribe(() => {
    system.runInterval(() => {
        if (lastTickTime === -1) {
            lastTickTime = Date.now();
            return;
        }

        const now = Date.now();
        const duration = now - lastTickTime;
        tickDurationSamples.push(duration);

        lastTickTime = now;

        if (tickDurationSamples.length > SAMPLE_SIZE) {
            tickDurationSamples.shift()
        }

        let totalTime = 0;
        for (const tickTime of tickDurationSamples) {
            totalTime += tickTime;
        }

        // console.log(`TPS: ${Math.round(1000 / (totalTime / tickDurationSamples.length))}`);
    }, 1);
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "lt:kill_all") {
        return;
    }

    const allEntities = ev.sourceEntity.dimension.getEntities();

    for (const ent of allEntities) {
        if (ent.typeId === "minecraft:player") {
            continue;
        }

        ent.remove();
    }

    ev.sourceEntity.sendMessage("Killed all entities");
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "lt:clear_props") {
        return;
    }

    world.clearDynamicProperties();
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "lt:show_props") {
        return;
    }

    console.log(JSON.stringify(world.getDynamicPropertyIds()));
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "lt:test") {
        return;
    }

    // Grab the target block's ID
    const mesSplit = ev.message.split(" ");

    const loc = {
        x: parseInt(mesSplit[0]) + 0.5,
        y: parseInt(mesSplit[1]),
        z: parseInt(mesSplit[2]) + 0.5
    }

    const dimension = ev.sourceEntity.dimension;

    // Place the physical block itself
    ev.sourceEntity.dimension.setBlockType(loc, "lunatech:analog_redstone_block");

    const block = ev.sourceEntity.dimension.getBlock(loc);

    // Summon the visual entity at the block location
    const entity = dimension.spawnEntity("lunatech:analog_redstone_block_visual", loc);

    BlockEntityLinkComponent.registerLinkedEntity(block, "test_link", entity);
})

import "./machines/index";
import "./panspark/index";
import "./displays/index";
import "./items/index"
import "./tools/redstoneManagers/index";
import "./blockLinking/index";
import "./blockId/index";
import "./entityLinking/index";

import "./analogRedstoneBlock";
import { blockIdManager } from "./blockId/manager";
import { BlockEntityLinkComponent } from "./entityLinking/component";
