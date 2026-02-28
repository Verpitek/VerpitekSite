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

import { Block, ContainerSlot, Vector3, world, Container, Dimension } from "@minecraft/server";
import { MachineComponentParams, MachineCustomComponent } from "../../machines/component";
import { PanSparkVM } from "../panspark";
import { getOpenContsById } from "./storagelib";

export class PanSparkMachine {
    location: Vector3;
    dimensionId: string;
    typeId: string;

    constructor(location: Vector3, dimensionId: string, typeId: string) {
        this.location = location;
        this.dimensionId = dimensionId;
        this.typeId = typeId;
    }
}

const vm_storage: Record<string, Record<string, PanSparkMachine>> = {};

function getOpenMachines(id: string) {
    const openMachineRecord = vm_storage[id];
    if (openMachineRecord === undefined) {
        return {};
    }

    return openMachineRecord;
}

export function getTargetContainer(selfNetId: string, targetName: string): Container | undefined {
    // Check if provided name is an open machine
    const openMachines = getOpenMachines(selfNetId);

    const machine = openMachines[targetName];
    if (machine !== undefined) {
        // Source container from machine block
        const dim = world.getDimension(machine.dimensionId);

        if (dim === undefined) {
            return;
        }

        const block = dim.getBlock(machine.location);

        return MachineCustomComponent.getLinkedMachineEntity(block).getComponent("minecraft:inventory").container;
    }

    // Check if it is instead an open container
    const openContainers = getOpenContsById(selfNetId);

    const container = openContainers.get(targetName);
    if (container === undefined) {
        return;
    }

    return container.block.getComponent("minecraft:inventory").container;
}

export function registerWith(vm: PanSparkVM, id: string, block: Block) {
    let storage = {};
    vm_storage[id] = storage;

    if (storage === undefined) {
        storage = {};
        vm_storage[id] = {};
    }

    const dimId = block.dimension.id;
    let loc = block.location;
    loc = {
        x: loc.x,
        y: loc.y,
        z: loc.z,
    }

    let containerCache: Container | undefined = undefined;

    const refreshContainerCache = () => {
        if (containerCache !== undefined && containerCache.isValid) {
            return;
        }

        if (!block.isValid) {
            // Block needs to be refreshed
            const dim = world.getDimension(dimId);
            if (dim === undefined) {
                throw new Error("Dimension unloaded");
            }

            block = dim.getBlock(loc);
        }

        const linkedEnt = MachineCustomComponent.getLinkedMachineEntity(block);

        containerCache = linkedEnt.getComponent("minecraft:inventory").container;
    }

    vm.registerOpCode("MACHINE_OPEN", (args, context) => {
        if (args.length !== 5) {
            throw new Error("Invalid number of arguments, expected 5 got " + args.length);
        }

        if (args[3] !== ">>") {
            throw new Error("Can't place machine data into a location!");
        }

        const xVar = context.getVar(args[0], 0);
        const yVar = context.getVar(args[1], 0);
        const zVar = context.getVar(args[2], 0);

        const targetPos = {
            x: xVar.value,
            y: yVar.value,
            z: zVar.value,
        }

        const dimension = world.getDimension(dimId);
        if (dimension === undefined) {
            throw new Error("Running inside an unloaded dimension!");
        }

        const targetBlock = dimension.getBlock(targetPos);
        if (!targetBlock) {
            throw new Error("Invalid target block!");
        }

        // Determine if the target block is a machine
        if (!targetBlock.hasTag("lunatech:machine")) {
            throw new Error("Target block is not a machine!");
        }

        // Determine if the target block is a machine with storage
        if (!targetBlock.hasTag("lunatech:machine.has_storage")) {
            throw new Error("Target block is not a machine with storage capabilities");
        }

        // Store the target machine under the provided name
        const targetId = args[4];

        // Check if there is an open container with the same name
        const openContainers = getOpenContsById(id);
        if (openContainers !== undefined && openContainers.has(targetId)) {
            throw new Error("Cant name a MACHINE the same as an already open STORAGE!");
        }

        // Getting the machine ID
        const targetMachId = (targetBlock.getComponent("lunatech:machine").customComponentParameters.params as MachineComponentParams).machine_id;


        storage[targetId] = new PanSparkMachine(targetPos, dimId, targetMachId);
    })

    // MACHINE_LIST
    vm.registerOpCode("MACHINE_LIST", (args, context) => {
        if (args.length > 0) {
            throw new Error("Invalid number of arguments, expected 0 got " + args.length);
        }

        const keys = Object.keys(storage);
        if (keys.length <= 0) {
            context.buffer.push("No machines open");
        } else {
            context.buffer.push("Open containers:\n - " + keys.join("\n - "));
        }
    })

    // MACHINE_CLOSE <MACHINE>
    vm.registerOpCode("MACHINE_CLOSE", (args, context) => {
        if (args.length !== 1) {
            throw new Error("Invalid number of arguments, expected 1 got " + args.length);
        }

        const containerName = args[0];
        if (storage[containerName] === undefined) {
            throw new Error("Machine not found!");
        }

        delete storage[containerName];
    })

    // MACHINE_SLOTS <MACHINE>
    // Prints the name of the available slots
    vm.registerOpCode("MACHINE_SLOTS", (args, context) => {
        if (args.length !== 1) {
            throw new Error("Invalid number of arguments, expected 5 got " + args.length);
        }

        const machine: PanSparkMachine | undefined = storage[args[0]];

        if (machine === undefined) {
            throw new Error("Unknown Machine '" + args[0] + "'");
        }

        const dim = world.getDimension(machine.dimensionId);
        const block = dim?.getBlock(machine.location);
        if (dim === undefined || block === undefined) {
            throw new Error("Target machine is not loaded");
        }

        const slots = Object.entries(getSlotInfoForMachineId(machine.typeId));

        if (slots.length === 0) {
            context.buffer.push("Target machine doesn't have an inventory");
        }

        let slotList = [];

        let message = `Available slots for ${args[0]}:`;
        for (const [slotNum, slotName] of slots) {
            slotList[slotNum] = slotName;
        }

        slotList = slotList.filter((value) => {
            return value != null;
        });

        for (const slot of slotList) {
            message += "\n - " + slot;
        }

        context.buffer.push(message);
    })

    // MACHINE_SLOT <enum INFO/COUNT/TYPE/MATCHES> ...
    vm.registerOpCode("MACHINE_SLOT", (args, context) => {
        refreshContainerCache();

        handleSlotOpCode(args, context, containerCache, storage);
    })

    // MACHINE_PROC <MACHINE> <PROC ID> [arg list] [>>] [variable]
    // Example: MACHINE_PROC furn "furnace.matches_input" storage 0 >> canInsert
    vm.registerOpCode("MACHINE_PROC", (args: string[], context) => {
        let opperandIndex: number = -1;
        if (args.length > 2) {
            opperandIndex = args.lastIndexOf('>>');
        }

        const hasOpperand = opperandIndex !== -1;

        // Get machine
        const machine = storage[args[0]];
        if (machine === undefined) {
            throw new Error("Unknown Machine: " + machine);
        }

        // Build args list
        const procArgList = args.slice(
            2,
            hasOpperand
                ? opperandIndex
                : args.length
        );

        const dim = world.getDimension(dimId);
        const selfBlock = dim?.getBlock(loc);
        if (selfBlock === undefined) {
            throw new Error("The block that ran this proc isnt loaded!");
        }

        refreshContainerCache();

        const res = runMachineProc(selfBlock, containerCache, machine, args[1], procArgList, context);

        if (hasOpperand) {
            if (res == null) {
                throw new Error("Expected result whil the proc returned nothing!");
            }

            // Store result in variable
            context.setVar(args[args.length - 1], res);
        }
    })
}

