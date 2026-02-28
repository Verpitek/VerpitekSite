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

import { BlockCustomComponent, BlockComponentTickEvent, BlockComponentBlockBreakEvent, BlockComponentPlayerInteractEvent, CustomComponentParameters, BlockComponentOnPlaceEvent, Vector3, BlockVolume, Block, world, Entity, Container, ContainerSlot } from "@minecraft/server";
import { NoMachineComponentError, NotAMachineError } from "../machines/errors";
import { ADDON_NAMESPACE } from "../constants";
import { registerStartupEvent } from "../events";
import * as kylowat from "../energy/kylowatAPI"
import { BlockTagLink, CanLinkResult } from "../blockLinking/manager";

export enum MachineTypes {
    /// Creates its own energy, able to transfer to any NODE machine
    GENERATOR = "GENERATOR",
    /// Stores mass amounts of energy, can recieve power from or transfer to any NODE machine
    BATTERY = "BATTERY",
    /// Consumes stored energy, able to recieve from any NODE machine
    WORKER = "WORKER",
    /// Able to recieve power from GENERATOR/BATTERY/NODE, can send power to BATTERY/NODE/WORKER
    NODE = "NODE",
}

export interface MachineComponentParams {
    // Required params

    /// The ID used by this machine in Kylowat
    machine_id: string,
    /// Dictates how this machine will handle its stored energy
    machine_type: MachineTypes,
    /// The amount of blocks away from this machine that power can be sent/recieved
    range: number,

    newRange: Record<string, number>,

    /// The amount of energy this block can store locally
    buffer: number,

    // Defaulted Values, undefined when being interacted with
    /// (Default = 5) Amount of energy this machine can transfer to each linked block per tick
    transfer_rate?: number,

    // Optional Values, usually associated with a tag
    /// (Optional) The slot that hoppers well attempt to insert into
    hopper_in?: number,
    /// (Optional) The slot that hoppers will attemp to pull from
    hopper_out?: number,
}

export type NamespacedString = `${string}:${string}`;

export type ToArrayOnly<T> = {
    [K in keyof T]:
    T[K] extends infer U | (infer U)[] | undefined
    ? U[]
    : never;
}

export interface MachineComponentEventFilter {
    machineId?: NamespacedString | 'ALL' | (NamespacedString | 'ALL')[],
    machineType?: MachineTypes | 'ALL' | (MachineTypes | 'ALL')[],
}

export interface MachineComponentLinkEventFilter extends MachineComponentEventFilter {
    // Supports 'ALL'
    linkTag?: string | string[];
}

function handleLinkEventFilterDefaults(filter?: MachineComponentLinkEventFilter): ToArrayOnly<MachineComponentLinkEventFilter> {
    // Handle base defaults
    filter = handleEventFilterDefaults(filter) as MachineComponentLinkEventFilter;

    if (filter.linkTag === undefined) {
        filter.linkTag = ['ALL'];
    } else if (typeof filter.linkTag === 'string') {
        filter.linkTag = [filter.linkTag];
    }

    return filter as ToArrayOnly<MachineComponentLinkEventFilter>;
}

function handleEventFilterDefaults(filter?: MachineComponentEventFilter): ToArrayOnly<MachineComponentEventFilter> {
    if (filter === undefined) {
        return {
            machineId: ['ALL'],
            machineType: ['ALL'],
        }
    }

    if (filter.machineId === undefined) {
        filter.machineId = ["ALL"];
    } else if (typeof filter.machineId === 'string') {
        filter.machineId = [filter.machineId];
    }

    if (filter.machineType === undefined) {
        filter.machineType = ["ALL"];
    } else if (typeof filter.machineType === 'string') {
        filter.machineType = [filter.machineType];
    }

    return filter as ToArrayOnly<MachineComponentEventFilter>;
}

interface MachineComponentLinkEvent {
    sourceBlock: Block,
    targetBlock: Block,
    linkData: BlockTagLink,
}

export type MACHINE_COMPONENT_TICK_EVENT_CALLBACK = (ev: BlockComponentTickEvent & { firstTick: boolean }, params: MachineComponentParams) => void;
export type MACHINE_COMPONENT_PLACE_EVENT_CALLBACK = (ev: BlockComponentOnPlaceEvent, params: MachineComponentParams) => void;
export type MACHINE_COMPONENT_BREAK_EVENT_CALLBACK = (ev: BlockComponentBlockBreakEvent, params: MachineComponentParams) => void;
export type MACHINE_COMPONENT_INTERACT_EVENT_CALLBACK = (ev: BlockComponentPlayerInteractEvent, params: MachineComponentParams) => void;
export type MACHINE_COMPONENT_LINK_EVENT_CALLBACK = (ev: MachineComponentLinkEvent, params: MachineComponentParams) => void;

