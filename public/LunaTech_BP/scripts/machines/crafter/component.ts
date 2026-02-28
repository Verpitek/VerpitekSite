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

import { Block, BlockComponentPlayerBreakEvent, BlockComponentPlayerInteractEvent, BlockComponentTickEvent, BlockCustomComponent, CustomComponentParameters, ScoreboardObjective, system, world } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../../constants";
import { registerStartupEvent } from "../../events";
import { MachineCustomComponent } from "../component";
import { getOutputForItem } from "./recipeManager";

export enum CraftingMachineStates {
    NO_INPUT = "NO_INPUT",
    INSUFFICIENT_INPUT = "INSUFFICIENT_INPUT",
    INVALID_INPUT = "INVALID_INPUT",
    INPUT_MISMATCH = "INPUT_MISMATCH",
    CRAFTING = "CRAFTING",
    OUTPUT_FULL = "OUTPUT_FULL",
    OUT_OF_ENERGY = "OUT_OF_ENERGY"
}

export interface CraftingMachineComponentParameters {
    input_slot: number,
    output_slot: number,
    craft_time: number,
    energy_consumption: number,
    crafting_tag: string,
}

export interface CraftingMachineComponentEventOptions {
    machineState?: string[],
    machineId?: string[],
}

type CraftingMachineComponentOnTickCallback = (ev: BlockComponentTickEvent, params: CraftingMachineComponentParameters) => Promise<void> | void;
type CraftingMachineComponentInteractCallback = (ev: BlockComponentPlayerInteractEvent, params: CraftingMachineComponentParameters) => Promise<void> | void;
type CraftingMachineComponentBreakCallback = (ev: BlockComponentPlayerBreakEvent, params: CraftingMachineComponentParameters) => Promise<void> | void;

type CrafterMachineBlock = {
    __crafterCmpCache?: CraftingMachineComponentParameters,
    __crafterCmpScoreboardObj?: ScoreboardObjective
}

/**
 * Indicates a machine is capable of crafting
 */
