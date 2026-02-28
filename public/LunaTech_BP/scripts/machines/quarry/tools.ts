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

import { Block, Dimension, Entity, MolangVariableMap, Vector3 } from "@minecraft/server";
import { XYZRecord } from "../../tools/xyz_record";
import { MachineCustomComponent } from "../component";

export enum QuarryEntityProperties {
    LayerIndex = "lunatech:quarry_index",
    LayerYIndex = "lunatech:quarry_target_y",
    TargetPos = "lunatech:quarry_target_pos",
    RemTime = "lunatech:quarry_remaining_ticks",
    TotalTime = "lunatech:quarry_total_ticks",
    AtLayerEnd = "luantech:quarry_layer_end",
}

enum Direction {
    XPos,
    ZPos,
    XNeg,
    ZNeg,
}

const InvertDirection = {
    [Direction.XPos]: Direction.XNeg,
    [Direction.XNeg]: Direction.XPos,
    [Direction.ZPos]: Direction.ZNeg,
    [Direction.ZNeg]: Direction.ZPos,
}

type BaseShape = { controllerLocation: Vector3, fullBase: true, c1Dir: Direction, c2Dir: Direction, c1Location: Vector3, c2Location: Vector3, c3Location: Vector3 };

type DynamicPropertyRecord = Record<string, string | number | boolean | Vector3>

class QuarryTools {
    calcluateRowAndIndex(currentIndex: number, minimumLength: number, maximimumLength: number): { row: number, index: number, width: number, finalValidIndex: boolean } {
        let testRow = -1;
        let maxWidthRowsTested = 0;
        let lastWidthTested = 0;

        const numOfMaxWidthRows = maximimumLength - minimumLength + 1;

        let remainingIndex = currentIndex;

        while (true) {
            testRow += 1;

            let width: number | undefined = undefined;

            // Calculate the width of the current row
            const possibleWidth = Math.min(1 + testRow, minimumLength);

            if (possibleWidth === minimumLength) {
                maxWidthRowsTested += 1;
            }

            let finalValidIndex = false;

            if (maxWidthRowsTested > numOfMaxWidthRows) {
                // Instead of possibleWidth use last width - 1
                width = lastWidthTested - 1;

                if (width === 1) {
                    finalValidIndex = true;
                }
            } else {
                width = possibleWidth;
            }

            if (width < 1) {
                throw new Error("Invalid index provided: " + testRow);
            }

            lastWidthTested = width;

            // Does this entire row fit within remaining index
            if (remainingIndex >= width) {
                // Does entirly fit, remove and continue
                remainingIndex -= width;
                continue;
            } else {
                // Doesn't entirly fit, return row and remaining index
                return { row: testRow, index: remainingIndex, width, finalValidIndex };
            }
        }
    }

    calculateTargetLocation(beamBlk: Block): { location: Vector3, isFinalInLayer: boolean, foundData: { index: number, controller: Block, baseShape: BaseShape } } | undefined {
        // Fetch the machine entity
        const machEnt = MachineCustomComponent.getLinkedMachineEntity(beamBlk);

        // Fetch the linked quarry controller
        const linkedControllers = MachineCustomComponent.getLoadedLinkedBlocks(beamBlk, "lunatech:quarry_beam");

        if (linkedControllers.length < 1) {
            // Not linked to a controller
            return;
        }

        const controller = linkedControllers[0];

        // Grab the base shape from the controller
        const baseShape = this.getBaseShapeFromController(controller);

        if (!baseShape.fullBase) {
            // Doesn't have a complete quarry base
            return;
        }

        let index = machEnt.getDynamicProperty(QuarryEntityProperties.LayerIndex) as number | undefined;
        if (index === undefined) {
            index = 0;
        }

        let currentYLevel = machEnt.getDynamicProperty(QuarryEntityProperties.LayerYIndex) as number | undefined;
        if (currentYLevel === undefined) {
            currentYLevel = baseShape.controllerLocation.y - 1;
        }

        const lengthA = this.getDistanceBetweenTwoPoints(baseShape.controllerLocation, baseShape.c1Location);
        const lengthB = this.getDistanceBetweenTwoPoints(baseShape.controllerLocation, baseShape.c2Location);

        let minimumLength;
        let maximumLength;
        if (lengthA >= lengthB) {
            minimumLength = lengthB;
            maximumLength = lengthA;
        } else {
            minimumLength = lengthA;
            maximumLength = lengthB;
        }

        const { row, index: indexWithinRow, width, finalValidIndex } = this.calcluateRowAndIndex(index, minimumLength, maximumLength);

        // Grab the initial XZ offset in-front of the controller location
        const currentLocation = {
            ...baseShape.controllerLocation,
            y: currentYLevel
        }

        this.offsetPositionInDir(currentLocation, baseShape.c1Dir);
        this.offsetPositionInDir(currentLocation, baseShape.c2Dir);

        // Calculate the offset position based on the current row
        if (row < lengthA) {
            // Offset the position towards the c1 direction by the current row
            this.offsetPositionInDir(currentLocation, baseShape.c1Dir, row);
        } else {
            const firstHalf = lengthA - 1;

            // Offset the position towards the c1 direction by the lengthA - 1
            this.offsetPositionInDir(currentLocation, baseShape.c1Dir, firstHalf);

            // Offset the position towards the c1 to c3 direction by row - firstHalf
            const remHalf = row - firstHalf;

            const c1toc3Dir = this.getDirBetweenPos(baseShape.c1Location, baseShape.c3Location);

            this.offsetPositionInDir(currentLocation, c1toc3Dir, remHalf);
        }

        // Offset from the current location by the indexWithinRow
        this.offsetPositionFromIndexDir(currentLocation, baseShape.c1Dir, baseShape.c2Dir, indexWithinRow);

        return { location: currentLocation, isFinalInLayer: finalValidIndex, foundData: { index, controller, baseShape } }
    }

