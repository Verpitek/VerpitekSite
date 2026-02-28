import { EquipmentSlot } from "@minecraft/server";
import { generateUUID } from "../tools/uuid";
export function declareEnergyOnTool(player, tool) {
    if (!tool.getDynamicProperty("uuid")) {
        const newTool = tool.clone();
        newTool.setDynamicProperty("energy", 100);
        newTool.setDynamicProperty("maxEnergy", 1000);
        newTool.setDynamicProperty("uuid", generateUUID());
        syncToolDisplay(player, newTool);
    }
}
export function addEnergyToTool(player, tool, power) {
    let newTool = tool.clone();
    declareEnergyOnTool(player, newTool);
    let energy = newTool.getDynamicProperty("energy") || 0;
    let maxEnergy = newTool.getDynamicProperty("maxEnergy") || 1000;
    newTool.setDynamicProperty("energy", Math.min(Math.max(energy + power, 0), maxEnergy));
    syncToolDisplay(player, newTool);
}
export function addEnergyToChestplate(player, tool, power) {
    let newTool = tool.clone();
    declareEnergyOnTool(player, newTool);
    let energy = newTool.getDynamicProperty("energy") || 0;
    let maxEnergy = newTool.getDynamicProperty("maxEnergy") || 1000;
    newTool.setDynamicProperty("energy", Math.min(Math.max(energy + power, 0), maxEnergy));
    syncChestDisplay(player, newTool);
}
export function syncChestDisplay(player, tool) {
    declareEnergyOnTool(player, tool);
    let energy = tool.getDynamicProperty("energy") || 0;
    let maxEnergy = tool.getDynamicProperty("maxEnergy") || 1000;
    tool.setLore([
        `§r${energy}§7/§r${maxEnergy} §bEU`
    ]);
    let armor = player.getComponent("equippable");
    let chest = armor.getEquipment(EquipmentSlot.Chest);
    if (tool.getDynamicProperty("uuid") == chest.getDynamicProperty("uuid")) {
        armor.setEquipment(EquipmentSlot.Chest, tool);
    }
}
export function hasEnergy(tool) {
    return (tool.getDynamicProperty("energy") || 0) > 0;
}
export function syncToolDisplay(player, tool) {
    declareEnergyOnTool(player, tool);
    let energy = tool.getDynamicProperty("energy") || 0;
    let maxEnergy = tool.getDynamicProperty("maxEnergy") || 1000;
    tool.setLore([
        `§r${energy}§7/§r${maxEnergy} §bEU`
    ]);
    let inv = player.getComponent("inventory").container;
    for(let i = 0; i < inv.size; i++){
        let invItem = inv.getItem(i);
        if (!invItem) continue;
        if (invItem.getDynamicProperty("uuid") == tool.getDynamicProperty("uuid")) {
            inv.setItem(i, tool);
            break;
        } else if (!invItem.getDynamicProperty("uuid")) {
            inv.setItem(i, tool);
            break;
        }
    }
}
export function transferMachineEnergyToTool(player, machine, tool, power) {}