// Slot OP Code Handle

enum SlotOpCodeActions {
    INFO = "INFO",
    COUNT = "COUNT",
    MAX_COUNT = "MAX_COUNT",
    TYPE = "TYPE",
}

function handleSlotOpCode(args: string[], context, container: Container, storage: Record<string, PanSparkMachine>) {
    if (args.length <= 0) {
        throw new Error("Expected atleast 1 argument but got none!");
    }

    let machine: PanSparkMachine;
    let dim: Dimension;
    let block: Block;
    let slot: ContainerSlot;
    let slotNum;

    const action = args[0] as SlotOpCodeActions;
    switch (action) {
        // MACHINE_SLOT INFO <MACHINE> <slotId>
        // Prints info about the specified slot
        case SlotOpCodeActions.INFO:
            if (args.length !== 3) {
                throw new Error("Invalid number of arguments, expected 3 but got " + args.length);
            }

            machine = storage[args[1]];

            if (machine === undefined) {
                throw new Error("Unknown machine " + args[1]);
            }

            dim = world.getDimension(machine.dimensionId)
            block = dim?.getBlock(machine.location);
            if (dim === undefined || block === undefined) {
                throw new Error("Target machine is unloaded!");
            }

            slotNum = context.getVar(args[2]);

            if (slotNum.type !== 0) {
                throw new Error("Expected number for the slot!");
            }

            slot = container.getSlot(slotNum);

            if (slot === undefined) {
                throw new Error("Unknown slot " + args[2]);
            }

            let itemInfo = "";
            if (!slot.hasItem()) {
                itemInfo = "  - Empty";
            } else {
                let typeId = slot.typeId;
                if (typeId.startsWith('minecraft:')) {
                    typeId = typeId.slice(10);
                }

                itemInfo = `  - "${typeId}"\n`
                    + `  - Amount: ${slot.amount.toString().padStart(2, '0')}/${slot.maxAmount.toString().padStart(2, '0')}`
            }

            context.buffer.push(` - "${args[2]}":\n` + itemInfo);
            break;
        // MACHINE_SLOT COUNT <MACHINE> <slotId> >> <variable>
        case SlotOpCodeActions.COUNT:
            if (args.length !== 5) {
                throw new Error("Invalid number of arguments, expected 5 but got " + args.length);
            } else if (args[3] !== '>>') {
                throw new Error("Expected '>>' opperand for argument `4` but got '" + args[3] + "'");
            }

            machine = storage[args[1]];

            if (machine === undefined) {
                throw new Error("Unknown machine " + args[1]);
            }

            dim = world.getDimension(machine.dimensionId)
            block = dim?.getBlock(machine.location);
            if (dim === undefined || block === undefined) {
                throw new Error("Target machine is unloaded!");
            }

            slotNum = context.getVar(args[2]);
            if (slotNum.type !== 0) {
                throw new Error("Expected number for slot but got " + args[2]);
            }

            slot = container.getSlot(slotNum);

            if (slot === undefined) {
                throw new Error("Unknown slot " + args[2]);
            }

            let count = 0;
            if (slot.hasItem()) {
                count = slot.amount;
            }

            context.setVar(args[4], { type: 0, value: count });

            break;

        // MACHINE_SLOT MAX_COUNT <MACHINE> <slotId> >> <variable>
        case SlotOpCodeActions.MAX_COUNT:
            if (args.length !== 5) {
                throw new Error("Invalid number of arguments, expected 5 but got " + args.length);
            } else if (args[3] !== '>>') {
                throw new Error("Expected '>>' opperand for argument `4` but got '" + args[3] + "'");
            }

            machine = storage[args[1]];

            if (machine === undefined) {
                throw new Error("Unknown machine " + args[1]);
            }

            dim = world.getDimension(machine.dimensionId)
            block = dim?.getBlock(machine.location);
            if (dim === undefined || block === undefined) {
                throw new Error("Target machine is unloaded!");
            }

            slotNum = context.getVar(args[2]);
            if (slotNum.type !== 0) {
                throw new Error("Expected number for slot but got " + args[2]);
            }

            slot = container.getSlot(slotNum);

            let maxCount = 0;
            if (slot.hasItem()) {
                maxCount = slot.maxAmount;
            }

            context.setVar(args[4], { type: 0, value: maxCount });

            break;

        // MACHINE_SLOT TYPE <MACHINE> <slotId> >> <variable>
        case SlotOpCodeActions.TYPE:
            if (args.length !== 5) {
                throw new Error("Invalid number of arguments, expected 5 but got " + args.length);
            } else if (args[3] !== '>>') {
                throw new Error("Expected '>>' opperand for argument `4` but got '" + args[3] + "'");
            }

            machine = storage[args[1]];

            if (machine === undefined) {
                throw new Error("Unknown machine " + args[1]);
            }

            dim = world.getDimension(machine.dimensionId)
            block = dim?.getBlock(machine.location);
            if (dim === undefined || block === undefined) {
                throw new Error("Target machine is unloaded!");
            }

            slotNum = context.getVar(args[2]);
            if (slotNum.type !== 0) {
                throw new Error("Expected number for slot but got " + args[2]);
            }

            slot = container.getSlot(slotNum);

            let typeId = "minecraft:air";
            if (slot.hasItem()) {
                typeId = slot.typeId;
            }

            context.setVar(args[4], { type: 1, value: typeId });

            break;
        default:
            throw new Error("Unknown action: " + action);
    }
}

