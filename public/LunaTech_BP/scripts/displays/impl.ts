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

import { MachineCustomComponent } from "../machines/component";
import { MachineDisplayComponent } from "./component";

MachineDisplayComponent.registerOnTick((ev, params) => {
    const displayEnt = MachineDisplayComponent.getDisplayEnt(ev.block);

    if (displayEnt === undefined) {
        const ent = MachineDisplayComponent.createDisplayEnt(ev.block, params.offset);
    }

    MachineDisplayComponent.updateDisplay(ev.block);
})

MachineCustomComponent.registerInteractEvent((ev) => {
    if (ev.block.getComponent(MachineDisplayComponent.ID) === undefined) {
        return;
    }

    // Check if the player was holding shift
    if (!ev.player.isSneaking) {
        return;
    }

    // Toggle UI
    const dispEnt = MachineDisplayComponent.getDisplayEnt(ev.block);

    const openProp = dispEnt.getProperty("lunatech:open_state") as number;

    if (openProp === 0) {
        dispEnt.setProperty("lunatech:open_state", 1);
    } else {
        dispEnt.setProperty("lunatech:open_state", 0);
    }
})