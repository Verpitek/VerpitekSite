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

	import { Block, BlockCustomComponent, system } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../../../constants";
import { registerStartupEvent } from "../../../events";
import { BlockPanSparkExecutorComponent } from "../panspark/component";

export enum MICROCONTROLLER_STATES {
    "FRONT" = "lunatech:power.front",
    "BACK" = "lunatech:power.back",
    "LEFT" = "lunatech:power.left",
    "RIGHT" = "lunatech:power.right"
}

export enum MICROCONTROLLER_STATE_MEM_MAP {
    "lunatech:power.front" = 0,
    "lunatech:power.back" = 1,
    "lunatech:power.left" = 2,
    "lunatech:power.right" = 3
}

export const MICROCONTROLLER_MEM_MAP_TO_DIRECTION = ["north", "south", "west", "east"];

export class MicrocontrollerBlockComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":machine.microcontroller";

    static directionToSideState(block: Block, direction: "NORTH" | "SOUTH" | "EAST" | "WEST") {
        // TODO: Update this when rotations are implemented
        switch (direction) {
            case "NORTH":
                return MICROCONTROLLER_STATES.FRONT;
            case "SOUTH":
                return MICROCONTROLLER_STATES.BACK;
            case "WEST":
                return MICROCONTROLLER_STATES.LEFT;
            case "EAST":
                return MICROCONTROLLER_STATES.RIGHT;
        }
    }

    static getSideStates(block: Block) {
        return block.permutation.getAllStates() as Record<MICROCONTROLLER_STATES, boolean>;
    }

    static setMultipleSidesEnabled(block: Block, values: Record<MICROCONTROLLER_STATES, boolean>) {
        let newPerm = block.permutation

        for (const [key, value] of Object.entries(values)) {
            newPerm = newPerm.withState(key, value);
        }

        const dim = block.dimension;
        const loc = block.location;
        const blockType = block.typeId;

        // Setting block to air to refresh redstone component
        dim.setBlockType(loc, "minecraft:air");

        // Setting back to the microcontroller with the new state
        dim.setBlockType(loc, blockType);
        dim.setBlockPermutation(block.location, newPerm);

        block.setPermutation(newPerm);
    }

    static getSidePowerLevel(block: Block, side: MICROCONTROLLER_STATES) {
        const vm = BlockPanSparkExecutorComponent.getOrCreateBlockVM(block);

        const sideMemLoc = MICROCONTROLLER_STATE_MEM_MAP[side]

        const currentValue = vm.machineMemory[sideMemLoc];

        if (currentValue === undefined) {
            return 0;
        }

        return currentValue;
    }

    static setSideEnabled(block: Block, side: MICROCONTROLLER_STATES, value: boolean = true) {
        const newPerm = block.permutation
            .withState(side, value);

        const dim = block.dimension;
        const loc = block.location;
        const blockType = block.typeId;

        // Setting block to air to refresh redstone component
        dim.setBlockType(loc, "minecraft:air");

        // Setting back to the microcontroller with the new state
        dim.setBlockType(loc, blockType);
        dim.setBlockPermutation(block.location, newPerm);

        block.setPermutation(
            block.permutation
                .withState(side, value)
        )
    };
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(MicrocontrollerBlockComponent.ID, new MicrocontrollerBlockComponent());
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    if (ev.id !== "lt:btest") {
        return;
    }

    const mesSplit = ev.message.split(" ");

    const loc = {
        x: parseInt(mesSplit[0]),
        y: parseInt(mesSplit[1]),
        z: parseInt(mesSplit[2])
    }

    const side = MICROCONTROLLER_STATES[mesSplit[3].toUpperCase()];
    if (side === undefined) {
        throw new Error("Unknown side ID: " + mesSplit[3].toUpperCase())
    }

    const block = ev.sourceEntity.dimension.getBlock(loc);

    // Set the block state
    const permutation = block.permutation;

    ev.sourceEntity.dimension.setBlockType(loc, "minecraft:air");
    ev.sourceEntity.dimension.setBlockType(loc, "lunatech:microcontroller");
    ev.sourceEntity.dimension.setBlockPermutation(loc, permutation);

    const currentState = permutation.getState(side) as boolean;

    MicrocontrollerBlockComponent.setSideEnabled(block, side, !currentState);
})