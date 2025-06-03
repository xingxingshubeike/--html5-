// Example1/js/gates/swap_gate.js
// 定义SWAP门。
// 注意：SWAP门的实际操作逻辑 (交换两个量子比特) 通常在模拟器的列处理中实现，
// 而不是通过单个门的矩阵来完成，因为SWAP门需要知道它作用的两个具体线路。
// 这里定义的Gate对象主要用于UI显示和识别。

const SWAP_Gate = new GateBuilder() //
  .setId("SWAP") // 设置唯一ID为"SWAP"
  .setSymbol("SWAP") // 设置显示符号为"SWAP" (UI上可能会根据情况显示不同文本，例如"X")
  .setName("SWAP Gate") // 设置名称
  .setBlurb(
    // 设置描述
    "Swaps the state of two qubits. Requires two SWAP gates in the same column to activate."
    // 中文：交换两个量子比特的状态。需要在同一列中放置两个SWAP门才能激活。
  )
  // 此处没有定义矩阵 (matrix)，因为SWAP操作是上下文相关的 (依赖于列中其他SWAP门的位置)。
  // 它的操作不是由一个固定的2x2或4x4矩阵简单表示，而是通过模拟器对整列的特殊处理来实现。
  .setHeight(1) // SWAP门在视觉上占据单个线路槽位的高度
  .build(); // 构建门对象

// 存储SWAP门定义的集合
const GATE_DEFINITIONS_SWAP = {
  // 使用ID "SWAP"作为键名，以避免如果符号"X"被其他Pauli门使用时发生冲突。
  SWAP: SWAP_Gate,
};
