// handlers/basic/set.ts
function handleSet(vm, instruction) {
  vm.setMemory(vm.fetchValue(instruction.arguments[0]), instruction.arguments[1]);
}

// handlers/basic/add.ts
function handleAdd(vm, instruction) {
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) + vm.fetchMemory(instruction.arguments[1]), instruction.arguments[2]);
}

// handlers/basic/sub.ts
function handleSub(vm, instruction) {
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) - vm.fetchMemory(instruction.arguments[1]), instruction.arguments[2]);
}

// handlers/basic/print.ts
function handlePrint(vm, instruction) {
  const value = vm.fetchValue(instruction.arguments[0]);
  if (Array.isArray(value)) {
    vm.outputBuffer.push(JSON.stringify(value));
  } else {
    vm.outputBuffer.push(value);
  }
}

// handlers/control/if.ts
function toNumber(vm, arg) {
  const val = vm.fetchValue(arg);
  if (typeof val === "number")
    return val;
  if (Array.isArray(val))
    return val.reduce((sum, n) => sum + n, 0);
  throw Error(`Expected number or array but got string at line: ${vm.activeInstructionPos + 1}`);
}
function handleIf(vm, instruction) {
  const a = instruction.arguments[0];
  const op = instruction.arguments[1];
  const b = instruction.arguments[2];
  switch (op.type) {
    case 3 /* EQUAL */: {
      const aVal = vm.fetchValue(a);
      const bVal = vm.fetchValue(b);
      if (typeof aVal === "string" || typeof bVal === "string") {
        return aVal === bVal;
      }
      const aNum = Array.isArray(aVal) ? aVal.reduce((s, n) => s + n, 0) : aVal;
      const bNum = Array.isArray(bVal) ? bVal.reduce((s, n) => s + n, 0) : bVal;
      return aNum === bNum;
    }
    case 4 /* NOTEQUAL */: {
      const aVal = vm.fetchValue(a);
      const bVal = vm.fetchValue(b);
      if (typeof aVal === "string" || typeof bVal === "string") {
        return aVal !== bVal;
      }
      const aNum = Array.isArray(aVal) ? aVal.reduce((s, n) => s + n, 0) : aVal;
      const bNum = Array.isArray(bVal) ? bVal.reduce((s, n) => s + n, 0) : bVal;
      return aNum !== bNum;
    }
    case 5 /* LESS */:
      return toNumber(vm, a) < toNumber(vm, b);
    case 6 /* GREATER */:
      return toNumber(vm, a) > toNumber(vm, b);
    case 7 /* LESSEQUAL */:
      return toNumber(vm, a) <= toNumber(vm, b);
    case 8 /* GREATEQUAL */:
      return toNumber(vm, a) >= toNumber(vm, b);
    default:
      return false;
  }
}

// handlers/arithmetics.ts
function handleMul(vm, instruction) {
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) * vm.fetchMemory(instruction.arguments[1]), instruction.arguments[2]);
}
function handleDiv(vm, instruction) {
  const divisor = vm.fetchMemory(instruction.arguments[1]);
  if (divisor === 0)
    throw Error(`Division by zero at line: ${vm.activeInstructionPos + 1}`);
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) / divisor, instruction.arguments[2]);
}
function handleMod(vm, instruction) {
  const divisor = vm.fetchMemory(instruction.arguments[1]);
  if (divisor === 0)
    throw Error(`Modulo by zero at line: ${vm.activeInstructionPos + 1}`);
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) % divisor, instruction.arguments[2]);
}
function handleSqrt(vm, instruction) {
  vm.setMemory(Math.sqrt(vm.fetchMemory(instruction.arguments[0])), instruction.arguments[1]);
}
function handlePow(vm, instruction) {
  vm.setMemory(Math.pow(vm.fetchMemory(instruction.arguments[0]), vm.fetchMemory(instruction.arguments[1])), instruction.arguments[2]);
}
function handleAbs(vm, instruction) {
  vm.setMemory(Math.abs(vm.fetchMemory(instruction.arguments[0])), instruction.arguments[1]);
}
function handleMin(vm, instruction) {
  vm.setMemory(Math.min(vm.fetchMemory(instruction.arguments[0]), vm.fetchMemory(instruction.arguments[1])), instruction.arguments[2]);
}
function handleMax(vm, instruction) {
  vm.setMemory(Math.max(vm.fetchMemory(instruction.arguments[0]), vm.fetchMemory(instruction.arguments[1])), instruction.arguments[2]);
}
function handleInc(vm, instruction) {
  const arg = instruction.arguments[0];
  vm.setMemory(vm.fetchMemory(arg) + 1, arg);
}
function handleDec(vm, instruction) {
  const arg = instruction.arguments[0];
  vm.setMemory(vm.fetchMemory(arg) - 1, arg);
}
function handleRng(vm, instruction) {
  const a = vm.fetchMemory(instruction.arguments[0]);
  const b = vm.fetchMemory(instruction.arguments[1]);
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  vm.setMemory(Math.floor(Math.random() * (max - min + 1)) + min, instruction.arguments[2]);
}

