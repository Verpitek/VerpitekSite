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

import { ItemStack, system, world } from "@minecraft/server";
import { tryTransferSlotToSlot } from "../../tools/container";
import { MachineCustomComponent } from "../component";
import { CraftingMachineComponent, CraftingMachineComponentParameters, CraftingMachineStates } from "./component";
import { getOutputForItem } from "./recipeManager";

// Handle Interaction
CraftingMachineComponent.registerOnInteract((ev) => {
    const heldSlot = ev.player.getComponent("minecraft:inventory").container.getSlot(ev.player.selectedSlotIndex);

    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);

    if (!heldSlot.hasItem() || (outputSlot.hasItem() && heldSlot.isStackableWith(outputSlot.getItem()))) {
        // No held item, pop output items
        const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);

        if (!outputSlot.hasItem()) {
            return;
        }

        tryTransferSlotToSlot(outputSlot, heldSlot);

        return;
    }

    if (!CraftingMachineComponent.isValidInput(ev.block, heldSlot.typeId)) {
        // Invalid input
        return;
    }

    // Try and insert an item into the machines container
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    tryTransferSlotToSlot(heldSlot, inputSlot);
}, {
    machineState: ['BLACKLIST', CraftingMachineStates.INVALID_INPUT]
})

// Handle NO_INPUT
CraftingMachineComponent.registerOnTick((ev, params) => {
    // Check if Machine has energy
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine === undefined) {
        return;
    }

    if (kwMachine.currentEnergy < params.energy_consumption) {
        // No energy to run
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.OUT_OF_ENERGY);
        return;
    }

    // Check if the input slot has any items
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    if (!inputSlot.hasItem()) {
        // No item
        return;
    }

    const recipe = CraftingMachineComponent.getRecipeForItem(ev.block, inputSlot.typeId);

    if (recipe === undefined) {
        // Invalid input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INVALID_INPUT);
        return;
    }

    if (inputSlot.amount < recipe.inputItem.amount) {
        // Not enough input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INSUFFICIENT_INPUT);
        return;
    }

    // Ready to start crafting
    CraftingMachineComponent.setState(ev.block, CraftingMachineStates.CRAFTING);
}, {
    machineState: [CraftingMachineStates.NO_INPUT],
})

// Handle INSUFFICIENT_INPUT
CraftingMachineComponent.registerOnTick((ev, params) => {
    // Check if Machine has energy
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < params.energy_consumption) {
        // No energy to run
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.OUT_OF_ENERGY);
        return;
    }

    if (kwMachine === undefined) {
        return;
    }

    // Check if the input slot has any items
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    if (!inputSlot.hasItem()) {
        // No Item
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.NO_INPUT);
        return;
    }

    const recipe = CraftingMachineComponent.getRecipeForItem(ev.block, inputSlot.typeId);

    if (recipe === undefined) {
        // Invalid input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INVALID_INPUT);
        return;
    }

    if (inputSlot.amount >= recipe.inputItem.amount) {
        // Ready to start crafting
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.CRAFTING);

        return;
    }
}, {
    machineState: [CraftingMachineStates.INSUFFICIENT_INPUT],
})

// Handle INVALID_INPUT
CraftingMachineComponent.registerOnTick((ev, params) => {
    // Check if Machine has energy
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < params.energy_consumption) {
        // No energy to run
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.OUT_OF_ENERGY);
        return;
    }

    if (kwMachine === undefined) {
        return;
    }

    // Check if the input slot has any items
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    if (!inputSlot.hasItem()) {
        // No item
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.NO_INPUT);
        return;
    }

    const recipe = CraftingMachineComponent.getRecipeForItem(ev.block, inputSlot.typeId);

    if (recipe === undefined) {
        // Invalid input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INVALID_INPUT);
        return;
    }

    if (inputSlot.amount >= recipe.inputItem.amount) {
        // Ready to start crafting
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.CRAFTING);

        return;
    }
}, {
    machineState: [CraftingMachineStates.INVALID_INPUT],
})

CraftingMachineComponent.registerOnInteract((ev) => {
    // Empty slot into hand as much as possible
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    const heldItem = ev.player.getComponent("minecraft:inventory").container.getSlot(ev.player.selectedSlotIndex);

    tryTransferSlotToSlot(inputSlot, heldItem);

    if (!inputSlot.hasItem()) {
        // Slot was cleared
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.NO_INPUT);
        return;
    }
}, {
    machineState: [CraftingMachineStates.INVALID_INPUT],
})

