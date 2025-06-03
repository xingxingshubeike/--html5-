// Example1/js/gates/identity_gate.js
// 定义单位门 (Identity Gate)。

// 单位门 (I门)
const IdentityGate = new GateBuilder() //
  .setSymbol("I") // 设置显示符号
  .setName("Identity") // 设置名称
  .setBlurb("Identity gate (I). 使量子比特状态保持不变。") // 设置描述，包含中文
  .setMatrix(Matrix.identity(2)) // 设置2x2的单位矩阵
  // 假设 Matrix.identity(2) 创建一个 2x2 的单位矩阵
  .build(); // 构建门对象

// 存储单位门定义的集合
const GATE_DEFINITIONS_IDENTITY = {
  I: IdentityGate, // 键名为 "I"
};
