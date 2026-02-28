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

import { ContainerSlot } from "@minecraft/server";

export function tryTransferSlotToSlot(sourceSlot: ContainerSlot, targetSlot: ContainerSlot, transferLimit?: number) {
    if (!sourceSlot.hasItem()) {
        // Nothing to transfer
        return;
    }

    if (!targetSlot.hasItem()) {
        const newItem = sourceSlot.getItem();

        if (transferLimit !== undefined && sourceSlot.amount > transferLimit) {
            newItem.amount = transferLimit;
            sourceSlot.amount -= transferLimit;
        } else {
            sourceSlot.setItem();
        }

        targetSlot.setItem(newItem);

        return newItem.amount;
    }


    if (!sourceSlot.isStackableWith(targetSlot.getItem())) {
        // The slots are incompatible, transfer none
        return;
    }

    // Transfer as many as possible
    const sourceAmount = sourceSlot.amount;
    const targetAmount = targetSlot.amount;
    const maxAmount = targetSlot.maxAmount;

    let amountToTransfer = Math.min(sourceAmount, maxAmount - targetAmount);
    if (transferLimit !== undefined) {
        amountToTransfer = Math.min(amountToTransfer, transferLimit);
    }

    if (amountToTransfer >= sourceAmount) {
        // Source is drained
        sourceSlot.setItem();
        targetSlot.amount += amountToTransfer;
    } else {
        sourceSlot.amount -= amountToTransfer;
        targetSlot.amount += amountToTransfer;
    }

    return amountToTransfer;
}