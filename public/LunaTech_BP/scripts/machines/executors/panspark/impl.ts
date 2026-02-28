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

import { bookTools } from "../../../tools/book";
import { MachineCustomComponent } from "../../component";
import { BlockPanSparkExecutorComponent } from "./component";

/// Blocks that run PanSpark
const RUNNERS: `${string}:${string}`[] = [
    "lunatech:microcontroller"
]

// Clearing scoreboards/VM data on break
MachineCustomComponent.registerBreakEvent((ev) => {
    BlockPanSparkExecutorComponent.unregisterBlockVM(ev.block);
}, {
    machineId: RUNNERS
})

// Managing the UNINIT interaction of the PanSpark Executor
BlockPanSparkExecutorComponent.registerOnInteractEvent((ev) => {
    // Power required for interaction
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < 1) {
        return;
    }

    // Get the item the player is holding
    const playerCon = ev.player.getComponent("minecraft:inventory").container;

    const heldItem = playerCon.getItem(ev.player.selectedSlotIndex);

    // Check if the held item is a book
    if (heldItem === undefined || !bookTools.isBook(heldItem)) {
        return;
    }

    BlockPanSparkExecutorComponent.storeCode(ev.block, bookTools.getFullContentsFromItemAsString(heldItem))
}, {
    machineId: RUNNERS,
    state: ["UNINIT"]
})

// Managing the IDLE interaction of the PanSpark Executor
BlockPanSparkExecutorComponent.registerOnInteractEvent((ev) => {
    // Power required for interaction
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < 1) {
        return;
    }

    kwMachine.removeEnergy(1);

    BlockPanSparkExecutorComponent.startCompile(ev.block);
}, {
    machineId: RUNNERS,
    state: ["IDLE"]
})

// Managing the COMPILE state of the PanSpark executor
BlockPanSparkExecutorComponent.registerOnTickEvent((ev) => {
    // Power required for tick
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < 1) {
        return;
    }

    kwMachine.removeEnergy(1);

    // Step the compiling
    BlockPanSparkExecutorComponent.stepCompile(ev.block);
}, {
    machineId: RUNNERS,
    state: ["COMPILING"]
})

// Managing the RUNNING state of the PanSpark executor
BlockPanSparkExecutorComponent.registerOnTickEvent((ev) => {
    // Power required for tick
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine.currentEnergy < 1) {
        return;
    }

    kwMachine.removeEnergy(1);

    BlockPanSparkExecutorComponent.stepRun(ev.block);
}, {
    machineId: RUNNERS,
    state: ["RUNNING"]
})

// Managing OUTPUT from the PanSpark Executor
BlockPanSparkExecutorComponent.registerOnOutputEvent((ev) => {
    ev.block.dimension.getPlayers({
        maxDistance: 16,
        location: ev.block.location,
    }).forEach((player) => {
        player.sendMessage(`[Microcontroller]: ${ev.outputBuffer.join("           \n")}`);
    })
}, {})