// handlers/arrays.ts
function getArray(vm, arg) {
  const val = vm.fetchValue(arg);
  if (!Array.isArray(val))
    throw Error(`Expected array register at line: ${vm.activeInstructionPos + 1}`);
  return val;
}
function updateArray(vm, arg, newArray) {
  const mem = arg.type === 2 /* MACHINE */ ? vm.machineMemory : vm.registerMemory;
  const idx = arg.value;
  const oldVal = mem[idx];
  if (oldVal.tag !== "array")
    throw Error(`Register is not an array at line: ${vm.activeInstructionPos + 1}`);
  const oldSize = oldVal.data.length * 2;
  const newSize = newArray.length * 2;
  const delta = newSize - oldSize;
  if (vm.heapUsed() + delta > vm.heapLimit) {
    throw Error(`Heap overflow! Need ${delta} more bytes but only ${vm.heapAvailable()} available.`);
  }
  oldVal.data = newArray;
}
function handleArrNew(vm, instruction) {
  const size = vm.fetchMemory(instruction.arguments[0]);
  if (size < 0)
    throw Error(`Array size cannot be negative at line: ${vm.activeInstructionPos + 1}`);
  const arr = Array.from({ length: size }, () => 0);
  vm.setMemory(arr, instruction.arguments[1]);
}
function handleArrPush(vm, instruction) {
  const arr = getArray(vm, instruction.arguments[0]);
  const val = vm.fetchMemory(instruction.arguments[1]);
  const newArr = [...arr, val];
  updateArray(vm, instruction.arguments[0], newArr);
}
function handleArrPop(vm, instruction) {
  const arr = getArray(vm, instruction.arguments[0]);
  const popped = arr.length > 0 ? arr[arr.length - 1] : 0;
  const newArr = arr.slice(0, -1);
  updateArray(vm, instruction.arguments[0], newArr);
  vm.setMemory(popped, instruction.arguments[1]);
}
function handleArrGet(vm, instruction) {
  const arr = getArray(vm, instruction.arguments[0]);
  const idx = vm.fetchMemory(instruction.arguments[1]);
  if (idx < 0 || idx >= arr.length)
    throw Error(`Array index ${idx} out of bounds (length ${arr.length})`);
  vm.setMemory(arr[idx], instruction.arguments[2]);
}
function handleArrSet(vm, instruction) {
  const arr = getArray(vm, instruction.arguments[0]);
  const idx = vm.fetchMemory(instruction.arguments[1]);
  if (idx < 0 || idx >= arr.length)
    throw Error(`Array index ${idx} out of bounds (length ${arr.length})`);
  const val = vm.fetchMemory(instruction.arguments[2]);
  const newArr = [...arr];
  newArr[idx] = val;
  updateArray(vm, instruction.arguments[0], newArr);
}
function handleArrLen(vm, instruction) {
  const arr = getArray(vm, instruction.arguments[0]);
  vm.setMemory(arr.length, instruction.arguments[1]);
}
function handleArrSort(vm, instruction) {
  const arr = getArray(vm, instruction.arguments[0]);
  const newArr = [...arr].sort((a, b) => a - b);
  updateArray(vm, instruction.arguments[0], newArr);
}

