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

import { MachineCustomComponent } from "../component";
import { CraftingMachineComponent } from "../crafter/component";

const POWER_NODE_SOUND_ID = "lunatech:power_node_sound";

MachineCustomComponent.registerTickEvent((ev, params) => {
    // Grab or create sound entity
    const linkedEnts = MachineCustomComponent.getAllLinkedEntities(ev.block);

    let soundEnt = linkedEnts.find((ent) => {
        return ent.typeId === POWER_NODE_SOUND_ID
    });

    if (soundEnt === undefined) {
        // Needs created
        soundEnt = ev.dimension.spawnEntity(POWER_NODE_SOUND_ID, ev.block.bottomCenter(), {});

        MachineCustomComponent.addLinkedEntity(ev.block, soundEnt);
    }

    const wasSounding = soundEnt.getProperty("lunatech:active") as boolean;

    if (!wasSounding) {
        soundEnt.setProperty("lunatech:active", true);
        return;
    }

}, {
    machineId: "lunatech:power_node",
})