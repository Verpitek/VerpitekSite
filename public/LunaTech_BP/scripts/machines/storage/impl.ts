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

import { system, world } from "@minecraft/server";
import { MachineLinkTags } from "../../blockLinking/linkRegistry";
import { distanceBetween, MachineCustomComponent } from "../component";
import { ItemExtractorBlockComponent } from "./component";
import { StorageMachineTools } from "./tools";

MachineCustomComponent.registerTickEvent((ev) => {
    // Check if the extractor has enough power to operate
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kwMachine.currentEnergy < 1) {
        // Has no energy to transfer with
        return;
    }

    const lastPushTime = ItemExtractorBlockComponent.getTimeSinceLastPush(ev.block);
    const lastPullTime = ItemExtractorBlockComponent.getTimeSinceLastPull(ev.block);

    if (lastPushTime === undefined || lastPushTime >= 7) {
        // Get linked recievers
        const linkedBlocks = MachineCustomComponent.getLoadedLinkedBlocks(ev.block, MachineLinkTags.ItemEmitter);

        if (linkedBlocks.length > 1) {
            throw new Error("Extractor is linked to too many blocks");
        } else if (linkedBlocks.length < 1) {
            // Not linked to anything, no processing needed
            return;
        }

        const targetBlock = linkedBlocks[0];

        const { reciever, distanceTravelled } = StorageMachineTools.resolveRecieverFromLinkedBlock(targetBlock);

        // Add the distance to the linked block + distanceTravelled from the resolve and determine how far the item physically travels through the chain
        const totalDistance = distanceBetween(ev.block.location, targetBlock.location) + distanceTravelled;

        if (reciever !== undefined && reciever.hasTag("lunatech:machine")) {
            // Transfer item
            const didPush = ItemExtractorBlockComponent.tryPushItemIntoMachine(ev.block, reciever);

            if (didPush) {
                kwMachine.removeEnergy(1);
            }
        }
    }

    if (kwMachine.currentEnergy < 1) {
        // Doesn't have energy to pull an item
        return;
    }

    if (lastPullTime === undefined || lastPullTime >= 7) {
        const didPull = ItemExtractorBlockComponent.tryPullItemFromLinkedContainer(ev.block);

        if (didPull) {
            kwMachine.removeEnergy(1);
        }
    }
}, {
    machineId: "lunatech:item_extractor",
})

MachineCustomComponent.registerTickEvent((ev) => {
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kwMachine.currentEnergy < 1) {
        // Has no energy to transfer with
        return;
    }

    const lastTransferTime = ItemExtractorBlockComponent.getTimeSinceLastPush(ev.block);

    if (lastTransferTime === undefined || lastTransferTime >= 7) {
        ItemExtractorBlockComponent.tryPushItemIntoLinkedContainer(ev.block);
    }
}, {
    machineId: "lunatech:item_reciever"
})

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    const invSlots = MachineCustomComponent.getMachineInvSlots(ev.block);

    const items = [];
    for (const slot of invSlots) {
        if (!slot.hasItem()) {
            continue;
        }

        items.push(slot.getItem());
    }

    system.runTimeout(() => {
        for (const item of items) {
            ev.dimension.spawnItem(item, ev.block.location);
        }
    }, 0)
}, {
    blockTypes: [
        "lunatech:item_extractor",
        "lunatech:item_reciever"
    ]
});