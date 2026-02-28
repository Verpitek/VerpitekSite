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

/**
 * Represent a UUID string
 */
export type UUID =
    `${string}-${string}-${string}-${string}-${string}`;
/**
 * Creates a UUID
 * 
 * Pulled from KylowatAPI, removed the need to look for existing UUIDs
 * because UUID itself is intended to already be unique. It would hard for an overlap to occur
 */
export function generateUUID(): UUID {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    }) as UUID;
}