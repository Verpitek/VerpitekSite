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

import { tryGetOutputForItem } from "./recipe";
import { MachineCustomComponent } from "../../component";
import { FurnaceCookResult, MachineFurnaceComponent, MachineFurnaceState } from "./component";
import { ContainerSlot, ItemStack, system } from "@minecraft/server";
import { registerSlotInfoForMachineId } from "../../../panspark/modules/machinelib";

// Register slot names
system.runTimeout(() => {
    registerSlotInfoForMachineId("lunatech:electric_furnace", {
        0: "input",
        1: "output",
    })
}, 0)

// IDLE events
MachineFurnaceComponent.registerTickEvent((ev, params) => {
    const con = MachineCustomComponent.getMachineContainer(ev.block);
    if (con === undefined) {
        // Not yet init
        return;
    }

    // Check if there are items in the input slot
    const inputSlot = con.getSlot(0);
    if (inputSlot.hasItem()) {
        // Needs to start cooking
        MachineFurnaceComponent.startCooking(ev.block);
        return;
    }
}, {
    furnace_states: [MachineFurnaceState.IDLE],
})

MachineFurnaceComponent.registerInteractEvent((ev, params) => {
    // TODO: Allow input of items to happen during any state and not strictly start cooking unless in idle

    const con = ev.player.getComponent("minecraft:inventory").container;
    const heldItem = con.getSlot(ev.player.selectedSlotIndex);

    const slots = MachineFurnaceComponent.getSlots(ev.block);

    // Pops the output items
    if (!heldItem.hasItem()) {
        // Dump the output item
        if (!slots.outputSlot.hasItem()) {
            return;
        }

        const loc = ev.block.center();
        const itemLoc = {
            x: loc.x,
            y: loc.y + 0.5,
            z: loc.z,
        };

        ev.dimension.spawnItem(slots.outputSlot.getItem(), itemLoc);

        // Remove item from output slot
        slots.outputSlot.setItem();

        return;
    }

    const outputItemId = tryGetOutputForItem(heldItem);

    if (outputItemId === undefined) {
        return;
    }

    // Store the input item into the machine's first slot
    const linkedEntity = MachineCustomComponent.getLinkedMachineEntity(ev.block);
    const linkedCon = linkedEntity.getComponent("minecraft:inventory").container;

    con.moveItem(ev.player.selectedSlotIndex, 0, linkedCon);

    // Set state to cooking
    MachineFurnaceComponent.startCooking(ev.block);
}, {
    furnace_states: [MachineFurnaceState.IDLE],
})

MachineFurnaceComponent.registerInteractEvent((ev) => {
    const slots = MachineFurnaceComponent.getSlots(ev.block);

    if (!slots.outputSlot.hasItem()) {
        return;
    }

    const loc = ev.block.center();
    const itemLoc = {
        x: loc.x,
        y: loc.y + 0.5,
        z: loc.z,
    };

    ev.dimension.spawnItem(slots.outputSlot.getItem(), itemLoc);

    // Remove item from output slot
    slots.outputSlot.setItem();
}, {
    furnace_states: [MachineFurnaceState.COOKING, MachineFurnaceState.OUT_OF_POWER, MachineFurnaceState.OUTPUT_FULL]
})

