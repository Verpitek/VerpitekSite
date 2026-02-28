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

import { Block, BlockComponentTickEvent, BlockCustomComponent, BlockVolume, CustomComponentParameters } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../../../constants";
import { registerStartupEvent } from "../../../events";

export type WindmillMachineComponentTickEvent = (ev: BlockComponentTickEvent, params: CustomComponentParameters) => void;

export class WindmillMachineComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":machine.windmill";

    constructor() {
        this.onTick = this.onTick.bind(this);
    }

    static ON_TICK_EVENTS: WindmillMachineComponentTickEvent[] = [];

    static registerOnTick(ev: WindmillMachineComponentTickEvent) {
        if (!this.ON_TICK_EVENTS.includes(ev)) {
            this.ON_TICK_EVENTS.push(ev);
        }
    }

    onTick(ev: BlockComponentTickEvent, params) {
        for (const cb of WindmillMachineComponent.ON_TICK_EVENTS) {
            cb(ev, params);
        }
    }

    static calculateEnergyProduction(blk: Block) {
        /*
            Windmills energy is calculated based on 2 factors:
            - Height above sea-level
            - Obstruction by *any* block in a 9x9x7 space around it
 
            Windmills energy can be modified by 2 mutually-exclusive factors
            - During a Thunderstorm energy is boosted by 50%
            - During a Rainy period energy is boosted by 20%
        */

        const loc = blk.location;

        if (loc.y < 64) {
            // Placed below sea-level, unable to generate any energy
            return 0;
        }

        const minCorner = {
            x: loc.x - 4,
            y: loc.y - 2,
            z: loc.z - 4
        }

        const maxCorner = {
            x: loc.x + 4,
            y: loc.y + 4,
            z: loc.z + 4
        }

        const volume = new BlockVolume(minCorner, maxCorner);

        const blocks = blk.dimension.getBlocks(volume, {
            excludeTypes: ["minecraft:air"]
        });

        let obstructionCount = 0;
        for (const location of blocks.getBlockLocationIterator()) {
            obstructionCount += 1;
        }

        let effectiveHeight = loc.y - obstructionCount - 64;

        if (effectiveHeight < 0) {
            // Placed near too many obstructing blocks, cant produce energy
            return 0;
        }

        return Math.round(effectiveHeight * 0.05905512);
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(WindmillMachineComponent.ID, new WindmillMachineComponent());
})