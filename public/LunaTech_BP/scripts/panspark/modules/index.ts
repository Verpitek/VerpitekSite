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

import { panspark } from "../vm_manager";

import { registerItemModuleMap } from "./tempModuleLoader";

import * as storage from "./storagelib";
import * as machine from "./machinelib";

// Register modules
panspark.registerModule("lunatech:storage", storage.registerWith);
panspark.registerModule("lunatech:machine", machine.registerWith);

// Register items for modules
registerItemModuleMap("minecraft:piston", "lunatech:machine");

registerItemModuleMap("minecraft:copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:waxed_copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:exposed_copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:waxed_exposed_copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:oxidized_copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:waxed_oxidized_copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:weathered_copper_golem_statue", "lunatech:storage");
registerItemModuleMap("minecraft:waxed_weathered_copper_golem_statue", "lunatech:storage");