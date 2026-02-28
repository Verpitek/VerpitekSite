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

import { Block, Container, system, world } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../../constants";
import { MachineCustomComponent } from "../component";

/**
* Component Requirements:
* - lunatech:machine

* State Requirements:
* - lunatech:source ["NORTH" | "SOUTH" | "EAST" | "WEST"]

* Effects:
* - When an ItemExtractor is placed the face of the block it was placed on it what it is marked as connected to
*/
export class ItemExtractorBlockComponent {
    static ID: string = ADDON_NAMESPACE + ":machine.item_extractor";

    static getLinkedDirection(blk: Block): InvertDirection {
        return blk.permutation.getState("minecraft:block_face") as InvertDirection;
    }

    static tryGetLinkedContainer(blk: Block) {
        // The value of `minecraft:block_face` can be inverted to get the direction of the linked block
        const linkedDirection = InvertDirection[this.getLinkedDirection(blk)];

        const linkedBlock = blk[DirectionToMethod[linkedDirection]]?.call(blk) as Block | undefined;

        if (linkedBlock === undefined) {
            return undefined;
        }

        const inv = linkedBlock.getComponent("minecraft:inventory");

        if (inv === undefined) {
            return undefined;
        }

        return inv.container;
    }

    static setLastPullTime(blk: Block) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        machEnt.setDynamicProperty("lunatech:item_machine.last_pull", system.currentTick);
    }

    static setLastPushTime(blk: Block) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        machEnt.setDynamicProperty("lunatech:item_machine.last_push", system.currentTick);
    }

    static getTimeSinceLastPull(blk: Block) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        const lastTime = machEnt.getDynamicProperty("lunatech:item_machine.last_pull") as number | undefined;

        if (lastTime === undefined) {
            return undefined;
        }

        return system.currentTick - lastTime;
    }

    static getTimeSinceLastPush(blk: Block) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        const lastTime = machEnt.getDynamicProperty("lunatech:item_machine.last_push") as number | undefined;

        if (lastTime === undefined) {
            return undefined;
        }

        return system.currentTick - lastTime;
    }

    static tryPushItemIntoLinkedContainer(blk: Block) {
        const con = this.tryGetLinkedContainer(blk);

        if (con === undefined) {
            return false;
        }

        const invSlots = MachineCustomComponent.getMachineInvSlots(blk);

        /**
         * Iterate the items in the linked container and check for the following:
         * - Is any item in the machine capable of stacking with the current item in the container
         *  - If yes push the item into the container
         *  - If no move to the next item
         */
        for (let i = 0; i < con.size; i++) {
            const slot = con.getSlot(i);

            const conSlotHasItem = slot.hasItem();

            if (conSlotHasItem && slot.maxAmount <= slot.amount) {
                // Target slot full
                continue;
            }

            let transfered: number | undefined = undefined;

            for (let j = 0; j < invSlots.length; j++) {
                const invSlot = invSlots[j];

                if (!invSlot.hasItem()) {
                    // No stored item
                    continue;
                }

                const invItem = invSlot.getItem();

                if (!conSlotHasItem) {
                    // Gurrenteed transfer
                    transfered = j;

                    invItem.amount = 1;

                    slot.setItem(invItem);

                    break;
                } else if (slot.isStackableWith(invItem)) {
                    // Transfer if stackable
                    transfered = j;

                    slot.amount += 1;

                    break;
                }

                // Mismatched items, continue
            }

            if (transfered !== undefined) {
                // Remove 1 from the inv-slot it was pulled from
                const pullSlot = invSlots[transfered];

                if (pullSlot.amount > 1) {
                    pullSlot.amount -= 1;
                } else {
                    pullSlot.setItem();
                }

                // Set last push time
                this.setLastPushTime(blk);

                return true;
            }
        }

        return false;
    }

    static tryPullItemFromLinkedContainer(blk: Block) {
        const container = this.tryGetLinkedContainer(blk);
        if (container === undefined) {
            return false;
        }

        return this.tryPullItemFromContainer(blk, container);
    }

    static tryPullItemFromContainer(blk: Block, con: Container) {
        if (con === undefined) {
            return false;
        }

        const invSlots = MachineCustomComponent.getMachineInvSlots(blk);

        /**
         * Iterate the items in the linked container and check for the following:
         *  - Is the item stackable with any of the extractor's slots
         *      - If yes pull the item into the extractor
         *      - If no move to next item
         */
        for (let i = 0; i < con.size; i++) {
            const slot = con.getSlot(i);

            if (!slot.hasItem()) {
                continue;
            }

            let transfered = false;

            for (const invSlot of invSlots) {
                const item = slot.getItem();

                if (invSlot.hasItem() && invSlot.amount >= invSlot.maxAmount) {
                    // Can't store any more items
                    continue;
                }

                if (!invSlot.hasItem()) {
                    item.amount = 1;
                    invSlot.setItem(item);

                    transfered = true;
                    break;
                } else if (invSlot.isStackableWith(item)) {
                    invSlot.amount += 1;

                    transfered = true;
                    break;
                }
            }

            if (transfered) {
                // Remove an item from the container slot
                if (slot.amount > 1) {
                    slot.amount -= 1;
                } else {
                    slot.setItem();
                }

                this.setLastPullTime(blk);

                return true;
            }
        }

        return false;
    }

    static tryPushItemIntoMachine(emitter: Block, target: Block) {
        const sourceInv = MachineCustomComponent.getMachineInvSlots(emitter);
        const targetInv = MachineCustomComponent.getMachineInvSlots(target);

        /**
         * Iterate items in the source inventory and check if any of the items can stack into the slots in the target inventory
         * 
         * If yes, move 1 item over and break
         */
        let foundItem = false;
        for (const targetSlot of targetInv) {
            const hasItem = targetSlot.hasItem();

            if (hasItem && targetSlot.amount >= targetSlot.maxAmount) {
                // Slot full
                continue;
            }

            for (const sourceSlot of sourceInv) {
                if (!sourceSlot.hasItem()) {
                    continue;
                }

                const sourceItem = sourceSlot.getItem();

                sourceItem.amount = 1;

                if (!hasItem) {
                    targetSlot.setItem(sourceItem);

                    if (sourceSlot.amount > 1) {
                        sourceSlot.amount -= 1;
                    } else {
                        sourceSlot.setItem();
                    }

                    foundItem = true;
                    break;
                }

                if (targetSlot.isStackableWith(sourceItem)) {
                    // Remove 1 item from source slot, add 1 item to target slot
                    if (sourceSlot.amount > 1) {
                        sourceSlot.amount -= 1;
                    } else {
                        sourceSlot.setItem();
                    }

                    targetSlot.amount += 1;

                    foundItem = true;
                    break;
                }
            }

            if (foundItem) {
                break;
            }
        }

        if (foundItem) {
            this.setLastPushTime(emitter);
        }

        return foundItem;
    }
}

export enum InvertDirection {
    "up" = "down",
    "down" = "up",
    "north" = "south",
    "south" = "north",
    "east" = "west",
    "west" = "east"
}

export enum DirectionToMethod {
    "up" = "above",
    "down" = "below",
    "north" = "north",
    "south" = "south",
    "east" = "east",
    "west" = "west",
}

export function invertDirection(direction: string) {
    direction = direction.toLowerCase()

    return InvertDirection[direction];
}