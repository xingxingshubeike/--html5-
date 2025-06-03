// Simplified Gate class and GateBuilder inspired by Quirk
// Source: Adapted from Quirk-master/src/circuit/Gate.js
// 定义量子门及其构建器。

class Gate {
  constructor() {
    // 门的基本属性
    this.symbol = ""; // 在绘制门时显示的文本符号 (例如 "H", "X", "●")
    this.name = ""; // 门的名称 (例如 "Hadamard Gate"，用于工具提示标题)
    this.blurb = ""; // 门的简短描述 (例如 "Creates superposition"，用于工具提示详情)
    this.matrix = null; // 门的操作矩阵 (Matrix对象)
    this.width = 1; // 门在电路上跨越的列数 (通常为1)
    this.height = 1; // 门在电路上跨越的线路数 (即作用的量子比特数)
    this.id = ""; // 门的唯一标识符，用于序列化和调色板中的键

    // 门的可选高级属性
    this.customDrawer = null; // 可选的自定义绘制函数 (替代标准符号绘制)
    this.controls = null; // 如果这是一个控制门的部分 (例如CNOT的目标X门)，这里可以存储Controls对象信息
    this.param = undefined; // 可选参数，用于参数化门 (例如旋转门的旋转角度)

    // 内部状态标志
    this._isDisplayGate = false; // 如果为true，此门用于可视化状态而不是改变状态 (例如振幅显示器)
    this._isControlGate = false; // 如果为true，此门是一个控制符号 (例如 ● 或 ○)

    // 新增属性 (用于时间依赖的门)
    this.isTimeDependent = false; // 标记此门是否是时间依赖的
    this.matrixGenerator = null; // 一个函数 (t) => Matrix，用于为时间依赖的门生成矩阵
  }

  /**
   * 获取门是否为显示门。
   * @returns {boolean}
   */
  get isDisplayGate() {
    return this._isDisplayGate;
  }

  /**
   * 获取门是否为控制符号。
   * @returns {boolean}
   */
  get isControlGate() {
    return this._isControlGate;
  }

  /**
   * 将门的作用应用于状态向量 (基础实现)。
   * 这个方法在完整的电路模拟器 (Circuit.js 或 simulator.js) 中会被扩展。
   * @param {Matrix} stateVector - 当前的量子态向量。
   * @returns {Matrix} 应用门操作后的新状态向量。
   */
  applyToState(stateVector) {
    if (!this.matrix) {
      // 如果门没有定义矩阵
      console.warn(`Gate ${this.name} has no matrix to apply.`);
      return stateVector; // 返回原状态
    }
    // 这是一个占位符实现。实际应用需要考虑门的高度 (作用的量子比特数)
    // 以及它在更大的状态向量中具体作用于哪些量子比特。
    // 对于单量子比特门作用于单量子比特状态的简单情况：
    if (
      this.height === 1 && // 门作用于1个量子比特
      stateVector.height === 2 && // 状态向量是2维的 (1个量子比特)
      stateVector.width === 1 // 状态向量是列向量
    ) {
      return this.matrix.times(stateVector); // 矩阵乘以向量
    }
    // 对于多量子比特门或作用于更大系统一部分的门，
    // 这里需要更复杂的逻辑 (例如张量积、受控操作等)。
    // console.warn("ApplyToState needs more sophisticated multi-qubit logic for gate:", this.name);
    return stateVector; // 如果不是简单情况，暂时返回原状态
  }

  /**
   * 创建此门的副本。
   * @returns {Gate} 此门的一个新实例副本。
   */
  copy() {
    const newGate = new Gate(); // 创建一个新的Gate实例
    Object.assign(newGate, this); // 复制所有属性，包括新增的属性

    // 深拷贝矩阵 (如果存在且不是时间依赖的，或者为时间依赖门处理初始矩阵)
    if (this.matrix) {
      // 创建一个新的Matrix对象，并复制其buffer内容
      newGate.matrix = new Matrix( //
        this.matrix.width, //
        this.matrix.height, //
        new Float32Array(this.matrix.buffer) //
      );
    }
    // matrixGenerator 是一个函数，所以浅拷贝即可。
    return newGate;
  }
}

// GateBuilder 类，用于链式构建Gate对象。
class GateBuilder {
  constructor() {
    this.gate = new Gate(); // 初始化一个新的Gate对象
  }

  setSymbol(symbol) {
    this.gate.symbol = symbol;
    if (!this.gate.id) this.gate.id = symbol; // 如果ID未设置，则默认使用符号作为ID
    return this; // 返回this以支持链式调用
  }

  setId(id) {
    this.gate.id = id;
    return this;
  }

  setName(name) {
    this.gate.name = name;
    return this;
  }

  setBlurb(blurb) {
    this.gate.blurb = blurb;
    return this;
  }

  setMatrix(matrix) {
    this.gate.matrix = matrix;
    // 如果矩阵存在，并且门的高度仍为默认的1，但矩阵高度大于1，
    // 则尝试根据矩阵大小自动设置门的高度 (假设矩阵是 2^N x 2^N 的)
    if (matrix && this.gate.height === 1 && matrix.height > 1) {
      //
      const numQubits = Math.log2(matrix.height); //
      if (Number.isInteger(numQubits) && numQubits > 0) {
        this.gate.height = numQubits; // 设置门的高度 (作用的量子比特数)
      }
    }
    return this;
  }

  setHeight(height) {
    this.gate.height = height;
    return this;
  }

  setWidth(width) {
    this.gate.width = width;
    return this;
  }

  setCustomDrawer(drawerFunc) {
    this.gate.customDrawer = drawerFunc;
    return this;
  }

  markAsDisplayGate() {
    this.gate._isDisplayGate = true;
    return this;
  }

  markAsControlGate() {
    this.gate._isControlGate = true;
    return this;
  }

  // 新增方法：标记门是否为时间依赖的
  markAsTimeDependent(isTD) {
    this.gate.isTimeDependent = isTD;
    return this;
  }

  // 新增方法：设置时间依赖门的矩阵生成函数
  setMatrixGenerator(generatorFn) {
    this.gate.matrixGenerator = generatorFn;
    return this;
  }

  setParam(param) {
    this.gate.param = param;
    return this;
  }

  /**
   * 构建并返回配置好的Gate对象。
   * @returns {Gate}
   */
  build() {
    // 如果ID仍未设置，则基于符号或随机生成一个ID
    if (!this.gate.id) {
      this.gate.id =
        this.gate.symbol || `gate-${Math.random().toString(36).substr(2, 9)}`;
    }
    // 如果是时间依赖的门，并且有矩阵生成函数，但初始矩阵尚未设置，
    // 则生成 t=0 时的初始矩阵。
    if (
      this.gate.isTimeDependent &&
      this.gate.matrixGenerator &&
      !this.gate.matrix
    ) {
      this.gate.matrix = this.gate.matrixGenerator(0); // 使用 t=0 生成初始矩阵
    }
    return this.gate; // 返回构建好的门对象
  }
}
