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

import { Block, BlockComponentTickEvent } from "@minecraft/server";
import { MachineComponentParams, MachineCustomComponent } from "../../component";
import { tryTransferSlotToSlot } from "../../workers/furnace/panspark";
import { tryGetCookTimeForItem } from "../solidFuel/cook_times";

// Tick Event
MachineCustomComponent.registerTickEvent((ev, params) => {
    if (ev.firstTick) {
        // No processing on first tick
        return;
    }

    const state = ev.block.permutation.getState("lunatech:gen_state") as string;

    switch (state) {
        case "NO_FUEL":
            handleNoFuelTick(ev, params);
            break;
        case "GENERATING":
            handleGeneratingTick(ev, params);
            break;
        case "INVALID_FUEL":
            handleInvalidFuelTick(ev, params);
            break;
    }
}, {
    machineId: ["lunatech:solid_fuel_generator"]
})

function handleNoFuelTick(ev: BlockComponentTickEvent & { firstTick: boolean }, params: MachineComponentParams) {

    // Check if there are any items in the Machine's input
    const inSlot = MachineCustomComponent.getMachineSlot(ev.block, 0);

    if (inSlot.hasItem()) {
        if (tryGetCookTimeForItem(inSlot.typeId) !== undefined) {
            // Valid fuel
            setState(ev.block, "GENERATING");
        } else {
            // Invalid fuel
            setState(ev.block, "INVALID_FUEL");
        }
    }
}

function handleGeneratingTick(ev: BlockComponentTickEvent & { firstTick: Boolean }, params: MachineComponentParams) {
    const progress = MachineCustomComponent.getProgress(ev.block);
    let maxProgress = MachineCustomComponent.getMaxProgress(ev.block);

    const inSlot = MachineCustomComponent.getMachineSlot(ev.block, 0);
    if (inSlot.hasItem()) {
        // Verify max progress
        const inProgress = tryGetCookTimeForItem(inSlot.typeId);
        if (maxProgress !== inProgress) {
            maxProgress = inProgress;
            MachineCustomComponent.setRuntimeMaxProgress(ev.block, maxProgress);
        }
    }

    if (maxProgress > progress) {
        // Not ready to burn the next fuel yet
        MachineCustomComponent.setProgress(ev.block, progress + 1);

        // Add energy
        const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
        kwMachine.addEnergy(5);
        return;
    }

    // Prepared to consume another fuel
    // Check if there are still any items in the Machine's input
    if (!inSlot.hasItem()) {
        // Go to NO_FUEL
        setState(ev.block, "NO_FUEL");
        return;
    }

    const cookTime = tryGetCookTimeForItem(inSlot.typeId);
    if (cookTime === undefined) {
        // Go to INVALID_FUEL
        setState(ev.block, "INVALID_FUEL");
        return;
    }

    MachineCustomComponent.setRuntimeMaxProgress(ev.block, cookTime);
    MachineCustomComponent.setProgress(ev.block, 0);

    if (inSlot.amount <= 1) {
        inSlot.setItem();
    } else {
        inSlot.amount -= 1;
    }

    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    kwMachine.addEnergy(5);
}

function handleInvalidFuelTick(ev: BlockComponentTickEvent, params: MachineComponentParams) {
    const inSlot = MachineCustomComponent.getMachineSlot(ev.block, 0);

    if (!inSlot.hasItem) {
        setState(ev.block, "NO_FUEL");
    } else if (tryGetCookTimeForItem(inSlot.typeId) !== undefined) {
        setState(ev.block, "GENERATING");
    }
}

// Interact Event
MachineCustomComponent.registerInteractEvent((ev, params) => {
    const state = ev.block.permutation.getState("lunatech:gen_state") as string;

    const inSlot = MachineCustomComponent.getMachineSlot(ev.block, 0);

    if (state === "INVALID_FUEL") {
        if (!inSlot.hasItem()) {
            return;
        }

        // Pop items into the world
        const item = inSlot.getItem();
        inSlot.setItem();

        ev.dimension.spawnItem(item, ev.block.location);

        return;
    }

    // Try insert items
    const heldSlot = ev.player.getComponent("minecraft:inventory").container.getSlot(ev.player.selectedSlotIndex);

    if (heldSlot.hasItem() && heldSlot.typeId === "minecraft:stick") {
        return;
    }

    if (!heldSlot.hasItem() || tryGetCookTimeForItem(heldSlot.typeId) === undefined) {
        // Cant insert
        return;
    }

    tryTransferSlotToSlot(heldSlot, inSlot);
}, {
    machineId: ["lunatech:solid_fuel_generator"]
})


// Useful functions
function setState(blk: Block, state: "NO_FUEL" | "INVALID_FUEL" | "GENERATING") {
    blk.setPermutation(blk.permutation.withState("lunatech:gen_state", state));
}