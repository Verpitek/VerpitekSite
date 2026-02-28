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

import { MachineCustomComponent } from "../../../component";

const MC_HIDDEN: Record<string, boolean | undefined> = {};

MachineCustomComponent.registerTickEvent((ev) => {
    // Check if the machine has any name ents already linked
    let nameEnt = MachineCustomComponent.getAllLinkedEntities(ev.block).find((val) => {
        return val.typeId === "lunatech:machine_text_ui";
    });

    const loc = ev.block.location;
    const blockId = `${ev.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

    const isHidden = MC_HIDDEN[blockId];

    if (nameEnt === undefined) {
        // Needs a new ent init
        const loc = ev.block.center();

        loc.y -= 0.1;

        nameEnt = ev.block.dimension.spawnEntity("lunatech:machine_text_ui", loc);

        MachineCustomComponent.addLinkedEntity(ev.block, nameEnt);
    }

    if (isHidden) {
        nameEnt.nameTag = "";
    } else {
        const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

        if (kwMachine.currentEnergy < 1) {
            nameEnt.nameTag = "OUT OF POWER";
        } else {
            // Grab the current state of the Microcontroller for the name that will be displayed
            const state = ev.block.permutation.getState("lunatech:executor.panspark")

            nameEnt.nameTag = state;
        }
    }
}, {
    machineId: "lunatech:microcontroller",
});

MachineCustomComponent.registerInteractEvent((ev) => {
    // Check if the player was holding shift
    if (!ev.player.isSneaking) {
        return;
    }

    // Set hidden
    const loc = ev.block.location;
    const blockId = `${ev.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

    const lastState = MC_HIDDEN[blockId];

    if (lastState === undefined || !lastState) {
        MC_HIDDEN[blockId] = true;
    } else {
        MC_HIDDEN[blockId] = false;
    }
}, {
    machineId: "lunatech:microcontroller",
})