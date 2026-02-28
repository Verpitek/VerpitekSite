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

import { MachineComponentParams, MachineCustomComponent, MachineTypes } from "./component";
import * as kylowat from "../energy/kylowatAPI";
import { Block, BlockVolume, Dimension, MolangVariableMap, Player, system, TicksPerSecond, Vector3, world } from "@minecraft/server";
import { tryTransferContainerToSlot, tryTransferSlotToContainer } from "./workers/furnace/panspark";
import { makeLine } from "../displays/line_manager";
import { registerWorldLoadEvent } from "../events";
import { BlockTagLink } from "../blockLinking/manager";
import { drawBoxAroundBlock, drawRangeDisplay } from "../blockLinking/particleHandlers/range_line";
import { XYZRecord } from "../tools/xyz_record";

function idFromBlock(machine: Block) {
    return machine.dimension.id + ":" + machine.location.x.toString() + machine.location.y.toString() + machine.location.z.toString();
}

MachineCustomComponent.registerTickEvent((ev, args) => {
    let hasTicked = ev.block.permutation.getState("lunatech:has_ticked");

    // Skip tick if the machine hasn't been regsitered yet, this will be an indicator for first tick though
    if (!hasTicked) {
        const loc = ev.block.location;

        // Check if a machine already exists at the target location
        const locId = kylowat.Machine.findIdByLocation(loc);

        if (locId !== null) {
            // Machine already exists where a new machine is being placed, destroy it and make a new one
            kylowat.Machine.deleteId(locId);
        }

        // Create a new machine in Kylowat
        new kylowat.Machine(
            args.machine_id,
            loc,
            0, // TODO: Add Power Drain Option
            args.buffer,
            0,
            1,
        );

        const blockCenter = ev.block.center();
        const entLoc = {
            x: blockCenter.x,
            y: blockCenter.y - 0.5,
            z: blockCenter.z
        }

        // Create linked entity for this machine
        const nameEnt = ev.block.dimension.spawnEntity("lunatech:machine_entity", entLoc);

        MachineCustomComponent.addLinkedEntity(ev.block, nameEnt);

        return;
    }

    const kWMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kWMachine === undefined) {
        return;
    }

    // Fire energy transfer if not a battery
    const amount = args.transfer_rate === undefined ? 5 : args.transfer_rate;
    kWMachine.transferToLinkedMachines(amount);
})

MachineCustomComponent.registerBreakEvent((ev) => {
    const id = idFromBlock(ev.block);

    // Delete machine
    MachineCustomComponent.deleteMachineAtBlock(ev.block);
})

let playerMachineInteractionStorage: Record<string, { machine: Block, player: Player, timeTillNextDisplayUpdateRec?: XYZRecord<number> }> = {};

