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

	import { Block, ScoreboardObjective, world } from "@minecraft/server";
import { MachineCustomComponent } from "../machines/component";
import { PanSparkClientComponent, VM_STATES } from "./component";

import { PanSparkVM } from "./panspark";

interface VmStorageData {
    vm: PanSparkVM,
    gen?: Generator<number, number, undefined>,
}

export enum VmTickResult {
    TICKED,
    DONE,
    ERR,
    NOGEN,
}

class Panspark {
    private vmStorage: Record<string, VmStorageData> = {};
    private moduleRegistrationFunctionStorage: Record<string, (vm: PanSparkVM, id: string, block: Block) => void> = {};

    registerDataForBlock(block: Block, data: VmStorageData) {
        this.vmStorage[this.getIdFromBlock(block)] = data;
    }

    getIdFromBlock(block: Block) {
        const cache = (block as Block & { panSparkIdCache: string | undefined }).panSparkIdCache;
        if (cache !== undefined) {
            return cache;
        }

        const loc = block.location;
        let id = `${block.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        (block as Block & { panSparkIdCache: string | undefined }).panSparkIdCache = id;

        return id;
    }

    getStoredDataForBlock(block: Block) {
        return this.vmStorage[this.getIdFromBlock(block)];
    }

    getVmForBlock(block: Block) {
        return this.vmStorage[this.getIdFromBlock(block)]?.vm;
    }

    getGeneratorForBlock(block: Block) {
        return this.vmStorage[this.getIdFromBlock(block)]?.gen;
    }

    loadModulesIntoVm(vm: PanSparkVM, block: Block, modules: string[]) {
        const netId = PanSparkClientComponent.getNetworkId(block);

        for (const modName of modules) {
            const regFunc = panspark.getModuleRegistration(modName);

            if (regFunc === undefined) {
                // Module wasnt reloaded, skip
                console.warn("Missing PanSpark module: " + modName);
                continue;
            }

            regFunc(vm, netId, block);
        }
    }

    startBlockVM(block: Block, code: string) {
        let vm = this.getVmForBlock(block);

        if (vm === undefined) {
            // Needs a VM to be init
            vm = new PanSparkVM();
        } else {
            // Reset VM
            vm.resetVM();
        }

        const loadedModules = this.getModulesForBlock(block);
        this.loadModulesIntoVm(vm, block, loadedModules)

        const gen = vm.run(vm.compile(code));

        this.registerDataForBlock(block, { vm, gen })

        // Set state to running
        PanSparkClientComponent.setState(block, VM_STATES.RUNNING);
    }

    handleVMError(block: Block, err: any) {
        let message: string;
        if (typeof err === 'string') {
            message = err;
        } else if (typeof err.message === 'string') {
            message = err.message;
        } else if (err.toString !== undefined) {
            message = err.toString();
        } else {
            message = "An unknown error occured";
        }

        PanSparkClientComponent.setBlockOutputData(block, message);
    }

    tickBlockVM(block: Block): VmTickResult {
        const gen = this.getGeneratorForBlock(block);

        if (gen === undefined) {
            return VmTickResult.NOGEN;
        }

        try {
            if (gen.next().done) {
                return VmTickResult.DONE;
            }
        } catch (err) {
            this.handleVMError(block, err);

            throw err;

            return VmTickResult.ERR
        }

        return VmTickResult.TICKED;
    }

    getScoreboardObj(block: Block, createIfNeeded: boolean = true): ScoreboardObjective | undefined {
        const loc = block.location;
        const scoreObjId = `lunatech:panspark:${block.dimension.id}:${loc.x}:${loc.y}:${loc.z}`;

        let scoreObj = world.scoreboard.getObjective(scoreObjId);
        if (scoreObj === undefined) {
            if (!createIfNeeded) {
                return;
            }

            return world.scoreboard.addObjective(scoreObjId);
        }

        return scoreObj;
    }

    getModulesForBlock(block: Block) {
        let scoreObj = this.getScoreboardObj(block, false);
        if (scoreObj === undefined) {
            // No modules
            return [];
        }

        const modules: string[] = [];

        const moduleParticipants = scoreObj.getParticipants();
        for (const modPart of moduleParticipants) {
            modules.push(modPart.displayName);
        }

        return modules;
    }

    cacheModuleForBlock(block: Block, moduleName: string) {
        const scoreObj = this.getScoreboardObj(block);

        if (scoreObj.hasParticipant(moduleName)) {
            // Module already loaded
            return false;
        }

        scoreObj.addScore(moduleName, 1);
        return true;
    }

    registerModuleOnBlock(moduleName: string, block: Block) {
        const regFunc = this.getModuleRegistration(moduleName);
        if (regFunc === undefined) {
            throw new Error("Invalid module name!");
        }

        // Cache module name in scoreboard if not already loaded
        if (!this.cacheModuleForBlock(block, moduleName)) {
            // Module was already loaded
            return false;
        }

        // If VM already exists and the module now, otherwise it will add it on VM creation
        const vm = this.getVmForBlock(block);

        if (vm !== undefined) {
            // Immediatly add module to VM
            regFunc(vm, PanSparkClientComponent.getNetworkId(block), block);
        }

        return true;
    }

    registerModule(moduleName: string, registrationMethod: (vm: PanSparkVM, id: string, block: Block) => void) {
        this.moduleRegistrationFunctionStorage[moduleName] = registrationMethod;
    }

    getModuleRegistration(moduleName: string) {
        return this.moduleRegistrationFunctionStorage[moduleName];
    }
}

export const panspark = new Panspark();

// Delete scoreboard for block on break
MachineCustomComponent.registerBreakEvent((ev) => {
    const scoreObj = panspark.getScoreboardObj(ev.block);

    world.scoreboard.removeObjective(scoreObj);
})