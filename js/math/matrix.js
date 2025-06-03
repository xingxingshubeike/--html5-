// js/math/matrix.js
// Matrix类，用于表示和操作复数矩阵。
// (包含对现有Matrix类的增加/修改)

class Matrix {
  /**
   * 构造函数
   * @param {number} width - 矩阵的宽度 (列数)。
   * @param {number} height - 矩阵的高度 (行数)。
   * @param {Float32Array} buffer - 存储矩阵元素的扁平化数组。
   * 每个复数元素由两个连续的浮点数表示 (实部, 虚部)。
   * buffer的长度应为 width * height * 2。
   */
  constructor(width, height, buffer) {
    // 验证buffer长度是否与维度匹配
    if (width * height * 2 !== buffer.length) {
      throw new Error(
        `Matrix buffer length (${
          buffer.length
        }) does not match dimensions W:${width} H:${height} (*2=${
          width * height * 2
        }).`
      );
    }
    this.width = width; // 矩阵宽度
    this.height = height; // 矩阵高度
    this.buffer = buffer; // 存储矩阵数据的Float32Array
  }

  /**
   * 获取矩阵指定位置的元素 (复数)。
   * @param {number} col - 列索引 (从0开始)。
   * @param {number} row - 行索引 (从0开始)。
   * @returns {Complex} 对应位置的复数元素。
   * @throws {Error} 如果索引越界。
   */
  cell(col, row) {
    // 检查索引是否越界
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) {
      console.error("Matrix cell out of range.", {
        col,
        row,
        matrixWidth: this.width,
        matrixHeight: this.height,
      });
      throw new Error("Matrix cell out of range.");
    }
    // 计算元素在buffer中的起始位置 (行主序存储)
    const i = (row * this.width + col) * 2; // 每个复数占2个float
    return new Complex(this.buffer[i], this.buffer[i + 1]); //
  }

  /**
   * 创建矩阵的深拷贝副本。
   * @returns {Matrix} 新的Matrix对象副本。
   */
  copy() {
    const newBuffer = new Float32Array(this.buffer); // 复制buffer内容
    return new Matrix(this.width, this.height, newBuffer);
  }

  /**
   * 检查当前矩阵是否与另一个矩阵精确相等。
   * @param {*} other - 要比较的另一个对象。
   * @returns {boolean} 如果相等则返回true。
   */
  isEqualTo(other) {
    if (!(other instanceof Matrix)) return false; // 类型检查
    if (this.width !== other.width || this.height !== other.height)
      return false; // 维度检查
    // buffer长度检查 (理论上维度检查已包含此情况)
    if (this.buffer.length !== other.buffer.length) return false;
    // 逐个比较buffer中的浮点数 (使用容差)
    for (let i = 0; i < this.buffer.length; i++) {
      if (Math.abs(this.buffer[i] - other.buffer[i]) > 1e-9) return false; // 使用一个小的容差值比较浮点数
    }
    return true; // 所有检查通过
  }

  /**
   * 检查当前矩阵是否在给定容差内约等于另一个矩阵。
   * @param {*} other - 要比较的另一个对象。
   * @param {number} epsilon - 容差。
   * @returns {boolean} 如果约等于则返回true。
   */
  isApproximatelyEqualTo(other, epsilon) {
    if (!(other instanceof Matrix)) return false;
    if (this.width !== other.width || this.height !== other.height) {
      console.warn("Matrix dimension mismatch in isApproximatelyEqualTo");
      return false;
    }
    if (this.buffer.length !== other.buffer.length) {
      console.warn("Matrix buffer length mismatch in isApproximatelyEqualTo");
      return false;
    }
    for (let i = 0; i < this.buffer.length; i++) {
      if (Math.abs(this.buffer[i] - other.buffer[i]) > epsilon) return false;
    }
    return true;
  }

  /**
   * 矩阵乘法 (当前矩阵乘以另一个矩阵或标量)。
   * @param {Matrix|number|Complex} other - 要乘以的矩阵或标量。
   * @returns {Matrix} 乘法结果的新矩阵。
   * @throws {Error} 如果参数无效或矩阵维度不兼容。
   */
  times(other) {
    // 情况1: 标量乘法 (乘以数字或复数)
    if (typeof other === "number" || other instanceof Complex) {
      //
      const scalar = Complex.from(other); // 将输入转换为Complex对象
      const newBuffer = new Float32Array(this.buffer.length); // 创建新buffer
      // 遍历原buffer，每个复数元素乘以标量
      for (let i = 0; i < this.buffer.length; i += 2) {
        const val = new Complex(this.buffer[i], this.buffer[i + 1]).times(
          //
          scalar
        );
        newBuffer[i] = val.real; //
        newBuffer[i + 1] = val.imag; //
      }
      return new Matrix(this.width, this.height, newBuffer);
    }

    // 情况2: 矩阵乘法 (当前矩阵 * other矩阵)
    if (!(other instanceof Matrix))
      throw new Error("Invalid argument for Matrix.times"); // 参数类型错误

    // 检查维度兼容性: 当前矩阵的宽度必须等于other矩阵的高度
    if (this.width !== other.height) {
      throw new Error(
        `Matrix dimensions incompatible for multiplication: ${this.width}x${this.height} and ${other.width}x${other.height}`
      );
    }
    // 计算结果矩阵的维度
    const newWidth = other.width;
    const newHeight = this.height;
    const newBuffer = new Float32Array(newWidth * newHeight * 2); // 创建结果矩阵的buffer

    // 执行矩阵乘法
    for (let r = 0; r < newHeight; r++) {
      // 遍历结果矩阵的每一行
      for (let c = 0; c < newWidth; c++) {
        // 遍历结果矩阵的每一列
        let sum = Complex.ZERO; // 初始化当前元素的值 (复数0)
        // 点积计算: sum = this_row[r] * other_col[c]
        for (let k = 0; k < this.width; k++) {
          // this.width是公共维度
          sum = sum.plus(this.cell(k, r).times(other.cell(c, k))); //
        }
        const idx = (r * newWidth + c) * 2; // 计算元素在buffer中的位置
        newBuffer[idx] = sum.real; //
        newBuffer[idx + 1] = sum.imag; //
      }
    }
    return new Matrix(newWidth, newHeight, newBuffer);
  }

  /**
   * 计算矩阵的厄米共轭 (转置并取每个元素的复共轭)。
   * @returns {Matrix} 新的厄米共轭矩阵。
   */
  adjoint() {
    // 结果矩阵的维度是原矩阵的转置维度 (width <-> height)
    const newMatrixBuffer = new Float32Array(this.width * this.height * 2);
    // 遍历原矩阵的每个元素
    for (let r_orig = 0; r_orig < this.height; r_orig++) {
      // 原行索引
      for (let c_orig = 0; c_orig < this.width; c_orig++) {
        // 原列索引
        const val = this.cell(c_orig, r_orig).conjugate(); // 获取元素并取共轭
        // 计算元素在新buffer中的位置 (转置后的位置: r_orig -> new_col, c_orig -> new_row)
        // 新矩阵以 (new_row, new_col) 索引，即 (c_orig, r_orig)
        const newIdx = (c_orig * this.height + r_orig) * 2; // 注意这里是 this.height (新矩阵的宽度)
        newMatrixBuffer[newIdx] = val.real; //
        newMatrixBuffer[newIdx + 1] = val.imag; //
      }
    }
    return new Matrix(this.height, this.width, newMatrixBuffer); // 注意维度交换
  }

  /**
   * 计算矩阵的Frobenius范数的平方 (所有元素模平方的和)。
   * 如果矩阵是向量，这对应于向量的欧几里得范数的平方。
   * @returns {number} 范数的平方。
   */
  norm2() {
    let t = 0;
    // 遍历buffer中的所有复数元素
    for (let i = 0; i < this.buffer.length; i += 2) {
      // 累加每个元素的模平方 (real^2 + imag^2)
      t +=
        this.buffer[i] * this.buffer[i] + // real part squared
        this.buffer[i + 1] * this.buffer[i + 1]; // imag part squared
    }
    return t;
  }

  /**
   * 计算当前矩阵与另一个矩阵的张量积 (Kronecker积)。
   * @param {Matrix} other - 另一个矩阵。
   * @returns {Matrix} 张量积结果的新矩阵。
   */
  tensorProduct(other) {
    // 结果矩阵的维度是 (this.width * other.width) x (this.height * other.height)
    const newWidth = this.width * other.width;
    const newHeight = this.height * other.height;
    const newBuffer = new Float32Array(newWidth * newHeight * 2);

    // A (tensor) B: A的每个元素乘以整个B矩阵，然后将这些子块排列起来
    // 遍历当前矩阵 (A) 的每个元素
    for (let r1 = 0; r1 < this.height; r1++) {
      // A的行
      for (let c1 = 0; c1 < this.width; c1++) {
        // A的列
        const s = this.cell(c1, r1); // A(r1, c1) 元素
        // 遍历另一个矩阵 (B) 的每个元素
        for (let r2 = 0; r2 < other.height; r2++) {
          // B的行
          for (let c2 = 0; c2 < other.width; c2++) {
            // B的列
            const v = s.times(other.cell(c2, r2)); // A(r1,c1) * B(r2,c2)
            // 计算结果元素在最终大矩阵中的位置
            const r = r1 * other.height + r2; // 最终行索引
            const c = c1 * other.width + c2; // 最终列索引
            const idx = (r * newWidth + c) * 2; // 在buffer中的位置
            newBuffer[idx] = v.real; //
            newBuffer[idx + 1] = v.imag; //
          }
        }
      }
    }
    return new Matrix(newWidth, newHeight, newBuffer);
  }

  /**
   * 静态方法，从一系列复数分量创建一个方阵。
   * 分量按行主序提供。
   * @param {...(number|Complex)} complexComponents - 构成方阵的复数元素。
   * @returns {Matrix} 新的方阵。
   * @throws {Error} 如果提供的元素数量不是完全平方数。
   */
  static square(...complexComponents) {
    const n_squared = complexComponents.length;
    const n = Math.sqrt(n_squared); // 方阵的边长
    if (!Number.isInteger(n))
      // 检查元素数量是否为完全平方数
      throw new Error("Need a square number of components for Matrix.square.");

    const buffer = new Float32Array(n_squared * 2); // 创建buffer
    // 填充buffer
    for (let i = 0; i < n_squared; i++) {
      const c = Complex.from(complexComponents[i]); // 将输入转换为Complex对象
      buffer[i * 2] = c.real; //
      buffer[i * 2 + 1] = c.imag; //
    }
    return new Matrix(n, n, buffer); // 创建并返回方阵
  }

  /**
   * 创建一个在多量子比特系统中交换两个指定量子比特状态的SWAP算符。
   * @param {number} q1_engine - 第一个量子比特的索引 (引擎内部使用，通常LSB为0)。
   * @param {number} q2_engine - 第二个量子比特的索引。
   * @param {number} numQubitsSystem - 系统中的总量子比特数。
   * @returns {Matrix} SWAP算符矩阵。
   */
  static swapOperator(q1_engine, q2_engine, numQubitsSystem) {
    // 如果交换的是同一个量子比特，则返回单位矩阵
    if (q1_engine === q2_engine) {
      return Matrix.identity(1 << numQubitsSystem);
    }

    const size = 1 << numQubitsSystem; // 矩阵的维度 (2^N x 2^N)
    const buffer = new Float32Array(size * size * 2).fill(0); // 初始化buffer全为0

    // 确保bit1是较小的索引，bit2是较大的索引
    const bit1 = Math.min(q1_engine, q2_engine);
    const bit2 = Math.max(q1_engine, q2_engine);

    // 遍历所有输入计算基态 |i⟩ (对应算符矩阵的第i列)
    for (let i = 0; i < size; i++) {
      // 获取基态 i 中在 bit1 和 bit2 位置上的值 (0或1)
      const val_at_bit1 = (i >> bit1) & 1;
      const val_at_bit2 = (i >> bit2) & 1;

      let j = i; // j 将是输出基态 (对应此列中'1'所在的行索引)
      // 如果这两个比特位的值不同，则SWAP它们 (通过翻转这两个位)
      if (val_at_bit1 !== val_at_bit2) {
        j ^= 1 << bit1; // 使用异或操作翻转bit1位
        j ^= 1 << bit2; // 使用异或操作翻转bit2位
      }
      // 如果这两个比特位的值相同，j 保持为 i (SWAP操作不改变这些比特)

      // 矩阵元素 M_ji 应该为 1 (其中 j 是行，i 是列)
      // (row_index * matrix_width + column_index) * 2
      const buffer_index = (j * size + i) * 2;
      buffer[buffer_index] = 1; // 实部为1
      // buffer[buffer_index + 1] 已经是0 (虚部)，因为 fill(0)
    }
    return new Matrix(size, size, buffer);
  }

  /**
   * 静态方法，从一系列复数分量创建一个列向量 (宽度为1的矩阵)。
   * @param {...(number|Complex)} complexComponents - 构成列向量的复数元素。
   * @returns {Matrix} 新的列向量。
   */
  static col(...complexComponents) {
    const numRows = complexComponents.length; // 列向量的行数
    const buffer = new Float32Array(numRows * 2);
    for (let i = 0; i < numRows; i++) {
      const c = Complex.from(complexComponents[i]); //
      buffer[i * 2] = c.real; //
      buffer[i * 2 + 1] = c.imag; //
    }
    return new Matrix(1, numRows, buffer); // 宽度为1，高度为元素数量
  }

  /**
   * 静态方法，创建一个指定大小的单位矩阵。
   * @param {number} size - 单位矩阵的维度 (边长)。
   * @returns {Matrix} 新的单位矩阵。
   */
  static identity(size) {
    if (size === 0) return new Matrix(0, 0, new Float32Array(0)); // 0维单位矩阵
    const buffer = new Float32Array(size * size * 2); // 初始化buffer
    // 将对角线元素设为1 (实部1, 虚部0)
    for (let i = 0; i < size; i++) {
      const idx = (i * size + i) * 2; // 对角线元素的索引 (M_ii)
      buffer[idx] = 1; // 实部为1
      // 虚部默认为0
    }
    return new Matrix(size, size, buffer);
  }

  /**
   * 创建一个门算符，该算符作用于大系统中的特定量子比特。
   * @param {Matrix} gateMatrix - 门本身的矩阵 (例如，一个2x2的单比特门矩阵)。
   * @param {number} targetQubitLsb - 门作用的量子比特中，索引最小的那个 (LSB, 最低有效位，从0开始计数)。
   * @param {number} numQubitsSystem - 系统中的总量子比特数。
   * @param {number} [gateQubitSpan=1] - 门矩阵实际作用的量子比特数量 (例如，单比特门为1，双比特门为2)。
   * @returns {Matrix} 扩展到整个系统的算符矩阵。
   * @throws {Error} 如果门矩阵维度与gateQubitSpan不匹配，或目标量子比特越界。
   */
  static gateOperator(
    gateMatrix,
    targetQubitLsb,
    numQubitsSystem,
    gateQubitSpan = 1
  ) {
    // 验证门矩阵的维度是否与 gateQubitSpan (门作用的量子比特数) 匹配
    // 门矩阵应为 (2^gateQubitSpan) x (2^gateQubitSpan)
    if (
      gateMatrix.width !== 1 << gateQubitSpan ||
      gateMatrix.height !== 1 << gateQubitSpan
    ) {
      throw new Error(
        `Gate matrix dimensions (${gateMatrix.width}x${
          gateMatrix.height
        }) do not match gateQubitSpan (2^${gateQubitSpan} = ${
          1 << gateQubitSpan
        }).`
      );
    }
    // 验证目标量子比特索引和跨度是否在系统范围内
    if (
      targetQubitLsb < 0 ||
      targetQubitLsb + gateQubitSpan > numQubitsSystem
    ) {
      throw new Error(
        `Target qubit LSB index (${targetQubitLsb}) / gate span (${gateQubitSpan}) out of bounds for the system of ${numQubitsSystem} qubits.`
      );
    }

    // 单独处理0量子比特系统的情况 (通常门作用于1个或多个量子比特)
    if (numQubitsSystem === 0) {
      if (
        gateQubitSpan === 0 && // 如果门也作用于0个量子比特 (即1x1标量)
        gateMatrix.width === 1 &&
        gateMatrix.height === 1
      ) {
        return gateMatrix; // 例如，0量子比特系统上的全局相位
      }
      // 对于0量子比特系统，非1x1的门是不寻常的
      return Matrix.identity(1); // 默认行为：返回1x1单位矩阵
    }

    let finalOp = null; // 初始化最终的系统算符

    // 从MSB (numQubitsSystem - 1) 到 LSB (0) 迭代量子比特索引
    // 以构建张量积链: Op_(N-1) ⊗ Op_(N-2) ⊗ ... ⊗ Op_0
    // (注意：Quirk的约定通常是 q_N-1 ... q_0 从左到右)
    for (let k = numQubitsSystem - 1; k >= 0; ) {
      // k 是当前处理的最高位量子比特的索引
      let currentPartOp; // 当前部分 (单个量子比特或门本身) 的算符

      // 检查当前MSB索引的量子比特 'k' 是否是门作用范围的MSB。
      // 门作用于从 targetQubitLsb 到 targetQubitLsb + gateQubitSpan - 1 的量子比特。
      // 因此，这个范围的MSB是 targetQubitLsb + gateQubitSpan - 1。
      // 但我们是从系统的MSB开始构建张量积，所以判断逻辑要反过来：
      // 我们要判断当前迭代到的k是否是目标量子比特范围的 *最高位*。
      // 例如，如果numQubitsSystem=3 (q2, q1, q0)，门作用于q0 (targetQubitLsb=0, gateQubitSpan=1)
      // k=2 (q2): 不是目标，用 I2
      // k=1 (q1): 不是目标，用 I2
      // k=0 (q0): 是目标，用 gateMatrix
      // 所以，当 k 正好是 (targetQubitLsb + gateQubitSpan - 1) 时，我们应该使用 gateMatrix，
      // 并且将 k 减去 gateQubitSpan。

      // 修正后的逻辑：
      // 我们从高位量子比特向低位量子比特构建张量积链。
      // 当迭代到门作用范围的最高位量子比特时，将整个 gateMatrix 作为一个单元进行张量积。
      // 否则，对当前量子比特使用单位门。

      // 目标量子比特范围的MSB索引是 targetQubitLsb + gateQubitSpan - 1
      // 目标量子比特范围的LSB索引是 targetQubitLsb
      if (
        k >= targetQubitLsb &&
        k < targetQubitLsb + gateQubitSpan && // k 在门的作用范围内
        k === targetQubitLsb + gateQubitSpan - 1 // 并且 k 是这个范围的最高位
      ) {
        currentPartOp = gateMatrix; // 使用门本身的矩阵
        k -= gateQubitSpan; // 将索引 k 移过所有被此门覆盖的量子比特
      } else {
        // 如果当前量子比特 k 不在门的作用范围，或者不是范围的最高位（已经被处理）
        currentPartOp = Matrix.identity(2); // 对此单个量子比特使用2x2单位门
        k -= 1; // 将索引 k 移过此单个单位门量子比特
      }

      // 构建张量积链
      if (finalOp === null) {
        // 如果是第一个部分
        finalOp = currentPartOp;
      } else {
        // finalOp 是针对更高索引的量子比特 (已经处理过的，张量积链中更靠左/MSB的部分)
        // currentPartOp 是针对较低索引的量子比特 (当前正在处理的)
        // 张量积顺序：(高位部分) ⊗ (低位部分)
        finalOp = finalOp.tensorProduct(currentPartOp);
      }
    }

    // 此情况理想情况下应由初始检查或循环逻辑捕获。
    // 如果 numQubitsSystem > 0 但 finalOp 仍为 null，则存在问题。
    if (finalOp === null && numQubitsSystem > 0) {
      // 这可能发生在 numQubitsSystem < gateQubitSpan 的情况，但这应该被开始的边界检查捕获。
      // 如果 numQubitsSystem > 0 但循环由于某种原因没有给 finalOp 赋值
      // (例如 numQubitsSystem=1, gateSpan=1, target=0):
      // k=0. k === (0+1-1) -> true. currentPartOp = gateMatrix. k = -1. finalOp = gateMatrix. 这是正确的。
      // 因此，如果 numQubitsSystem > 0，finalOp 不应为 null。
      // 如果可能为 null (例如，如果 numQubitsSystem=0 且未在上面处理)，则提供默认值。
      console.error(
        "Error in gateOperator: finalOp is null for non-zero qubit system."
      );
      return Matrix.identity(1 << numQubitsSystem); // 后备，尽管表示逻辑错误
    }
    if (finalOp === null && numQubitsSystem === 0) {
      // 如果0量子比特且上面未处理
      return Matrix.identity(1); // 返回1x1单位矩阵
    }

    return finalOp;
  }

  /**
   * 创建一个受控门算符。
   * @param {Matrix} gateMatrix - 目标门本身的矩阵。
   * @param {number} targetQubitLsb - 目标门作用的量子比特中，索引最小的那个 (LSB, 引擎索引)。
   * @param {number[]} controlQubitIndices - 控制量子比特 (●) 的引擎索引数组。
   * @param {number[]} antiControlQubitIndices - 反控制量子比特 (○) 的引擎索引数组。
   * @param {number} numQubitsSystem - 系统中的总量子比特数。
   * @param {number} [gateQubitSpan=1] - 目标门矩阵实际作用的量子比特数量。
   * @returns {Matrix} 扩展到整个系统的受控门算符矩阵。
   */
  static controlledGateOperator(
    gateMatrix,
    targetQubitLsb,
    controlQubitIndices, // 引擎索引
    antiControlQubitIndices, // 引擎索引
    numQubitsSystem,
    gateQubitSpan = 1
  ) {
    const systemSize = 1 << numQubitsSystem; // 系统状态空间维度
    // 初始化最终算符矩阵为全0
    const finalOpBuffer = new Float32Array(systemSize * systemSize * 2).fill(0);
    const finalOperator = new Matrix(systemSize, systemSize, finalOpBuffer);

    // 获取目标门在无控制情况下的系统级算符
    const gateSystemOperator = Matrix.gateOperator(
      gateMatrix,
      targetQubitLsb,
      numQubitsSystem,
      gateQubitSpan
    );

    // 获取系统级的单位矩阵
    const identitySystemOperator = Matrix.identity(systemSize);

    // 遍历所有输入计算基态 |i⟩ (对应最终算符的第i列)
    for (let i = 0; i < systemSize; i++) {
      let controlsMet = true; // 标志位，表示控制条件是否满足

      // 检查所有 "●" (control) 条件
      // controlQubitIndices 中的索引是引擎索引 (LSB=0)
      for (const controlQubit of controlQubitIndices) {
        // (i >> controlQubit) & 1) 获取基态 i 中第 controlQubit 个量子比特的值
        if (!((i >> controlQubit) & 1)) {
          // 如果该控制量子比特为 |0⟩ (不满足●条件)
          controlsMet = false;
          break;
        }
      }

      // 如果 "●" 条件已满足，则继续检查 "○" (anti-control) 条件
      if (controlsMet) {
        for (const antiControlQubit of antiControlQubitIndices) {
          if ((i >> antiControlQubit) & 1) {
            // 如果该反控制量子比特为 |1⟩ (不满足○条件)
            controlsMet = false;
            break;
          }
        }
      }

      // 根据控制条件是否满足，填充 finalOperator 的第 i 列
      if (controlsMet) {
        // 如果所有控制条件都满足
        // 应用目标门：复制 gateSystemOperator 的第 i 列到 finalOperator 的第 i 列
        for (let r = 0; r < systemSize; r++) {
          // 遍历行 r
          const val = gateSystemOperator.cell(i, r); // 获取 gateSystemOperator[r][i] (列向量的第r个元素)
          const idx = (r * systemSize + i) * 2; // finalOperator中 (r,i) 位置的实部索引
          finalOperator.buffer[idx] = val.real; //
          finalOperator.buffer[idx + 1] = val.imag; //
        }
      } else {
        // 如果控制条件不满足
        // 应用单位门：复制 identitySystemOperator 的第 i 列到 finalOperator 的第 i 列
        // (单位矩阵的第i列只有在第i行处为1，其余为0)
        for (let r = 0; r < systemSize; r++) {
          const val = identitySystemOperator.cell(i, r);
          const idx = (r * systemSize + i) * 2;
          finalOperator.buffer[idx] = val.real; //
          finalOperator.buffer[idx + 1] = val.imag; //
        }
      }
    }
    return finalOperator;
  }
  // ... (rest of the Matrix class, including PAULI_X etc.)
}