    calculateBoundsFromBaseShape(shape: BaseShape): { xRange: [number, number], zRange: [number, number], yMaxLimit: number } {
        // Grab the lowest X and Z of the 4 shape locations
        let xRange: [number, number] = [NaN, NaN];
        let zRange: [number, number] = [NaN, NaN];

        for (const location of [shape.controllerLocation, shape.c1Location, shape.c2Location, shape.c3Location]) {
            const minX = xRange[0];
            const maxX = xRange[1];
            if (isNaN(minX) || location.x < minX) {
                xRange[0] = location.x;
            } else if (isNaN(maxX) || location.x > maxX) {
                xRange[1] = location.x;
            }

            const minZ = zRange[0];
            const maxZ = zRange[1];
            if (isNaN(minZ) || location.z < minZ) {
                zRange[0] = location.z;
            } else if (isNaN(maxZ) || location.z > maxZ) {
                zRange[1] = location.z;
            }
        }

        return { xRange, zRange, yMaxLimit: shape.controllerLocation.y - 1 };
    }

    calculateTrueTarget(beamBlk: Block): { block: Block, targetLocation: Vector3, isFinalInLayer: boolean, foundData: { index: number, controller: Block, baseShape: BaseShape } } | undefined {
        let { location: targetLocation, foundData, isFinalInLayer } = this.calculateTargetLocation(beamBlk);

        targetLocation = {
            x: Math.floor(targetLocation.x) + 0.5,
            y: Math.floor(targetLocation.y) + 0.5,
            z: Math.floor(targetLocation.z) + 0.5,
        }

        const startingPoint = this.calculateBeamSourcePos(beamBlk);

        const direction = normalizedDirection(startingPoint, targetLocation);

        // Cast a ray from the startingPoint and see what block it hits
        const blockFound = beamBlk.dimension.getBlockFromRay(startingPoint, direction, {
            includeLiquidBlocks: true,
            includePassableBlocks: true,
            excludeTypes: ["minecraft:air"],
        })

        return { block: blockFound.block, targetLocation, isFinalInLayer, foundData };
    }

    getBaseShapeFromController(blk: Block): { controllerLocation: Vector3, fullBase: false } | BaseShape {
        const controllerLocation = blk.location;

        // Grab corners linked to the controller
        const linkedCorners = MachineCustomComponent.getLoadedLinkedBlocks(blk, "lunatech:quarry_controller");

        if (linkedCorners.length !== 2) {
            return { controllerLocation, fullBase: false };
        }

        // Grab the corners linked to the found corners
        const immediateCorners = [];
        const oppCorner = [];
        const foundLocations: XYZRecord<boolean> = new XYZRecord();
        for (const corner of linkedCorners) {
            const baseLocation = corner.location;

            const hasBaseLoc = foundLocations.getValue(baseLocation, true);

            if (hasBaseLoc) {
                continue;
            }

            foundLocations.setValue(baseLocation, true, false);
            immediateCorners.push(baseLocation);

            const foundCorners = MachineCustomComponent.getLoadedLinkedBlocks(corner, "lunatech:quarry_corner");

            for (const foundCorner of foundCorners) {
                const foundLoc = foundCorner.location;

                const hasFoundLoc = foundLocations.getValue(foundLoc, true);

                if (hasFoundLoc) {
                    continue;
                }

                foundLocations.setValue(foundLoc, true, false);
                oppCorner.push(foundLoc);
            }
        }

        if (oppCorner.length + immediateCorners.length !== 3) {
            //console.log("Not 3 corners total");
            // Invalid base
            return { controllerLocation, fullBase: false };
        }

        // Get the controller that would be deemed to the "right"
        const { orderedCorners, aDir: c1Dir, bDir: c2Dir } = this.getOrderedCorners(controllerLocation, immediateCorners[0], immediateCorners[1], oppCorner[0]);

        return { controllerLocation, fullBase: true, c1Dir, c2Dir, c1Location: orderedCorners[0], c2Location: orderedCorners[1], c3Location: orderedCorners[2] };
    }

