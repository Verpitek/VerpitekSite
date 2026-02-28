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

import { Block, BlockComponentTickEvent, BlockCustomComponent, BlockVolume, CustomComponentParameters, Player, system } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../../../constants";
import { registerStartupEvent } from "../../../events";

/**
 * Every tick the watermill needs to check how many waterblocks are are immediatly touching it and generates a small amount of power
 * based on that count. The watermill will consider itself a block of power to give it a solid 9 blocks max to evenly space it out by 3
 * 
 * For every 3 blocks of water found, 1 more EU is produced in the tick
 */

export type WatermillMachineComponentTickEvent = (ev: BlockComponentTickEvent, params: CustomComponentParameters) => void;

export class WatermillMachineComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":machine.watermill";

    constructor() {
        this.onTick = this.onTick.bind(this);
    }

    static ON_TICK_EVENTS: WatermillMachineComponentTickEvent[] = [];

    static registerOnTick(cb: WatermillMachineComponentTickEvent) {
        this.ON_TICK_EVENTS.push(cb);
    }

    onTick(ev, params) {
        for (const cb of WatermillMachineComponent.ON_TICK_EVENTS) {
            cb(ev, params)
        }
    }

    static calculateEnergyProduction(blk: Block) {
        const loc = blk.location;

        const minCorner = {
            x: loc.x - 1,
            y: loc.y - 1,
            z: loc.z - 1
        }

        const maxCorner = {
            x: loc.x + 1,
            y: loc.y + 1,
            z: loc.z + 1
        }

        const volume = new BlockVolume(minCorner, maxCorner);

        const blocks = blk.dimension.getBlocks(volume, {
            includeTypes: ["minecraft:water", "minecraft:flowing_water"]
        });

        let size = 1;
        const iter = blocks.getBlockLocationIterator();
        for (const location of iter) {
            size += 1;
        }

        return Math.floor(size / 3);
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(WatermillMachineComponent.ID, new WatermillMachineComponent());
})