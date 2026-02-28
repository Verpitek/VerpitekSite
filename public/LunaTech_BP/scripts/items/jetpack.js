import { system, EquipmentSlot } from "@minecraft/server";
import * as energy from "./energy";
const jetpackState = new Map();
const TICKS_PER_ENERGY = 20;
export function jetpackLoop(player, toggle) {
    if (toggle == true && !jetpackState.has(player.id)) {
        player.addEffect(`slow_falling`, 1, {
            showParticles: false
        }) // Reduces fall damage on fire
        ;
        const intervalID = system.runInterval(()=>{
            const chest = player.getComponent("equippable").getEquipment(EquipmentSlot.Chest);
            if (!chest || chest.typeId !== "lunatech:jetpack" || !energy.hasEnergy(chest)) {
                return jetpackLoop(player, false);
            }
            player.applyImpulse({
                x: 0,
                y: 0.10,
                z: 0
            });
            if (system.currentTick % TICKS_PER_ENERGY === 0) {
                energy.addEnergyToChestplate(player, chest, -1);
            }
        }, 1);
        jetpackState.set(player.id, intervalID);
    } else if (toggle == false && jetpackState.has(player.id)) {
        const intervalID = jetpackState.get(player.id);
        system.clearRun(intervalID);
        jetpackState.delete(player.id);
    }
}