/// The Custom Component used by all machines
export class MachineCustomComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":machine";

    // Temp Block Data
    private static NAME_DATA: Record<string, Record<string, (string | string[])>> = {};

    // Storage
    private static TICK_EVENT_CALLBACKS: Record<string, Record<string, MACHINE_COMPONENT_TICK_EVENT_CALLBACK[]>> = {};
    private static PLACE_EVENT_CALLBACKS: Record<string, Record<string, MACHINE_COMPONENT_PLACE_EVENT_CALLBACK[]>> = {};
    private static BREAK_EVENT_CALLBACKS: Record<string, Record<string, MACHINE_COMPONENT_BREAK_EVENT_CALLBACK[]>> = {};
    private static INTERACT_EVENT_CALLBACKS: Record<string, Record<string, MACHINE_COMPONENT_INTERACT_EVENT_CALLBACK[]>> = {};

    // Storage for custom events
    /// Filter is LinkType -> Machine ID -> Machine Type
    private static LINK_EVENT_CALLBACKS: Record<string, Record<string, Record<string, MACHINE_COMPONENT_LINK_EVENT_CALLBACK[]>>> = {}

    /// Stores the names of the slots, Machine ID -> Slot Name -> Slot Num
    private static SLOT_NAME_REGISTRY: Record<string, Record<string, number>> = {};
    private static MAX_PROGRESS_MAP: Record<string, number> = {};

    static registerTickEvent(callback: MACHINE_COMPONENT_TICK_EVENT_CALLBACK, filter?: MachineComponentEventFilter) {
        this.newRegisterEvent(
            MachineCustomComponent.TICK_EVENT_CALLBACKS,
            callback,
            filter,
        )
    }

    static registerPlaceEvent(callback: MACHINE_COMPONENT_PLACE_EVENT_CALLBACK, filter?: MachineComponentEventFilter) {
        this.newRegisterEvent(
            MachineCustomComponent.PLACE_EVENT_CALLBACKS,
            callback,
            filter,
        )
    }

    static registerBreakEvent(callback: MACHINE_COMPONENT_BREAK_EVENT_CALLBACK, filter?: MachineComponentEventFilter) {
        this.newRegisterEvent(
            MachineCustomComponent.BREAK_EVENT_CALLBACKS,
            callback,
            filter,
        )
    }

    static registerInteractEvent(callback: MACHINE_COMPONENT_INTERACT_EVENT_CALLBACK, filter?: MachineComponentEventFilter) {
        this.newRegisterEvent(
            MachineCustomComponent.INTERACT_EVENT_CALLBACKS,
            callback,
            filter,
        )
    }

    static registerLinkEvent(callback: MACHINE_COMPONENT_LINK_EVENT_CALLBACK, filter?: MachineComponentLinkEventFilter) {
        // The first half of the filtering is handled locally here 
        // then passed into the regular event registration for each linkType
        filter = handleLinkEventFilterDefaults(filter);

        for (const tag of filter.linkTag) {
            let eventGroup = this.LINK_EVENT_CALLBACKS[tag];

            if (eventGroup === undefined) {
                eventGroup = {};
                this.LINK_EVENT_CALLBACKS[tag] = eventGroup;
            }

            // Using the origional event registration for the remainder of the filter handling
            this.newRegisterEvent(eventGroup, callback, filter);
        }
    }

    private static newRegisterEvent(cbStorageObj: Record<string, Record<string, CallableFunction[]>>, callback: CallableFunction, filter?: MachineComponentEventFilter) {
        filter = handleEventFilterDefaults(filter);

        const eventGroups: Record<string, CallableFunction[]>[] = [];

        // Adding machine ID specific event groups
        for (const machineId of filter.machineId) {
            let group = cbStorageObj[machineId];

            if (group === undefined) {
                group = {};
                cbStorageObj[machineId] = group;
            }

            eventGroups.push(group);
        }

        // Inserting callback references into the event groups under the provided machine types
        for (const eventGroup of eventGroups) {
            for (const machineType of filter.machineType) {
                let eventList = eventGroup[machineType];

                if (eventList === undefined) {
                    eventList = [callback];
                    eventGroup[machineType] = eventList;
                } else if (!eventList.includes(callback)) {
                    eventList.push(callback);
                }
            }
        }
    }

    /// Binds `this` into all methods as the component system will remove that context
    constructor() {
        this.onTick = this.onTick.bind(this);
        this.onPlace = this.newOnEvent.bind(this, MachineCustomComponent.PLACE_EVENT_CALLBACKS);
        this.onBreak = this.newOnEvent.bind(this, MachineCustomComponent.BREAK_EVENT_CALLBACKS);
        this.onPlayerInteract = this.newOnEvent.bind(this, MachineCustomComponent.INTERACT_EVENT_CALLBACKS);
    }

    // Event Methods
    onTick(ev: BlockComponentTickEvent, args: CustomComponentParameters) {
        if (ev.block.typeId === "minecraft:air") {
            return;
        }

        const perm = ev.block.permutation
        const hasTicked = perm.getState("lunatech:has_ticked") as boolean;

        (ev as Record<string, any>).firstTick = !hasTicked;

        this.newOnEvent(MachineCustomComponent.TICK_EVENT_CALLBACKS, ev, args);

        if (!hasTicked) {
            // Set permutation to indicate first tick has happened
            ev.block.dimension.setBlockPermutation(ev.block.location, perm.withState("lunatech:has_ticked", true))
        }
    }

    onPlace(ev: BlockComponentOnPlaceEvent, args: CustomComponentParameters) {
        throw new Error("I shouldn't have gotten called, I'm a stub!");
    }

    onBreak(ev: BlockComponentBlockBreakEvent, args: CustomComponentParameters) {
        throw new Error("I shouldn't have gotten called, I'm a stub!");
    }

    onPlayerInteract(ev: BlockComponentPlayerInteractEvent, args: CustomComponentParameters) {
        throw new Error("I shouldn't have gotten called, I'm a stub!");
    }

    private static onLink(source: Block, target: Block, linkData: BlockTagLink) {
        const cmp = MachineCustomComponent.getComponent(source);

        const eventList = this.buildLinkEventList(source, linkData.linkTag, cmp);

        for (const event of eventList) {
            event({
                sourceBlock: source,
                targetBlock: target,
                linkData: linkData
            }, cmp);
        }
    }

    private static buildLinkEventList(blk: Block, linkType: string, cmp: MachineComponentParams): Set<MACHINE_COMPONENT_LINK_EVENT_CALLBACK> {
        const allGroup = this.LINK_EVENT_CALLBACKS['ALL'];
        const specGroup = this.LINK_EVENT_CALLBACKS[linkType];

        let allEList: Set<any> = undefined;
        if (allGroup !== undefined) {
            allEList = this.newBuildEventListForMachine(blk, allGroup, cmp);
        }

        let specEList: Set<any> = undefined
        if (specGroup !== undefined) {
            specEList = this.newBuildEventListForMachine(blk, specGroup, cmp);
        }

        const hasSpecList = specEList !== undefined;
        const hasAllList = allEList !== undefined;

        if (hasAllList && !hasSpecList) {
            return allEList;
        } else if (!hasAllList && hasSpecList) {
            return specEList;
        } else if (!hasAllList && !hasSpecList) {
            // No events
            return new Set();
        }

        return new Set([...allEList.values(), ...specEList.values()]);
    }

    private static newBuildEventListForMachine<T>(mc: Block, cbStorageObj: Record<string, Record<string, T[]>>, params: MachineComponentParams): Set<T> {
        const eventGroups: Record<string, T[]>[] = [];

        // Grab all event groups associated with this component
        let allEventGroup = cbStorageObj['ALL'];
        if (allEventGroup !== undefined) {
            eventGroups.push(allEventGroup);
        }

        // Grab all event groups associated with this machine ID
        let typeEventGroup = cbStorageObj[params.machine_id];
        if (typeEventGroup !== undefined) {
            eventGroups.push(typeEventGroup);
        }

        // Iterate the event groups and grab all related to the machine's type
        const eventList: T[] = [];
        for (const group of eventGroups) {
            let allEvents = group['ALL'];
            if (allEvents !== undefined) {
                eventList.push(...allEvents);
            }

            const events = group[params.machine_type];
            if (events === undefined) {
                continue;
            }

            eventList.push(...events);
        }

        return new Set(eventList);
    }

    newOnEvent(cbStorageObj: Record<string, Record<string, CallableFunction[]>>, ev: Record<string, any> & { block: Block }, args: CustomComponentParameters) {
        const params = args.params as MachineComponentParams;

        const eventList = MachineCustomComponent.newBuildEventListForMachine(ev.block, cbStorageObj, params);

        for (const callback of eventList) {
            callback(ev, params);
        }
    }

    // Methods that can be used to interact with a machine
    static getBlockVolume(block: Block) {
        if (!block.hasTag("lunatech:machine")) {
            throw new NotAMachineError(block.location);
        }

        // Grab the range
        const machCmp = block.getComponent("lunatech:machine");
        if (machCmp === undefined) {
            throw new NoMachineComponentError(block.location);
        }

        const range = (machCmp.customComponentParameters.params as MachineComponentParams).range;

        // Create a block volume from this range and location
        return this.getBlockVolumeFromRange(range, block.location);
    }

    // Methods that can be used to interact with a machine
    static getBlockVolumeForLinkType(block: Block, linkType: string) {
        if (!block.hasTag("lunatech:machine")) {
            throw new NotAMachineError(block.location);
        }

        // Grab the range
        const range = this.getRangeForLinkType(block, linkType);

        return this.getBlockVolumeFromRange(range, block.location);
    }

    /**
     * Gets a BlockVolume based on the provided range or machine
     */
    static getBlockVolumeFromRange(range: number, location: Vector3) {
        const fromLoc = {
            x: location.x - range,
            y: location.y - range,
            z: location.z - range,
        }

        const toLoc = {
            x: location.x + range,
            y: location.y + range,
            z: location.z + range,
        }

        return new BlockVolume(fromLoc, toLoc);
    }

    static getConnectedMachineLocationIter(machine: Block) {
        const volume = this.getBlockVolume(machine);

        // Grab the dimension and get all connected blocks
        let locations = Array.from(machine.dimension.getBlocks(volume, {
            includeTags: ["lunatech:machine"],
        }, true).getBlockLocationIterator());

        const loc = machine.location;

        locations = locations.filter((value) => {
            return !(
                value.x === loc.x
                && value.y === loc.y
                && value.z === loc.z
            );
        })

        return locations;
    }

    static getConnectedMachines(machine: Block): Block[] {
        const locations = this.getConnectedMachineLocationIter(machine);

        const connectedMachines: Block[] = [];
        for (const location of locations) {
            const block = machine.dimension.getBlock(location);

            if (block === undefined) {
                // Only found air, skip
                break;
            }

            connectedMachines.push(block);
        }

        return connectedMachines;
    }

    static getConnectedKylowatMachines(machine: Block, typeFilter?: MachineTypes[]): kylowat.Machine[] {
        const machines = this.getConnectedMachines(machine);

        const kWMachines: kylowat.Machine[] = [];
        for (const machine of machines) {
            const kWMachine = MachineCustomComponent.getKylowatMachine(machine);
            if (kWMachine === undefined) {
                continue;
            }

            const params = machine.getComponent("lunatech:machine").customComponentParameters.params as MachineComponentParams;

            if (typeFilter !== undefined && typeFilter.length !== 0 && !typeFilter.includes(params.machine_type)) {
                continue;
            }

            kWMachines.push(MachineCustomComponent.getKylowatMachine(machine));
        }

        return kWMachines;
    }

    static getKylowatMachine(machine: Block): kylowat.Machine | undefined {
        const loc = machine.location;
        const id = `${loc.x}:${loc.y}:${loc.z}`;

        let kWMachine = kylowat.Machine.cache.get(id);

        if (kWMachine === undefined) {
            const id = kylowat.Machine.findIdByLocation(loc);

            if (id !== null) {
                // Machine needs reloaded!
                kWMachine = kylowat.Machine.reconstructFromId(id);
            }
        }

        return kWMachine;
    }

    static handleAutoLink(machine: Block) {
        // NOTE: THIS FUNCTION IS CURRENTLY NOT MADE TO THE STANDARDS OF THE CURRENT LINKING SYSTEM, IT SHOULD NOT BE USED UNTIL ITS UPDATED
        const args = machine.getComponent("lunatech:machine")?.customComponentParameters.params as MachineComponentParams;

        if (args === undefined) {
            throw new NotAMachineError(machine.location);
        }

        const kWMachine = MachineCustomComponent.getKylowatMachine(machine);

        // Handle linking to respective machines
        const machineType = args.machine_type;

        if (machineType !== MachineTypes.WORKER) {
            // Should link to any "BATTERY" or "WORKER" within range
            const connectedMachines = MachineCustomComponent.getConnectedKylowatMachines(machine, [MachineTypes.BATTERY, MachineTypes.WORKER]);

            const linkedMachines = kWMachine.getLinkedMachines();

            const removedList = linkedMachines.filter((value) => {
                let res = !connectedMachines.includes(value);

                if (res) {
                    kWMachine.unlinkMachine(value);
                }

                return res;
            });

            // Find the machines that still need to be linked
            const addedList = connectedMachines.filter((value) => {
                let res = !linkedMachines.includes(value);

                if (res) {
                    kWMachine.linkMachine(value);
                }

                return res;
            });
        }

        return kWMachine.getLinkedMachines();
    }

    static deleteMachineAtBlock(mc: Block) {
        const machine = this.getKylowatMachine(mc);

        kylowat.Machine.deleteId(machine.id);
        machine?.delete();

        // Delete linked entities and scoreboard objective
        const scoreboardId = this.getLinkedEntityScoreboardId(mc);
        const linkedEntites = this.getAllLinkedEntities(mc);

        for (const entity of linkedEntites) {
            entity.remove();
        }

        world.scoreboard.removeObjective(scoreboardId);
    }

    private static getLinkedEntityScoreboardId(mc: Block): string {
        const loc = mc.location;
        return `lunatech:linked_entities:${mc.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;
    }

    static getLinkedMachineEntity(mc: Block): Entity {
        // Check if the entity exists in a cache
        const cachedEntity = (mc as any).verpitek_linked_machine_entity as Entity | undefined;
        if (cachedEntity && cachedEntity.isValid) {
            return cachedEntity;
        }

        const linkedEntities = this.getAllLinkedEntities(mc);

        let foundEntity: Entity | undefined = undefined;

        for (const entity of linkedEntities) {
            if (entity.typeId === "lunatech:machine_entity") {
                foundEntity = entity;
            }
        }

        (mc as any).verpitek_linked_machine_entity = foundEntity;

        return foundEntity;
    }

    static getAllLinkedEntities(mc: Block): Entity[] {
        const id = this.getLinkedEntityScoreboardId(mc);

        const res = world.scoreboard.getObjective(id);

        if (res === undefined) {
            // No linked ents
            return [];
        }

        let ents = [];
        for (const entityId of res.getParticipants()) {
            let entity;
            try {
                entity = entityId.getEntity();
            } catch {
                // Entity not loaded
                continue;
            }

            ents.push(entity);
        }

        return ents;
    }

    static addLinkedEntity(mc: Block, entity: Entity) {
        const scoreboardId = this.getLinkedEntityScoreboardId(mc);

        let obj = world.scoreboard.getObjective(scoreboardId);
        if (obj === undefined) {
            obj = world.scoreboard.addObjective(scoreboardId);
        }

        obj.setScore(entity, 0);
    }

    static removeLinkedEntity(mc: Block, entity: Entity) {
        const scoreboardId = this.getLinkedEntityScoreboardId(mc);

        let obj = world.scoreboard.getObjective(scoreboardId);
        if (obj === undefined) {
            // No linked entities so nothing to remove
            return;
        }

        obj.removeParticipant(entity);
    }

    static setNameLine(block: Block, lineId: string, lineTxt: string) {
        const loc = block.location;
        const locId = `${block.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        let storedNameData = this.NAME_DATA[locId];
        if (storedNameData === undefined) {
            storedNameData = {
                [lineId]: lineTxt,
            }

            this.NAME_DATA[locId] = storedNameData;
            return;
        }

        storedNameData[lineId] = lineTxt;
    }

    static appendNameLine(block: Block, lineId: string, lineTxt: string) {
        const loc = block.location;
        const locId = `${block.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        let storedNameData = this.NAME_DATA[locId];
        if (storedNameData === undefined) {
            storedNameData = {
                [lineId]: lineTxt,
            }

            this.NAME_DATA[locId] = storedNameData;
            return;
        }

        let existingLineData = storedNameData[lineId];
        if (existingLineData === undefined) {
            storedNameData[lineId] = lineTxt;
        }

        if (typeof existingLineData === 'string') {
            existingLineData = [existingLineData, lineTxt];
            storedNameData[lineId] = existingLineData;
            return;
        }

        existingLineData.push(lineTxt);
    }

    static getNameLines(block: Block) {
        const loc = block.location;
        const locId = `${block.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        let storedNameData = this.NAME_DATA[locId];
        if (storedNameData === undefined) {
            // No stored name
            return [];
        } else {
            let lines: string[] = [];
            for (const line of Object.values(storedNameData)) {
                if (typeof line === 'string') {
                    lines.push(line);
                } else {
                    lines.push(...line);
                }
            }

            return lines;
        }
    }

    static tryRemoveEnergy(block: Block, amount: number) {
        const kylowatMachine = this.getKylowatMachine(block);

        const currentEnergy = kylowatMachine.currentEnergy;
        if (amount > currentEnergy) {
            return false;
        }

        kylowatMachine.removeEnergy(amount);

        return true;
    }

    static getMachineContainer(mach: Block): Container | undefined {
        const linkedEnt = this.getLinkedMachineEntity(mach);
        if (linkedEnt === undefined) {
            return;
        }

        return linkedEnt.getComponent("minecraft:inventory").container!
    }

    static getMachineSlot(mach: Block, slot: number) {
        return this.getMachineContainer(mach)!.getSlot(slot);
    }

    static registerSlotName(machineId: string, slotName: string, slotNum: number) {
        let existingReg = this.SLOT_NAME_REGISTRY[machineId];
        if (existingReg === undefined) {
            existingReg = {};
            this.SLOT_NAME_REGISTRY[machineId] = existingReg;
        }

        existingReg[slotName] = slotNum;
    }

    static getSlotFromName(blk: Block, slotName: string) {
        const cmp = blk.getComponent(this.ID)!.customComponentParameters.params as MachineComponentParams;

        const machSlots = this.SLOT_NAME_REGISTRY[cmp.machine_id];
        if (machSlots === undefined) {
            return undefined;
        }

        const slotId = machSlots[slotName];

        if (slotId === undefined) {
            return undefined;
        }

        return this.getMachineSlot(blk, slotId);
    }

    static getScoreboardObj(blk: Block) {
        const loc = blk.location;

        const objId = `lunatech:machine:${blk.dimension.id}:${loc.x}:${loc.y}:${loc.z}`

        let obj = world.scoreboard.getObjective(objId);
        if (obj === undefined) {
            obj = world.scoreboard.addObjective(objId);
        }

        return obj;
    }

    static getProgress(blk: Block) {
        const obj = this.getScoreboardObj(blk);

        if (!obj.hasParticipant('PROGRESS')) {
            return 0;
        }

        return obj.getScore('PROGRESS');
    }

    static setProgress(blk: Block, value: number) {
        const obj = this.getScoreboardObj(blk);

        obj.setScore('PROGRESS', value);
    }

    static getMaxProgress(blk: Block) {
        const cmp = blk.getComponent(this.ID).customComponentParameters.params as MachineComponentParams;

        // Checking if runtime max exists for block
        const obj = this.getScoreboardObj(blk);
        if (obj.hasParticipant('MAX_PROGRESS')) {
            return obj.getScore('MAX_PROGRESS');
        }

        return this.MAX_PROGRESS_MAP[cmp.machine_id];
    }

    static setRuntimeMaxProgress(blk: Block, max: number) {
        const obj = this.getScoreboardObj(blk);

        obj.setScore('MAX_PROGRESS', max);
    }

    static registerMaxProgress(machineId: string, maxProgress: number) {
        this.MAX_PROGRESS_MAP[machineId] = maxProgress
    }

    static canLinkTo(sourceMachine: Block, targetMachine: Block) {
        const srcCmp = sourceMachine.getComponent(MachineCustomComponent.ID);
        const trgCmp = targetMachine.getComponent(MachineCustomComponent.ID);

        if (srcCmp === undefined || trgCmp === undefined) {
            return false;
        }

        // Check ranges
        const distance = distanceBetween(sourceMachine.center(), targetMachine.center());
        const maxDistance = (srcCmp.customComponentParameters.params as MachineComponentParams).range;
        if (distance > maxDistance) {
            return false;
        }

        const srcType = (srcCmp.customComponentParameters.params as MachineComponentParams).machine_type;
        const trgType = (trgCmp.customComponentParameters.params as MachineComponentParams).machine_type;

        if (srcType === MachineTypes.WORKER || trgType === MachineTypes.GENERATOR) {
            // Worker machines can't send their power to anything
            // Generator machines can't recieve power from anything
            return false;
        }

        if (srcType === MachineTypes.GENERATOR || srcType === MachineTypes.BATTERY) {
            // Generator/Battery machines can only link to nodes
            return trgType === MachineTypes.NODE;
        }

        // Narrowed down combinations to source being a NODE and target not being a GENERATOR
        return true;
    }

    static getComponent(blk: Block) {
        const cmp = blk.getComponent(this.ID);

        return cmp.customComponentParameters.params as MachineComponentParams;
    }

    static getId(blk: Block) {
        return this.getComponent(blk).machine_id;
    }

    // Grabs all slots with a name prefixed by `INV_`
    static getMachineInvSlots(blk: Block): ContainerSlot[] {
        const machId = this.getId(blk);

        const machSlots = this.SLOT_NAME_REGISTRY[machId];

        const slots = [];

        for (const [slotName, slotNum] of Object.entries(machSlots)) {
            if (!slotName.startsWith("INV_")) {
                continue;
            }

            const slotNum = parseInt(slotName.slice(4));
            if (isNaN(slotNum)) {
                continue;
            }

            slots[slotNum] = this.getMachineSlot(blk, slotNum);
        }

        return slots;
    }


    // DEFAULT CONNECTION RANGE: 10 Blocks
    static getRangeForLinkType(blk: Block, linkTag: string) {
        const cmp = this.getComponent(blk);

        if (cmp.newRange === undefined) {
            return 10;
        }

        const range = cmp.newRange[linkTag];

        if (range === undefined) {
            return 10;
        }

        return range;
    }

    static fetchArrayFromDynProps(blk: Block, id: string): (string | number | boolean | Vector3)[] {
        const machEnt = this.getLinkedMachineEntity(blk);

        const dynProps = machEnt.getDynamicPropertyIds();

        const res = [];

        for (const dynProp of dynProps) {
            if (!dynProp.startsWith(id)) {
                // Not part of the array
                continue;
            }

            const indexStr = dynProp.slice(id.length);

            const index = parseInt(indexStr);

            if (isNaN(index)) {
                // Also not part of the array
                continue;
            }

            // Push the associated value to the res array at the given index
            res[index] = machEnt.getDynamicProperty(dynProp);
        }

        return res;
    }

    static clearArrayInDynProps(blk: Block, id: string) {
        const machEnt = this.getLinkedMachineEntity(blk);
        const dynProps = machEnt.getDynamicPropertyIds();

        for (const dynProp of dynProps) {
            if (!dynProp.startsWith(id)) {
                // Not part of the array
                continue;
            }

            const indexStr = dynProp.slice(id.length);

            const index = parseInt(indexStr);

            if (isNaN(index) && dynProp !== id + "length") {
                // Also not part of the array
                continue;
            }

            machEnt.setDynamicProperty(dynProp);
        }
    }

    static storeArrayInDynProps(blk: Block, id: string, array: (string | number | boolean | Vector3 | undefined)[]) {
        this.clearArrayInDynProps(blk, id);

        const machEnt = this.getLinkedMachineEntity(blk);

        const newProperties: Record<string, string | number | boolean | Vector3> = {};

        for (let i = 0; i < array.length; i++) {
            const value = array[i];

            if (value === undefined) {
                continue;
            }

            newProperties[id + i] = value;
        }

        // Length value used for appending
        newProperties[id + "length"] = array.length;

        machEnt.setDynamicProperties(newProperties);
    }

    static appendToArrayInDynProps(blk: Block, id: string, value: string | number | boolean | Vector3 | undefined) {
        const machEnt = this.getLinkedMachineEntity(blk);

        // Get the length from dyn props
        const length = machEnt.getDynamicProperty(id + "length") as number | undefined;

        if (length === undefined) {
            // Doesn't have any stored data yet
            this.storeArrayInDynProps(blk, id, [value]);
            return 0;
        }

        // Storing new value + length
        machEnt.setDynamicProperty(id + length, value);
        machEnt.setDynamicProperty(id + "length", length + 1);
    }

    static setValueInArray(blk: Block, id: string, index: number, value: string | number | boolean | Vector3 | undefined) {
        const machEnt = this.getLinkedMachineEntity(blk);

        // Get the length from dyn props
        const length = machEnt.getDynamicProperty(id + "length") as number | undefined;

        if (length === undefined) {
            // Doesn't have any stored data yet
            const array = [];
            array[index] = value;

            this.storeArrayInDynProps(blk, id, array);
            return 0;
        }

        // Storing new value
        machEnt.setDynamicProperty(id + index, value);

        // Checking if stored length needs updated
        if ((length - 1) < index) {
            // Length needs to increase to index + 1
            machEnt.setDynamicProperty(id + "length", index + 1);
        }
    }

    static registerLinkedBlock(source: Block, target: Block, linkType: string) {
        const linkData = BlockTagLink.getLinkFromType(linkType);

        if (linkData !== undefined) {
            // Block link is part of the generic link system, fire generic link
            this.onLink(source!, target!, linkData);
        }

        this.appendToArrayInDynProps(source, linkType + "lb", target.location);
    }

    static getAllLoadedLinkedBlocks(blk: Block, testValidity: boolean = false) {
        const possibleLinks = BlockTagLink.getLinkOptions(blk);

        let linkedBlockMap: Record<string, { linkData: BlockTagLink, blocks: Block[] }> = {};

        for (const link of possibleLinks) {
            // Get all blocks linked to this machine of the current type
            const linkedBlocks = this.getLoadedLinkedBlocks(blk, link.linkTag, testValidity)

            linkedBlockMap[link.linkTag] = { blocks: linkedBlocks, linkData: link };
        }

        return linkedBlockMap;
    }

    static getLoadedLinkedBlocks(blk: Block, linkType: string, testValidity: boolean = false) {
        const locArray = this.fetchArrayFromDynProps(blk, linkType + "lb") as Vector3[];

        const linkTypeInst = BlockTagLink.getLinkFromType(linkType);
        if (linkTypeInst === undefined && testValidity) {
            return [];
        }

        const res: Block[] = [];

        for (let i = 0; i < locArray.length; i++) {
            const blockLoc = locArray[i];

            let linkedBlock: Block | undefined = undefined;

            try {
                linkedBlock = blk.dimension.getBlock(blockLoc);
            } catch { };

            if (linkedBlock === undefined) {
                continue;
            }

            if (testValidity) {
                const linkData = linkTypeInst.canLink(blk, linkedBlock);

                if (linkData.res !== CanLinkResult.SUCCESS || linkData.linkMade.linkTag !== linkTypeInst.linkTag) {
                    // No longer a valid link, remove from dyn props
                    this.setValueInArray(blk, linkType + "lb", i, undefined);

                    continue;
                }
            }

            res.push(linkedBlock);
        }

        return res;
    }

    static couldLinkToBlock(source: Block, target: Block, tryFlip: boolean = true): { linkType?: string, errors: [string, CanLinkResult][], couldLink: boolean, absSource?: Block, absTarget?: Block } {
        const possibleLinks = BlockTagLink.getLinkOptions(source);

        if (possibleLinks.length <= 0) {
            if (!tryFlip) {
                return { errors: [["NO_TAGS", CanLinkResult.INVALID_TARGET]], couldLink: false };
            }

            // If there are zero possible links, try again with the values flipped
            // If there are links and they only worked flipped thats handled below by "canLink"
            return this.couldLinkToBlock(target, source, false);
        }

        let validLink: BlockTagLink | undefined = undefined;

        const err: [string, CanLinkResult][] = [];

        let absSource: Block | undefined = undefined;
        let absTarget: Block | undefined = undefined;

        for (let link of possibleLinks) {
            // Check if the link is valid
            const linkData = link.canLink(source, target);
            if (linkData.res !== CanLinkResult.SUCCESS) {
                // Link failed, mark error and continue
                err.push([link.linkTag, linkData.res]);

                continue;
            }

            link = linkData.linkMade;

            // Potentially valid unless the absolute-source already contains the absolute-target
            const linkedBlocks = this.getLoadedLinkedBlocks(linkData.source, link.linkTag, true);
            const maxLinkCount = (link.limiter?.getMaxLinkCount(linkData.source) ?? -1);

            if (maxLinkCount !== -1 && linkedBlocks.length >= maxLinkCount) {
                // Already at the link limit for this link type, continue and push the err
                err.push([link.linkTag, CanLinkResult.INVALID_TARGET]);
                continue;
            }

            const targetLoc = linkData.target.location;

            let alrLinked = false;
            for (const linkedBlock of linkedBlocks) {
                const linkedLoc = linkedBlock.location;

                if (
                    linkedLoc.x === targetLoc.x &&
                    linkedLoc.y === targetLoc.y &&
                    linkedLoc.z === targetLoc.z
                ) {
                    // Block already linked, break;
                    alrLinked = true;
                    break;
                }
            }

            if (alrLinked) {
                // Absolute Source is already linked to Absolute Target, try other link option
                continue;
            }

            // Fully valid link
            validLink = link;

            absSource = linkData.source;
            absTarget = linkData.target;

            break;
        }

        return { linkType: validLink?.linkTag, errors: err, couldLink: validLink !== undefined, absSource, absTarget };
    }

    static tryLinkToBlock(source: Block, target: Block, tryFlip: boolean = true): { linkType?: string, errors: [string, CanLinkResult][], couldLink: boolean, absSource?: Block, absTarget?: Block } {
        const couldLinkData = this.couldLinkToBlock(source, target, tryFlip);

        if (couldLinkData.couldLink) {
            this.registerLinkedBlock(couldLinkData.absSource!, couldLinkData.absTarget!, couldLinkData.linkType);
        }

        return couldLinkData;
    }
}

export function distanceBetween(a: Vector3, b: Vector3) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(MachineCustomComponent.ID, new MachineCustomComponent());
})