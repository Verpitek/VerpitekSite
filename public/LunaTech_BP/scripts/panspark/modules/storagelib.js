import { world, system, ItemStack } from "@minecraft/server";

// Change when the library is initiated!
export class Container {
  name = "";
  block = null;

  constructor(name, block) {
    this.name = name;
    this.block = block;
  }
}

let vm_storage = new Map();

export function getOpenContsById(id) {
  return vm_storage.get(id);
}

function isWithinRadius(machineBlock, x, y, z, radius) {
  const loc = machineBlock.location;
  const machine_location = [loc.x, loc.y, loc.z];

  const dx = x - machine_location[0];
  const dy = y - machine_location[1];
  const dz = z - machine_location[2];

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance <= radius;
}

export function registerWith(vm, id, machineBlock) {
  // STORAGE_OPEN x y z >> containerName
  // Opens a container at the specified coordinates and assigns it a name
  vm.registerOpCode("STORAGE_OPEN", (args, context) => {
    if (args.length < 5 || args[3] !== ">>") {
      throw new Error("Invalid STORAGE_OPEN syntax. Expected: STORAGE_OPEN x y z >> containerName");
    }

    const x = context.getVar(args[0], 0);
    const y = context.getVar(args[1], 0);
    const z = context.getVar(args[2], 0);

    if (x.type !== 0 || y.type !== 0 || z.type !== 0) {
      throw new Error("STORAGE_OPEN coordinates must be numbers");
    }

    const coords = {
      x: x.value,
      y: y.value,
      z: z.value
    };

    const targetBlock = machineBlock.dimension.getBlock(coords);
    if (!targetBlock) {
      throw new Error("Target Block is either not loaded or air");
    }

    // Check if within radius
    if (!isWithinRadius(machineBlock, coords.x, coords.y, coords.z, 10)) {
      throw new Error(`Container at (${coords.x}, ${coords.y}, ${coords.z}) is outside allowed radius of 10 blocks`);
    }

    const containerName = args[4];

    const inventoryComponent = targetBlock.getComponent("minecraft:inventory");
    if (!inventoryComponent) {
      throw new Error(`Block at (${coords.x}, ${coords.y}, ${coords.z}) is not a container`);
    }

    const container = new Container(containerName, targetBlock);

    let machineStorage = vm_storage.get(id);
    if (machineStorage === undefined) {
      machineStorage = new Map();
      vm_storage.set(id, machineStorage);
    }

    machineStorage.set(containerName, container);
  });

  // STORAGE_LIST
  // Prints all open container names to the buffer
  vm.registerOpCode("STORAGE_LIST", (args, context) => {
    const storage = vm_storage.get(id);

    if (storage === undefined || storage.size === 0) {
      context.buffer.push("No containers open");
    } else {
      context.buffer.push("Open containers: " + Array.from(storage.keys()).join(", "));
    }
  });

  // STORAGE_CLOSE containerName
  // Closes a container and removes it from memory
  vm.registerOpCode("STORAGE_CLOSE", (args, context) => {
    if (args.length < 1) {
      throw new Error("Invalid STORAGE_CLOSE syntax. Expected: STORAGE_CLOSE containerName");
    }

    const storage = vm_storage.get(id);

    const containerName = args[0];
    if (!storage.has(containerName)) {
      throw new Error(`Container "${containerName}" not found`);
    }

    storage.delete(containerName);
  });

  // STORAGE_SIZE containerName >> variable
  // Gets the size of a container (number of slots)
  vm.registerOpCode("STORAGE_SIZE", (args, context) => {
    if (args.length < 3 || args[1] !== ">>") {
      throw new Error("Invalid STORAGE_SIZE syntax. Expected: STORAGE_SIZE containerName >> variable");
    }

    const storage = vm_storage.get(id);

    const containerName = args[0];
    const container = storage.get(containerName);

    if (!container) {
      throw new Error(`Container "${containerName}" not found`);
    }

    const inventoryComponent = container.block.getComponent("minecraft:inventory");
    const size = inventoryComponent.container.size;

    context.setVar(args[2], { type: 0, value: size });
  });

  // STORAGE_COUNT containerName itemId >> variable
  // Counts total amount of a specific item in the container
  vm.registerOpCode("STORAGE_COUNT", (args, context) => {
    if (args.length < 4 || args[2] !== ">>") {
      throw new Error("Invalid STORAGE_COUNT syntax. Expected: STORAGE_COUNT containerName itemId >> variable");
    }

    const storage = vm_storage.get(id);

    const containerName = args[0];
    const container = storage.get(containerName);

    if (!container) {
      throw new Error(`Container "${containerName}" not found`);
    }

    const itemId = args[1];
    const inventoryComponent = container.block.getComponent("minecraft:inventory");
    const containerObj = inventoryComponent.container;

    let totalCount = 0;
    for (let i = 0; i < containerObj.size; i++) {
      const item = containerObj.getItem(i);
      if (item && item.typeId === itemId) {
        totalCount += item.amount;
      }
    }

    context.setVar(args[3], { type: 0, value: totalCount });
  });

  // STORAGE_FIND containerName itemId >> variable
  // Finds the first slot containing the specified item (-1 if not found)
  vm.registerOpCode("STORAGE_FIND", (args, context) => {
    if (args.length < 4 || args[2] !== ">>") {
      throw new Error("Invalid STORAGE_FIND syntax. Expected: STORAGE_FIND containerName itemId >> variable");
    }

    const storage = vm_storage.get(id);

    const containerName = args[0];
    const container = storage.get(containerName);

    if (!container) {
      throw new Error(`Container "${containerName}" not found`);
    }

    const itemId = args[1];
    const inventoryComponent = container.block.getComponent("minecraft:inventory");
    const containerObj = inventoryComponent.container;

    let foundSlot = -1;
    for (let i = 0; i < containerObj.size; i++) {
      const item = containerObj.getItem(i);
      if (item && item.typeId === itemId) {
        foundSlot = i;
        break;
      }
    }

    context.setVar(args[3], { type: 0, value: foundSlot });
  });

  // STORAGE_FINDEMPTY containerName >> variable
  // Finds the first empty slot in the container (-1 if full)
  vm.registerOpCode("STORAGE_FINDEMPTY", (args, context) => {
    if (args.length < 3 || args[1] !== ">>") {
      throw new Error("Invalid STORAGE_FINDEMPTY syntax. Expected: STORAGE_FINDEMPTY containerName >> variable");
    }

    const storage = vm_storage.get(id);

    const containerName = args[0];
    const container = storage.get(containerName);

    if (!container) {
      throw new Error(`Container "${containerName}" not found`);
    }

    const inventoryComponent = container.block.getComponent("minecraft:inventory");
    const containerObj = inventoryComponent.container;

    let emptySlot = -1;
    for (let i = 0; i < containerObj.size; i++) {
      const item = containerObj.getItem(i);
      if (!item) {
        emptySlot = i;
        break;
      }
    }

    context.setVar(args[2], { type: 0, value: emptySlot });
  });

  // STORAGE_TRANSFER fromContainer fromSlot toContainer >> result
  // Transfers an entire stack from one container slot to the first available slot in another container
  // Returns 1 on success, 0 on failure (no empty slot or source slot empty)
  vm.registerOpCode("STORAGE_TRANSFER", (args, context) => {
    if (args.length < 5 || args[3] !== ">>") {
      throw new Error("Invalid STORAGE_TRANSFER syntax. Expected: STORAGE_TRANSFER fromContainer fromSlot toContainer >> result");
    }

    const fromContainerName = args[0];
    const toContainerName = args[2];

    const storage = vm_storage.get(id);

    const fromContainer = storage.get(fromContainerName);
    const toContainer = storage.get(toContainerName);

    if (!fromContainer) {
      throw new Error(`Container "${fromContainerName}" not found`);
    }
    if (!toContainer) {
      throw new Error(`Container "${toContainerName}" not found`);
    }

    const fromSlotVar = context.getVar(args[1], 0);
    if (fromSlotVar.type !== 0) {
      throw new Error("STORAGE_TRANSFER fromSlot must be a number");
    }

    const fromSlot = Math.floor(fromSlotVar.value);

    const fromInv = fromContainer.block.getComponent("minecraft:inventory").container;
    const toInv = toContainer.block.getComponent("minecraft:inventory").container;

    if (fromSlot < 0 || fromSlot >= fromInv.size) {
      throw new Error(`Source slot ${fromSlot} is out of bounds`);
    }

    // Get item from source slot
    const sourceItem = fromInv.getItem(fromSlot);
    if (!sourceItem) {
      context.setVar(args[4], { type: 0, value: 0 });
      return;
    }

    // Find empty slot in destination
    let destSlot = -1;
    for (let i = 0; i < toInv.size; i++) {
      const item = toInv.getItem(i);
      if (!item) {
        destSlot = i;
        break;
      }
    }

    if (destSlot === -1) {
      context.setVar(args[4], { type: 0, value: 0 });
      return;
    }

    // Transfer the item
    fromInv.transferItem(fromSlot, toInv);
    context.setVar(args[4], { type: 0, value: 1 });
  });

  // STORAGE_TRANSFERALL fromContainer toContainer >> result
  // Transfers all items from one container to another (only to empty slots)
  // Returns the number of stacks successfully transferred
  vm.registerOpCode("STORAGE_TRANSFERALL", (args, context) => {
    if (args.length < 4 || args[2] !== ">>") {
      throw new Error("Invalid STORAGE_TRANSFERALL syntax. Expected: STORAGE_TRANSFERALL fromContainer toContainer >> result");
    }

    const fromContainerName = args[0];
    const toContainerName = args[1];

    const storage = vm_storage.get(id);

    const fromContainer = storage.get(fromContainerName);
    const toContainer = storage.get(toContainerName);

    if (!fromContainer) {
      throw new Error(`Container "${fromContainerName}" not found`);
    }
    if (!toContainer) {
      throw new Error(`Container "${toContainerName}" not found`);
    }

    const fromInv = fromContainer.block.getComponent("minecraft:inventory").container;
    const toInv = toContainer.block.getComponent("minecraft:inventory").container;

    let transferredCount = 0;

    // Transfer all items from source
    for (let i = 0; i < fromInv.size; i++) {
      const item = fromInv.getItem(i);
      if (item) {
        // Find empty slot in destination
        let destSlot = -1;
        for (let j = 0; j < toInv.size; j++) {
          const destItem = toInv.getItem(j);
          if (!destItem) {
            destSlot = j;
            break;
          }
        }

        if (destSlot !== -1) {
          fromInv.transferItem(i, toInv);
          transferredCount++;
        }
      }
    }

    context.setVar(args[3], { type: 0, value: transferredCount });
  });

  // STORAGE_SORT containerName
  // Compacts items in a container by stacking similar items together
  vm.registerOpCode("STORAGE_SORT", (args, context) => {
    if (args.length < 1) {
      throw new Error("Invalid STORAGE_SORT syntax. Expected: STORAGE_SORT containerName");
    }

    const storage = vm_storage.get(id);

    const containerName = args[0];
    const container = storage.get(containerName);

    if (!container) {
      throw new Error(`Container "${containerName}" not found`);
    }

    const inv = container.block.getComponent("minecraft:inventory").container;

    // Collect all items
    const items = [];
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) {
        items.push(item.clone());
        inv.setItem(i, undefined);
      }
    }

    // Group by item type and sum amounts
    const itemMap = new Map();
    for (const item of items) {
      const key = item.typeId;
      if (!itemMap.has(key)) {
        itemMap.set(key, { typeId: item.typeId, amount: 0, maxStack: item.maxAmount });
      }
      itemMap.get(key).amount += item.amount;
    }

    // Place items back in stacks
    let slotIndex = 0;
    for (const [typeId, data] of itemMap) {
      let remaining = data.amount;
      while (remaining > 0 && slotIndex < inv.size) {
        const stackSize = Math.min(remaining, data.maxStack);
        const newStack = new ItemStack(data.typeId, stackSize);
        inv.setItem(slotIndex, newStack);
        remaining -= stackSize;
        slotIndex++;
      }
    }
  });
}
