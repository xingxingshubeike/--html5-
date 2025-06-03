// js/gates/control_gates.js
// 定义控制门符号，如 ● (控制) 和 ○ (反控制)。

// 控制门符号 (●)
const Control = new GateBuilder() //
  .setSymbol("●") // 设置显示符号
  .setName("Control") // 设置名称
  .setBlurb("Conditions on this qubit being |1⟩") // 设置描述：当此量子比特为|1⟩时触发
  .markAsControlGate() // 标记为控制门符号
  .build(); // 构建门对象

// 反控制门符号 (○)
const AntiControl = new GateBuilder() //
  .setSymbol("○") // 设置显示符号
  .setName("Anti-Control") // 设置名称
  .setBlurb("Conditions on this qubit being |0⟩") // 设置描述：当此量子比特为|0⟩时触发
  .markAsControlGate() // 标记为控制门符号
  .build(); // 构建门对象

// CNOT门在概念上是一个“复合”门，
// 在UI中通过放置一个Control (●) 和一个X门来构建。
// 对于工具箱，我们可能会提供一个CNOT模板或通过特定逻辑处理。
// 目前，我们只定义控制符号。
// 一个完整的CNOT操作矩阵如下：
// const CNOT_MATRIX = Matrix.square( //
//     1, 0, 0, 0,
//     0, 1, 0, 0,
//     0, 0, 0, 1,
//     0, 0, 1, 0
// );
// 我们不在这里将其分配给单个工具箱门，因为它是构造出来的。

// 存储控制门定义的集合
const GATE_DEFINITIONS_CONTROL = {
  Control: Control, // 键名为 "Control"，值为上面定义的 Control 对象
  AntiControl: AntiControl, // 键名为 "AntiControl"，值为上面定义的 AntiControl 对象
  // CNOT: CnotGate (如果我们要将其作为单个工具箱项)
};