    offsetPositionInDir(position: Vector3, dir: Direction, amount: number = 1) {
        switch (dir) {
            case Direction.XPos:
                position.x += amount;
                break;
            case Direction.XNeg:
                position.x -= amount;
                break;
            case Direction.ZPos:
                position.z += amount;
                break;
            case Direction.ZNeg:
                position.z -= amount;
                break;
        }
    }

    offsetPositionFromIndexDir(position: Vector3, c1Dir: Direction, c2Dir: Direction, amount: number) {
        // When moving with this data you move towards the C2 direction and away from the C1 direction.
        const invC1Dir = InvertDirection[c1Dir];

        this.offsetPositionInDir(position, invC1Dir, amount);
        this.offsetPositionInDir(position, c2Dir, amount);
    }

    castRayParticle(dimension: Dimension, fromPos: Vector3, toPos: Vector3, duration: number) {
        const offsetPos = {
            x: toPos.x - fromPos.x,
            y: toPos.y - fromPos.y,
            z: toPos.z - fromPos.z,
        }

        const varMap = new MolangVariableMap;

        varMap.setFloat("dir_x", offsetPos.x);
        varMap.setFloat("dir_y", offsetPos.y);
        varMap.setFloat("dir_z", offsetPos.z);
        varMap.setFloat("max_age", duration);

        // Spawn particle
        dimension.spawnParticle("lunatech:laser_beam", fromPos, varMap);
    }

    getOrderedCorners(conPos: Vector3, conPosA: Vector3, conPosB: Vector3, oppPos: Vector3): { orderedCorners: [Vector3, Vector3, Vector3], aDir: Direction, bDir: Direction } {
        // Calculate direction from conPos to conPosA
        const aDir = this.getDirBetweenPos(conPos, conPosA);
        const bDir = this.getDirBetweenPos(conPos, conPosB);

        // X+/Z+
        if (
            // X+/Z+
            (aDir === Direction.XPos &&
                bDir === Direction.ZPos) ||
            // X+/Z-
            (bDir === Direction.XPos &&
                aDir === Direction.ZNeg) ||
            // X-/Z+
            (bDir === Direction.XNeg &&
                aDir === Direction.ZPos) ||
            // X-/Z-
            (aDir === Direction.XNeg &&
                bDir === Direction.ZNeg)
        ) {
            return { orderedCorners: [conPosA, conPosB, oppPos], aDir, bDir };
        }
        if (
            // X+/Z+
            (bDir === Direction.XPos &&
                aDir === Direction.ZPos) ||
            // X+/Z-
            (aDir === Direction.XPos &&
                bDir === Direction.ZNeg) ||
            // X-/Z+
            (aDir === Direction.XNeg &&
                bDir === Direction.ZPos) ||
            // X-/Z-
            (bDir === Direction.XNeg &&
                aDir === Direction.ZNeg)
        ) {
            return { orderedCorners: [conPosB, conPosA, oppPos], aDir: bDir, bDir: aDir };
        }

        throw new Error("Invalid direction combination");
    }

    getDistanceBetweenTwoPoints(posA: Vector3, posB: Vector3) {
        if (posA.x !== posB.x) {
            return Math.abs(posA.x - posB.x) - 1;
        }

        if (posA.z !== posB.z) {
            return Math.abs(posA.z - posB.z) - 1;
        }

        throw new Error("Invalid points!");
    }

    getDirBetweenPos(posA: Vector3, posB: Vector3) {
        if (posA.x !== posB.x) {
            if (posA.x < posB.x) {
                return Direction.XPos;
            } else {
                return Direction.XNeg;
            }
        } else {
            if (posA.z < posB.z) {
                return Direction.ZPos;
            } else {
                return Direction.ZNeg;
            }
        }
    }

    calculateBeamSourcePos(beamBlk: Block) {
        const loc = beamBlk.location;

        return {
            x: loc.x + 0.5,
            y: loc.y - 0.1,
            z: loc.z + 0.5,
        }
    }

    isPosInBounds(position: Vector3, shape: BaseShape) {
        const bounds = this.calculateBoundsFromBaseShape(shape);

        return position.y <= bounds.yMaxLimit &&
            position.x > bounds.xRange[0] &&
            position.x < bounds.xRange[1] &&
            position.z > bounds.zRange[0] &&
            position.z < bounds.zRange[1]
    }

    // Dynamic Property Methods
    setTargetPosition(machEnt: Entity, pos: Vector3) {
        machEnt.setDynamicProperty(QuarryEntityProperties.TargetPos, pos);
    }

    setRemainingTimeInfo(machEnt: Entity, remainingTime: number) {
        machEnt.setDynamicProperty(QuarryEntityProperties.RemTime, remainingTime);
    }

    setTotalTimeInfo(machEnt: Entity, totalTime: number) {
        machEnt.setDynamicProperty(QuarryEntityProperties.TotalTime, totalTime);
    }
}

export const quarryTools = new QuarryTools();

function normalizedDirection(from: Vector3, to: Vector3) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;

    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (length === 0) {
        return { x: 0, y: 0, z: 0 };
    }

    return {
        x: dx / length,
        y: dy / length,
        z: dz / length
    };
}