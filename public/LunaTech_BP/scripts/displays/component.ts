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

import { Block, BlockComponentTickEvent, BlockCustomComponent, CustomComponentParameters, ScoreboardObjective, Vector3, world } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../constants";
import { registerStartupEvent } from "../events";
import { MachineCustomComponent } from "../machines/component";
import { CraftingMachineComponent } from "../machines/crafter/component";

/// Power is implied through 
export enum DisplayModelDesign {
    /// Simple Analogue dial that just displays power
    PowerOnly,
    /// Includes Power, Progress, and Input Slot trackers
    PowerProgressInput,
    /// Includes Power, Progress, Input Slot, and Output Slot trackers
    PowerProgressInOutput,
    /// Includes Power and Inventory Slot trackers
    PowerInv,
}

const MODEL_HAS_PROGRESS = [DisplayModelDesign.PowerProgressInput, DisplayModelDesign.PowerProgressInOutput];
const MODEL_HAS_INPUT = [DisplayModelDesign.PowerProgressInput, DisplayModelDesign.PowerProgressInOutput];
const MODEL_HAS_OUTPUT = [DisplayModelDesign.PowerProgressInOutput];
const MODEL_HAS_INV = [DisplayModelDesign.PowerInv];

export interface MachineDisplayComponentParameters {
    content: DisplayModelDesign,
    offset?: Vector3,
    flip_progress?: boolean
}

type MachineDisplayBlock = {
    __displayCmpCache?: MachineDisplayComponentParameters,
    __displayCmpScoreboardObj?: ScoreboardObjective
}

export interface MachineDisplayComponentEventOptions {
    machineId?: string[],
}

type MachineDisplayComponentOnTickCallback = (ev: BlockComponentTickEvent, params: MachineDisplayComponentParameters) => Promise<void> | void;

