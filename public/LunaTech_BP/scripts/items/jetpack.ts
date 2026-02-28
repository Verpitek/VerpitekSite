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

import { system, Player, EquipmentSlot } from "@minecraft/server";
import * as power from "./power";

const jetpackState = new Map();
const ENERGY_PER_TICK = 20;

export function jetpackLoop(player: Player, toggle: boolean) {
    if (toggle && !jetpackState.has(player.id)) {
        player.addEffect(`slow_falling`, 1, { showParticles: false }); // Reduces fall damage on fire

        const intervalID = system.runInterval(() => {
            const chest = player.getComponent("equippable").getEquipmentSlot(EquipmentSlot.Chest);

            if (!chest || chest.typeId !== "lunatech:jetpack" || !power.hasEnergy(chest)) {
                jetpackLoop(player, false);
                return;
            }

            player.addEffect(`levitation`, 1, { amplifier: 20 });
            if (system.currentTick % ENERGY_PER_TICK === 0) {
                power.queueEnergyChange(player, chest, -1)
            }

        }, 1);

        jetpackState.set(player.id, intervalID);

    } else if (!toggle && jetpackState.has(player.id)) {
        power.flushPlayerEnergyCache(player);

        const intervalID = jetpackState.get(player.id);
        system.clearRun(intervalID);
        jetpackState.delete(player.id);
    }
}
