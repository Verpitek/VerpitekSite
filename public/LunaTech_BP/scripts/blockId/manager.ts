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

import { Block, Dimension, Vector3, world } from "@minecraft/server";
import { registerWorldLoadEvent } from "../events";
import { generateUUID } from "../tools/uuid";
import { DimLocRecord, XYZRecord } from "../tools/xyz_record";

/**
 * This file will eventually represent a universal Block ID system.
 * It acts as the manager of all Block IDs, plus provides events that allow you to update various things about a block when its ID changes
 * 
 * Blocks utilizing this system are expected to handle their own removal when a block is destroyed
 */
class BlockIdManager {
    private BLOCK_LOC_TO_UUID_CACHE: DimLocRecord<string> = new DimLocRecord();
    private BLOCK_UUID_TO_LOC_CACHE: Record<string, { dimId: string, location: Vector3 }> = {};

    // Functions for dealing with the block's location as a string
    private serializeLocation(location: Vector3, dimensionId: string) {
        return `${dimensionId}|${location.x}|${location.y}|${location.z}`;
    }

    private parseLocation(locationStr: string): { dimId: string, location: Vector3 } {
        const locationSplit = locationStr.split("|");

        const dimId = locationSplit[0];

        const location = {
            x: parseInt(locationSplit[1]),
            y: parseInt(locationSplit[2]),
            z: parseInt(locationSplit[3]),
        }

        return { dimId, location }
    }

    private getLocationBasedId(blk: Block): string {
        return this.getLocationBasedIdFromLoc(blk.location, blk.dimension.id);
    }

    private getLocationBasedIdFromLoc(loc: Vector3, dimensionId: string): string {
        let dimChar;
        switch (dimensionId) {
            case "minecraft:overworld":
                dimChar = "o";
                break;
            case "minecraft:nether":
                dimChar = "n";
                break;
            case "minecraft:the_end":
                dimChar = "e";
                break;
            default:
                dimChar = dimensionId;
        }

        return dimChar + loc.x + loc.y + loc.z;
    }

    // Functions related to registering/unregistering into/from runtime caches
    private registerUUIDForRuntime(uuid: string, location: Vector3, dimensionId: string) {
        this.BLOCK_LOC_TO_UUID_CACHE.setValue(dimensionId, location, uuid);
        this.BLOCK_UUID_TO_LOC_CACHE[uuid] = { location, dimId: dimensionId };
    }

    private unregisterUUIDForRuntime(uuid: string, location: Vector3, dimensionId: string) {
        this.BLOCK_LOC_TO_UUID_CACHE.deleteValue(dimensionId, location);
        delete this.BLOCK_UUID_TO_LOC_CACHE[uuid];
    }

    private registerUUIDForDynProps(uuid: string, location: Vector3, dimensionId: string) {
        const locId = this.getLocationBasedIdFromLoc(location, dimensionId);
        world.setDynamicProperty(`blockid:ltu${locId}`, uuid);
        world.setDynamicProperty(`blockid:utl${uuid}`, this.serializeLocation(location, dimensionId));
    }

    private unregisterUUIDForDynProps(uuid: string, location: Vector3, dimensionId: string) {
        const locId = this.getLocationBasedIdFromLoc(location, dimensionId);
        world.setDynamicProperty(`blockid:ltu${locId}`);

        world.setDynamicProperty(`blockid:utl${uuid}`);
    }

    private registerNewUUID(location: Vector3, dimensionId: string): string {
        let uuid = generateUUID();

        // Storing in runtime cache (Dies on server restart)
        this.registerUUIDForRuntime(uuid, location, dimensionId);

        // Storing in Dynamic Properties (Permenant)
        this.registerUUIDForDynProps(uuid, location, dimensionId);

        return uuid;
    }

    unregisterBlock(block: Block) {
        this.unregisterBlockWithLocation(block.location, block.dimension.id);
    }

    unregisterBlockWithLocation(location: Vector3, dimensionId: string, uuid?: string) {
        if (uuid === undefined) {
            uuid = this.tryGetBlockUUIDFromLoc(location, dimensionId);

            if (uuid === undefined) {
                console.log("Failed to unregister because UUID didn't exist");
                return;
            }
        }

        this.unregisterUUIDForRuntime(uuid, location, dimensionId);
        this.unregisterUUIDForDynProps(uuid, location, dimensionId);
    }

    // Functions for acquiring/doing things with the Block UUID
    getBlockUUID(blk: Block): string {
        // Check if the Block ID can be grabbed using the block's location
        return this.getBlockUUIDFromLoc(blk.location, blk.dimension.id);
    }

    /**
     * Grabs the UUID associated with the block
     * This is an unchanging ID that can be used to associate data with a block in the world
     */
    getBlockUUIDFromLoc(loc: Vector3, dimensionId: string): string {
        let uuid = this.tryGetBlockUUIDFromLoc(loc, dimensionId);

        if (uuid !== undefined) {
            // Register into the runtime cache
            return uuid;
        }

        console.log("Registering new ID");
        return this.registerNewUUID(loc, dimensionId);
    }

    tryGetBlockUUID(blk: Block) {
        return this.tryGetBlockUUIDFromLoc(blk.location, blk.dimension.id);
    }

    tryGetBlockUUIDFromLoc(loc: Vector3, dimensionId: string): string {
        // Check if there is a copy of the UUID in the runtime cache
        let uuid = this.BLOCK_LOC_TO_UUID_CACHE.getValue(dimensionId, loc, false);
        if (uuid !== undefined) {
            return uuid;
        }

        // Check if there is a cached instance in dynamic properties
        const locId = this.getLocationBasedIdFromLoc(loc, dimensionId);
        const dynPropId = `blockid:ltu${locId}`;
        uuid = world.getDynamicProperty(dynPropId) as string | undefined;

        return uuid;
    }

    tryGetBlockLocation(uuid: string): { location: Vector3, dimId: string } {
        // Check if there is a copy of the UUID in the local cache
        let locData = this.BLOCK_UUID_TO_LOC_CACHE[uuid];
        if (locData !== undefined) {
            return locData;
        }

        // Check if there is info about the location in dynamic properties
        const locStr = world.getDynamicProperty(`blockid:utl${uuid}`) as string | undefined;
        if (locStr !== undefined) {
            return this.parseLocation(locStr);
        }

        // No stored location for the provided UUID
        return undefined;
    }

    /**
     * Calling this allows for the block with the provided UUID to become associated with a new position.
     * 
     * This clears out all previously stored bits of data hinging on the block's location and transitions it to the new location
     * 
     * This does not support moving the data across dimensions and does not move the block itself
     */
    moveDataToNewLocation(uuid: string, dimensionId: string, oldLocation: Vector3, newLocation: Vector3) {
        // Updating Runtime Caches
        this.unregisterUUIDForRuntime(uuid, oldLocation, dimensionId);
        this.registerUUIDForRuntime(uuid, newLocation, dimensionId);

        // Updating Dyanmic Property Caches
        this.unregisterUUIDForDynProps(uuid, oldLocation, dimensionId);
        this.registerUUIDForDynProps(uuid, newLocation, dimensionId);
    }
}

export const blockIdManager = new BlockIdManager;