// Example1/js/circuit/circuitStats.js
// 简化版本，灵感来源于 Quirk-master/src/circuit/CircuitStats.js
// 该类用于存储和计算量子线路模拟结束后的统计信息，如最终状态、概率等。

class CircuitStats {
  /**
   * 构造函数
   * @param {CircuitDefinition} circuitDefinition - 对应的量子线路定义。
   * @param {Matrix} finalStateVector - 一个列向量，表示模拟结束时的最终量子态。
   */
  constructor(circuitDefinition, finalStateVector) {
    this.circuitDefinition = circuitDefinition; //
    this.finalState = finalStateVector; // 最终状态向量 (应为一个列向量)

    // 验证 finalStateVector 的有效性
    if (
      !finalStateVector || // finalStateVector 不存在
      finalStateVector.width !== 1 || // 不是列向量
      // 状态向量的高度应为 2^numQubits
      finalStateVector.height !== 1 << circuitDefinition.numQubits //
    ) {
      console.warn(
        "CircuitStats: finalStateVector is invalid or not provided. Defaulting to |0...0> state."
      );
      // 如果最终状态无效，则默认初始化为 |0...0⟩ 态
      const numQubits = circuitDefinition.numQubits; //
      const numStates = numQubits > 0 ? 1 << numQubits : 1; // 状态总数 (处理0量子比特情况)
      const buffer = new Float32Array(numStates * 2); // 复数数组，每个复数占2个float
      if (numStates > 0) {
        buffer[0] = 1; // |0...0⟩ 态的第一个振幅 (实部) 为1，其余为0
      }
      this.finalState = new Matrix(1, numStates, buffer); //
    }
  }

  /**
   * 计算测量到每个计算基态的概率。
   * @returns {number[]} 一个概率数组，索引对应于计算基态的十进制表示。
   */
  probabilities() {
    const numQubits = this.circuitDefinition.numQubits; //
    if (numQubits === 0) return [1]; // 0量子比特特殊情况，概率为1 (只有一个状态)

    const numStates = 1 << numQubits; // 计算基态总数
    const probs = new Array(numStates).fill(0); // 初始化概率数组
    for (let i = 0; i < numStates; i++) {
      // 从状态向量中获取第i个基态的振幅 (列向量，所以列索引为0，行索引为i)
      const amplitude = this.finalState.cell(0, i); //
      probs[i] = amplitude.norm2(); // 概率是振幅的模平方
    }
    return probs;
  }

  /**
   * 计算每个量子比特测量到 |0⟩ 或 |1⟩ 的边缘概率。
   * @returns {Array<Array<number>>} 一个二维数组，每个内部数组为 [P(|0⟩), P(|1⟩)]，对应一个量子比特。
   * 示例: [[P(q0=0), P(q0=1)], [P(q1=0), P(q1=1)], ...]
   */
  marginalProbabilitiesPerQubit() {
    const numQubits = this.circuitDefinition.numQubits; //
    if (numQubits === 0) return []; // 0量子比特情况

    const systemProbabilities = this.probabilities(); // 获取整个系统的概率分布
    const marginals = []; // 存储边缘概率的数组

    // 遍历每个量子比特
    for (let q = 0; q < numQubits; q++) {
      let prob0 = 0; // 测量到 |0⟩ 的概率
      let prob1 = 0; // 测量到 |1⟩ 的概率
      // 遍历所有系统基态
      for (let i = 0; i < systemProbabilities.length; i++) {
        // 检查第 q 个量子比特在基态 i 中的值 (0 或 1)
        // (i >> q) & 1) 用于获取整数 i 的二进制表示中第 q 位的值
        if (!((i >> q) & 1)) {
          // 如果第 q 个量子比特是 0
          prob0 += systemProbabilities[i];
        } else {
          // 如果第 q 个量子比特是 1
          prob1 += systemProbabilities[i];
        }
      }
      marginals.push([prob0, prob1]); // 添加该量子比特的边缘概率
    }
    return marginals;
  }

