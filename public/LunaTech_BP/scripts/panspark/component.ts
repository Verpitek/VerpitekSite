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

import { BlockComponentTickEvent, BlockCustomComponent, CustomComponentParameters, Block, BlockComponentPlayerInteractEvent } from "@minecraft/server";
import { registerStartupEvent } from "../events";
import { ADDON_NAMESPACE } from "../constants";
import { MachineCustomComponent } from "../machines/component";

/*
    Handles:
    - Code input via book
    - Code output via book
    - PanSpark VM Ticking
        - Including energy consumption if this block is a machine
        - Done via a "ticked_vm event" that only fires when a line of code is executed
    - State management throughout this thigns
*/

export interface PanSparkClientComponentEventExtraData {
    typeId?: string;
    currentState?: VM_STATES;
}

function handleEventFilterDefaults(filter: Partial<PanSparkClientComponentEventFilter>) {
    if (filter.typeId === undefined) {
        filter.typeId = ['ALL'];
    }

    if (filter.state === undefined) {
        filter.state = ['ALL'];
    }

    return filter as PanSparkClientComponentEventFilter
}

export interface PanSparkClientComponentParams {
}

const VM_STATE_ID = "lunatech:panspark_vm.state";

export interface PanSparkClientComponentEventFilter {
    typeId: string[];
    state: (VM_STATES | 'ALL')[];
}

export enum VM_STATES {
    UNINIT = "UNINIT",
    INITING = "INITING",
    IDLE = "IDLE",
    RUNNING = "RUNNING",
    ERR = "ERR",
    OUT_OF_POWER = "OUT_OF_POWER",
    FINISHED = "FINISHED",
}

export type PANSPARK_CLIENT_BLOCK_TICK_EVENT_DATA = (BlockComponentTickEvent & { extraData: PanSparkClientComponentEventExtraData });
export type PANSPARK_CLIENT_BLOCK_TICK_EVENT_CALLBACK = (ev: PANSPARK_CLIENT_BLOCK_TICK_EVENT_DATA, params: PanSparkClientComponentParams) => void;

export type PANSPARK_CLIENT_BLOCK_INTERACT_EVENT_DATA = (BlockComponentPlayerInteractEvent & { extraData: PanSparkClientComponentEventExtraData });
export type PANSPARK_CLIENT_BLOCK_INTERACT_EVENT_CALLBACK = (ev: PANSPARK_CLIENT_BLOCK_INTERACT_EVENT_DATA, params: PanSparkClientComponentParams) => void;