// 定义常用的Pauli矩阵和Hadamard矩阵作为Matrix类的静态属性
// 如果它们尚未定义 (例如在其他地方)，则进行初始化
Matrix.PAULI_X = Matrix.PAULI_X || Matrix.square(0, 1, 1, 0);
Matrix.PAULI_Y =
  Matrix.PAULI_Y || Matrix.square(0, Complex.I.times(-1), Complex.I, 0); //
Matrix.PAULI_Z = Matrix.PAULI_Z || Matrix.square(1, 0, 0, -1);
Matrix.HADAMARD =
  Matrix.HADAMARD || Matrix.square(1, 1, 1, -1).times(1 / Math.sqrt(2)); //

// 定义标准的2量子比特SWAP矩阵 (可选，不由swapOperator直接使用，但可供参考)
Matrix.SWAP_2_QUBIT =
  Matrix.SWAP_2_QUBIT ||
  Matrix.square(
    // |00> -> |00>, |01> -> |10>, |10> -> |01>, |11> -> |11>
    1,
    0,
    0,
    0, // 对应输入|00>列
    0,
    0,
    1,
    0, // 对应输入|01>列
    0,
    1,
    0,
    0, // 对应输入|10>列
    0,
    0,
    0,
    1 // 对应输入|11>列
  );
