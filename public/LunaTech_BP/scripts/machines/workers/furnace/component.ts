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

import { Block, BlockComponentPlayerInteractEvent, BlockComponentTickEvent, BlockCustomComponent, CustomComponentParameters, ItemStack, world } from "@minecraft/server";
import { tryGetOutputForItem } from "./recipe";
import { registerStartupEvent } from "../../../events";
import { MachineComponentParams, MachineCustomComponent } from "../../component";

export enum MachineFurnaceState {
    IDLE = "IDLE",
    COOKING = "COOKING",
    OUTPUT_FULL = "OUTPUT_FULL",
    INVALID_INPUT = "INVALID_INPUT",
    OUT_OF_POWER = "OUT_OF_POWER"
}

// Cached data types
interface MachineFurnaceCachedData {
    state?: MachineFurnaceState
}

type FurnWithCache = Block & { furnCache: MachineFurnaceCachedData };

export type MachineFurnaceComponentParams = {
    /// Amount of energy consumed per tick by this furnace
    energy_cost: number,
    /// Amount of ticks it takes for an item to cook
    cook_time: number,
}

export enum FurnaceCookResult {
    NoInput,
    InvalidInput,
    OutputFull,
    MismatchedOutput,
    Cooked,
}

export interface MachineFurnaceComponentEventFilter {
    machine_id?: string[],
    block_ids?: string[],
    furnace_states?: string[],
}

function createProcessedEventFilter(baseFilter: MachineFurnaceComponentEventFilter): Required<MachineFurnaceComponentEventFilter> {
    let newFilter: MachineFurnaceComponentEventFilter = {};

    if (baseFilter.block_ids === undefined) {
        newFilter.block_ids = ['ALL'];
    } else {
        newFilter.block_ids = [...baseFilter.block_ids];
    }

    if (baseFilter.furnace_states === undefined) {
        newFilter.furnace_states = ['ALL'];
    } else {
        newFilter.furnace_states = [...baseFilter.furnace_states];
    }

    if (baseFilter.machine_id === undefined) {
        newFilter.machine_id = ['ALL'];
    } else {
        newFilter.machine_id = [...baseFilter.machine_id];
    }

    return newFilter as Required<MachineFurnaceComponentEventFilter>;
}

// Callback Types
export type MachineFurnaceComponentTickEventCallback = (ev: BlockComponentTickEvent, params: MachineFurnaceComponentParams) => void;
export type MachineFuranceInteractEventCallback = (ev: BlockComponentPlayerInteractEvent, params: MachineFurnaceComponentParams) => void;

type GenericEventStorage<CT = CallableFunction> = Record<
    string, // Machine ID
    Record<
        string, // Block ID
        Record<
            string, // Furnace State
            CT[]
        >
    >
>;

/**
 * Needs to be able to handle all the processing that allows a machine to be a furnace
 */
export class MachineFurnaceComponent implements BlockCustomComponent {
    static ID = "lunatech:machine.furnace";

    static TICK_EVENT_STORAGE: GenericEventStorage<MachineFurnaceComponentTickEventCallback> = {};
    static INTERACT_EVENT_STORAGE: GenericEventStorage<MachineFuranceInteractEventCallback> = {};

    static registerTickEvent(cb: MachineFurnaceComponentTickEventCallback, filter: MachineFurnaceComponentEventFilter = {}) {
        this.registerEvent(this.TICK_EVENT_STORAGE, cb, filter);
    }

    static registerInteractEvent(cb: MachineFuranceInteractEventCallback, filter: MachineFurnaceComponentEventFilter = {}) {
        this.registerEvent(this.INTERACT_EVENT_STORAGE, cb, filter);
    }

    private static registerEvent(cbStorage: GenericEventStorage, cb: CallableFunction, filter: MachineFurnaceComponentEventFilter) {
        const handledFilter = createProcessedEventFilter(filter);

        const machIdGroups = [];

        for (const machId of handledFilter.machine_id) {
            let foundGroup = cbStorage[machId];
            if (foundGroup === undefined) {
                foundGroup = {};
                cbStorage[machId] = foundGroup;
            }

            machIdGroups.push(foundGroup);
        }

        const blockIdGroups = [];

        for (const blockId of handledFilter.block_ids) {
            for (const machIdGroup of machIdGroups) {
                let foundGroup = machIdGroup[blockId];

                if (foundGroup === undefined) {
                    foundGroup = {};
                    machIdGroup[blockId] = foundGroup;
                }

                blockIdGroups.push(foundGroup);
            }
        }

        for (const furnState of handledFilter.furnace_states) {
            for (const blockIdGroup of blockIdGroups) {
                let eventList = blockIdGroup[furnState];

                if (eventList === undefined) {
                    eventList = [];
                    blockIdGroup[furnState] = eventList;
                }

                eventList.push(cb);
            }
        }
    }

