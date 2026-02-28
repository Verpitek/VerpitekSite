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
import { WindmillMachineComponent } from "../generators/windmill/component";

const WINDMILL_SOUND_ID = "lunatech:windmill_sound";

MachineCustomComponent.registerTickEvent((ev, params) => {
    // Grab or create sound entity
    const linkedEnts = MachineCustomComponent.getAllLinkedEntities(ev.block);

    let soundEnt = linkedEnts.find((ent) => {
        return ent.typeId === WINDMILL_SOUND_ID
    });

    if (soundEnt === undefined) {
        // Needs created
        soundEnt = ev.dimension.spawnEntity(WINDMILL_SOUND_ID, ev.block.bottomCenter(), {});

        MachineCustomComponent.addLinkedEntity(ev.block, soundEnt);
    }

    const wasSounding = soundEnt.getProperty("lunatech:active") as boolean;
    const isPowered = WindmillMachineComponent.calculateEnergyProduction(ev.block) > 0;

    if (wasSounding === isPowered) {
        return;
    }

    soundEnt.setProperty("lunatech:active", isPowered);
}, {
    machineId: "lunatech:windmill",
})