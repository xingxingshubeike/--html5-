// js/gates/display_gates.js
// 定义用于显示量子态信息的特殊“门”，它们不改变状态，仅用于可视化。

// 振幅显示器
const AmplitudeDisplay = new GateBuilder() //
  .setSymbol("Amps") // 设置显示符号
  .setName("Amplitude Display") // 设置名称
  .setBlurb("Shows state amplitudes") // 设置描述：显示状态振幅
  .markAsDisplayGate() // 标记为显示门
  .setHeight(1) // 设置默认高度为1个量子比特 (可以被用户调整)
  .build(); // 构建门对象

// 概率显示器
const ProbabilityDisplay = new GateBuilder() //
  .setSymbol("Prob") // 设置显示符号
  .setName("Probability Display") // 设置名称
  .setBlurb("Shows measurement probabilities") // 设置描述：显示测量概率
  .markAsDisplayGate() // 标记为显示门
  .setHeight(1) // 设置默认高度为1个量子比特
  .build(); // 构建门对象

// 布洛赫球显示器
const BlochSphereDisplay = new GateBuilder() //
  .setSymbol("Bloch") // 设置显示符号
  .setName("Bloch Sphere") // 设置名称
  .setBlurb("Displays single qubit state on Bloch sphere") // 设置描述：在布洛赫球上显示单个量子比特的状态
  .markAsDisplayGate() // 标记为显示门
  .setHeight(1) // 设置高度为1个量子比特 (布洛赫球通常针对单个量子比特)
  .build(); // 构建门对象

// 存储显示门定义的集合
const GATE_DEFINITIONS_DISPLAY = {
  Amplitude: AmplitudeDisplay, // 键名为 "Amplitude"
  Probability: ProbabilityDisplay, // 键名为 "Probability"
  Bloch: BlochSphereDisplay, // 键名为 "Bloch"
};
