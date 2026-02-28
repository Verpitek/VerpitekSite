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
import { AnalogRedstoneBlockComponent } from "../../analogRedstoneBlock";
import { MicrocontrollerBlockComponent } from "../../machines/executors/microcontroller/component";
import { redstoneTools } from "../redstone";


// Register getters/setters for custom Redstone Producers within LunaTech
redstoneTools.registerRedPowerGet("lunatech:microcontroller",
    (blk: Block, direction: "NORTH" | "SOUTH" | "EAST" | "WEST") => {
        // Check the power being sent in the given direction
        const side = MicrocontrollerBlockComponent.directionToSideState(blk, direction);

        return MicrocontrollerBlockComponent.getSidePowerLevel(blk, side);
    }
)

redstoneTools.registerRedPowerGet("lunatech:analog_redstone_block",
    (blk: Block) => {
        return AnalogRedstoneBlockComponent.getPower(blk);
    }
)
redstoneTools.registerRedPowerSet("lunatech:analog_redstone_block",
    (blk: Block, value: number) => {
        value = Math.max(Math.min(value, 15), 0);

        AnalogRedstoneBlockComponent.setPower(blk, value);
    }
)