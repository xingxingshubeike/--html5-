// Example1/js/gates/identity_gate.js
const IdentityGate = new GateBuilder()
  .setSymbol("I")
  .setName("Identity")
  .setBlurb("Identity gate (I). 使量子比特状态保持不变。")
  .setMatrix(Matrix.identity(2)) // 假设 Matrix.identity(2) 创建一个 2x2 的单位矩阵
  .build();

const GATE_DEFINITIONS_IDENTITY = {
  I: IdentityGate,
};
