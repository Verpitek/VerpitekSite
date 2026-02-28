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

import { world, Block, Dimension, ContainerSlot, Container, ItemStack } from "@minecraft/server";
import { MachineCustomComponent } from "../../component";
import { registerMachineProc, PanSparkMachine, getTargetContainer } from "../../../panspark/modules/machinelib";
import { PanSparkClientComponent } from "../../../panspark/component";
import { tryGetOutputForItem } from "./recipe";

registerMachineProc(["lunatech:electric_furnace"], "furnace.insert", (self: Block, mach: PanSparkMachine, args: string[], container, context) => {
    if (args.length < 1) {
        throw new Error("Expected 1-2 args for the MACHINE_PROC but got " + args.length);
    }

    const selfNetId = PanSparkClientComponent.getNetworkId(self);

    const sourceCon = getTargetContainer(selfNetId, args[0]);

    if (sourceCon === undefined) {
        throw new Error("Invalid source container");
    }

    const rule = (slot) => {
        return tryGetOutputForItem(slot) !== undefined;
    };

    // Get the furnace's container
    const furnCon = getFurnCon(self, mach);
    const targetSlot = furnCon.getSlot(0);
    if (args.length > 1) {
        // Specified slot transfer
        const slotNum = context.getVar(args[1]);

        if (slotNum.type !== 0) {
            throw new Error("Expected number for slot num, got " + args[1]);
        }

        const sourceSlot = sourceCon.getSlot(slotNum.value);

        if (rule(sourceSlot)) {
            tryTransferSlotToSlot(sourceSlot, targetSlot);
        }

    } else {
        // General transfer
        tryTransferContainerToSlot(sourceCon, targetSlot, [rule]);
    }
})

registerMachineProc(["lunatech:electric_furnace"], "furnace.extract", (self: Block, mach: PanSparkMachine, args: string[], container, context) => {
    if (args.length < 1) {
        throw new Error("Expected 1-2 args for the MACHINE_PROC but got " + args.length);
    }

    const selfNetId = PanSparkClientComponent.getNetworkId(self);

    const targCon = getTargetContainer(selfNetId, args[0]);

    if (targCon === undefined) {
        throw new Error("Invalid source container");
    }

    // Grabbing the furnace's container
    const furnCon = getFurnCon(self, mach);

    const sourceSlot = furnCon.getSlot(1);
    if (args.length === 2) {
        // Targetted transfer
        const slotNum = context.getVar(args[1]);
        const targetSlot = targCon.getSlot(slotNum.value);
        tryTransferSlotToSlot(sourceSlot, targetSlot);
    } else {
        // General transfer
        tryTransferSlotToContainer(targCon, sourceSlot);
    }
})

function getFurnCon(self: Block, mach: PanSparkMachine) {
    let dim: Dimension;
    if (self.dimension.id === mach.dimensionId) {
        dim = self.dimension;
    } else {
        dim = world.getDimension(mach.dimensionId);

        if (dim === undefined) {
            throw new Error("Target furnace is unloaded!");
        }
    }

    const block = dim.getBlock(mach.location);
    return MachineCustomComponent.getLinkedMachineEntity(block).getComponent("minecraft:inventory").container;
}

function passesRules(targetSlot: ContainerSlot, rules: ((slot: ContainerSlot) => boolean)[] = []) {
    let res: boolean = true;
    for (const rule of rules) {
        if (!rule(targetSlot)) {
            res = false;
            break;
        }
    }

    return res;
}