registerWorldLoadEvent(() => {
    /**
     * Start an interval that loops players in a link interaction
     * 
     * In this loop:
     * - Grab the base machine they've interacted with
     *   - Loop all possible link types for this block and create a list of possible downstream tags
     *   - Loop all possible link types that can link to this block and create a list of its possible downstream tags
     *   - Grab 2 seperate sections from the block volume, one with the list made of downstream tags and a list of upstream tags
     *  - Draw the overall box around the entire range area
     *  - Iterate all downstream tagged blocks and draw a green-box around the machine if its within range
     *      - If the downstream tag is present in the upstream list, remove it
     *  - Iterate all upstream tagged blocks and grab the block at their location
     *    - Grab the range from this block instance and check if the source block is within range
     *      - If yes, draw a green box
     *      - If no, draw a red box
     */
    system.runInterval(() => {
        for (let { player, machine, timeTillNextDisplayUpdateRec } of Object.values(playerMachineInteractionStorage)) {
            if (player === undefined) {
                continue;
            }

            if (!player.isValid || !machine.isValid || machine.isAir || !machine.hasTag("lunatech:machine")) {
                // Player has left the server or block is now invalid, remove their data from the interaction storage
                delete playerMachineInteractionStorage[player.id];

                // TODO: If block unloaded, inform the player

                continue;
            }

            if (timeTillNextDisplayUpdateRec === undefined) {
                timeTillNextDisplayUpdateRec = new XYZRecord();

                playerMachineInteractionStorage[player.id] = { player, machine, timeTillNextDisplayUpdateRec };
            }

            // Get a start point 5 blocks back from the player
            const playerLoc = player.location;

            const startPos = {
                x: playerLoc.x - 10,
                y: playerLoc.y - 10,
                z: playerLoc.z - 10,
            }

            const endPos = {
                x: playerLoc.x + 10,
                y: playerLoc.y + 10,
                z: playerLoc.z + 10,
            }

            // Grab a block volume around the player
            const blockVolume = new BlockVolume(startPos, endPos);

            // Grab all machine blocks in the vacinity
            const potentialLinks = player.dimension.getBlocks(blockVolume, {
                includeTags: ["lunatech:machine"],
            })

            const blockLocIter = potentialLinks.getBlockLocationIterator();

            const machLoc = machine.location;

            for (const potentialLoc of blockLocIter) {

                // Check the last time this loc was displayed
                const nextDisplayTime = timeTillNextDisplayUpdateRec.getValue(potentialLoc, true);

                if (nextDisplayTime !== undefined && nextDisplayTime > 0) {
                    // Remove 2 from display time and continue
                    timeTillNextDisplayUpdateRec.setValue(potentialLoc, nextDisplayTime - 2);
                    continue;
                }

                // Set display time to 20 and move forward
                timeTillNextDisplayUpdateRec.setValue(potentialLoc, 20);

                if (
                    potentialLoc.x === machLoc.x &&
                    potentialLoc.y === machLoc.y &&
                    potentialLoc.z === machLoc.z
                ) {
                    // Selected Block
                    drawBoxAroundBlock(player, machine.center(), "lunatech:link_selected_line")
                    continue;
                }

                const block = player.dimension.getBlock(potentialLoc);

                // Check if the base machine can link to the target machine under the same conditions
                const res = MachineCustomComponent.couldLinkToBlock(machine, block);

                if (res.couldLink) {
                    drawBoxAroundBlock(player, block.center(), "lunatech:link_allowed_line");
                } else {
                    drawBoxAroundBlock(player, block.center(), "lunatech:link_invalid_line");
                }
            }
        }
    }, 2)
})