// panspark.ts
var OpCode;
((OpCode2) => {
  OpCode2[OpCode2["SET"] = 0] = "SET";
  OpCode2[OpCode2["ADD"] = 1] = "ADD";
  OpCode2[OpCode2["SUB"] = 2] = "SUB";
  OpCode2[OpCode2["PRINT"] = 3] = "PRINT";
  OpCode2[OpCode2["JUMP"] = 4] = "JUMP";
  OpCode2[OpCode2["POINT"] = 5] = "POINT";
  OpCode2[OpCode2["IF"] = 6] = "IF";
  OpCode2[OpCode2["MUL"] = 7] = "MUL";
  OpCode2[OpCode2["DIV"] = 8] = "DIV";
  OpCode2[OpCode2["MOD"] = 9] = "MOD";
  OpCode2[OpCode2["SQRT"] = 10] = "SQRT";
  OpCode2[OpCode2["POW"] = 11] = "POW";
  OpCode2[OpCode2["ABS"] = 12] = "ABS";
  OpCode2[OpCode2["MIN"] = 13] = "MIN";
  OpCode2[OpCode2["MAX"] = 14] = "MAX";
  OpCode2[OpCode2["INC"] = 15] = "INC";
  OpCode2[OpCode2["DEC"] = 16] = "DEC";
  OpCode2[OpCode2["RNG"] = 17] = "RNG";
  OpCode2[OpCode2["NOP"] = 18] = "NOP";
  OpCode2[OpCode2["HALT"] = 19] = "HALT";
  OpCode2[OpCode2["UNTIL"] = 20] = "UNTIL";
  OpCode2[OpCode2["CALL"] = 21] = "CALL";
  OpCode2[OpCode2["RET"] = 22] = "RET";
  OpCode2[OpCode2["ARR_NEW"] = 23] = "ARR_NEW";
  OpCode2[OpCode2["ARR_PUSH"] = 24] = "ARR_PUSH";
  OpCode2[OpCode2["ARR_POP"] = 25] = "ARR_POP";
  OpCode2[OpCode2["ARR_GET"] = 26] = "ARR_GET";
  OpCode2[OpCode2["ARR_SET"] = 27] = "ARR_SET";
  OpCode2[OpCode2["ARR_LEN"] = 28] = "ARR_LEN";
  OpCode2[OpCode2["ARR_SORT"] = 29] = "ARR_SORT";
  OpCode2[OpCode2["PERIPHERAL"] = 30] = "PERIPHERAL";
})(OpCode ||= {});
var ArgType;
((ArgType2) => {
  ArgType2[ArgType2["LITERAL"] = 0] = "LITERAL";
  ArgType2[ArgType2["REGISTER"] = 1] = "REGISTER";
  ArgType2[ArgType2["MACHINE"] = 2] = "MACHINE";
  ArgType2[ArgType2["EQUAL"] = 3] = "EQUAL";
  ArgType2[ArgType2["NOTEQUAL"] = 4] = "NOTEQUAL";
  ArgType2[ArgType2["LESS"] = 5] = "LESS";
  ArgType2[ArgType2["GREATER"] = 6] = "GREATER";
  ArgType2[ArgType2["LESSEQUAL"] = 7] = "LESSEQUAL";
  ArgType2[ArgType2["GREATEQUAL"] = 8] = "GREATEQUAL";
  ArgType2[ArgType2["LABEL"] = 9] = "LABEL";
  ArgType2[ArgType2["STRING"] = 10] = "STRING";
  ArgType2[ArgType2["ARRAY"] = 11] = "ARRAY";
})(ArgType ||= {});
function byteSize(v) {
  if (v.tag === "int")
    return 2;
  if (v.tag === "string")
    return v.data.length + 1;
  return v.data.length * 2;
}
function tokenize(line) {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === " ") {
      i++;
      continue;
    }
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"')
        j++;
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
    } else if (line[i] === "[") {
      let j = i + 1;
      while (j < line.length && line[j] !== "]")
        j++;
      if (j >= line.length)
        throw Error(`Unclosed array literal in line: ${line}`);
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
    } else {
      let j = i;
      while (j < line.length && line[j] !== " ")
        j++;
      tokens.push(line.slice(i, j));
      i = j;
    }
  }
  return tokens;
}
function parseArgument(arg) {
  if (arg.startsWith('"') && arg.endsWith('"'))
    return { type: 10 /* STRING */, value: arg.slice(1, -1) };
  if (arg.startsWith("[") && arg.endsWith("]")) {
    const inner = arg.slice(1, -1).trim();
    if (inner.length === 0)
      throw Error(`Empty array literal not allowed: ${arg}`);
    const elements = inner.split(",").map((s) => parseInt(s.trim()));
    if (elements.some(isNaN))
      throw Error(`Invalid array literal: ${arg}`);
    return { type: 11 /* ARRAY */, value: elements };
  }
  if (arg.startsWith("r"))
    return { type: 1 /* REGISTER */, value: parseInt(arg.slice(1)) };
  if (arg.startsWith("x"))
    return { type: 2 /* MACHINE */, value: parseInt(arg.slice(1)) };
  if (arg === "==")
    return { type: 3 /* EQUAL */, value: 0 };
  if (arg === "!=")
    return { type: 4 /* NOTEQUAL */, value: 0 };
  if (arg === "<")
    return { type: 5 /* LESS */, value: 0 };
  if (arg === ">")
    return { type: 6 /* GREATER */, value: 0 };
  if (arg === "<=")
    return { type: 7 /* LESSEQUAL */, value: 0 };
  if (arg === ">=")
    return { type: 8 /* GREATEQUAL */, value: 0 };
  return { type: 0 /* LITERAL */, value: parseInt(arg) };
}
function buildInstruction(operation, tokens, line, peripheralName) {
  const argArr = [];
  for (let i = 1;i < tokens.length; i++) {
    if (tokens[i] !== ">>" && tokens[i] !== "ELSE")
      argArr.push(parseArgument(tokens[i]));
  }
  return { operation, arguments: argArr, line, peripheralName };
}

