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

import { MachineCustomComponent } from "../../component";
import { WindmillMachineComponent } from "./component";

WindmillMachineComponent.registerOnTick((ev) => {
    const energyOutput = WindmillMachineComponent.calculateEnergyProduction(ev.block);

    if (energyOutput === undefined) {
        // No energy generated
        return;
    }

    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);

    if (kwMachine === undefined) {
        // Machine unloaded, no energy generated
        return;
    }

    kwMachine.addEnergy(energyOutput);
})