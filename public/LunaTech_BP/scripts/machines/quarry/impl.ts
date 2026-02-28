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

import { Block, Entity, Vector3 } from "@minecraft/server";
import { distanceBetween, MachineCustomComponent } from "../component";
import { QuarryEntityProperties, quarryTools } from "./tools";

const TICKS_PER_BLOCK = 1;

MachineCustomComponent.registerTickEvent((ev) => {
    const machEnt = MachineCustomComponent.getLinkedMachineEntity(ev.block);

    if (machEnt === undefined) {
        // Doesn't exist yet
        return;
    }

    // Grab the current timer for the block in the quarry
    let remainingTime = machEnt.getDynamicProperty(QuarryEntityProperties.RemTime) as number | undefined;

    if (remainingTime === undefined) {
        // Prepare the beam for its following ticks, no timer to work off of so no incrementing of other data
        prepareAndCastParticleFromQuarryBeam(ev.block);
        return;
    }

    // This is a beam block that has acted before, check where the timer is at
    if (remainingTime > 0) {
        // Not yet time to break a block, tick down the timer
        handleTimerDecrement(ev.block, machEnt, remainingTime);
        return;
    }

    // Timer has finished
    handleTimerFinished(ev.block);

    /*
    const result = quarryTools.calculateTargetLocation(ev.block);
    if (result === undefined) {
        return
    }

    const { location: currentLocation, isFinalInLayer: finalValidIndex, foundData } = result;

    // Destroy the block at current location
    ev.dimension.setBlockType(currentLocation, "minecraft:air");

    const centerCurrentLocation = {
        x: currentLocation.x + 0.5,
        y: currentLocation.y + 0.5,
        z: currentLocation.z + 0.5,
    }

    // Fire a ray to the block being destroyed
    quarryTools.castRayParticle(ev.dimension, ev.block.center(), centerCurrentLocation, 1 / 20);

    // Increment Indexs & Offsets based on new values
    if (finalValidIndex) {
        machEnt.setDynamicProperty(QuarryEntityProperties.LayerIndex, 0);
        machEnt.setDynamicProperty(QuarryEntityProperties.LayerYIndex, currentLocation.y - 1);
    } else {
        machEnt.setDynamicProperty(QuarryEntityProperties.LayerIndex, foundData.index + 1);
    }
    */
}, {
    machineId: ["lunatech:quarry_beam"]
})

function handleTimerDecrement(_blk: Block, machEnt: Entity, currentTime: number) {
    // Handle timer decrement
    machEnt.setDynamicProperty(QuarryEntityProperties.RemTime, currentTime - 1);
}

function handleTimerFinished(beamBlk: Block) {
    // Break the true target (if in bounds) and increment indexes
    const { block, targetLocation, isFinalInLayer, foundData } = quarryTools.calculateTrueTarget(beamBlk);

    if (quarryTools.isPosInBounds(block.location, foundData.baseShape)) {
        // TODO: Calculate item drops and breakability of the block
        beamBlk.dimension.setBlockType(block.location, "minecraft:air");
    }

    const machEnt = MachineCustomComponent.getLinkedMachineEntity(beamBlk);

    if (isFinalInLayer) {
        machEnt.setDynamicProperty(QuarryEntityProperties.LayerIndex, 0);
        machEnt.setDynamicProperty(QuarryEntityProperties.LayerYIndex, targetLocation.y - 1);
    } else {
        machEnt.setDynamicProperty(QuarryEntityProperties.LayerIndex, foundData.index + 1);
    }

    // Prepare and cast next particle
    prepareAndCastParticleFromQuarryBeam(beamBlk);
}

function prepareAndCastParticleFromQuarryBeam(beamBlk: Block) {
    const machEnt = MachineCustomComponent.getLinkedMachineEntity(beamBlk);

    // Setup target position inside of machEntity
    const targetResult = quarryTools.calculateTargetLocation(beamBlk);
    if (targetResult === undefined) {
        return;
    }

    let targetPosition = targetResult.location;
    targetPosition = {
        x: Math.floor(targetPosition.x) + 0.5,
        y: Math.floor(targetPosition.y) + 0.5,
        z: Math.floor(targetPosition.z) + 0.5,
    }

    // Calculate distance to the target and get how long it takes to hit that block
    const totalDistance = distanceBetween(beamBlk.location, targetPosition);
    const totalTickTime = Math.round(totalDistance * TICKS_PER_BLOCK) + 1;

    // Convert the time to seconds
    const totalSecTime = totalTickTime / 20;

    quarryTools.castRayParticle(beamBlk.dimension, quarryTools.calculateBeamSourcePos(beamBlk), targetPosition, totalSecTime);

    // Storing data
    quarryTools.setTargetPosition(machEnt, targetPosition);
    quarryTools.setTotalTimeInfo(machEnt, totalTickTime);
    quarryTools.setRemainingTimeInfo(machEnt, totalTickTime);

    return;
}