export class PanSparkClientComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":panspark_client";

    // Storage/Registration
    private static PS_C_BLK_TICK_CALLBACKS: Record<string, PANSPARK_CLIENT_BLOCK_TICK_EVENT_CALLBACK[]> = {};
    private static PS_C_BLK_INTERACT_CALLBACKS: Record<string, Record<string, PANSPARK_CLIENT_BLOCK_INTERACT_EVENT_CALLBACK[]>> = {};

    static registerBlockTickEvent(callback: PANSPARK_CLIENT_BLOCK_TICK_EVENT_CALLBACK, blockId: string = 'ALL') {
        this.registerEvent(this.PS_C_BLK_TICK_CALLBACKS, callback, blockId);
    }

    static registerBlockInteractEvent(callback: PANSPARK_CLIENT_BLOCK_INTERACT_EVENT_CALLBACK, filter: Partial<PanSparkClientComponentEventFilter>) {
        this.newRegisterEvent(this.PS_C_BLK_INTERACT_CALLBACKS, callback, filter);
    }

    private static newRegisterEvent(cbStorage: Record<string, Record<string, CallableFunction[]>>, callback: CallableFunction, filter: Partial<PanSparkClientComponentEventFilter>) {
        const fullFilter = handleEventFilterDefaults(filter);

        let stateGroups: Record<string, CallableFunction[]>[] = [];
        for (const state of fullFilter.state) {
            let group = cbStorage[state];

            if (group === undefined) {
                group = {};
                cbStorage[state] = group;
            }

            stateGroups.push(group);
        }

        for (const blockId of fullFilter.typeId) {
            for (const group of stateGroups) {
                const eventList = group[blockId];

                if (eventList === undefined) {
                    group[blockId] = [callback];
                } else {
                    eventList.push(callback);
                }
            }
        }
    }

    private static registerEvent(cbStorage: Record<string, CallableFunction[]>, func: CallableFunction, blockId: string) {
        let existingData = cbStorage[blockId];
        if (existingData === undefined) {
            existingData = [func];

            cbStorage[blockId] = existingData;
        } else if (!existingData.includes(func)) {
            existingData.push(func);
        }
    }

    constructor() {
        this.onTick = this.onEvent.bind(this, PanSparkClientComponent.PS_C_BLK_TICK_CALLBACKS);
        this.onPlayerInteract = this.newOnEvent.bind(this, PanSparkClientComponent.PS_C_BLK_INTERACT_CALLBACKS);
    }

    onPlayerInteract() {
        throw new Error("I shouldn't have ran, I'm a stub!");
    }

    onTick() {
        throw new Error("I shouldn't have ran, I'm a stub!");
    }

    buildEventList(cbSource: Record<string, Record<string, CallableFunction[]>>, block: Block) {
        const eventGroups = [];

        // Handling all group
        const allGroup = cbSource['ALL'];
        if (allGroup != null) {
            eventGroups.push(allGroup);
        }

        // Handling block group
        const blockState = block.permutation.getState(VM_STATE_ID) as VM_STATES;

        const stateGroup = cbSource[blockState];
        if (blockState != null) {
            eventGroups.push(stateGroup);
        }

        let eventList = [];

        for (const group of eventGroups) {
            const allEventList = group['ALL'];
            if (allEventList !== undefined) {
                eventList.push(...allEventList);
            }

            const typeIdList = group[block.typeId];
            if (typeIdList !== undefined) {
                eventList.push(...typeIdList);
            }
        }

        return eventList;
    }

    newOnEvent(cbSource: Record<string, Record<string, CallableFunction[]>>, evData: unknown & { extraData: PanSparkClientComponentEventExtraData } & { block: Block }, args: CustomComponentParameters) {
        const eventList = this.buildEventList(cbSource, evData.block);

        const params = args.params;
        for (const event of eventList) {
            event(evData, params);
        }
    }

    onEvent(callbackSource: Record<string, CallableFunction[]>, evData: unknown & { extraData: PanSparkClientComponentEventExtraData } & { block: Block }, args: CustomComponentParameters) {
        // Grab all events
        let genericEventList = callbackSource['ALL'];
        if (genericEventList === undefined) {
            genericEventList = [];
        }

        // Grab events based on block types
        let blkTypeEventList = callbackSource[evData.block.typeId];
        if (blkTypeEventList === undefined) {
            blkTypeEventList = [];
        }

        // Grab events based on VM state
        const currentVmState = evData.block.permutation.getState(VM_STATE_ID) as VM_STATES;
        let vmStateEventList = callbackSource[currentVmState];
        if (currentVmState === undefined || vmStateEventList === undefined) {
            vmStateEventList = [];
        }

        const eventList = [...genericEventList, ...blkTypeEventList, ...vmStateEventList];

        const params = args.params as PanSparkClientComponentParams;

        // Setting up extra data
        evData.extraData = {
            currentState: currentVmState,
        };

        // Firing all events
        for (const event of eventList) {
            event(evData, params);
        }
    }

    // Useful methods
    static setState(client: Block, state: VM_STATES) {
        const permutation = client.permutation.withState(VM_STATE_ID, state);

        client.dimension.setBlockPermutation(client.location, permutation);
    }

    static storeNetworkId(client: Block, id: string) {
        const linkedEntity = MachineCustomComponent.getAllLinkedEntities(client)[0];

        linkedEntity.setDynamicProperty("lunatech:panspark_id", id);
    }

    static getNetworkId(client: Block) {
        const linkedEntity = MachineCustomComponent.getAllLinkedEntities(client)[0];

        return linkedEntity.getDynamicProperty("lunatech:panspark_id") as string | undefined;
    }

    static setBlockOutputData(block: Block, data: string) {
        const linkedEntity = MachineCustomComponent.getAllLinkedEntities(block)[0];
        linkedEntity.setDynamicProperty("lunatech:panspark_vm_output", data);
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(PanSparkClientComponent.ID, new PanSparkClientComponent());
})