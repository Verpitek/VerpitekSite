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

type XYZRecordData<T> = Record<number, Record<number, Record<number, T>>>;
type DimLocRecordData<T> = Record<string, XYZRecord<T>>;

export class XYZRecord<T> {
    data: XYZRecordData<T>;

    constructor(initializer: XYZRecordData<T> = {}) {
        this.data = initializer;
    }

    getValue(keyPos: Vector3, prepareForSet: boolean = false): T {
        const xGroup = this.data[keyPos.x];
        if (xGroup === undefined) {
            if (prepareForSet) {
                this.data[keyPos.x] = { [keyPos.y]: { [keyPos.z]: undefined } };
            }

            return undefined;
        }

        const yGroup = xGroup[keyPos.y];
        if (yGroup === undefined) {
            if (prepareForSet) {
                xGroup[keyPos.y] = { [keyPos.z]: undefined };
            }

            return undefined;
        }

        return yGroup[keyPos.z];
    }

    setValue(keyPos: Vector3, value: T, isPrepared: boolean = false) {
        if (isPrepared) {
            this.data[keyPos.x][keyPos.y][keyPos.z] = value;
        } else {
            // Checking if X Axis obj exists
            let xAxisObj = this.data[keyPos.x];
            if (xAxisObj === undefined) {
                // Doesn't exist, set value
                this.data[keyPos.x] = { [keyPos.y]: { [keyPos.z]: value } };
                return;
            }

            // Checking if Y Axis obj exists
            let yAxisObj = xAxisObj[keyPos.y];
            if (yAxisObj === undefined) {
                // Doesn't exist, set value
                xAxisObj[keyPos.y] = { [keyPos.z]: value };
                return;
            }

            // Set Z value
            yAxisObj[keyPos.z] = value;
        }
    }

    deleteValue(keyPos: Vector3, isPrepared: boolean = false) {
        if (isPrepared) {
            delete this.data[keyPos.x][keyPos.y][keyPos.z];
            return;
        }

        const xAxisObj = this.data[keyPos.x];
        if (xAxisObj === undefined) {
            return;
        }

        const yAxisObj = xAxisObj[keyPos.y];
        if (yAxisObj === undefined) {
            return;
        }

        delete this.data[keyPos.x][keyPos.y][keyPos.z];
    }
}

export class DimLocRecord<T> {
    private data: DimLocRecordData<T>;

    constructor(initializer: DimLocRecordData<T> = {}) {
        this.data = initializer;
    }

    getValue(dimId: string, keyPos: Vector3, prepareForSet: boolean = false): T | undefined {
        const xyzRecord = this.data[dimId];
        if (xyzRecord === undefined) {
            if (prepareForSet) {
                this.data[dimId] = new XYZRecord({ [keyPos.x]: { [keyPos.y]: { [keyPos.z]: undefined } } });
            }

            return undefined;
        }

        return xyzRecord.getValue(keyPos, prepareForSet);
    }

    setValue(dimId: string, keyPos: Vector3, value: T, isPrepared: boolean = false) {
        if (isPrepared) {
            this.data[dimId].setValue(keyPos, value, true);
        } else {
            const xyzRecord = this.data[dimId];
            if (xyzRecord === undefined) {
                this.data[dimId] = new XYZRecord({
                    [keyPos.x]: {
                        [keyPos.y]: {
                            [keyPos.z]: value
                        }
                    },
                });
            } else {
                xyzRecord.setValue(keyPos, value, false);
            }
        }
    }

    deleteValue(dimId: string, keyPos: Vector3, isPrepared: boolean = false) {
        this.data[dimId]?.deleteValue(keyPos, isPrepared);
    }
}