// Handle Direct Linking
MachineCustomComponent.registerInteractEvent((ev) => {
    // Ensure the player is using a wrench and is not crouching
    const heldItem = ev.player.getComponent("minecraft:inventory").container.getSlot(ev.player.selectedSlotIndex);

    if (ev.player.isSneaking || !heldItem.hasItem() || heldItem.typeId !== "lunatech:wrench") {
        // Not a linking interaction
        return;
    }

    let { machine: sourceMachine } = playerMachineInteractionStorage[ev.player.id] ?? { machine: undefined };

    const interactedWithMachine = ev.block.hasTag("lunatech:machine");

    if (sourceMachine === undefined || !sourceMachine.isValid) {
        // First interaction of the set

        if (!interactedWithMachine) {
            // No output because this just means they used the wrench on something non-linkable
            return;
        }

        ev.player.sendMessage("Interact with the machine you want to link to! Interact with this machine again to cancel");

        // Store machine and reference in next interaction
        playerMachineInteractionStorage[ev.player.id] = { machine: ev.block, player: ev.player };
        return;
    }

    // Second interaction of the set

    if (!interactedWithMachine) {
        // Didn't interact with a machine
        const sourceLoc = sourceMachine.location;
        ev.player.sendMessage("Can only link to another machine, try again or interact with the origional machine to cancel!\nConfiguring Machine at: " + `(${sourceLoc.x}, ${sourceLoc.y}, ${sourceLoc.z})`);

        return;
    }

    // Check if its an interaction with the origional block
    const sMachLoc = sourceMachine.location;
    const tMachLoc = ev.block.location;

    if (
        sMachLoc.x === tMachLoc.x &&
        sMachLoc.y === tMachLoc.y &&
        sMachLoc.z === tMachLoc.z
    ) {
        ev.player.sendMessage("Cancelled");
        delete playerMachineInteractionStorage[ev.player.id];
        return;
    }

    // Checking if the two blocks successfully link
    const res = MachineCustomComponent.tryLinkToBlock(sourceMachine, ev.block);

    if (res.linkType !== undefined) {
        ev.player.sendMessage("Successfully linked two machines");
    } else {
        ev.player.sendMessage("Failed to link two machines");
    }

    delete playerMachineInteractionStorage[ev.player.id];

    /*
    // Check held item
    const heldItem = ev.player.getComponent("minecraft:inventory").container.getSlot(ev.player.selectedSlotIndex);

    if (!heldItem.hasItem() || heldItem.typeId !== "lunatech:wrench") {
        return;
    }

    const playerId = ev.player.id;

    let sourceMachine = playerMachineInteractionStorage[playerId];

    if (!ev.block.hasTag("lunatech:machine")) {
        if (sourceMachine !== undefined) {
            ev.player.sendMessage("Can only link to another machine, try again or interact with the origional machine to cancel!\nSrc Loc: " + JSON.stringify(sourceMachine));
            return;
        }

        return;
    }

    const loc = ev.block.location;

    if (sourceMachine === undefined) {
        const cmp = ev.block.getComponent(MachineCustomComponent.ID).customComponentParameters.params as MachineComponentParams;

        if (cmp.machine_type === MachineTypes.WORKER) {
            return;
        }

        // Storing machine for next interaction
        playerMachineInteractionStorage[playerId] = loc;

        ev.player.sendMessage("Interact with the machine you want to link to! Interact with this machine again to cancel");
        return;
    }

    if (
        loc.x === sourceMachine.x
        && loc.y === sourceMachine.y
        && loc.z === sourceMachine.z
    ) {
        // Source machine
        delete playerMachineInteractionStorage[playerId];
        ev.player.sendMessage("Cancelled!");

        return;
    }

    // New target machine
    const srcBlock = ev.player.dimension.getBlock(sourceMachine);

    if (srcBlock === undefined) {
        ev.player.sendMessage("Source machine is invalid now!");
        delete playerMachineInteractionStorage[playerId];
        return;
    }

    if (!MachineCustomComponent.canLinkTo(srcBlock, ev.block)) {
        ev.player.sendMessage("Those two machines can't be linked!");
        delete playerMachineInteractionStorage[playerId];
        return;
    }

    const srcKwMachine = MachineCustomComponent.getKylowatMachine(srcBlock);
    const trgKWMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    srcKwMachine.linkMachine(trgKWMachine);
    delete playerMachineInteractionStorage[playerId];

    ev.player.sendMessage("Machines linked!");
    */
})


// Higher the number, the less particles there will be
const PARTICLE_DISTANCE = 0.25;

function generateLineId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const lineIdStorage: Record<string, string[]> = {};
const lineProgress: Record<string, number> = {};

function drawLineStep(a: Vector3, b: Vector3, dimension: Dimension, lineId: string = generateLineId()) {
    // Calculate distance between the two points
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const distance = Math.abs(Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)));

    // Last particle is usually skipped because it would be inside the machine anyway
    const particleCount = Math.floor(distance / PARTICLE_DISTANCE);

    // Determine blue_flames progress
    let prog = lineProgress[lineId];

    if (prog === undefined || prog > particleCount) {
        prog = 0;
    } else {
        prog += 1;
    }

    // Calculating the direction between the two points
    const dx2 = b.x - a.x;
    const dy2 = b.y - a.y;
    const dz2 = b.z - a.z;
    const length = Math.abs(Math.sqrt((dx2 * dx2) + (dy2 * dy2) + (dz2 * dz2)));
    const direction = {
        x: dx / length,
        y: dy / length,
        z: dz / length
    };

    // Spawn particle
    const travelDistance = PARTICLE_DISTANCE * prog;

    const particleLocation = {
        x: (direction.x * travelDistance) + a.x,
        y: (direction.y * travelDistance) + a.y,
        z: (direction.z * travelDistance) + a.z,
    }

    if (isNaN(particleLocation.x)) {
        return lineId;
    }

    dimension.spawnParticle("lunatech:electricity", particleLocation);

    lineProgress[lineId] = prog;
    return lineId;
}

