// js/gates/pauli_gates.js
// 定义Pauli门 (X, Y, Z)。

// Pauli-X 门 (也称为NOT门)
const PauliX = new GateBuilder() //
  .setSymbol("X") // 设置显示符号 (Quirk中使用"+"作为X门符号，这里用"X"更标准，但main.js中是"+")
  // 根据用户提供的 `main.js` 和 `pauli_gates.js` PauliX 的 symbol 是 "+"。
  // 在这里保持文件内容不变，仅添加注释。如果用户希望改为"X"，需修改文件。
  .setName("Pauli X") // 设置名称
  .setBlurb("Bit flip gate (NOT gate)") // 设置描述：比特翻转门 (非门)
  .setMatrix(Matrix.PAULI_X) // 设置Pauli-X矩阵
  .build(); // 构建门对象

// Pauli-Y 门
const PauliY = new GateBuilder() //
  .setSymbol("Y") // 设置显示符号
  .setName("Pauli Y") // 设置名称
  .setBlurb("Bit and phase flip gate") // 设置描述：比特和相位同时翻转门
  .setMatrix(Matrix.PAULI_Y) // 设置Pauli-Y矩阵
  .build(); // 构建门对象

// Pauli-Z 门
const PauliZ = new GateBuilder() //
  .setSymbol("Z") // 设置显示符号
  .setName("Pauli Z") // 设置名称
  .setBlurb("Phase flip gate") // 设置描述：相位翻转门
  .setMatrix(Matrix.PAULI_Z) // 设置Pauli-Z矩阵
  .build(); // 构建门对象

// 存储Pauli门定义的集合
const GATE_DEFINITIONS_PAULI = {
  // 根据 `main.js` 中 gateTypes 的合并顺序以及 `PauliX` 的符号为 "+",
  // 如果希望在工具箱中以 "X" 作为键名并对应 PauliX (符号 "+")，可以这样设置：
  // X: PauliX,
  // 但如果严格按照 PauliX 的 ID (默认为其 symbol "+")，则应为：
  // "+": PauliX, (或者在 GateBuilder 中为 PauliX 设置一个明确的 ID "X")
  // 此处遵循原始文件结构，键名使用门的标准字母。
  X: PauliX, // 键名为 "X"，对应上面定义的PauliX对象 (其符号为"+")
  Y: PauliY, // 键名为 "Y"
  Z: PauliZ, // 键名为 "Z"
};