export function tryTransferContainerToSlot(sourceCon: Container, targetSlot: ContainerSlot, customRules?: ((slot: ContainerSlot) => boolean)[], maxTransfer?: number) {
    const firstItem = sourceCon.firstItem();
    if (firstItem === undefined) {
        // Nothing to transfer
        return;
    }

    let amountTransfered = 0;

    if (targetSlot.hasItem() && targetSlot.amount >= targetSlot.maxAmount) {
        // No space in the target slot
        return;
    }

    let targetItem: ItemStack | undefined = targetSlot.hasItem() ? targetSlot.getItem() : undefined;

    // Iterate container contents and transfer items that can stack
    for (let i = 0; i < sourceCon.size; i++) {
        const sourceSlot = sourceCon.getSlot(i);

        if (!sourceSlot.hasItem()) {
            // Nothing to transfer
            continue;
        }

        if (targetItem !== undefined && !sourceSlot.isStackableWith(targetItem)) {
            // Can't stack
            continue;
        }

        // Ensure source slot passes rules
        if (!passesRules(sourceSlot, customRules)) {
            // Fails custom check
            continue;
        }

        let freeSpace = !targetSlot.hasItem() ? sourceSlot.maxAmount : targetSlot.maxAmount - targetSlot.amount;

        // Take items from source and place into target
        let transferCount = Math.min(sourceSlot.amount, freeSpace);

        if (maxTransfer !== undefined) {
            transferCount = Math.min(transferCount, maxTransfer);
        }

        amountTransfered += transferCount;

        const sourceItem = sourceSlot.getItem();

        if (transferCount >= sourceSlot.amount) {
            // Drained source
            sourceSlot.setItem();
        } else {
            sourceSlot.amount -= transferCount;
        }

        if (targetItem === undefined) {
            // Set target slot item to be the source slot's origional item with modified amount
            sourceItem.amount = transferCount;
            targetSlot.setItem(sourceItem);
            targetItem = sourceItem;
        } else {
            targetSlot.amount += transferCount;
        }

        if ((freeSpace - transferCount) <= 0 || (maxTransfer !== undefined && amountTransfered >= maxTransfer)) {
            // Target full or maxTransfer hit
            return;
        }
    }
}

export function tryTransferSlotToContainer(con: Container, testSlot: ContainerSlot, maxTransfer?: number) {
    if (!testSlot.hasItem()) {
        // Nothing to transfer
        return;
    }

    const testItem = testSlot.getItem();

    let amountTransfered = 0;

    // Container is full, iterate slots and add whats possible
    for (let i = 0; i < con.size; i++) {
        const compSlot = con.getSlot(i);

        if (!compSlot.hasItem()) {
            if (maxTransfer === undefined || maxTransfer <= testItem.amount) {
                // Can transfer all into the slot
                compSlot.setItem(testItem);
                testSlot.setItem();
            } else {
                // Can only partially transfer due to maxTransfer
                testSlot.amount -= maxTransfer;

                testItem.amount = maxTransfer;
                compSlot.setItem(testItem);
            }

            return;
        }

        if (!compSlot.isStackableWith(testItem)) {
            continue;
        }

        let transferCount = Math.min(testSlot.amount, compSlot.maxAmount - compSlot.amount);

        if (maxTransfer !== undefined) {
            transferCount = Math.min(transferCount, maxTransfer);
        }

        amountTransfered += transferCount;

        compSlot.amount += transferCount;

        if (testSlot.amount <= transferCount) {
            testSlot.setItem();
            return;
        } else {
            testSlot.amount -= transferCount;
        }

        if (maxTransfer !== undefined && amountTransfered >= maxTransfer) {
            // Max transfer hit
            return;
        }
    }

    return;
}

export function tryTransferSlotToSlot(sourceSlot: ContainerSlot, targetSlot: ContainerSlot) {
    if (!sourceSlot.hasItem()) {
        // Nothing to transfer
        return;
    }

    if (!targetSlot.hasItem()) {
        // Empty target slot, can transfer all
        targetSlot.setItem(sourceSlot.getItem());
        sourceSlot.setItem();

        return;
    }


    if (!sourceSlot.isStackableWith(targetSlot.getItem())) {
        // The slots are incompatible, transfer none
        return;
    }

    // Transfer as many as possible
    const sourceAmount = sourceSlot.amount;
    const targetAmount = targetSlot.amount;
    const maxAmount = targetSlot.maxAmount;

    const amountToTransfer = Math.min(sourceAmount, maxAmount - targetAmount);

    if (amountToTransfer >= sourceAmount) {
        // Source is drained
        sourceSlot.setItem();
        targetSlot.amount += amountToTransfer;
    } else {
        sourceSlot.amount -= amountToTransfer;
        targetSlot.amount += amountToTransfer;
    }
}