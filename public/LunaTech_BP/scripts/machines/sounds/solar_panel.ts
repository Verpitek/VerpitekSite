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
import { getBlocksPowerLevelFromLight } from "../generators/solar_panel";

const SOLAR_PANEL_SOUND_ID = "lunatech:solar_panel_sound";

MachineCustomComponent.registerTickEvent((ev, params) => {
    // Grab or create sound entity
    const linkedEnts = MachineCustomComponent.getAllLinkedEntities(ev.block);

    let soundEnt = linkedEnts.find((ent) => {
        return ent.typeId === SOLAR_PANEL_SOUND_ID
    });

    if (soundEnt === undefined) {
        // Needs created
        soundEnt = ev.dimension.spawnEntity(SOLAR_PANEL_SOUND_ID, ev.block.bottomCenter(), {});

        MachineCustomComponent.addLinkedEntity(ev.block, soundEnt);
    }

    const isProducing = getBlocksPowerLevelFromLight(ev.block) > 0;

    // Activate or de-activate based on current state
    soundEnt.setProperty("lunatech:active", isProducing);
}, {
    machineId: "lunatech:solar_panel",
})