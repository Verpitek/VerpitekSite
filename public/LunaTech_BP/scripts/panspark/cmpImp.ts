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

import { Block, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { bookTools } from "../tools/book";
import { MachineCustomComponent } from "../machines/component";
import { PanSparkClientComponent, VM_STATES } from "./component";
import { panspark, VmTickResult } from "./vm_manager";

export const CANCELLED = Symbol("CANCELLED");

const POWER_COST = 1;

// When a player interacts while uninit it should open the form for initing and set the state to "initing"
PanSparkClientComponent.registerBlockInteractEvent((ev, params) => {
    PanSparkClientComponent.setState(ev.block, VM_STATES.INITING);

    createAndSendInitUi(ev.block, ev.player).then((res) => {
        if (res === CANCELLED) {
            // Form was cancelled, return to uninit
            PanSparkClientComponent.setState(ev.block, VM_STATES.UNINIT);
            return;
        }

        if (res !== undefined) {
            // Store name for display
            PanSparkClientComponent.storeNetworkId(ev.block, res);
        }

        PanSparkClientComponent.setState(ev.block, VM_STATES.IDLE);
    });
}, {
    state: [VM_STATES.UNINIT]
});

PanSparkClientComponent.registerBlockInteractEvent((ev, params) => {
    const playerCon = ev.player.getComponent("minecraft:inventory").container;
    const heldItem = playerCon.getItem(ev.player.selectedSlotIndex);

    if (heldItem === undefined) {
        return;
    }

    // Check if the held item is a book
    const bkCmp = heldItem.getComponent("minecraft:book");
    if (bkCmp === undefined) {
        return;
    }

    // Grab the stored code and start the VM on the block using it
    const code = bookTools.getFullContentsAsString(bkCmp);

    panspark.startBlockVM(ev.block, code);
}, {
    state: [VM_STATES.IDLE]
});

PanSparkClientComponent.registerBlockInteractEvent((ev, params) => {
    const playerCon = ev.player.getComponent("minecraft:inventory").container;
    const heldItem = playerCon.getItem(ev.player.selectedSlotIndex);

    if (heldItem === undefined) {
        return;
    }

    // Check if the held item is a book
    const bkCmp = heldItem.getComponent("minecraft:book");
    if (bkCmp === undefined) {
        return;
    }

    // Grab the stored code and start the VM on the block using it
    const linkedEnt = MachineCustomComponent.getAllLinkedEntities(ev.block)[0];
    const outputData = linkedEnt.getDynamicProperty("lunatech:panspark_vm_output") as string;
    bookTools.storeStringAcrossPages(bkCmp, outputData);

    playerCon.setItem(ev.player.selectedSlotIndex, heldItem);

    // Reset state back to idle
    PanSparkClientComponent.setState(ev.block, VM_STATES.IDLE);
}, {
    state: [VM_STATES.FINISHED, VM_STATES.ERR]
});

function createAndSendInitUi(ev: Block, player: Player): Promise<string | typeof CANCELLED | undefined> {
    // TODO: Use scoreboard to ensure unique-ness/validity
    const form = new ModalFormData();

    form.title("Terminal Registration Form");
    form.textField("Terminal Identifier", "Enter your Terminal's name", {
        tooltip: "(Optional) Used in displays",
    });

    return new Promise((res) => {
        form.show(player).then((formRes) => {
            if (formRes.canceled) {
                res(CANCELLED);
                return;
            }

            let ret = formRes.formValues[0] as string;

            if (ret.length === 0) {
                res(undefined)
            } else {
                res(ret);
            }
        })
    })
}
/* TODO: Create a new Terminal display based on Entity UI
// Every tick the client should be setting its terminal ID and current State into its name
PanSparkClientComponent.registerBlockTickEvent((ev) => {
    const state = ev.extraData.currentState;

    let name: string = state;
    if (state !== VM_STATES.INITING && state !== VM_STATES.UNINIT) {
        const id = PanSparkClientComponent.getNetworkId(ev.block);

        if (id === undefined) {
            name = `${state}`;
        } else {
            name = `${id}: ${state}`;
        }
    }

    MachineCustomComponent.setNameLine(ev.block, "panspark_client", name);
})*/

PanSparkClientComponent.registerBlockTickEvent((ev) => {
    const tickResult = panspark.tickBlockVM(ev.block);

    let vm;
    switch (tickResult) {
        case VmTickResult.DONE:
            vm = panspark.getVmForBlock(ev.block);

            const outputData = vm.getBuffer().join('\n');
            PanSparkClientComponent.setBlockOutputData(ev.block, outputData);

            PanSparkClientComponent.setState(ev.block, VM_STATES.FINISHED);
            break;
        case VmTickResult.ERR:
            // Err already stored, set state and break
            PanSparkClientComponent.setState(ev.block, VM_STATES.ERR)

            break;
        case VmTickResult.NOGEN:
            // No generator, reset to IDLE
            PanSparkClientComponent.setState(ev.block, VM_STATES.IDLE);
            break;
        case VmTickResult.TICKED:
            // Remove an energy unit from the terminal
            const didRemove = MachineCustomComponent.tryRemoveEnergy(ev.block, POWER_COST);

            if (didRemove === false) {
                // Set to Out-Of-Energy
                PanSparkClientComponent.setState(ev.block, VM_STATES.OUT_OF_POWER);
                return;
            }

            break;
    }
}, VM_STATES.RUNNING);

PanSparkClientComponent.registerBlockTickEvent((ev) => {
    // Check if there is even still a running generator to be ticked
    const gen = panspark.getGeneratorForBlock(ev.block);
    if (gen === undefined) {
        // Return to IDLE, VM was killed
        PanSparkClientComponent.setState(ev.block, VM_STATES.IDLE);
        return;
    }

    // Check if there is enough power to resume execution
    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kwMachine.currentEnergy >= POWER_COST) {
        // Reset back to running
        PanSparkClientComponent.setState(ev.block, VM_STATES.RUNNING);
    }
}, VM_STATES.OUT_OF_POWER);