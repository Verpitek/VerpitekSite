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

import { Block } from "@minecraft/server";
import { redstoneTools } from "../../../tools/redstone";
import { BlockPanSparkExecutorComponent } from "../panspark/component";
import { MicrocontrollerBlockComponent, MICROCONTROLLER_MEM_MAP_TO_DIRECTION, MICROCONTROLLER_STATES, MICROCONTROLLER_STATE_MEM_MAP } from "./component";

/**
 * RUNNING Tick Event Loop
 * 
 * For each Microcontroller in the world that is actively running, the below callback is fired.
 * 
 * The loop manages the Machine registers in the PanSpark VM, specifically reading from X0-X3
 * for updating its redstone output and writing to X4-X7 for redstone input
 */
BlockPanSparkExecutorComponent.registerOnTickEvent((ev) => {
    const sideStates = MicrocontrollerBlockComponent.getSideStates(ev.block);

    const machMem = ev.vm.machineMemory;
    const outputSlice = machMem.slice(0, 4);

    const newObject: Partial<Record<MICROCONTROLLER_STATES, boolean>> = {};
    let hasUpdate = false;

    // Create a new object with just the target states that are different from the current states
    for (const [key, value] of Object.entries(sideStates)) {
        if (!key.startsWith("lunatech:power.")) {
            continue;
        }

        // Check if the block has an analog set option
        const memIndex = MICROCONTROLLER_STATE_MEM_MAP[key];

        const dir = MICROCONTROLLER_MEM_MAP_TO_DIRECTION[memIndex];
        const targetBlk = ev.block[dir]() as Block;
        const analogTarget = outputSlice[memIndex];

        if (redstoneTools.trySetBlockAnalogRedPower(targetBlk, analogTarget)) {
            // Disable redstone output on that side
            if (value) {
                newObject[key] = false;
            }

            continue;
        }

        const target = outputSlice[memIndex] > 0;

        if (value !== target) {
            hasUpdate = true;
            newObject[key] = target;
        }
    }

    if (hasUpdate) {
        MicrocontrollerBlockComponent.setMultipleSidesEnabled(
            ev.block,
            newObject as Record<MICROCONTROLLER_STATES, boolean>
        );
    }

    // Reading the power around the microcontroller and setting the machine memory values
    const frontBlk = ev.block.north();
    const backBlk = ev.block.south();
    const leftBlk = ev.block.west();
    const rightBlk = ev.block.east()

    machMem[4] = redstoneTools.tryGetBlockRedPower(frontBlk, "SOUTH") ?? 0;
    machMem[5] = redstoneTools.tryGetBlockRedPower(backBlk, "NORTH") ?? 0;
    machMem[6] = redstoneTools.tryGetBlockRedPower(leftBlk, "EAST") ?? 0;
    machMem[7] = redstoneTools.tryGetBlockRedPower(rightBlk, "WEST") ?? 0;
}, {
    machineId: ["lunatech:microcontroller"],
    state: ["RUNNING"],
})