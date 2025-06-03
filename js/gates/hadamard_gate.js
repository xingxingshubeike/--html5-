// js/gates/hadamard_gate.js
// 定义Hadamard门。

// Hadamard门 (H门)
const Hadamard = new GateBuilder() //
  .setSymbol("H") // 设置显示符号
  .setName("Hadamard") // 设置名称
  .setBlurb("Creates superposition") // 设置描述：创建叠加态
  .setMatrix(Matrix.HADAMARD) // 设置Hadamard矩阵
  .build(); // 构建门对象

// 存储Hadamard门定义的集合
const GATE_DEFINITIONS_HADAMARD = {
  H: Hadamard, // 键名为 "H"
};
