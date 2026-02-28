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

import { system, StartupEvent, WorldLoadAfterEvent, ScriptEventCommandMessageAfterEvent, world, ItemTypes, ItemStack, Player, BlockVolume } from "@minecraft/server";
import { MachineCustomComponent } from "./machines/component";
import { WindmillMachineComponent } from "./machines/generators/windmill/component";
import { bookTools } from "./tools/book";

// Callback types
type StartupEventCallback = (arg0: StartupEvent) => void;
type WorldLoadCallback = (arg0: WorldLoadAfterEvent) => void;
type ScriptEventCallback = (arg0: ScriptEventCommandMessageAfterEvent) => void;

// Callback storage/registering
const STARTUP_EVENTS: StartupEventCallback[] = [];
export function registerStartupEvent(callback: StartupEventCallback) {
    if (STARTUP_EVENTS.includes(callback)) {
        return;
    }

    STARTUP_EVENTS.push(callback);
}

const WORLD_LOAD_EVENTS: WorldLoadCallback[] = [];
export function registerWorldLoadEvent(callback: WorldLoadCallback) {
    if (WORLD_LOAD_EVENTS.includes(callback)) {
        return;
    }

    WORLD_LOAD_EVENTS.push(callback);
}

const SCRIPT_EVENTS: Record<string, ScriptEventCallback[]> = {};
export function registerScriptEvent(id: string, callback: ScriptEventCallback) {
    let evList = SCRIPT_EVENTS[id];

    if (evList === undefined) {
        SCRIPT_EVENTS[id] = [callback];
    } else {
        evList.push(callback);
    }
}

// Callback firing
system.beforeEvents.startup.subscribe((ev) => {
    for (const event of STARTUP_EVENTS) {
        event(ev);
    }
})

world.afterEvents.worldLoad.subscribe((ev) => {
    for (const event of WORLD_LOAD_EVENTS) {
        event(ev);
    }
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    const events = SCRIPT_EVENTS[ev.id];
    if (events === undefined) {
        return;
    }

    for (const event of events) {
        event(ev);
    }
}, {
    namespaces: ["lunatech"],
})