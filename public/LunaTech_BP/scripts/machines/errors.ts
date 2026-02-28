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

import { Vector3 } from "@minecraft/server";

export class NotAMachineError extends Error {
    constructor(location: Vector3) {
        super(`Provided block was not a machine! Loc: ${location.x}, ${location.y}, ${location.z}`);
    }
}

export class NoMachineComponentError extends Error {
    constructor(location: Vector3) {
        super(`Provided Machine block has machine tag but no machine component! Loc: ${location.x}, ${location.y}, ${location.z}`);
    }
}