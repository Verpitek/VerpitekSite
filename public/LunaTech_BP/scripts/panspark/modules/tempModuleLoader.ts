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

// Temporary method of loading modules into a terminal
// Allows a module to be linked to an Item ID.
// When that item is used on the terminal, the module is added to it and the item is consumed

import { panspark } from "../vm_manager";
import { MachineCustomComponent } from "../../machines/component";

const ITEM_MODULE_MAP: Record<string, string> = {};

export function registerItemModuleMap(itemId: string, moduleId: string) {
    ITEM_MODULE_MAP[itemId] = moduleId;
}

MachineCustomComponent.registerInteractEvent((ev) => {
    const heldItem = ev.player.getComponent("minecraft:inventory")!.container.getSlot(ev.player.selectedSlotIndex);

    if (!heldItem.hasItem()) {
        return;
    }

    const linkedModule = ITEM_MODULE_MAP[heldItem.typeId];

    if (linkedModule === undefined) {
        return;
    }

    // Try and add the module to the terminal's VM
    if (!panspark.registerModuleOnBlock(linkedModule, ev.block)) {
        // Didn't register because it was already there, item should not be removed
        return;
    }

    if (heldItem.amount > 1) {
        heldItem.amount -= 1;
    } else {
        heldItem.setItem();
    }

    ev.player.sendMessage("Added module to block!");
}, {
    machineId: "lunatech:terminal",
})