class VM3 {
  outputBuffer = [];
  instructions = [];
  callStack;
  stackPointer = 0;
  activeInstructionPos = 0;
  registerMemoryLimit;
  machineMemoryLimit;
  callStackLimit;
  heapLimit;
  registerMemory;
  machineMemory;
  runFastFlag = false;
  peripherals = new Map;
  constructor(registerMemoryLimit, machineMemoryLimit, callStackLimit, heapLimit) {
    this.registerMemoryLimit = registerMemoryLimit;
    this.machineMemoryLimit = machineMemoryLimit;
    this.callStackLimit = callStackLimit;
    this.heapLimit = heapLimit;
    this.registerMemory = Array.from({ length: registerMemoryLimit }, () => ({
      tag: "int",
      data: 0
    }));
    this.machineMemory = Array.from({ length: machineMemoryLimit }, () => ({
      tag: "int",
      data: 0
    }));
    this.callStack = new Int16Array(callStackLimit).fill(0);
  }
  registerPeripheral(name, handler) {
    this.peripherals.set(name, handler);
  }
  unregisterPeripheral(name) {
    this.peripherals.delete(name);
  }
  totalHeapUsed() {
    return this.registerMemory.reduce((sum, v) => sum + byteSize(v), 0) + this.machineMemory.reduce((sum, v) => sum + byteSize(v), 0);
  }
  heapUsed() {
    return this.totalHeapUsed();
  }
  heapAvailable() {
    return this.heapLimit - this.totalHeapUsed();
  }
  setMemory(data, dest) {
    if (dest.type === 1 /* REGISTER */) {
      const idx = dest.value;
      if (idx >= this.registerMemoryLimit || idx < 0)
        throw Error("Outside register memory bounds!");
      this._writeSlot(this.registerMemory, idx, data);
    } else if (dest.type === 2 /* MACHINE */) {
      const idx = dest.value;
      if (idx >= this.machineMemoryLimit || idx < 0)
        throw Error("Outside machine memory bounds!");
      this._writeSlot(this.machineMemory, idx, data);
    } else {
      throw Error(dest.type === 0 /* LITERAL */ ? `Memory destination cannot be a LITERAL at line: ${this.activeInstructionPos + 1}` : `Illegal memory destination at line: ${this.activeInstructionPos + 1}`);
    }
  }
  _writeSlot(mem, idx, data) {
    const newVal = typeof data === "string" ? { tag: "string", data } : Array.isArray(data) ? { tag: "array", data } : { tag: "int", data };
    const delta = byteSize(newVal) - byteSize(mem[idx]);
    if (this.totalHeapUsed() + delta > this.heapLimit) {
      throw Error(`Heap overflow! Need ${delta} more bytes but only ${this.heapAvailable()} available.`);
    }
    mem[idx] = newVal;
  }
  fetchValue(arg) {
    if (arg.type === 0 /* LITERAL */)
      return arg.value;
    if (arg.type === 10 /* STRING */)
      return arg.value;
    if (arg.type === 11 /* ARRAY */)
      return arg.value;
    if (arg.type === 1 /* REGISTER */) {
      const idx = arg.value;
      if (idx >= this.registerMemoryLimit || idx < 0)
        throw Error("Outside register memory bounds!");
      return this.registerMemory[idx].data;
    }
    if (arg.type === 2 /* MACHINE */) {
      const idx = arg.value;
      if (idx >= this.machineMemoryLimit || idx < 0)
        throw Error("Outside machine memory bounds!");
      return this.machineMemory[idx].data;
    }
    throw Error(`Empty or illegal memory fetch at line: ${this.activeInstructionPos + 1}`);
  }
  fetchMemory(arg) {
    const v = this.fetchValue(arg);
    if (typeof v === "string") {
      throw Error(`Expected number but got string "${v}" at line: ${this.activeInstructionPos + 1}`);
    }
    if (Array.isArray(v)) {
      throw Error(`Expected number but got array at line: ${this.activeInstructionPos + 1}`);
    }
    return v;
  }
  pushCallStack(returnAddr) {
    if (this.stackPointer >= this.callStackLimit)
      throw Error("Stack overflow!");
    this.callStack[this.stackPointer++] = returnAddr;
  }
  popCallStack() {
    if (this.stackPointer <= 0)
      throw Error("Stack underflow!");
    return this.callStack[--this.stackPointer];
  }
  saveState() {
    return [
      this.activeInstructionPos,
      JSON.stringify(this.registerMemory),
      JSON.stringify(this.machineMemory),
      Array.from(this.callStack.slice(0, this.stackPointer)).join(","),
      JSON.stringify(this.outputBuffer),
      JSON.stringify(this.instructions)
    ].join("|");
  }
  loadState(state) {
    const parts = [];
    let remaining = state;
    for (let i = 0;i < 5; i++) {
      const idx = remaining.indexOf("|");
      if (idx === -1)
        throw Error("Invalid savestate format");
      parts.push(remaining.slice(0, idx));
      remaining = remaining.slice(idx + 1);
    }
    parts.push(remaining);
    if (parts.length !== 6)
      throw Error("Invalid savestate format");
    this.activeInstructionPos = parseInt(parts[0]);
    this.registerMemory = JSON.parse(parts[1]);
    this.machineMemory = JSON.parse(parts[2]);
    this.callStack.fill(0);
    this.stackPointer = 0;
    if (parts[3]) {
      const vals = parts[3].split(",").map(Number);
      this.stackPointer = vals.length;
      vals.forEach((v, i) => this.callStack[i] = v);
    }
    this.outputBuffer = JSON.parse(parts[4]);
    this.instructions = JSON.parse(parts[5]);
  }
  resolveVariables(source) {
    const vars = new Map;
    let autoCounter = 0;
    const output = [];
    for (const line of source.split(`
`)) {
      const trimmed = line.trimStart();
      const decl = trimmed.match(/^\$(\w+)\s*=\s*(\S+)$/);
      if (decl) {
        const varName = `$${decl[1]}`;
        const target = decl[2];
        if (target === "auto") {
          vars.set(varName, `r${autoCounter++}`);
        } else {
          vars.set(varName, target);
          if (target.startsWith("r")) {
            const idx = parseInt(target.slice(1));
            if (!isNaN(idx) && idx >= autoCounter)
              autoCounter = idx + 1;
          }
        }
        continue;
      }
      let resolved = trimmed;
      const sorted = [...vars.entries()].sort((a, b) => b[0].length - a[0].length);
      for (const [name, reg] of sorted)
        resolved = resolved.replaceAll(name, reg);
      output.push(resolved);
    }
    return output.join(`
`);
  }
  *compile(source) {
    const code = this.resolveVariables(source);
    const sanitized = [];
    for (const raw of code.split(`
`)) {
      const trimmed = raw.trimStart();
      if (!trimmed || trimmed.startsWith("//"))
        continue;
      sanitized.push(trimmed);
    }
    const pointMemory = new Map;
    for (let i = 0;i < sanitized.length; i++) {
      const toks = tokenize(sanitized[i]);
      if (toks[0] === "POINT")
        pointMemory.set(toks[1], i);
    }
    const resolveLabel = (label) => {
      const idx = pointMemory.get(label);
      if (idx === undefined)
        throw Error(`Undefined label: "${label}"`);
      return idx.toString();
    };
    for (let i = 0;i < sanitized.length; i++) {
      let toks = tokenize(sanitized[i]);
      const opcode = toks[0];
      const resolveAt = (tokenIdx) => {
        toks = [...toks];
        toks[tokenIdx] = resolveLabel(toks[tokenIdx]);
      };
      let instruction = null;
      switch (opcode) {
        case "SET":
          instruction = buildInstruction(0 /* SET */, toks, i);
          break;
        case "ADD":
          instruction = buildInstruction(1 /* ADD */, toks, i);
          break;
        case "SUB":
          instruction = buildInstruction(2 /* SUB */, toks, i);
          break;
        case "PRINT":
          instruction = buildInstruction(3 /* PRINT */, toks, i);
          break;
        case "JUMP":
          resolveAt(1);
          instruction = buildInstruction(4 /* JUMP */, toks, i);
          break;
        case "POINT":
          resolveAt(1);
          instruction = buildInstruction(5 /* POINT */, toks, i);
          break;
        case "CALL":
          resolveAt(1);
          instruction = buildInstruction(21 /* CALL */, toks, i);
          break;
        case "IF":
          resolveAt(5);
          if (toks[6] === "ELSE") {
            if (toks.length < 8)
              throw Error(`Missing label after ELSE at line ${i}`);
            resolveAt(7);
            toks = toks.filter((_, idx) => idx !== 6);
          }
          instruction = buildInstruction(6 /* IF */, toks, i);
          break;
        case "MUL":
          instruction = buildInstruction(7 /* MUL */, toks, i);
          break;
        case "DIV":
          instruction = buildInstruction(8 /* DIV */, toks, i);
          break;
        case "MOD":
          instruction = buildInstruction(9 /* MOD */, toks, i);
          break;
        case "SQRT":
          instruction = buildInstruction(10 /* SQRT */, toks, i);
          break;
        case "POW":
          instruction = buildInstruction(11 /* POW */, toks, i);
          break;
        case "ABS":
          instruction = buildInstruction(12 /* ABS */, toks, i);
          break;
        case "MIN":
          instruction = buildInstruction(13 /* MIN */, toks, i);
          break;
        case "MAX":
          instruction = buildInstruction(14 /* MAX */, toks, i);
          break;
        case "INC":
          instruction = buildInstruction(15 /* INC */, toks, i);
          break;
        case "DEC":
          instruction = buildInstruction(16 /* DEC */, toks, i);
          break;
        case "RNG":
          instruction = buildInstruction(17 /* RNG */, toks, i);
          break;
        case "NOP":
          instruction = buildInstruction(18 /* NOP */, toks, i);
          break;
        case "HALT":
          instruction = buildInstruction(19 /* HALT */, toks, i);
          break;
        case "UNTIL":
          instruction = buildInstruction(20 /* UNTIL */, toks, i);
          break;
        case "RET":
          instruction = buildInstruction(22 /* RET */, toks, i);
          break;
        case "ARR_NEW":
          instruction = buildInstruction(23 /* ARR_NEW */, toks, i);
          break;
        case "ARR_PUSH":
          instruction = buildInstruction(24 /* ARR_PUSH */, toks, i);
          break;
        case "ARR_POP":
          instruction = buildInstruction(25 /* ARR_POP */, toks, i);
          break;
        case "ARR_GET":
          instruction = buildInstruction(26 /* ARR_GET */, toks, i);
          break;
        case "ARR_SET":
          instruction = buildInstruction(27 /* ARR_SET */, toks, i);
          break;
        case "ARR_LEN":
          instruction = buildInstruction(28 /* ARR_LEN */, toks, i);
          break;
        case "ARR_SORT":
          instruction = buildInstruction(29 /* ARR_SORT */, toks, i);
          break;
        default:
          if (this.peripherals.has(opcode)) {
            instruction = buildInstruction(30 /* PERIPHERAL */, toks, i, opcode);
          } else {
            throw Error(`Unknown OpCode "${opcode}" at line ${i}`);
          }
      }
      this.instructions.push(instruction);
      yield instruction;
    }
  }
  *run() {
    while (this.activeInstructionPos < this.instructions.length) {
      let ipModified = false;
      this.outputBuffer = [];
      const instr = this.instructions[this.activeInstructionPos];
      switch (instr.operation) {
        case 0 /* SET */:
          handleSet(this, instr);
          break;
        case 3 /* PRINT */:
          handlePrint(this, instr);
          break;
        case 1 /* ADD */:
          handleAdd(this, instr);
          break;
        case 2 /* SUB */:
          handleSub(this, instr);
          break;
        case 4 /* JUMP */:
          this.activeInstructionPos = instr.arguments[0].value;
          ipModified = true;
          break;
        case 5 /* POINT */:
          break;
        case 6 /* IF */:
          if (handleIf(this, instr)) {
            this.activeInstructionPos = instr.arguments[3].value;
            ipModified = true;
          } else if (instr.arguments[4]) {
            this.activeInstructionPos = instr.arguments[4].value;
            ipModified = true;
          }
          break;
        case 19 /* HALT */:
          return;
        case 18 /* NOP */:
          break;
        case 7 /* MUL */:
          handleMul(this, instr);
          break;
        case 8 /* DIV */:
          handleDiv(this, instr);
          break;
        case 9 /* MOD */:
          handleMod(this, instr);
          break;
        case 10 /* SQRT */:
          handleSqrt(this, instr);
          break;
        case 11 /* POW */:
          handlePow(this, instr);
          break;
        case 12 /* ABS */:
          handleAbs(this, instr);
          break;
        case 13 /* MIN */:
          handleMin(this, instr);
          break;
        case 14 /* MAX */:
          handleMax(this, instr);
          break;
        case 15 /* INC */:
          handleInc(this, instr);
          break;
        case 16 /* DEC */:
          handleDec(this, instr);
          break;
        case 17 /* RNG */:
          handleRng(this, instr);
          break;
        case 20 /* UNTIL */:
          if (!handleIf(this, instr))
            ipModified = true;
          break;
        case 21 /* CALL */:
          this.pushCallStack(this.activeInstructionPos + 1);
          this.activeInstructionPos = instr.arguments[0].value;
          ipModified = true;
          break;
        case 22 /* RET */:
          this.activeInstructionPos = this.popCallStack();
          ipModified = true;
          break;
        case 23 /* ARR_NEW */:
          handleArrNew(this, instr);
          break;
        case 24 /* ARR_PUSH */:
          handleArrPush(this, instr);
          break;
        case 25 /* ARR_POP */:
          handleArrPop(this, instr);
          break;
        case 26 /* ARR_GET */:
          handleArrGet(this, instr);
          break;
        case 27 /* ARR_SET */:
          handleArrSet(this, instr);
          break;
        case 28 /* ARR_LEN */:
          handleArrLen(this, instr);
          break;
        case 29 /* ARR_SORT */:
          handleArrSort(this, instr);
          break;
        case 30 /* PERIPHERAL */: {
          const handler = this.peripherals.get(instr.peripheralName);
          if (!handler)
            throw Error(`No handler registered for: "${instr.peripheralName}"`);
          handler(this, instr.arguments);
          break;
        }
        default:
          throw Error(`Unknown OpCode: ${instr.operation}`);
      }
      if (!this.runFastFlag)
        yield;
      if (!ipModified)
        this.activeInstructionPos++;
    }
  }
}
export {
  VM3 as VM,
  OpCode,
  ArgType
};
