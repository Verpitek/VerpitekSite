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

	import { system, world, InputButton, ButtonState, EquipmentSlot, BlockPermutation } from "@minecraft/server";
import { jetpackLoop } from "./jetpack"
import * as power from "./power"

const poweredTools = [
    "lunatech:powered_drill",
    "lunatech:powered_chainsaw",
    "lunatech:jetpack"
];

world.afterEvents.playerButtonInput.subscribe(ev => {
    if (ev.button == InputButton.Jump) {
        if (ev.newButtonState == ButtonState.Pressed) {
            let jetpack = ev.player.getComponent("equippable").getEquipmentSlot(EquipmentSlot.Chest)
            if (jetpack.hasItem()) {
                if (jetpack?.typeId == `lunatech:jetpack`) {
                    power.queueEnergyChange(ev.player, jetpack, -1)
                    jetpackLoop(ev.player, true)
                }
            }
        } else {
            jetpackLoop(ev.player, false)
        }
    }
})

world.beforeEvents.playerBreakBlock.subscribe(ev => {
    if (poweredTools.includes(ev.itemStack?.typeId)) {
        if (ev.itemStack?.getDynamicProperty("energy") <= 0) {
            ev.cancel = true;
            ev.player.sendMessage(`§cThis tool has 0 energy!`)
            system.run(() => {
                ev.player.playSound(`random.break`)
            })
        } else {
            system.run(() => {
                power.addEnergyToLunatechItem(ev.player, ev.player.getComponent("inventory").container.getSlot(ev.player.selectedSlotIndex), -1)
            })
        }
    }
})

world.afterEvents.playerInventoryItemChange.subscribe(ev => {
    const item = ev.player.getComponent("inventory").container.getSlot(ev.slot);
    if (!item.hasItem()) return;
    if (!ev.itemStack) return;
    const typeId = item.typeId;
    if (poweredTools.includes(typeId) && item.typeId == ev.itemStack.typeId) {
        power.declareEnergyOnTool(ev.player, item);
    }
});

world.beforeEvents.playerLeave.subscribe(ev => {
    system.run(() => {
        power.flushPlayerEnergyCache(ev.player)
    })
})

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.blockComponentRegistry.registerCustomComponent('lunatech:step_to_charge', {
        onStepOn: e => {
            power.startPlayerScan(e.entity, e.block)
        },
        onStepOff: e => {
            power.stopPlayerScan(e.entity)
        },
    });
    initEvent.blockComponentRegistry.registerCustomComponent('lunatech:resin_fill', {
        onTick: e => {
            const perm = e.block.permutation;
            if (!perm.getState('lunatech:resin_filled')) {
                const states = { ...perm.getAllStates() };
                states['lunatech:resin_filled'] = true;
                e.block.setPermutation(
                    BlockPermutation.resolve(e.block.typeId, states)
                );
            }
        }
    });
});