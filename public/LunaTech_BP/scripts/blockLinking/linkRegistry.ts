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

import { limitLinkLocationsForQuarryBaseBlocks } from "../blockLinking/genericLinkLimits";
import { LinkLimiter } from "../blockLinking/linkLimiter";
import { BlockTagLink } from "../blockLinking/manager";

// # Electricity Related Links

export enum KylowatLinkTags {
    Generator = "kylowat:electricity.generator",
    Node = "kylowat:electricity.node",
    Worker = "kylowat:electricity.worker",
}

export const ELECTRICITY_LINK_IDS = [KylowatLinkTags.Generator, KylowatLinkTags.Node, KylowatLinkTags.Worker];

// No worker link definition because the worker can't send its electricity

// Defining electricity link for GENERATOR
new BlockTagLink({
    linkTag: KylowatLinkTags.Generator,
    validLinks: [KylowatLinkTags.Node],
    reversible: true,
    linkParticle: "lunatech:pulseing_line"
});

// Defining electricity link for NODE
new BlockTagLink({
    linkTag: KylowatLinkTags.Node,
    validLinks: [KylowatLinkTags.Worker, KylowatLinkTags.Node],
    reversible: true,
    linkParticle: "lunatech:pulseing_line"
});

// # Machine related Links

export enum MachineLinkTags {
    ItemEmitter = "lunatech:items.emitter",
    ItemReciever = "lunatech:items.reciever",
    ItemJunction = "lunatech:items.junction"
}

const SingleLinkLimiter = new LinkLimiter({
    maxLink: 1
})

// Defines the link between an ItemEmitter and an Item[Reciever/Junction]
new BlockTagLink({
    linkTag: MachineLinkTags.ItemEmitter,
    validLinks: [MachineLinkTags.ItemReciever, MachineLinkTags.ItemJunction],
    reversible: true,
    linkParticle: "lunatech:item_line",
    limiter: SingleLinkLimiter,
})

new BlockTagLink({
    linkTag: MachineLinkTags.ItemJunction,
    validLinks: [MachineLinkTags.ItemReciever, MachineLinkTags.ItemJunction],
    reversible: true,
    linkParticle: "lunatech:item_line",
    limiter: SingleLinkLimiter
})

// Links related to the Quarry machines
export enum QuarryMachineLinkTags {
    Controller = "lunatech:quarry_controller",
    Corner = "lunatech:quarry_corner",
    Beam = "lunatech:quarry_beam",
}

// Defines links that are used for determining the base of a quarry
const QuarryBaseLinkLimiter = new LinkLimiter({
    maxLink: 2,
    customTests: [limitLinkLocationsForQuarryBaseBlocks],
})

const QuarryBeamLinkLimiter = new LinkLimiter({
    maxLink: 1,
})

new BlockTagLink({
    linkTag: QuarryMachineLinkTags.Controller,
    validLinks: [QuarryMachineLinkTags.Corner],
    reversible: true,
    linkParticle: "lunatech:item_line",
    limiter: QuarryBaseLinkLimiter,
})

new BlockTagLink({
    linkTag: QuarryMachineLinkTags.Corner,
    validLinks: [QuarryMachineLinkTags.Corner],
    reversible: true,
    linkParticle: "lunatech:item_line",
    limiter: QuarryBaseLinkLimiter,
})

new BlockTagLink({
    linkTag: QuarryMachineLinkTags.Beam,
    validLinks: [QuarryMachineLinkTags.Controller],
    reversible: true,
    linkParticle: "lunatech:item_line",
    limiter: QuarryBeamLinkLimiter,
})