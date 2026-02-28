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

import { Block, BlockComponentBlockBreakEvent, BlockCustomComponent, Entity, world } from "@minecraft/server";
import { blockIdManager } from "../blockId/manager";
import { ADDON_NAMESPACE } from "../constants";
import { registerStartupEvent } from "../events";

/**
* Handles registration, fetching, ticking, and deletion of entities linked to a given block.
*/
export class BlockEntityLinkComponent implements BlockCustomComponent {
    static ID: string = ADDON_NAMESPACE + ":block_entity_link";

    static killExceptions: Set<string> = new Set();

    static registerKillException(value: string) {
        this.killExceptions.add(value);
    }

    static tryGetLinkedEntity(blk: Block, linkId: string) {
        const blockUUID = blockIdManager.tryGetBlockUUID(blk);

        if (blockUUID === undefined) {
            // If the block doesn't have a UUID it isn't going to have any linked entities
            return;
        }

        const entityId = world.getDynamicProperty("entityLink:bte|" + blockUUID + "|" + linkId) as string | undefined;
        if (entityId === undefined) {
            // Block doesn't have any stored entity UUID for the provided Link ID
            return;
        }

        return world.getEntity(entityId);
    }

    private static addPropIdToMasterList(blockUUID: string, propId: string) {
        let masterListStr = world.getDynamicProperty("entityLink:link_list|" + blockUUID) as string | undefined;

        let masterList: string[] = [];
        if (masterListStr === undefined) {
            // List doesn't exist yet, add first member
            masterList.push(propId);
        } else {
            // Pre-existing list
            masterList = JSON.parse(masterListStr);

            if (masterList.includes(propId)) {
                return;
            }

            masterList.push(propId);
        }

        world.setDynamicProperty("entityLink:link_list|" + blockUUID, JSON.stringify(masterList));
    }

    private static removePropIdFromMasterList(blockUUID: string, propId: string) {
        let masterListStr = world.getDynamicProperty("entityLink:link_list|" + blockUUID) as string | undefined;

        if (masterListStr === undefined) {
            return;
        }

        let masterList = JSON.parse(masterListStr) as string[];

        masterList = masterList.filter((value) => {
            return value !== propId;
        });

        world.setDynamicProperty("entityLink:link_list|" + blockUUID, JSON.stringify(masterList));
    }

    private static removePropIdsFromMasterList(blockUUID: string, propIds: string[]) {
        let masterListStr = world.getDynamicProperty("entityLink:link_list|" + blockUUID) as string | undefined;

        if (masterListStr === undefined) {
            return;
        }

        let masterList = JSON.parse(masterListStr) as string[];

        masterList = masterList.filter((value) => {
            return !propIds.includes(value);
        });

        world.setDynamicProperty("entityLink:link_list|" + blockUUID, JSON.stringify(masterList));
    }

    static getMasterList(blockUUID: string): string[] {
        let masterListStr = world.getDynamicProperty("entityLink:link_list|" + blockUUID) as string | undefined;
        if (masterListStr === undefined) {
            return [];
        }

        return JSON.parse(masterListStr);
    }

    static registerLinkedEntity(blk: Block, linkId: string, entity: Entity) {
        const blockUUID = blockIdManager.getBlockUUID(blk);

        const propId = "entityLink:bte|" + blockUUID + "|" + linkId;
        world.setDynamicProperty(propId, entity.id);

        // Store PropID in Block's masterlist
        this.addPropIdToMasterList(blockUUID, propId);
    }

    private static getLinkIdFromLinkProp(propId: string) {
        const idSplit = propId.split("|");
        return idSplit[2];
    }

    static getAllLinkedEntities(blk: Block) {
        const blockUUID = blockIdManager.getBlockUUID(blk);
        const masterList = this.getMasterList(blockUUID);

        const idsForRemoval: string[] = [];
        const entities: Record<string, Entity> = {};
        for (const propId of masterList) {
            const entId = world.getDynamicProperty(propId) as string | undefined;

            if (entId === undefined) {
                idsForRemoval.push(propId);
                continue;
            }

            const linkId = this.getLinkIdFromLinkProp(propId);

            const entity = world.getEntity(entId);
            if (entity !== undefined) {
                entities[linkId] = entity;
            }
        }

        return entities;
    }

    static getLinkedEntity(blk: Block, linkId: string) {
        const blockUUID = blockIdManager.getBlockUUID(blk);

        const entId = world.getDynamicProperty("entityLink:bte|" + blockUUID + "|" + linkId) as string | undefined;
        if (entId === undefined) {
            return undefined;
        }

        return world.getEntity(entId);
    }

    onBreak(ev: BlockComponentBlockBreakEvent) {
        const blockUUID = blockIdManager.getBlockUUID(ev.block);

        // Kill entities linked to this block
        const linkData = BlockEntityLinkComponent.getAllLinkedEntities(ev.block);
        for (const [linkId, entity] of Object.entries(linkData)) {
            if (BlockEntityLinkComponent.killExceptions.has(linkId)) {
                continue;
            }

            // Despawn entity
            entity.remove();
        }

        // Delete all dynamic properties inside the masterlist and then the masterlist itself
        const allLinkPropIds = BlockEntityLinkComponent.getMasterList(blockUUID);
        for (const propId of allLinkPropIds) {
            world.setDynamicProperty(propId);
        }

        world.setDynamicProperty("entityLink:link_list|" + blockUUID);

        // Unregister the block from the ID system
        blockIdManager.unregisterBlock(ev.block);
    }
}

registerStartupEvent((ev) => {
    ev.blockComponentRegistry.registerCustomComponent(BlockEntityLinkComponent.ID, new BlockEntityLinkComponent());
})