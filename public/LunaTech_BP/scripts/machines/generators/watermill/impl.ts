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
import { WatermillMachineComponent } from "./component";

WatermillMachineComponent.registerOnTick((ev) => {
    const eu = WatermillMachineComponent.calculateEnergyProduction(ev.block);

    if (eu === 0) {
        return;
    }

    const kwMachine = MachineCustomComponent.getKylowatMachine(ev.block);
    if (kwMachine === undefined) {
        return;
    }

    kwMachine.addEnergy(eu);
})