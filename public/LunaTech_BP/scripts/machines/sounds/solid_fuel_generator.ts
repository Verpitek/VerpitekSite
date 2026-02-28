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

const SOLID_FUEL_GENERATOR_SOUND_ID = "lunatech:solid_fuel_generator_sound";

MachineCustomComponent.registerTickEvent((ev, params) => {
    // Grab or create sound entity
    const linkedEnts = MachineCustomComponent.getAllLinkedEntities(ev.block);

    let soundEnt = linkedEnts.find((ent) => {
        return ent.typeId === SOLID_FUEL_GENERATOR_SOUND_ID
    });

    if (soundEnt === undefined) {
        // Needs created
        soundEnt = ev.dimension.spawnEntity(SOLID_FUEL_GENERATOR_SOUND_ID, ev.block.bottomCenter(), {});

        MachineCustomComponent.addLinkedEntity(ev.block, soundEnt);
    }

    // Check if generator is currently producing power
    const perm = ev.block.permutation;

    const state = perm.getState("lunatech:gen_state");

    const wasProducing = soundEnt.getProperty("lunatech:active") as boolean;
    const isProducing = state === "GENERATING";

    if (wasProducing === isProducing) {
        return;
    }

    soundEnt.setProperty("lunatech:active", isProducing);
}, {
    machineId: "lunatech:solid_fuel_generator",
})