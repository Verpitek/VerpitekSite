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

	import { Block, world } from "@minecraft/server";
import { MachineCustomComponent } from "../../machines/component";

export function getBlocksPowerLevelFromLight(block: Block) {
	return Math.round((block.getSkyLightLevel() / 15) * 5);
}

function getPowerLevelFromCurrentTime() {
	const time = world.getTimeOfDay();

	// TODO: Make impacted by weather

	if (time >= 13670 && time <= 22330) {
		return 0;
	} else if (
		(time >= 22331 && time <= 23296)
		|| (time >= 12705 && time <= 13669)
	) {
		return 1;
	} else if (
		(time >= 23297 && time <= 23960)
		|| (time >= 12041 && time <= 12704)
	) {
		return 2;
	} else if (
		(
			(time >= 23961 && time <= 24000)
			|| (time >= 0 && time <= 933)
		)
		|| (time >= 11067 && time <= 12040)
	) {
		return 3;
	} else if (
		(time >= 934 && time <= 2444)
		|| (time >= 9557 && time <= 11066)
	) {
		return 4;
	} else if (
		(time >= 2445 && time <= 9556)
	) {
		return 5;
	} else {
		throw new Error("Invalid time: " + time);
	}


	// Below is code that can be used to calculate the redstone output of a daylight sensor at a given time.
	// It remains here becuase it took a long time to write,
	// but isn't entirly needed due to the solar panels more limited set of power output
	/*
	if (time > 13670 && time <= 22330) {
		return 0;
	} else if (
		(time > 13219 && time <= 13669)
		|| (time > 22331 && time <= 22781)
	) {
		return 1;
	} else if (
		(time > 12931 && time <= 13218)
		|| (time > 23782 && time <= 23070)
	) {
		return 2;
	} else if (
		(time > 12705 && time <= 12930)
		|| (time > 23071 && time <= 23296)
	) {
		return 3;
	} else if (
		(time > 12471 && time <= 12704)
		|| (time > 23297 && time <= 23529)
	) {
		return 4;
	} else if (
		(time > 12233 && time <= 12470)
		|| (time > 23768 && time <= 23960)
	) {
		return 5;
	} else if (
		(time > 12041 && time <= 12232)
		|| (time > 23768 && time <= 23960)
	) {
		return 6;
	} else if (
		(time > 11835 && time <= 12040)
		|| (
			(time > 23961 && time < 24000) ||
			(time > 0 && time <= 166)
		)
	) {
		return 7;
	} else if (
		(time > 11466 && time <= 11834)
		|| (time > 167 && time <= 535)
	) {
		return 8;
	} else if (
		(time > 11067 && time <= 11465)
		|| (time > 536 && time <= 933)
	) {
		return 9;
	} else if (
		(time > 10629 && time <= 11066)
		|| (time > 934 && time <= 1371)
	) {
		return 10;
	} else if (
		(time > 10136 && time <= 10628)
		|| (time > 1372 && time <= 1865)
	) {
		return 11;
	} else if (
		(time > 9557 && time <= 10135)
		|| (time > 1866 && time <= 2444)
	) {
		return 12;
	} else if (
		(time > 8826 && time <= 9556)
		|| (time > 2445 && time <= 3175)
	) {
		return 13;
	} else if (
		(time > 7706 && time <= 8825)
		|| (time > 3176 && time <= 4294)
	) {
		return 14;
	} else if (time > 4295 && time <= 7705) {
		return 15;
	} else {
		throw new Error("Invalid time of day!");
	}
	}*/
}

// TODO: Fill in Solar Panel methods/events
MachineCustomComponent.registerTickEvent((ev, args) => {
	const kWMachine = MachineCustomComponent.getKylowatMachine(ev.block);

	if (kWMachine === undefined) {
		return;
	}

	kWMachine.addEnergy(getBlocksPowerLevelFromLight(ev.block));
}, {
	machineId: "lunatech:solar_panel",
});