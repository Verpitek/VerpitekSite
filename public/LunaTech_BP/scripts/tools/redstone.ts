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

const REDSTONE_POWER_KEY_MAP = {
    "minecraft:redstone_wire": "redstone_signal"
}

export class RedstoneTools {
    // Stores callbacks used for getter/setting power from non-producer blocks
    RED_POWER_GETS: Record<string, RedPowerGetter> = {};

    // Stores callbacks used for setting power in blocks with the analog capability
    RED_POWER_SETS: Record<string, RedPowerSetter> = {};

    getBlockRedstonePower(blk: Block) {
        const stateKey = REDSTONE_POWER_KEY_MAP[blk.typeId];

        if (stateKey === undefined) {
            return 0;
        }

        return blk.permutation.getState(stateKey) as number;
    }

    registerRedPowerGet(blockId: string, getter: RedPowerGetter) {
        this.RED_POWER_GETS[blockId] = getter;
    }

    // For blocks with special-set options outside of the redstone system, will eventually be favored for the redstone_consumer component
    registerRedPowerSet(blockId: string, setter: RedPowerSetter) {
        this.RED_POWER_SETS[blockId] = setter;
    }

    tryGetBlockRedPower(blk: Block, direction: "NORTH" | "SOUTH" | "EAST" | "WEST") {
        const getter = this.RED_POWER_GETS[blk.typeId];

        if (getter === undefined) {
            return undefined;
        }

        return getter(blk, direction);
    }

    trySetBlockAnalogRedPower(blk: Block, power: number) {
        const setter = this.RED_POWER_SETS[blk.typeId];

        if (setter === undefined) {
            return false;
        }

        setter(blk, power);

        return true;
    }

    /*trySetBlockRedPower(blk: Block, value: number) {
        const setter = this.RED_POWER_GETS_SETS[blk.typeId]?.set;

        if (setter === undefined) {
            return false;
        }

        return setter(blk, value);
    }*/
}

export const redstoneTools = new RedstoneTools();

type RedPowerGetter = (blk: Block, direction: "NORTH" | "SOUTH" | "EAST" | "WEST") => number
type RedPowerSetter = (blk: Block, value: number) => void;