/// Amount of ticks that should be waited until the next line is done
const LINE_INTERVAL = 20;
let lineWaitProgs: Record<string, number> = {};

/*
MachineCustomComponent.registerTickEvent((ev) => {
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kwMachine === undefined) {
        return;
    }

    const loc = ev.block.center();
    const blockId = `${ev.block.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

    // Determine if it needs to wait
    const waitProg = lineWaitProgs[blockId];
    if (waitProg !== undefined) {
        if (waitProg < LINE_INTERVAL) {
            // Still waiting

            lineWaitProgs[blockId] += 1;
            return;
        }

        // Done waiting
        delete lineWaitProgs[blockId];
    }

    const linkedMachines = kwMachine.getLinkedMachines();

    let lineIds = lineIdStorage[blockId];
    if (lineIds === undefined) {
        lineIds = [];
        lineIdStorage[blockId] = lineIds;
    }

    for (let i = 0; i < linkedMachines.length; i++) {
        const machine = linkedMachines[i];

        const currentLineId = lineIds[i];

        const machLoc = machine.location;
        const machCenterLoc = {
            x: machLoc.x + 0.5,
            y: machLoc.y,
            z: machLoc.z + 0.5,
        }

        makeLine(loc, machCenterLoc, ev.dimension.id, 0.025);
    }

    if (linkedMachines.length > 0) {
        lineWaitProgs[blockId] = 0;
    }
})*/

