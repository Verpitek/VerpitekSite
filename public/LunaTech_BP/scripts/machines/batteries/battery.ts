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

import { MachineComponentParams, MachineCustomComponent, MachineTypes } from "../component";

// Machine linking is made limited in how it works, the code below was for handling a less precise system

/*MachineCustomComponent.registerTickEvent((ev, params) => {
    // Grab all linked machines
    const kWMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    // If kWMachine doesn't exist yet, wait until next tick
    if (kWMachine === undefined) {
        return;
    }

    // If out of power early exit the tick
    if (kWMachine.currentEnergy === 0) {
        return;
    }

    const isOnLowPower = kWMachine.currentEnergy < 3;

    const linkedMachines = kWMachine.getLinkedMachines();

    const transferRate = params.transfer_rate ? params.transfer_rate : 5;

    let amountData = determineTransferAmountPerMachine(linkedMachines.length, kWMachine.currentEnergy, transferRate);

    let machIndex = 0;
    for (const machine of linkedMachines) {
        let currentIndex = machIndex++;

        // If this battery is out of energy, break from this loop and stop trying to transfer energy
        if (kWMachine.currentEnergy === 0) {
            break;
        }

        // If the linked machine is maxed on energy, continue
        if (machine.currentEnergy === machine.maxEnergy) {
            continue;
        }

        // Get the block at the linked machine, ignore if unloaded
        const machineBlock = ev.dimension.getBlock(machine.location);
        if (machineBlock === undefined) {
            continue;
        }

        const machineArgs = machineBlock.getComponent("lunatech:machine").customComponentParameters.params as MachineComponentParams;

        // If linked machine is a battery and this machine is low on power, it should skip sending energy to any near by batteries and focus on linked workers
        if (isOnLowPower && machineArgs.machine_type == MachineTypes.BATTERY) {
            continue;
        }

        let amount = amountData.perMachine;
        if (currentIndex < amountData.exAmt) {
            amount += 1;
        }

        kWMachine.transferEnergy(machine, amount);
    }
}, {
    machineType: MachineTypes.BATTERY
});*/

/**
 * @param linkCount - The number of machines being transfered to
 * @param storedEnergy - The amount of energy within the machine being transfered from
 * @param transferAmount - The max amount of energy it aims to transfer to each machine
 */
function determineTransferAmountPerMachine(linkCount: number, storedEnergy: number, transferAmount: number): { perMachine: number, exAmt: number } {
    const maxTransfer = transferAmount * linkCount;

    if (storedEnergy >= maxTransfer) {
        // Each machine can get the transferRate, no machines need an extra energy
        return { perMachine: transferAmount, exAmt: 0 };
    }

    // Partial transfer amount per machine, gurrenteed to be less than transferRate
    const perMachine = Math.floor(storedEnergy / linkCount);

    const exAmt = storedEnergy - (perMachine * linkCount);

    return { perMachine, exAmt };
}