  /**
   * 计算指定量子比特的约化密度矩阵。
   * 假设其他量子比特被追踪掉 (traced out)。
   * @param {number} qubitIndex - 量子比特的索引 (从 LSB 0 开始计数)。
   * @returns {Matrix} 一个2x2的密度矩阵。
   */
  densityMatrix(qubitIndex) {
    // 检查量子比特索引是否有效
    if (qubitIndex < 0 || qubitIndex >= this.circuitDefinition.numQubits) {
      //
      throw new Error(
        "Qubit index out of range for density matrix calculation."
      );
    }
    // 处理0量子比特情况：通常布洛赫球期望一个2x2密度矩阵。
    // 返回一个默认的 |0⟩ 态密度矩阵。
    if (this.circuitDefinition.numQubits === 0) {
      //
      return Matrix.square(
        //
        Complex.ONE, //
        Complex.ZERO, //
        Complex.ZERO, //
        Complex.ZERO //
      );
    }

    const numQubits = this.circuitDefinition.numQubits; //
    const numStates = 1 << numQubits; // 系统状态总数

    // 密度矩阵的四个元素: rho_00, rho_01, rho_10, rho_11
    const rhoElements = [
      Complex.ZERO, //
      Complex.ZERO, //
      Complex.ZERO, //
      Complex.ZERO, //
    ];

    // 计算对角元素 rho_00 和 rho_11
    // rho_00 = sum_{i where qubitIndex-th bit is 0} |amplitude_i|^2
    // rho_11 = sum_{i where qubitIndex-th bit is 1} |amplitude_i|^2
    for (let i = 0; i < numStates; i++) {
      const amplitude_i = this.finalState.cell(0, i); // 获取基态i的振幅
      if (amplitude_i.isEqualTo(Complex.ZERO)) continue; // 如果振幅为0，则跳过

      const qubit_i_is_0 = ((i >> qubitIndex) & 1) === 0; // 判断基态i中第qubitIndex位是否为0

      if (qubit_i_is_0) {
        // 如果是0
        rhoElements[0] = rhoElements[0].plus(
          //
          amplitude_i.times(amplitude_i.conjugate()) // 加上 |amplitude_i|^2
        );
      } else {
        // 如果是1
        rhoElements[3] = rhoElements[3].plus(
          //
          amplitude_i.times(amplitude_i.conjugate()) //
        );
      }
    }

    // 计算非对角元素 rho_01
    // rho_01 = sum_{i where qubitIndex-th bit is 0} amplitude_i * (amplitude_j)*
    // 其中 j 是 i 将第 qubitIndex 位翻转后的状态。
    rhoElements[1] = Complex.ZERO; // 重置以确保清晰
    for (let i = 0; i < numStates; i++) {
      // 检查基态 i 中第 qubitIndex 位的量子比特是否为 |0⟩
      if (!((i >> qubitIndex) & 1)) {
        // 如果第 qubitIndex 位是 0
        const amplitude_i_q0 = this.finalState.cell(0, i); // 获取 |...0...⟩ 形式的振幅
        if (amplitude_i_q0.isEqualTo(Complex.ZERO)) continue; //

        // 构建状态 j，它与 i 相同，但在 qubitIndex 位的量子比特翻转为 |1⟩
        const j = i | (1 << qubitIndex); // 使用位或操作将第 qubitIndex 位置1
        const amplitude_j_q1 = this.finalState.cell(0, j); // 获取 |...1...⟩ 形式的振幅

        rhoElements[1] = rhoElements[1].plus(
          //
          amplitude_i_q0.times(amplitude_j_q1.conjugate()) // 累加 amplitude_i * (amplitude_j)*
        );
      }
    }
    rhoElements[2] = rhoElements[1].conjugate(); // rho_10 = (rho_01)*

    // 构建并返回2x2密度矩阵
    return Matrix.square(
      //
      rhoElements[0],
      rhoElements[1],
      rhoElements[2],
      rhoElements[3]
    );
  }