// Handle hopper ent interaction
MachineCustomComponent.registerTickEvent((ev, params) => {
    if (ev.firstTick || !ev.block.hasTag("lunatech:machine.storage.can_hop")) {
        // Block isnt marked with hopper support or first tick
        return;
    }

    const loc = ev.block.location;
    const objId = `lunatech:machine.start_tick:${ev.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

    // Setup scoreboard with first tick
    let obj = world.scoreboard.getObjective(objId);
    if (obj === undefined) {
        obj = world.scoreboard.addObjective(objId);
    }
    if (obj.hasParticipant("ent_last_time")) {
        const lastTime = obj.getScore("ent_last_time");

        if (system.currentTick - lastTime < 2) {
            // Not ready to fire
            return;
        }

        // Ready to fire, fall-through
    }

    let interactedWithHopper = false;

    if (params.hopper_in !== undefined) {
        interactedWithHopper = handleHopperEntInput(ev.block, params.hopper_in);
    }
    if (params.hopper_out !== undefined) {
        interactedWithHopper = handleHopperEntOutput(ev.block, params.hopper_out);
    }

    if (interactedWithHopper) {
        obj.setScore("ent_last_time", system.currentTick)
    }
})

// Handle hopper block interaction
MachineCustomComponent.registerTickEvent((ev, params) => {
    if (ev.firstTick || !ev.block.hasTag("lunatech:machine.storage.can_hop")) {
        // Block isnt marked with hopper support
        return;
    }

    const loc = ev.block.location;
    const objId = `lunatech:machine.start_tick:${ev.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

    // Setup scoreboard with first tick
    let obj = world.scoreboard.getObjective(objId);
    if (obj === undefined) {
        obj = world.scoreboard.addObjective(objId);
    }
    if (obj.hasParticipant("blk_last_time")) {
        const lastTime = obj.getScore("blk_last_time");

        if (system.currentTick - lastTime < 8) {
            // Not ready to fire
            return;
        } else {
            // Ready to fire, reset score to current tick
            obj.setScore("blk_last_time", system.currentTick);
        }
    } else {
        // First tick so should execute
        obj.setScore("blk_last_time", system.currentTick);
    }

    if (params.hopper_in !== undefined) {
        handleHopperInput(ev.block, params.hopper_in);
    }

    if (params.hopper_out !== undefined) {
        handleHopperOutput(ev.block, params.hopper_out);
    }
})

enum HOPPER_DIR {
    DOWN,
    UP,
    NORTH,
    SOUTH,
    WEST,
    EAST
}

const HOPPER_DIR_MAP: (Record<string, number> | Record<number, string>) = {
    0: "below",
    below: HOPPER_DIR.UP,
    1: "above",
    above: HOPPER_DIR.DOWN,
    2: "north",
    north: HOPPER_DIR.SOUTH,
    3: "south",
    south: HOPPER_DIR.NORTH,
    4: "west",
    west: HOPPER_DIR.EAST,
    5: "east",
    east: HOPPER_DIR.WEST
}

function handleHopperEntInput(mach: Block, inputTargetSlot: number) {
    const targetSlot = MachineCustomComponent.getMachineContainer(mach).getSlot(inputTargetSlot);

    const ents = checkForHoppperEnts(mach, HopperEntDir.UP);

    let foundEnt = false;
    for (const ent of ents) {
        foundEnt = true;

        const hopCon = ent.getComponent("minecraft:inventory").container;

        tryTransferContainerToSlot(hopCon, targetSlot, undefined, 1);
    }

    return foundEnt;
}

function handleHopperInput(mach: Block, inputTargetSlot: number) {
    // Check if there are any hoppers to try and pull from
    const hoppers = checkForHoppers(mach);
    if (hoppers.length <= 0) {
        // No connected hoppers
        return;
    }

    // Grab the target slot
    const targetSlot = MachineCustomComponent.getMachineContainer(mach).getSlot(inputTargetSlot);

    // Iterate hoppers and transfer items into targetSlot
    for (const hop of hoppers) {
        const hopCon = hop.getComponent('minecraft:inventory').container;

        tryTransferContainerToSlot(hopCon, targetSlot, undefined, 1);
    }
}

// Should check if an entity is below the minecart and transfer to it if it is
function handleHopperEntOutput(mach: Block, outputSourceSlot: number) {
    const sourceSlot = MachineCustomComponent.getMachineContainer(mach).getSlot(outputSourceSlot);

    const ents = checkForHoppperEnts(mach, HopperEntDir.DOWN);

    let foundEnt = false;
    for (const ent of ents) {
        // Transfer into the found hopper
        const hopCon = ent.getComponent("minecraft:inventory").container;

        foundEnt = true;

        tryTransferSlotToContainer(hopCon, sourceSlot, 1);
    }

    return foundEnt;
}

function handleHopperOutput(mach: Block, outputSourceSlot: number) {
    // Check if there is a hopper below to insert items into
    const hop = mach.below();
    if (
        hop.typeId !== "minecraft:hopper" ||
        hop.permutation.getState('toggle_bit')
    ) {
        return;
    }

    // Get the hopper's container
    const hopCon = hop.getComponent('minecraft:inventory').container;

    // Get source slot
    const sourceSlot = MachineCustomComponent.getMachineContainer(mach).getSlot(outputSourceSlot);

    // Transfer items from sourceSlot into hopCon
    tryTransferSlotToContainer(hopCon, sourceSlot, 1);
}

enum HopperEntDir {
    UP = 1,
    DOWN = -1,
}

function checkForHoppperEnts(mach: Block, dir: HopperEntDir) {
    // Check if there is an entity to output into
    const loc = mach.location;
    const searchLoc = {
        x: loc.x,
        y: loc.y + dir,
        z: loc.z,
    }

    const ents = mach.dimension.getEntitiesAtBlockLocation(searchLoc);

    return ents.filter((value) => {
        return value.typeId === "minecraft:hopper_minecart";
    })
}

function checkForHoppers(mach: Block) {
    const hopperList: Block[] = [];

    for (let i = HOPPER_DIR.UP; i <= HOPPER_DIR.EAST; i++) {
        const targetDir = HOPPER_DIR_MAP[i];
        const targetBlock: Block = mach[HOPPER_DIR_MAP[i]]();

        if (targetBlock === undefined || targetBlock.typeId !== "minecraft:hopper") {
            // Not a hopper
            continue;
        }

        const states = targetBlock.permutation.getAllStates();

        if (states["toggle_bit"]) {
            // Powered by redstone
            continue;
        }

        if (states["facing_direction"] !== HOPPER_DIR_MAP[targetDir]) {
            // Not facing the right direction
            continue;
        }

        hopperList.push(targetBlock);
    }

    return hopperList;
}