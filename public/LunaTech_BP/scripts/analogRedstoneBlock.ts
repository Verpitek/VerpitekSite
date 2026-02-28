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

import { registerStartupEvent } from "./events";
import { Block, BlockComponentOnPlaceEvent, BlockComponentTickEvent, BlockCustomComponent } from "@minecraft/server";
import { BlockEntityLinkComponent } from "./entityLinking/component";

// This component handles the redstone event for the Analog Redstone Block
export class AnalogRedstoneBlockComponent implements BlockCustomComponent {
    static ID: string = "lunatech:analog_redstone_block";

    static setPower(blk: Block, value: number) {
        if (value > 15) {
            value = 15;
        } else if (value < 0) {
            value = 0;
        }

        const permuation = blk.permutation;

        blk.setPermutation(permuation.withState("lunatech:redstone_signal", value));
    }

    static getPower(blk: Block) {
        return blk.permutation.getState("lunatech:redstone_signal") as number
    }

    onTick(ev: BlockComponentTickEvent) {
        const powerState = ev.block.permutation.getState("lunatech:redstone_signal") as number;

        // Update linked entities properties to match powerState
        const linkedVisualEnt = BlockEntityLinkComponent.getLinkedEntity(ev.block, "visual");
        if (linkedVisualEnt === undefined) {
            // Entity doesn't exist yet
            return;
        }

        linkedVisualEnt.setProperty("lunatech:power_level", powerState);
    }

    onPlace(ev: BlockComponentOnPlaceEvent) {
        const blockLoc = ev.block.location;

        // Create visual entity and link
        const loc = {
            x: blockLoc.x + 0.5,
            y: blockLoc.y - 0.007,
            z: blockLoc.z + 0.5
        }

        const placementDir = ev.block.permutation.getState("minecraft:cardinal_direction") as "north" | "south" | "east" | "west";

        let rotation;
        switch (placementDir) {
            case "north":
                rotation = 180;
                break;
            case "south":
                rotation = 0;
                break;
            case "east":
                rotation = 270;
                break;
            case "west":
                rotation = 90;
                break;
        }

        // Summon the visual entity at the block location
        const entity = ev.dimension.spawnEntity("lunatech:analog_redstone_block_visual", loc, {
            initialRotation: rotation
        });
        BlockEntityLinkComponent.registerLinkedEntity(ev.block, "visual", entity);
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(AnalogRedstoneBlockComponent.ID, new AnalogRedstoneBlockComponent());
})