    static buildEventListForBlock<CT = CallableFunction>(cbStorage: GenericEventStorage<CT>, furn: Block) {
        const machineCmp = furn.getComponent(MachineFurnaceComponent.ID)!.customComponentParameters.params as MachineComponentParams;
        const blockId = furn.typeId;
        const furnState = this.getFurnaceState(furn);

        const machIdEventGroups: (Record<string, Record<string, CT[]>>)[] = [];

        // Narrowing available events by Machine ID if possible
        let machIdFiltGroups = cbStorage[machineCmp.machine_id];
        if (machIdFiltGroups !== undefined) {
            machIdEventGroups.push(machIdFiltGroups)
        }

        let machIdAllGroups = cbStorage['ALL'];
        if (machIdAllGroups !== undefined) {
            machIdEventGroups.push(machIdAllGroups);
        }

        // Narrowing availble events by block ID if possible
        const eventList: CT[] = [];

        for (const group of machIdEventGroups) {
            const blkIdFiltGroups = group[blockId];
            if (blkIdFiltGroups !== undefined) {
                // Grab all events based on furnace state
                const furnStateFiltEventList = blkIdFiltGroups[furnState];
                if (furnStateFiltEventList !== undefined) {
                    eventList.push(...furnStateFiltEventList)
                }

                const furnStateAllEventList = blkIdFiltGroups['ALL'];
                if (furnStateAllEventList !== undefined) {
                    eventList.push(...furnStateAllEventList);
                }
            }

            const blkIdAllGroups = group['ALL'];
            if (blkIdAllGroups !== undefined) {
                // Grab all events based on furnace state
                const furnStateFiltEventList = blkIdAllGroups[furnState];
                if (furnStateFiltEventList !== undefined) {
                    eventList.push(...furnStateFiltEventList)
                }

                const furnStateAllEventList = blkIdAllGroups['ALL'];
                if (furnStateAllEventList !== undefined) {
                    eventList.push(...furnStateAllEventList);
                }
            }
        }

        return new Set(eventList);
    }

    constructor() {
        this.onTick = this.onTick.bind(this);
        this.onPlayerInteract = this.onEvent.bind(this, MachineFurnaceComponent.INTERACT_EVENT_STORAGE);
    }

    onTick(ev: BlockComponentTickEvent, params: CustomComponentParameters) {
        // TODO: Setup first-tick in ev extraData
        if (ev.block === undefined) {
            return;
        }

        this.onEvent(MachineFurnaceComponent.TICK_EVENT_STORAGE, ev, params);
    }

    onPlayerInteract(ev: BlockComponentPlayerInteractEvent, params: CustomComponentParameters) {
        throw new Error("This shouldn't have been called, its a stub");
    }

    onEvent(cbStorage: GenericEventStorage, ev: unknown & { block: Block }, params: CustomComponentParameters) {
        const eventList = MachineFurnaceComponent.buildEventListForBlock(cbStorage, ev.block);

        for (const event of eventList) {
            event(ev, params.params);
        }
    }

    // Useful methods
    static getCachedData(furn: Block) {
        return (furn as FurnWithCache).furnCache;
    }

    static getFurnaceState(furn: Block, useCache: boolean = true) {
        let cachedData = this.getCachedData(furn);

        if (cachedData === undefined) {
            cachedData = {};
            (furn as FurnWithCache).furnCache = cachedData;

            // Skipping undefined check
            useCache = false;
        }

        if (useCache && cachedData.state !== undefined) {
            return cachedData.state;
        }

        const state = furn.permutation.getState('lunatech:furnace_state') as MachineFurnaceState;

        cachedData.state = state;

        return state;
    }

    static setState(blk: Block, state: MachineFurnaceState) {
        const permutation = blk.permutation;

        blk.dimension.setBlockPermutation(blk.location, permutation.withState("lunatech:furnace_state", state));
    }