export class MachineDisplayComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":machine.display";

    static ON_TICK_EVENTS: Record<string, MachineDisplayComponentOnTickCallback[]> = {};

    constructor() {
        this.onTick = MachineDisplayComponent.onEvent.bind(this, MachineDisplayComponent.ON_TICK_EVENTS);
    }

    onTick() {
        throw new Error("STUB");
    }

    static registerOnTick(cb: MachineDisplayComponentOnTickCallback, options: MachineDisplayComponentEventOptions = {}) {
        this.registerEvent(this.ON_TICK_EVENTS, cb, options);
    }

    private static registerEvent(storage: Record<string, CallableFunction[]>, cb: CallableFunction, options: MachineDisplayComponentEventOptions) {
        if (options.machineId === undefined) {
            options.machineId = ['ALL']
        }

        for (const machId of options.machineId) {
            let eventList = storage[machId];
            if (eventList === undefined) {
                eventList = [cb];
                storage[machId] = eventList;
            } else {
                eventList.push(cb);
            }
        }
    }

    static onEvent(cbStorage: Record<string, CallableFunction[]>, ev: { block: Block }, rawParams: CustomComponentParameters) {
        const blk = ev.block;

        const params = rawParams.params as MachineDisplayComponentParameters;

        const allList = cbStorage['ALL'];
        if (allList !== undefined) {
            for (const event of allList) {
                const res = event(ev, params);

                if (res instanceof Promise) {
                    res.then();
                }
            }
        }

        const machCmp = blk.getComponent("lunatech:machine");
        if (machCmp === undefined) {
            // Block is no longer a machine
            return;
        }

        const machineId = machCmp.customComponentParameters.params["machine_id"];

        const specList = cbStorage[machineId];
        if (specList !== undefined) {
            for (const event of specList) {
                const res = event(ev, params);

                if (res instanceof Promise) {
                    res.then();
                }
            }
        }
    }

    static getAndCacheCmp(blk: Block): MachineDisplayComponentParameters {
        let cache = (blk as MachineDisplayBlock).__displayCmpCache
        if (cache !== undefined) {
            return cache;
        }

        const cmp = blk.getComponent(this.ID);
        if (cmp === undefined) {
            throw new Error("Provided block is not a Crafter Machine!");
        }

        (blk as MachineDisplayBlock).__displayCmpCache = cmp.customComponentParameters.params as MachineDisplayComponentParameters;

        return cmp.customComponentParameters.params as MachineDisplayComponentParameters;
    }

    static getOrCacheScoreboardObj(blk: Block) {
        let cache = (blk as MachineDisplayBlock).__displayCmpScoreboardObj;
        if (cache !== undefined) {
            return cache;
        }

        const loc = blk.location;
        const objId = `lunatech:machine.display:${blk.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        let obj = world.scoreboard.getObjective(objId);
        if (obj === undefined) {
            obj = world.scoreboard.addObjective(objId);
        }

        (blk as MachineDisplayBlock).__displayCmpScoreboardObj = obj;

        return obj;
    }

    static createDisplayEnt(blk: Block, offset?: Vector3) {
        const cmp = this.getAndCacheCmp(blk);

        if (offset === undefined) {
            offset = { x: 0, y: 0, z: 0 }
        }

        const loc = blk.location;
        const entLocation = {
            x: loc.x + offset.x + 0.5,
            y: loc.y + offset.y + 1.2,
            z: loc.z + offset.z + 0.5,
        }

        const ent = blk.dimension.spawnEntity("lunatech:machine_ui", entLocation);

        // Set display model
        ent.setProperty("lunatech:model", cmp.content);

        // Link entity to machine
        MachineCustomComponent.addLinkedEntity(blk, ent);

        // Store entity in scoreboard
        const obj = this.getOrCacheScoreboardObj(blk);
        obj.addScore(ent.id, 0);

        return ent;
    }

    static getDisplayEnt(blk: Block) {
        const obj = this.getOrCacheScoreboardObj(blk);

        const participants = obj.getParticipants();

        if (participants.length > 1) {
            throw new Error("Invalid number of participants in display scoreboard");
        }

        return participants[0]?.getEntity();
    }

    static updateDisplay(blk: Block) {
        // Check if block still has display cmp, return if not
        if (blk.getComponent(this.ID) === undefined) {
            return;
        }

        const ent = this.getDisplayEnt(blk);
        const cmp = this.getAndCacheCmp(blk);

        const kwMachine = MachineCustomComponent.getKylowatMachine(blk);

        if (kwMachine === undefined) {
            return;
        }

        const displayModel = cmp.content;
        ent.setProperty("lunatech:model", displayModel);

        const powerPercentage = (kwMachine.currentEnergy / kwMachine.maxEnergy) * 100;
        ent.setProperty("lunatech:power_dial", powerPercentage);

        // TODO: Make progress sourcing generic, currently requires crafter
        if (MODEL_HAS_PROGRESS.includes(displayModel)) {
            // Has both input and a progress
            const progress = MachineCustomComponent.getProgress(blk);
            const maxProgress = MachineCustomComponent.getMaxProgress(blk);

            let progressPercentage = (progress / maxProgress) * 100;

            if (cmp.flip_progress !== undefined && cmp.flip_progress) {
                progressPercentage = 100 - progressPercentage;
            }

            ent.setProperty("lunatech:progress_dial", progressPercentage);
        }

        if (MODEL_HAS_INPUT.includes(displayModel)) {
            const inputSlot = MachineCustomComponent.getSlotFromName(blk, "INPUT");
            let inputPercentage;
            if (inputSlot.hasItem()) {
                inputPercentage = (inputSlot.amount / inputSlot.maxAmount) * 100;
            } else {
                inputPercentage = 0;
            }

            ent.setProperty("lunatech:input_percentage", inputPercentage)
        }

        if (MODEL_HAS_OUTPUT.includes(displayModel)) {
            const outputSlot = MachineCustomComponent.getSlotFromName(blk, "OUTPUT");
            let outputPercentage;
            if (outputSlot.hasItem()) {
                outputPercentage = (outputSlot.amount / outputSlot.maxAmount) * 100;
            } else {
                outputPercentage = 0;
            }

            ent.setProperty("lunatech:output_percentage", outputPercentage)
        }

        if (MODEL_HAS_INV.includes(displayModel)) {
            const invSlots = MachineCustomComponent.getMachineInvSlots(blk);

            for (let i = 0; i < invSlots.length; i++) {
                // Set property based off amount to max percentage

                const slot = invSlots[i];

                if (!slot.hasItem()) {
                    ent.setProperty(`lunatech:inv_${i}_percentage`, 0);
                } else {
                    ent.setProperty(`lunatech:inv_${i}_percentage`, (slot.amount / slot.maxAmount) * 100);
                }
            }
        }
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(MachineDisplayComponent.ID, new MachineDisplayComponent());
})