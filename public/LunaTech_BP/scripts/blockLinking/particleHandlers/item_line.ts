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

import { Dimension, MolangVariableMap, Vector3 } from "@minecraft/server";
import { registerLineDraw } from "../../blockLinking/particleHandlers/tick";

export const ITEM_LINE_VISID = "lunatech:item_line";

export function drawItemLine(startPoint: Vector3, endPoint: Vector3, dim: Dimension) {
    const offsetVec = {
        x: endPoint.x - startPoint.x,
        y: endPoint.y - startPoint.y,
        z: endPoint.z - startPoint.z,
    }

    const varMap = new MolangVariableMap();
    varMap.setFloat("dir_x", offsetVec.x);
    varMap.setFloat("dir_y", offsetVec.y);
    varMap.setFloat("dir_z", offsetVec.z);
    varMap.setFloat("width", 0.025);

    dim.spawnParticle("lunatech:item_line", startPoint, varMap);
}

registerLineDraw(ITEM_LINE_VISID, drawItemLine);