export class CraftingMachineComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":machine.crafter";
    static STATE_ID: string = ADDON_NAMESPACE + ":machine.crafter.state";

    // Block ID -> Machine ID -> Callback[]
    static ON_TICK_EVENTS: Record<string, Record<string, CraftingMachineComponentOnTickCallback[]>> = {};
    static ON_INTERACT_EVENTS: Record<string, Record<string, CraftingMachineComponentInteractCallback[]>> = {};
    static ON_BREAK_EVENTS: Record<string, Record<string, CraftingMachineComponentBreakCallback[]>> = {};

    constructor() {
        const This = CraftingMachineComponent;

        this.onTick = This.onEvent.bind(this, This.ON_TICK_EVENTS);
        this.onPlayerInteract = This.onEvent.bind(this, This.ON_INTERACT_EVENTS);
        // this.onPlayerBreak = This.onEvent.bind(this, This.ON_BREAK_EVENTS);
    }

    static registerOnTick(cb: CraftingMachineComponentOnTickCallback, options: CraftingMachineComponentEventOptions = {}) {
        this.registerEvent(this.ON_TICK_EVENTS, cb, options);
    }

    static registerOnInteract(cb: CraftingMachineComponentInteractCallback, options: CraftingMachineComponentEventOptions = {}) {
        this.registerEvent(this.ON_INTERACT_EVENTS, cb, options);
    }

    static registerOnBreak(cb: CraftingMachineComponentBreakCallback, options: CraftingMachineComponentEventOptions = {}) {
        this.registerEvent(this.ON_BREAK_EVENTS, cb, options);
    }

    private static registerEvent(storage: Record<string, Record<string, CallableFunction[]>>, cb: CallableFunction, options: CraftingMachineComponentEventOptions) {
        if (options.machineState === undefined) {
            options.machineState = ['ALL'];
        } else if (options.machineState.includes("BLACKLIST")) {
            // Invert the list
            options.machineState = Object.keys(CraftingMachineStates).filter((value) => {
                return !options.machineState.includes(value);
            })
        }

        if (options.machineId === undefined) {
            options.machineId = ['ALL'];
        }

        for (const state of options.machineState) {
            let blkStateGroup = storage[state];

            if (blkStateGroup === undefined) {
                blkStateGroup = {};
                storage[state] = blkStateGroup;
            }

            for (const machId of options.machineId) {
                let eventList = blkStateGroup[machId];
                if (eventList === undefined) {
                    eventList = [cb];
                    blkStateGroup[machId] = eventList;
                } else {
                    eventList.push(cb);
                }
            }
        }
    }

    onTick() {
        throw new Error("STUB");
    }

    onPlayerInteract() {
        throw new Error("STUB");
    }

    /*onPlayerBreak() {
        throw new Error("STUB");
    }*/

    static onEvent(cbStorage: Record<string, Record<string, CallableFunction[]>>, ev: { block: Block }, rawParams: CustomComponentParameters) {
        const blk = ev.block;

        const state = blk.permutation.getState(CraftingMachineComponent.STATE_ID) as CraftingMachineStates;

        const machCmp = blk.getComponent("lunatech:machine");
        if (machCmp === undefined) {
            throw new Error("Tried to tick a block that isn't a machine!");
        }

        const machineId = machCmp.customComponentParameters.params["machine_id"];

        let groups = [cbStorage['ALL'], cbStorage[state]];

        let params = rawParams.params as CraftingMachineComponentParameters;

        for (const group of groups) {
            if (group === undefined) {
                continue;
            }

            const allList = group['ALL'];
            if (allList !== undefined) {
                for (const event of allList) {
                    const res = event(ev, params);

                    if (res instanceof Promise) {
                        res.then();
                    }
                }
            }

            const specList = group[machineId];
            if (specList !== undefined) {
                for (const event of specList) {
                    const res = event(ev, params);

                    if (res instanceof Promise) {
                        res.then();
                    }
                }
            }
        }
    }

    static setState(blk: Block, state: CraftingMachineStates) {
        const permutation = blk.permutation;

        blk.setPermutation(permutation.withState(CraftingMachineComponent.STATE_ID, state));
    }

    static getAndCacheCmp(blk: Block): CraftingMachineComponentParameters {
        let cache = (blk as CrafterMachineBlock).__crafterCmpCache
        if (cache !== undefined) {
            return cache;
        }

        const cmp = blk.getComponent(this.ID);
        if (cmp === undefined) {
            throw new Error("Provided block is not a Crafter Machine!");
        }

        (blk as CrafterMachineBlock).__crafterCmpCache = cmp.customComponentParameters.params as CraftingMachineComponentParameters;

        return cmp.customComponentParameters.params as CraftingMachineComponentParameters;
    }

    static getInputSlot(blk: Block) {
        const cmp = this.getAndCacheCmp(blk);

        const linkedEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        const con = linkedEnt.getComponent("minecraft:inventory").container;

        return con.getSlot(cmp.input_slot);
    }

    static getOutputSlot(blk: Block) {
        const cmp = this.getAndCacheCmp(blk);

        const linkedEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        const con = linkedEnt.getComponent("minecraft:inventory").container;

        return con.getSlot(cmp.output_slot);
    }

    static isValidInput(blk: Block, itemId: string) {
        const cmp = this.getAndCacheCmp(blk);

        return getOutputForItem(itemId, cmp.crafting_tag) !== undefined;
    }

    static getRecipeForItem(blk: Block, itemId: string) {
        const cmp = this.getAndCacheCmp(blk);

        return getOutputForItem(itemId, cmp.crafting_tag);
    }

    static getOrCacheScoreboardObj(blk: Block) {
        let cache = (blk as CrafterMachineBlock).__crafterCmpScoreboardObj;
        if (cache !== undefined) {
            return cache;
        }

        const loc = blk.location;
        const objId = `${blk.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        let obj = world.scoreboard.getObjective(objId);
        if (obj === undefined) {
            obj = world.scoreboard.addObjective(objId);
        }

        (blk as CrafterMachineBlock).__crafterCmpScoreboardObj = obj;

        return obj;
    }

    static setCurrentProgress(blk: Block, value: number) {
        const obj = this.getOrCacheScoreboardObj(blk);

        obj.setScore('progress', value);
    }

    static createProgressBar(blk: Block) {
        const curProg = MachineCustomComponent.getProgress(blk);
        const cmp = this.getAndCacheCmp(blk);

        let fillCount = Math.floor((curProg / cmp.craft_time) * 10);

        const progStr = '='.repeat(fillCount).padEnd(10, '-');

        const inputSlot = this.getInputSlot(blk);
        const outputSlot = this.getOutputSlot(blk);

        let inputAmount = 0;
        let inputMaxAmount = 0;
        if (inputSlot.hasItem()) {
            inputAmount = inputSlot.amount;
            inputMaxAmount = inputSlot.maxAmount;
        }

        let outputAmount = 0;
        let outputMaxAmount = 0;
        if (outputSlot.hasItem()) {
            outputAmount = outputSlot.amount;
            outputMaxAmount = outputSlot.maxAmount;
        }

        return `I: ${inputAmount.toString().padStart(2, '0')}/${inputMaxAmount.toString().padStart(2, '0')} [${progStr}] O: ${outputAmount.toString().padStart(2, '0')}/${outputMaxAmount.toString().padStart(2, '0')}`;
    }

    static getState(blk: Block) {
        const permutation = blk.permutation;

        return permutation.getState(this.STATE_ID) as CraftingMachineStates
    }

    static isCrafting(blk: Block) {
        const currentState = this.getState(blk);

        return currentState === CraftingMachineStates.CRAFTING;
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(CraftingMachineComponent.ID, new CraftingMachineComponent());
})