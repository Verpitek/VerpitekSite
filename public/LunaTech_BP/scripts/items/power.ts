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

import { ContainerSlot, Player, EquipmentSlot, system, world } from "@minecraft/server";
import * as kylowat from "../energy/kylowatAPI";
import { generateUUID } from "../tools/uuid";

const ENERGY_PER_TICK = 10;
const energyCache = new Map<string, number>();

export function queueEnergyChange(
    player: Player,
    slot: ContainerSlot,
    amount: number
) {
    const uuid = slot.getDynamicProperty("uuid");
    if (!uuid) return;

    energyCache.set(uuid, (energyCache.get(uuid) ?? 0) + amount);
    syncLunatechItemDisplay(player, slot, energyCache.get(uuid)!);
}

function applyQueuedEnergy(player: Player, slot: ContainerSlot) {
    const uuid = slot.getDynamicProperty("uuid");
    if (!uuid) return;

    const pending = energyCache.get(uuid);
    if (!pending) return;

    addEnergyToLunatechItem(player, slot, pending);
    energyCache.delete(uuid);
}

export function flushPlayerEnergyCache(player: Player) {
    const inv = player.getComponent("inventory")?.container;
    const equip = player.getComponent("equippable");
    const slotsByUUID = new Map<string, ContainerSlot>();

    if (inv) {
        for (let i = 0; i < inv.size; i++) {
            const slot = inv.getSlot(i);
            if (!slot.hasItem()) continue;
            const uuid = slot.getDynamicProperty("uuid");
            if (uuid && !slotsByUUID.has(uuid)) slotsByUUID.set(uuid, slot);
        }
    }

    if (equip) {
        for (const es of [
            EquipmentSlot.Head,
            EquipmentSlot.Chest,
            EquipmentSlot.Legs,
            EquipmentSlot.Feet
        ]) {
            const slot = equip.getEquipmentSlot(es);
            if (!slot?.hasItem()) continue;
            const uuid = slot.getDynamicProperty("uuid");
            if (uuid && !slotsByUUID.has(uuid)) slotsByUUID.set(uuid, slot);
        }
    }

    for (const slot of slotsByUUID.values()) {
        applyQueuedEnergy(player, slot);
    }
}

export function hasEnergy(slot: ContainerSlot): boolean {
    if (!slot?.hasItem()) return false;

    const energy = slot.getDynamicProperty("energy");
    return typeof energy === "number" && energy > 0;
}

export function declareEnergyOnTool(player: Player, slot: ContainerSlot) {
    if (slot.getDynamicProperty("uuid")) return;

    slot.setDynamicProperty("energy", 0);
    slot.setDynamicProperty("maxEnergy", 1000);
    slot.setDynamicProperty("uuid", generateUUID());

    syncLunatechItemDisplay(player, slot);
}

export function addEnergyToLunatechItem(
    player: Player,
    slot: ContainerSlot,
    power: number
) {
    const energy = slot.getDynamicProperty("energy") ?? 0;
    const maxEnergy = slot.getDynamicProperty("maxEnergy") ?? 1000;
    if ((energy + power) <= maxEnergy) {
        slot.setDynamicProperty("energy", energy + power);
        syncLunatechItemDisplay(player, slot)
    }
}

export function syncLunatechItemDisplay(
    player: Player,
    slot: ContainerSlot,
    pendingExtra = 0
) {
    const uuid = slot.getDynamicProperty("uuid");
    if (!uuid) return;

    const energy = Math.min(
        (slot.getDynamicProperty("energy") ?? 0) + pendingExtra,
        slot.getDynamicProperty("maxEnergy") ?? 1000
    );
    const maxEnergy = slot.getDynamicProperty("maxEnergy") ?? 1000;
    const lore = [`§r${energy}§7/§r${maxEnergy} §bEU`];

    const inv = player.getComponent("inventory")?.container;
    if (inv) {
        for (let i = 0; i < inv.size; i++) {
            const s = inv.getSlot(i);
            if (s.hasItem() && s.getDynamicProperty("uuid") === uuid) {
                s.setLore(lore);
            }
        }
    }

    const equip = player.getComponent("equippable");
    if (equip) {
        for (const es of [
            EquipmentSlot.Head,
            EquipmentSlot.Chest,
            EquipmentSlot.Legs,
            EquipmentSlot.Feet
        ]) {
            const s = equip.getEquipmentSlot(es);
            if (s?.hasItem() && s.getDynamicProperty("uuid") === uuid) {
                s.setLore(lore);
            }
        }
    }
}

const scanningPlayers = new Map<string, { player: Player; id: string }>();
let intervalHandle: number | null = null;

export function startPlayerScan(player: Player, machineBlock) {
    scanningPlayers.set(player.id, {
        player,
        id: kylowat.Machine.findIdByLocation(machineBlock.location)
    });

    if (intervalHandle === null) {
        intervalHandle = system.runInterval(mainChargingLoop, 1);
    }
}

export function stopPlayerScan(player: Player) {
    flushPlayerEnergyCache(player);
    scanningPlayers.delete(player.id);

    if (scanningPlayers.size === 0 && intervalHandle !== null) {
        system.clearRun(intervalHandle);
        intervalHandle = null;
    }
}

function isChargeable(slot?: ContainerSlot) {
    if (!slot?.hasItem()) return false;
    if (!slot.typeId.startsWith("lunatech")) return false;

    const energy = slot.getDynamicProperty("energy");
    const maxEnergy = slot.getDynamicProperty("maxEnergy");
    return energy < maxEnergy
}

function mainChargingLoop() {
    for (const entry of scanningPlayers.values()) {
        const { player, id } = entry;
        const machine = kylowat.Machine.reconstructFromId(id);

        const chargeable: ContainerSlot[] = [];

        const inv = player.getComponent("inventory")?.container;
        if (inv) {
            for (let i = 0; i < inv.size; i++) {
                const slot = inv.getSlot(i);
                if (isChargeable(slot)) chargeable.push(slot);
            }
        }

        const equip = player.getComponent("equippable");
        if (equip) {
            for (const es of [
                EquipmentSlot.Head,
                EquipmentSlot.Chest,
                EquipmentSlot.Legs,
                EquipmentSlot.Feet
            ]) {
                const slot = equip.getEquipmentSlot(es);
                if (isChargeable(slot)) chargeable.push(slot);
            }
        }

        if (chargeable.length === 0) {
            stopPlayerScan(player)
            continue;
        }

        const available = Math.min(machine.currentEnergy, ENERGY_PER_TICK);
        if (available <= 0) continue;

        const perItem = Math.max(1, Math.floor(available / chargeable.length));
        const used = perItem * chargeable.length;
        if (used > machine.currentEnergy) continue;

        machine.removeEnergy(used);

        for (const slot of chargeable) {
            queueEnergyChange(player, slot, perItem);
        }

        flushPlayerEnergyCache(player);
    }
}