// Handle CRAFTING
CraftingMachineComponent.registerOnTick((ev, params) => {
    // Check if Machine has energy
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < params.energy_consumption) {
        // No energy to run
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.OUT_OF_ENERGY);
        return;
    }

    if (kwMachine === undefined) {
        return;
    }

    // Check if the input slot has any items
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    if (!inputSlot.hasItem()) {
        // No item
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.NO_INPUT);
        return;
    }

    const recipe = CraftingMachineComponent.getRecipeForItem(ev.block, inputSlot.typeId);

    if (recipe === undefined) {
        // Invalid input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INVALID_INPUT);
        return;
    }

    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);
    if (outputSlot.hasItem() && (outputSlot.amount >= outputSlot.maxAmount || (outputSlot.maxAmount - outputSlot.amount) < recipe.outputItem.amount)) {
        // Output is full
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.OUTPUT_FULL);
        return;
    }

    const testOutput = new ItemStack(recipe.outputItem.id);

    if (outputSlot.hasItem() && !testOutput.isStackableWith(outputSlot.getItem())) {
        // Input mismatch with output
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INPUT_MISMATCH);
        return;
    }

    if (inputSlot.amount < recipe.inputItem.amount) {
        // Not enough input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INSUFFICIENT_INPUT);
        return;
    }

    kwMachine.removeEnergy(params.energy_consumption);

    // Handle current progress
    const curProg = MachineCustomComponent.getProgress(ev.block);
    if (curProg >= params.craft_time) {
        // Craft complete!
        if (outputSlot.hasItem()) {
            outputSlot.amount += recipe.outputItem.amount;
        } else {
            outputSlot.setItem(new ItemStack(recipe.outputItem.id, recipe.outputItem.amount));
        }

        if (inputSlot.amount > recipe.inputItem.amount) {
            inputSlot.amount -= recipe.inputItem.amount;
        } else {
            inputSlot.setItem();
            CraftingMachineComponent.setState(ev.block, CraftingMachineStates.NO_INPUT);
        }

        MachineCustomComponent.setProgress(ev.block, 0);
    } else {
        // Increment progress
        MachineCustomComponent.setProgress(ev.block, curProg + 1);
    }
}, {
    machineState: [CraftingMachineStates.CRAFTING],
})

// Handle OUT_OF_ENERGY
CraftingMachineComponent.registerOnTick((ev, params) => {
    // Check if Machine has energy
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < params.energy_consumption) {
        // No energy to run
        return;
    }

    if (kwMachine === undefined) {
        return;
    }

    // Check if the input slot has any items
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    if (!inputSlot.hasItem()) {
        // No item
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.NO_INPUT);
        return;
    }

    const recipe = CraftingMachineComponent.getRecipeForItem(ev.block, inputSlot.typeId);

    if (recipe === undefined) {
        // Invalid input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INVALID_INPUT);
        return;
    }

    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);
    if (outputSlot.hasItem() && (outputSlot.amount >= outputSlot.maxAmount || (outputSlot.maxAmount - outputSlot.amount) < recipe.outputItem.amount)) {
        // Output is full
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.OUTPUT_FULL);
        return;
    }

    const testOutput = new ItemStack(recipe.outputItem.id);

    if (outputSlot.hasItem() && !testOutput.isStackableWith(outputSlot.getItem())) {
        // Input mismatch with output
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INPUT_MISMATCH);
        return;
    }

    if (inputSlot.amount < recipe.inputItem.amount) {
        // Not enough input
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INSUFFICIENT_INPUT);
        return;
    }

    CraftingMachineComponent.setState(ev.block, CraftingMachineStates.CRAFTING);
}, {
    machineState: [CraftingMachineStates.OUT_OF_ENERGY],
})

// Handle OUTPUT_FULL
CraftingMachineComponent.registerOnTick((ev, params) => {
    // If output is no longer full, switch to CRAFTING
    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);

    if (!outputSlot.hasItem() || outputSlot.amount < outputSlot.maxAmount) {
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.CRAFTING);
        return;
    }
}, {
    machineState: [CraftingMachineStates.OUTPUT_FULL],
})

// Handle INPUT_MISMATCH
CraftingMachineComponent.registerOnTick((ev, params) => {
    const cmp = CraftingMachineComponent.getAndCacheCmp(ev.block);

    // If input result can stack with output slot, return to crafting
    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    const recipe = getOutputForItem(inputSlot.typeId, cmp.crafting_tag);

    if (recipe === undefined) {
        // Input item is invalid
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.INPUT_MISMATCH);
        return;
    }

    const testItem = new ItemStack(recipe.outputItem.id);

    if (!outputSlot.hasItem() || outputSlot.isStackableWith(testItem)) {
        CraftingMachineComponent.setState(ev.block, CraftingMachineStates.CRAFTING);
        return;
    }
}, {
    machineState: [CraftingMachineStates.INPUT_MISMATCH],
})

/*CraftingMachineComponent.registerOnBreak((ev) => {
    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    // Pop items into the world if they exist
    if (outputSlot.hasItem()) {
        ev.dimension.spawnItem(outputSlot.getItem(), ev.block.location);

        outputSlot.setItem();
    }

    if (inputSlot.hasItem()) {
        ev.dimension.spawnItem(inputSlot.getItem(), ev.block.location);

        inputSlot.setItem();
    }
})*/

// TODO: Find some way to do this via custom components, accessing inventories should be possible post-mortem
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    const outputSlot = CraftingMachineComponent.getOutputSlot(ev.block);
    const inputSlot = CraftingMachineComponent.getInputSlot(ev.block);

    const inputItem = inputSlot.hasItem() ? inputSlot.getItem() : undefined;
    const outputItem = outputSlot.hasItem() ? outputSlot.getItem() : undefined;

    system.runTimeout(() => {
        if (inputItem !== undefined) {
            ev.dimension.spawnItem(inputItem, ev.block.location);
        }

        if (outputItem !== undefined) {
            ev.dimension.spawnItem(outputItem, ev.block.location);
        }
    }, 0)
}, {
    blockTypes: [
        "lunatech:compressor",
        "lunatech:electric_furnace",
        "lunatech:macerator",
        "lunatech:recycler",
    ]
});