    static getScoreboardObjective(blk: Block) {
        const loc = blk.location;
        const objectiveId = `lunatech:furnace:${blk.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        // Sets up progress scoreboard and sets state to "COOKING"
        let objective = world.scoreboard.getObjective(objectiveId);

        if (objective === undefined) {
            objective = world.scoreboard.addObjective(objectiveId);
        }

        return objective;
    }

    static setCookProgress(blk: Block, amount: number) {
        const scbObj = this.getScoreboardObjective(blk);

        scbObj.setScore('progress', amount);
    }

    static addCookProgress(blk: Block, amount: number) {
        const scbObj = this.getScoreboardObjective(blk);

        let currentProgress = 0;
        if (scbObj.hasParticipant('progress')) {
            currentProgress = scbObj.getScore('progress');
        }

        scbObj.setScore('progress', currentProgress + amount);
    }

    static getCookProgress(blk: Block) {
        const scbObj = this.getScoreboardObjective(blk);

        if (!scbObj.hasParticipant('progress')) {
            return -1;
        }

        return scbObj.getScore('progress');
    }

    static startCooking(blk: Block) {
        const furnProgObjective = this.getScoreboardObjective(blk);

        furnProgObjective.setScore("progress", 0);

        this.setState(blk, MachineFurnaceState.COOKING);
    }

    static cookStoredItem(blk: Block): FurnaceCookResult {
        const linkedEntity = MachineCustomComponent.getLinkedMachineEntity(blk);

        const con = linkedEntity.getComponent("minecraft:inventory").container;

        const inputSlot = con.getSlot(0);
        const isInputAir = !inputSlot.hasItem();
        if (isInputAir) {
            return FurnaceCookResult.NoInput;
        }

        const outputItem = tryGetOutputForItem(inputSlot);

        if (outputItem === undefined) {
            return FurnaceCookResult.InvalidInput;
        }

        const outputSlot = con.getSlot(1);
        const isOutputAir = !outputSlot.hasItem();

        if (!isOutputAir && outputSlot.amount >= outputSlot.maxAmount) {
            return FurnaceCookResult.OutputFull;
        }

        if (!isOutputAir && outputSlot.typeId !== outputItem) {
            return FurnaceCookResult.MismatchedOutput;
        }

        if (!isOutputAir) {
            outputSlot.amount += 1;
        } else {
            outputSlot.setItem(new ItemStack(outputItem));
        }

        // Remove 1 from the input slot
        // TODO: Somehow find a way to ensure that the data value also matches, not sure how that is grabbed from an Add-On
        if (inputSlot.amount > 1) {
            inputSlot.amount -= 1;
        } else {
            inputSlot.setItem();
        }

        return FurnaceCookResult.Cooked;
    }

    static getSlots(blk: Block) {
        const linkEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        const con = linkEnt.getComponent("minecraft:inventory").container;

        return {
            inputSlot: con.getSlot(0),
            outputSlot: con.getSlot(1),
        }
    }

    // Name related methods
    static createProgressBar(blk: Block, cookTime: number) {
        const progress = this.getCookProgress(blk);

        if (progress === undefined || progress === -1) {
            return;
        }

        let onChars = Math.floor((progress / (cookTime - 1)) * 10);
        let offChars = 10 - onChars;

        // Grab the current input item
        const slots = this.getSlots(blk);

        let inputMax = 0;
        let inputAmount = 0;
        if (slots.inputSlot.hasItem()) {
            inputMax = slots.inputSlot.maxAmount;
            inputAmount = slots.inputSlot.amount;
        }

        let outputMax = 0;
        let outputAmount = 0;
        if (slots.outputSlot.hasItem()) {
            outputMax = slots.outputSlot.maxAmount;
            outputAmount = slots.outputSlot.amount;

            if (inputMax === 0) {
                inputMax = outputMax;
            }
        } else if (inputMax !== 0) {
            outputMax = inputMax;
        }

        return `I: ${inputAmount.toString().padStart(2, '0')}/${inputMax.toString().padStart(2, '0')} [${'='.repeat(onChars)}${'-'.repeat(offChars)}] O: ${outputAmount.toString().padStart(2, '0')}/${outputMax.toString().padStart(2, '0')}`;
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(MachineFurnaceComponent.ID, new MachineFurnaceComponent());
})