  /**
   * 将单个量子比特的密度矩阵转换为其布洛赫向量 (x, y, z)。
   * 布洛赫向量 (x, y, z) 由密度矩阵 ρ 计算：
   * x = ρ_10 + ρ_01 = 2 * Re(ρ_01)
   * y = i * (ρ_10 - ρ_01) = 2 * Im(ρ_01)
   * z = ρ_00 - ρ_11
   * 注意：这里使用的 ρ_01 是矩阵的 (0,1) 元素，ρ_10 是 (1,0) 元素。
   * Quirk的Bloch vector x,y,z映射关系:
   * x = Tr(rho sigma_x)
   * y = Tr(rho sigma_y)
   * z = Tr(rho sigma_z)
   * 如果 rho = [[a, b], [c, d]],
   * x = c + b
   * y = i(c - b)
   * z = a - d
   * 代码中的 cell(row, col) -> cell(1,0) 是 c (ρ_10), cell(0,1) 是 b (ρ_01).
   * 所以 x_code = rho.cell(1,0).real + rho.cell(0,1).real (如果它们是共轭的，就是 2*Re(rho_01))
   * y_code = (rho.cell(1,0).minus(rho.cell(0,1))).times(Complex.I).real
   * z_code = rho.cell(0,0).real - rho.cell(1,1).real
   *
   * @param {number} qubitIndex - 量子比特的索引。
   * @returns {{x: number, y: number, z: number}} 布洛赫球上的坐标 (x, y, z)。
   */
  blochVector(qubitIndex) {
    const rho = this.densityMatrix(qubitIndex); // 获取该量子比特的密度矩阵
    const rho00 = rho.cell(0, 0).real; //
    const rho11 = rho.cell(1, 1).real; //
    // 注意：在标准的密度矩阵表示中，ρ_01 通常指第0行第1列的元素。
    // 而这里 cell(col, row) 或 cell(row, col) 的约定需要明确。
    // 假设 cell(col, row):
    // const rho01 = rho.cell(1, 0); // 对应元素 ρ_01 (第0行，第1列) - Quirk的Matrix是cell(col,row)
    // const rho10 = rho.cell(0, 1); // 对应元素 ρ_10 (第1行，第0列)
    // 假设 cell(row, col) 如同标准的数学表示法:
    const rho_01_element = rho.cell(0, 1); // ρ_{0,1} (第0行, 第1列)
    const rho_10_element = rho.cell(1, 0); // ρ_{1,0} (第1行, 第0列)

    // 根据标准公式 x = Tr(ρσ_x), y = Tr(ρσ_y), z = Tr(ρσ_z)
    // x = ρ_01 + ρ_10
    // y = i(ρ_10 - ρ_01)
    // z = ρ_00 - ρ_11
    // 如果矩阵是对称的 (ρ_01 = ρ_10^*), 且x,y,z为实数:
    // x = 2 * Re(ρ_01)
    // y = 2 * Im(ρ_01) (如果用 ρ_01 定义 y = -2 Im(ρ_10))
    // 或者 y = -2 * Im(ρ_01)  (如果用 ρ_10 定义 y = 2 Im(ρ_10)) - 需确认符号约定

    // Quirk 的实现 (src/simulators/DensityMatrixSimulator.js, densityMatrixToBlochVector)
    // x = (ρ[0][1] + ρ[1][0]).real
    // y = (ρ[0][1] - ρ[1][0]).imag  <-- 注意这里的符号和虚部，这暗示了 y = -Tr(ρ iσ_y) 或类似的变体
    // z = (ρ[0][0] - ρ[1][1]).real

    // 提供的代码中的实现：
    // const x = rho01.plus(rho10).real; //  (ρ_01 + ρ_10).real
    // const y = rho10.minus(rho01).times(Complex.I).real; // i * (ρ_10 - ρ_01).real
    // const z = rho00 - rho11;
    // 此处 x,y,z 的计算与标准 Bloch 向量公式一致
    // x = (ρ_01 + ρ_10).real  (如果 ρ_10 = ρ_01^*,  则 x = 2 * Re(ρ_01) )
    // y = ( i * (ρ_10 - ρ_01) ).real (如果 ρ_10 = ρ_01^*,  设 ρ_01 = a+bi, ρ_10 = a-bi,
    //                                 i * (a-bi - (a+bi)) = i * (-2bi) = 2b = 2 * Im(ρ_01) )
    // z = ρ_00 - ρ_11
    // 因此，代码中的 `rho01` 变量名指的是 ρ_10 元素，而 `rho10` 指的是 ρ_01 元素。
    // 为了清晰，我们用 rho_01_element 和 rho_10_element。

    const x = rho_01_element.plus(rho_10_element).real; // (ρ_01 + ρ_10).real
    const y = rho_10_element.minus(rho_01_element).times(Complex.I).real; // (i * (ρ_10 - ρ_01)).real
    const z = rho00 - rho11;

    return { x, y, z };
  }

  /**
   * 创建一个对应于空电路 (默认初始状态 |0...0⟩) 的CircuitStats对象。
   * @param {CircuitDefinition} circuitDefinition - 量子线路定义。
   * @returns {CircuitStats} 新的CircuitStats对象。
   */
  static forEmptyCircuit(circuitDefinition) {
    const numQubits = circuitDefinition.numQubits; //
    const numStates = numQubits > 0 ? 1 << numQubits : 1; // 系统状态数
    const buffer = new Float32Array(numStates * 2); // 复数数组
    if (numQubits > 0) {
      buffer[0] = 1; // |0...0⟩ 态：第一个振幅为 1+0i
    } else if (numQubits === 0) {
      // 0量子比特情况
      buffer[0] = 1; // 标量 1
    }

    const initialStateVector = new Matrix(1, numStates, buffer); //
    return new CircuitStats(circuitDefinition, initialStateVector); //
  }
}
