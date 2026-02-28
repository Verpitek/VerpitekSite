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

import { Block, Vector3 } from "@minecraft/server";
import { LinkLimiter } from "../blockLinking/linkLimiter";
import { MachineCustomComponent } from "../machines/component";

export interface BlockTagLinkConstructionData {
    /// The tag used to identify this link and blocks that are candidates for its source
    linkTag: string,

    /// The tags used to identify blocks that are candidates for a link target
    validLinks: string[],

    // TODO: Remove this, its function is unclear and doesn't make sense in this stage of linking
    /// Dictates whether or not `BlockTagLink.getValidLinkOptions` should attempt to flip the source and target blocks provided when the tested link fails
    reversible?: boolean,

    /// The ID a registered `Link Particle` that should be used for this link, if any.
    linkParticle?: string,

    /// An object that dictates the max link limit on the provided block instance
    limiter?: LinkLimiter
}

/**
 * The block interacted with by the wrench dictates what blocks are valid links and what kind of link is made.
 * 
 * An instance of this class defines the rules to see if a given block can be linked and if it can what link will be made
 */
export class BlockTagLink {
    /**
     * Used to identify which links are valid for a given block
     * 
     * Also used as the identifier for storing what blocks are linked in the machine_entity's dynamic properties
     */
    linkTag: string;

    /**
     * Is able to downlink to any block that has atleast one tag in this list
     */
    validLinks: string[];

    /**
     * If true, the wrench will do an inverse check when the first test fails
     * 
     * Note that this may result in a different link than the one being tested against forming
     */
    reversible: boolean;

    /**
     * The Link Particle ID for this link
     */
    linkParticle?: string;

    /**
     * An object that allows this link type to have limits for its link
     */
    limiter?: LinkLimiter

    constructor(data: BlockTagLinkConstructionData) {
        this.linkTag = data.linkTag;

        this.validLinks = [];
        for (const link of data.validLinks) {
            this.validLinks.push(link);
        }

        if (data.reversible !== undefined) {
            this.reversible = data.reversible;
        } else {
            this.reversible = false;
        }

        LINK_TYPE_REG[this.linkTag] = this;

        this.linkParticle = data.linkParticle;

        this.limiter = data.limiter;
    }

    static getLinkOptions(blk: Block): BlockTagLink[] {
        const tags = blk.getTags();

        const res = [];

        for (const tag of tags) {
            const val = LINK_TYPE_REG[tag];

            if (val !== undefined) {
                res.push(val);
            }
        }

        return res;
    }

    static getLinkFromType(linkType: string) {
        return LINK_TYPE_REG[linkType];
    }

    private static _canLinkRev(source: Block, target: Block): { res: CanLinkResult, linkMade?: BlockTagLink, source?: Block, target?: Block } {
        // Get the possible link types for the target block
        const linkTypes = this.getLinkOptions(target);

        let hadDistanceProblem: boolean = false;

        // Check if any of these link types allow the source to link to the target (No reverse accepted since that would recursively link)
        for (const linkType of linkTypes) {
            const linkData = linkType.canLink(target, source, false);

            if (linkData.res === CanLinkResult.SUCCESS) {
                return linkData;
            }

            if (linkData.res === CanLinkResult.TOO_FAR) {
                hadDistanceProblem = true;
            }
        }

        return { res: (hadDistanceProblem ? CanLinkResult.TOO_FAR : CanLinkResult.INVALID_TARGET) };
    }

    canLink(source: Block, target: Block, tryReverse: boolean = this.reversible): { res: CanLinkResult, linkMade?: BlockTagLink, source?: Block, target?: Block } {
        // Check if the target block has any tag within the validLinks list
        let isValidType = false;
        for (const linkTag of this.validLinks) {
            if (target.hasTag(linkTag)) {
                isValidType = true;

                break;
            }
        }

        if (!isValidType) {
            if (tryReverse) {
                return BlockTagLink._canLinkRev(source, target);
            }

            return { res: CanLinkResult.INVALID_TARGET };
        }

        const linkVolume = MachineCustomComponent.getBlockVolumeForLinkType(source, this.linkTag);

        if (!linkVolume.isInside(target.location)) {
            if (tryReverse) {
                return BlockTagLink._canLinkRev(source, target);
            }

            // Too far away
            return { res: CanLinkResult.TOO_FAR };
        }

        // Check if the link passes the custom tests provided in the limiter
        if (this.limiter !== undefined) {
            const passedTests = this.limiter.tryCustomTests(source, target);

            if (!passedTests) {
                return { res: CanLinkResult.INVALID_TARGET };
            }
        }

        return { res: CanLinkResult.SUCCESS, linkMade: this, source, target };
    }
}

export enum CanLinkResult {
    /// Target doesn't include any tags in the valid link
    INVALID_TARGET,
    /// Target is too far away (but does have a valid link type),
    TOO_FAR,
    /// Success
    SUCCESS,
}

const LINK_TYPE_REG: Record<string, BlockTagLink> = {};