export type PanSparkVariable =
    | { type: 0; value: number }
    | { type: 1; value: string }
    | { type: 2; value: number[] };

// Proc OP Code handle
const MACHINE_PROC_REG: Record<string, Record<string, MACHINE_PROC_CALLBACK>> = {};

export type MACHINE_PROC_CALLBACK = (self: Block, mach: PanSparkMachine, args: string[], container: Container, context) => PanSparkVariable | void;

export function registerMachineProc(targetMachineIds: string[], procOp: string, proc: MACHINE_PROC_CALLBACK) {
    for (const machId of targetMachineIds) {
        let procRecord = MACHINE_PROC_REG[machId];
        if (procRecord === undefined) {
            procRecord = {};
            MACHINE_PROC_REG[machId] = procRecord;
        }

        procRecord[procOp] = proc;
    }
}

function runMachineProc(self: Block, selfContainer: Container, targetMachine: PanSparkMachine, procOp: string, args: string[], context): PanSparkVariable | void {
    const procRecord = MACHINE_PROC_REG[targetMachine.typeId];

    if (procRecord === undefined) {
        throw new Error("Proc OP not found for target MACHINE");
    }

    const procFunc: MACHINE_PROC_CALLBACK = procRecord[procOp];
    if (procFunc === undefined) {
        throw new Error("Proc OP not found for target MACHINE");
    }

    return procFunc(self, targetMachine, args, selfContainer, context);
}

const MACH_SLOT_INFO_STORAGE: Record<string, Record<number, string>> = {};

export function getSlotInfoForMachineId(machId: string) {
    return MACH_SLOT_INFO_STORAGE[machId];
}

export function registerSlotInfoForMachineId(machId: string, slotInfo: Record<number, string>) {
    MACH_SLOT_INFO_STORAGE[machId] = slotInfo;
}