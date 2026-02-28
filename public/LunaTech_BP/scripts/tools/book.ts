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

import { ItemBookComponent, ItemStack } from "@minecraft/server";

export class BookTools {
    getFullContentsFromItemAsString(bkItm: ItemStack) {
        if (!this.isBook(bkItm)) {
            throw new Error("Can't get text from a non-book item!");
        }

        return this.getFullContentsAsString(bkItm.getComponent("minecraft:book"));
    }

    getFullContentsAsString(bkCmp: ItemBookComponent) {
        const contents = bkCmp.contents;
        if (contents.includes(undefined)) {
            // TODO: Create proper error
            throw new Error("Can't parse a book with raw contents");
        }

        return contents.join('\n');
    }

    storeStringAcrossPages(bkCmp: ItemBookComponent, text: string) {
        let newContents = [];
        for (let i = 0; i < Math.ceil(text.length / 256); i++) {
            // Get slice of the string
            let startIndex = i * 256;
            const slice = text.slice(startIndex, Math.min(text.length, startIndex + 256));

            newContents.push(slice);
        }

        bkCmp.setContents(newContents);
    }

    isBook(item: ItemStack) {
        const component = item.getComponent("minecraft:book");

        return component !== undefined;
    }
}

export const bookTools = new BookTools();