// COOKING events
MachineFurnaceComponent.registerTickEvent((ev, params) => {
    const inputSlot = MachineCustomComponent.getMachineContainer(ev.block)!.getSlot(0);

    if (!inputSlot.hasItem()) {
        // Reset progress and return to IDLE
        MachineFurnaceComponent.setCookProgress(ev.block, 0);
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.IDLE);
        return;
    } else if (tryGetOutputForItem(inputSlot) === undefined) {
        // Invalid input item
        MachineFurnaceComponent.setCookProgress(ev.block, 0);
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.INVALID_INPUT);
        return;
    }

    // Set furnace status line
    const progress = MachineFurnaceComponent.getCookProgress(ev.block);

    // Check if the furnace needs to go to OUT_OF_POWER
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < params.energy_cost) {
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.OUT_OF_POWER);
        return;
    }

    // remove energy
    kwMachine.removeEnergy(params.energy_cost);

    if (progress < params.cook_time - 1) {
        // Increase progress by 1 and return
        MachineFurnaceComponent.addCookProgress(ev.block, 1);

        return;
    }

    // Cook time is done, try and cook item then reset progress
    const cookResult = MachineFurnaceComponent.cookStoredItem(ev.block);

    switch (cookResult) {
        case FurnaceCookResult.InvalidInput:
            MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.INVALID_INPUT)
            break;
        case FurnaceCookResult.Cooked:
            // Reset progress
            MachineFurnaceComponent.setCookProgress(ev.block, 0);
            break;
        case FurnaceCookResult.NoInput:
            // Return to IDLE
            MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.IDLE);
            break;
        case FurnaceCookResult.MismatchedOutput:
        case FurnaceCookResult.OutputFull:
            MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.OUTPUT_FULL);
            break;
        default:
            throw new Error("Unhandled result: " + cookResult);
    }
}, {
    furnace_states: [MachineFurnaceState.COOKING],
})

// OUT_OF_POWER events
MachineFurnaceComponent.registerTickEvent((ev, params) => {
    // Set furnace status line

    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy >= params.energy_cost) {

        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.COOKING);

        return;
    }
}, {
    furnace_states: [MachineFurnaceState.OUT_OF_POWER],
})

// OUTPUT_FULL events
MachineFurnaceComponent.registerTickEvent((ev, params) => {
    // Set furnace status line

    // Check why its full
    const furnCon = MachineCustomComponent.getMachineContainer(ev.block);
    if (furnCon === undefined) {
        // Not yet init
        return;
    }

    const inputSlot = furnCon.getSlot(0);
    const outputSlot = furnCon.getSlot(1);

    if (!outputSlot.hasItem()) {
        // Output slot no longer full, return to cooking
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.COOKING);
        return;
    }

    if (!inputSlot.isStackableWith(outputSlot.getItem())) {
        // Mismatched input and output
        return;
    }

    if (outputSlot.amount < outputSlot.maxAmount) {
        // Space freed, return to cooking
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.OUTPUT_FULL);
        return;
    }
}, {
    furnace_states: [
        MachineFurnaceState.OUTPUT_FULL,
    ]
})

// INVALID_INPUT events
MachineFurnaceComponent.registerTickEvent((ev, params) => {
    // Set furnace status line

    // Check if still invalid
    const inputSlot = MachineCustomComponent.getMachineContainer(ev.block).getSlot(0);

    if (!inputSlot.hasItem()) {
        // Input empty, go to IDLE
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.IDLE);
        return;
    }

    if (tryGetOutputForItem(inputSlot) !== undefined) {
        // Input item valid recipe item, go to COOKING
        MachineFurnaceComponent.setState(ev.block, MachineFurnaceState.COOKING);
        return;
    }
}, {
    furnace_states: [
        MachineFurnaceState.INVALID_INPUT,
    ]
})

MachineFurnaceComponent.registerInteractEvent((ev, params) => {
    // Pop invalid items into the world
    const inputSlot = MachineCustomComponent.getMachineContainer(ev.block).getSlot(0);

    if (!inputSlot.hasItem()) {
        // Input empty, nothing to pop and is about to return to IDLE
        return;
    }

    if (tryGetOutputForItem(inputSlot) !== undefined) {
        // Input item valid recipe item, about to go to COOKING
        return;
    }

    const inputItem = inputSlot.getItem();
    inputSlot.setItem();

    ev.dimension.spawnItem(inputItem, ev.block.location);
}, {
    furnace_states: [
        MachineFurnaceState.INVALID_INPUT,
    ]
})