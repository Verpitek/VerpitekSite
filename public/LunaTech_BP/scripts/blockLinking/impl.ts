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

import { BlockTagLink } from "../blockLinking/manager";
import { ELECTRICITY_LINK_IDS } from "../blockLinking/linkRegistry";
import { MachineCustomComponent } from "../machines/component";

// Handling Electricity Related Links
MachineCustomComponent.registerLinkEvent((ev) => {
    // Linking machines via KW
    const sourceKwMach = MachineCustomComponent.getKylowatMachine(ev.sourceBlock);
    const targetKwMach = MachineCustomComponent.getKylowatMachine(ev.targetBlock);

    sourceKwMach.linkMachine(targetKwMach);
}, {
    linkTag: ELECTRICITY_LINK_IDS
})