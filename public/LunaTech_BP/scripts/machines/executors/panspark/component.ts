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

import { Block, BlockComponentPlayerInteractEvent, BlockComponentTickEvent, BlockCustomComponent, CustomComponentParameters, world } from "@minecraft/server";
import { ADDON_NAMESPACE } from "../../../constants";
import { registerStartupEvent } from "../../../events";
import { MachineCustomComponent } from "../../component";
import { VM } from "./panspark";

type CompileGen = Generator<{
    operation: any;
    arguments: {
        type: number;
        value: number;
    }[];
    line: any;
}, void, unknown>;

type RunGen = Generator<any, void, unknown>;
type RunGenRes = IteratorResult<any, void>;

type CompileGenRes = IteratorResult<{
    operation: any;
    arguments: {
        type: number;
        value: number;
    }[];
    line: any;
}, void>

interface EventObjectExtras {
    vm: VM
}

interface ExecutorComponentOutputEvent {
    block: Block,
    outputBuffer: string[]
}

type PanSparkExecutorComponentOnTickCallback = (ev: BlockComponentTickEvent & EventObjectExtras, params: CustomComponentParameters) => Promise<void> | void;
type PanSparkExecutorComponentOnInteractCallback = (ev: BlockComponentPlayerInteractEvent & EventObjectExtras, params: CustomComponentParameters) => Promise<void> | void;
type PanSparkExecutorComponentOnOutputCallback = (ev: ExecutorComponentOutputEvent & EventObjectExtras, params: CustomComponentParameters) => Promise<void> | void;

export class BlockPanSparkExecutorComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":executor.panspark";

    // Storage

    /// Keyed by the Executor's Block ID (`dimId:x:y:z`) with the PanSpark VM as the value
    static VM_INSTANCES: Record<string, VM> = {};

    /// Stores the function generators used in compiling until finished
    static GEN_DATAS: Record<string, { vm: VM, compGen?: CompileGen, runGen?: RunGen, lastCompResponse: CompileGenRes | undefined, lastRunResponse: RunGenRes | undefined }> = {};

    // Event Storage
    static ON_TICK: Record<string, Record<string, PanSparkExecutorComponentOnTickCallback[]>> = {};
    static ON_INTERACT: Record<string, Record<string, PanSparkExecutorComponentOnInteractCallback[]>> = {};

    static ON_OUTPUT: Record<string, Record<string, PanSparkExecutorComponentOnOutputCallback[]>> = {};

    // General
    private static getBlockId(blk: Block) {
        const blockDim = blk.dimension;
        const blockLoc = blk.location;

        return `${blockDim.id}:${blockLoc.x}:${blockLoc.y}:${blockLoc.z}`;
    }

    static STATE_ID: string = ADDON_NAMESPACE + ":executor.panspark"
    static getState(blk: Block) {
        return blk.permutation.getState(this.STATE_ID) as string;
    }

    static setState(blk: Block, state: string) {
        const modPerm = blk.permutation.withState(this.STATE_ID, state);

        blk.setPermutation(modPerm);
    }

    // VM Related

    static getOrCreateBlockVM(blk: Block): VM {
        const blockId = this.getBlockId(blk);

        let vm = this.VM_INSTANCES[blockId];

        if (vm === undefined) {
            vm = new VM(16, 8, 8);
        }

        this.VM_INSTANCES[blockId] = vm;

        return vm;
    }

    static getBlockGenData(blk: Block) {
        const blockId = this.getBlockId(blk);

        return this.GEN_DATAS[blockId];
    }

    static getBlockCompileGen(blk: Block): CompileGen {
        return this.getBlockGenData(blk).compGen;
    }

    static unregisterBlockVM(blk: Block) {
        const blockId = this.getBlockId(blk);

        delete this.VM_INSTANCES[blockId];
    }

    static startCompile(blk: Block) {
        // Code is pulled from dyn properties of linked machine ent
        const code = this.getStoredCode(blk);
        if (code === undefined) {
            this.setState(blk, "UNINIT");
            return;
        }

        const vm = this.getOrCreateBlockVM(blk);
        const compGen = vm.compile(code);

        const blockId = this.getBlockId(blk);

        this.GEN_DATAS[blockId] = { vm, compGen, lastCompResponse: undefined, lastRunResponse: undefined };

        this.setState(blk, "COMPILING");
    }

    static stepCompile(blk: Block) {
        const data = this.getBlockGenData(blk);

        if (data === undefined) {
            // Broke mid-compile, return to IDLE
            this.setState(blk, "IDLE");
            return;
        }

        data.lastCompResponse = data.compGen.next();

        if (data.lastCompResponse.done) {
            const vm = this.getOrCreateBlockVM(blk);

            data.runGen = vm.run();

            blk.dimension.getPlayers({
                maxDistance: 16,
                location: blk.location,
            }).forEach((player) => {
                player.sendMessage("Compiling Finished!");
            })

            this.setState(blk, "RUNNING");
        }

        return data.lastCompResponse;
    }

    static stepRun(blk: Block) {
        let data = this.getBlockGenData(blk);

        if (data === undefined) {
            // VM needs reloaded from its save state
            const saveState = this.getSaveState(blk);
            if (saveState === undefined) {
                // Save state doesn't exist, return to idle
                this.setState(blk, "IDLE");
                return;
            }

            const vm = this.loadFromSaveState(blk, this.getSaveState(blk));

            data = {
                vm,
                runGen: vm.run(),
                lastCompResponse: undefined,
                lastRunResponse: undefined
            }

            this.GEN_DATAS[this.getBlockId(blk)] = data;
        }

        try {
            data.lastRunResponse = data.runGen.next();
        } catch (e) {
            this.setState(blk, "IDLE");
            return undefined;
        }

        if (data.lastRunResponse.done) {
            this.setState(blk, "IDLE");

            blk.dimension.getPlayers({
                maxDistance: 16,
                location: blk.location,
            }).forEach((player) => {
                player.sendMessage("Run Finished!");
            })

        } else if (data.vm.outputBuffer[0] !== undefined) {
            // Has output
            this.onBufferOutput({
                block: blk,
                outputBuffer: data.vm.outputBuffer,
            }, blk.getComponent(this.ID).customComponentParameters);
        }

        // Save a state
        this.saveState(blk, data.vm);

        return { res: data.lastRunResponse, vm: data.vm };
    }

    // Event Related

    static tryGetEventList<T>(storage: Record<string, Record<string, T[]>>, machId: string, state: string): T[] {
        let allGroups = storage["ALL"];
        if (allGroups === undefined) {
            allGroups = {};
        }

        const allEventList = [];
        if (allGroups['ALL'] !== undefined) {
            allEventList.push(...allGroups['ALL']);
        }

        if (allGroups[state] !== undefined) {
            allEventList.push(...allGroups[state]);
        }

        let machIdGroups = storage[machId];
        if (machIdGroups === undefined) {
            machIdGroups = {};
        }

        const machIdEventList = [];
        if (machIdGroups['ALL'] !== undefined) {
            machIdEventList.push(...machIdGroups['ALL']);
        }

        if (machIdGroups[state] !== undefined) {
            machIdEventList.push(...machIdGroups[state]);
        }

        return [...allEventList, ...machIdEventList];
    }

    static registerOnTickEvent(cb: PanSparkExecutorComponentOnTickCallback, filter: { machineId?: string[], state?: string[] }) {
        this.registerEvent(this.ON_TICK, cb, filter);
    }

    static registerOnInteractEvent(cb: PanSparkExecutorComponentOnInteractCallback, filter: { machineId?: string[], state?: string[] }) {
        this.registerEvent(this.ON_INTERACT, cb, filter);
    }

    static registerOnOutputEvent(cb: PanSparkExecutorComponentOnOutputCallback, filter: { machineId?: string[], state?: string[] }) {
        this.registerEvent(this.ON_OUTPUT, cb, filter);
    }

    private static registerEvent(storage: Record<string, Record<string, CallableFunction[]>>, cb: CallableFunction, filter: { machineId?: string[], state?: string[] }) {
        if (filter.machineId === undefined) {
            filter.machineId = ["ALL"];
        }

        if (filter.state === undefined) {
            filter.state = ["ALL"];
        }

        for (const machId of filter.machineId) {
            let eventGrp = storage[machId];

            if (eventGrp === undefined) {
                eventGrp = {};
                storage[machId] = eventGrp;
            }

            for (const state of filter.state) {
                let eventList = eventGrp[state];

                if (eventList === undefined) {
                    eventGrp[state] = [cb];
                } else {
                    eventList.push(cb);
                }
            }
        }
    }

    onTick(ev: BlockComponentTickEvent, component: CustomComponentParameters) {
        BlockPanSparkExecutorComponent.onEvent(BlockPanSparkExecutorComponent.ON_TICK, ev, component);
    }

    onPlayerInteract(ev: BlockComponentPlayerInteractEvent, component: CustomComponentParameters) {
        BlockPanSparkExecutorComponent.onEvent(BlockPanSparkExecutorComponent.ON_INTERACT, ev, component);
    }

    private static onBufferOutput(ev: ExecutorComponentOutputEvent, component: CustomComponentParameters) {
        BlockPanSparkExecutorComponent.onEvent(BlockPanSparkExecutorComponent.ON_OUTPUT, ev, component);
    }

    static onEvent(cbStorage: Record<string, Record<string, ((ev: EventObjectExtras, component: CustomComponentParameters) => Promise<void> | void)[]>>, ev: { block: Block, vm?: VM }, component: CustomComponentParameters) {
        if (ev.block.isAir) {
            return;
        }

        const machId = MachineCustomComponent.getId(ev.block);
        const state = BlockPanSparkExecutorComponent.getState(ev.block);

        const eventList = BlockPanSparkExecutorComponent.tryGetEventList(cbStorage, machId, state);

        ev.vm = this.getOrCreateBlockVM(ev.block);

        for (const cb of eventList) {
            const res = cb(ev as EventObjectExtras, component);

            if (res instanceof Promise) {
                res.then();
            }
        }
    }

    static storeCode(blk: Block, code: string) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        machEnt.setDynamicProperty("lunatech:executor.panspark.code", code);

        // Switch to idle
        this.setState(blk, "IDLE");
    }

    static getStoredCode(blk: Block) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        return machEnt.getDynamicProperty("lunatech:executor.panspark.code") as string | undefined;
    }

    static saveState(blk: Block, vm: VM) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        const saveState = vm.saveState();

        machEnt.setDynamicProperty("lunatech:executor.panspark.save_state", saveState);
    }

    static getSaveState(blk: Block) {
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(blk);

        return machEnt.getDynamicProperty("lunatech:executor.panspark.save_state") as string | undefined;
    }

    static loadFromSaveState(blk: Block, saveState: string) {
        const vm = new VM(16, 8);

        vm.loadState(saveState);

        return vm;
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(BlockPanSparkExecutorComponent.ID, new BlockPanSparkExecutorComponent());
})