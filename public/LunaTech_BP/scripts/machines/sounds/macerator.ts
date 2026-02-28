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

const MACERATOR_SOUND_ID = "lunatech:macerator_sound";

MachineCustomComponent.registerTickEvent((ev, params) => {
    // Grab or create sound entity
    const linkedEnts = MachineCustomComponent.getAllLinkedEntities(ev.block);

    let soundEnt = linkedEnts.find((ent) => {
        return ent.typeId === MACERATOR_SOUND_ID
    });

    if (soundEnt === undefined) {
        // Needs created
        soundEnt = ev.dimension.spawnEntity(MACERATOR_SOUND_ID, ev.block.bottomCenter(), {});

        MachineCustomComponent.addLinkedEntity(ev.block, soundEnt);
    }

    const wasCrafting = soundEnt.getProperty("lunatech:active") as boolean;
    const isCrafting = CraftingMachineComponent.isCrafting(ev.block);

    if (wasCrafting === isCrafting) {
        // Sound remains unchanged
        return;
    }

    // Activate or de-activate based on current state
    soundEnt.setProperty("lunatech:active", isCrafting);
}, {
    machineId: "lunatech:macerator",
})