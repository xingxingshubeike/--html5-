// js/math/matrix.js
// (Additions/Modifications to existing Matrix class)

class Matrix {
  // ... (previous constructor, cell, isEqualTo, isApproximatelyEqualTo, times, adjoint, norm2 methods) ...
  constructor(width, height, buffer) {
    if (width * height * 2 !== buffer.length) {
      throw new Error(
        `Matrix buffer length (${
          buffer.length
        }) does not match dimensions W:${width} H:${height} (*2=${
          width * height * 2
        }).`
      );
    }
    this.width = width;
    this.height = height;
    this.buffer = buffer;
  }

  cell(col, row) {
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) {
      console.error("Matrix cell out of range.", {
        col,
        row,
        matrixWidth: this.width,
        matrixHeight: this.height,
      });
      throw new Error("Matrix cell out of range.");
    }
    const i = (row * this.width + col) * 2;
    return new Complex(this.buffer[i], this.buffer[i + 1]);
  }
  copy() {
    const newBuffer = new Float32Array(this.buffer); // 复制 buffer
    return new Matrix(this.width, this.height, newBuffer);
  }

  isEqualTo(other) {
    if (!(other instanceof Matrix)) return false;
    if (this.width !== other.width || this.height !== other.height)
      return false;
    if (this.buffer.length !== other.buffer.length) return false; // Should be caught by dimensions check too
    for (let i = 0; i < this.buffer.length; i++) {
      if (Math.abs(this.buffer[i] - other.buffer[i]) > 1e-9) return false; // Use tolerance for float
    }
    return true;
  }

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

  times(other) {
    if (typeof other === "number" || other instanceof Complex) {
      const scalar = Complex.from(other);
      const newBuffer = new Float32Array(this.buffer.length);
      for (let i = 0; i < this.buffer.length; i += 2) {
        const val = new Complex(this.buffer[i], this.buffer[i + 1]).times(
          scalar
        );
        newBuffer[i] = val.real;
        newBuffer[i + 1] = val.imag;
      }
      return new Matrix(this.width, this.height, newBuffer);
    }

    if (!(other instanceof Matrix))
      throw new Error("Invalid argument for Matrix.times");

    if (this.width !== other.height) {
      throw new Error(
        `Matrix dimensions incompatible for multiplication: ${this.width}x${this.height} and ${other.width}x${other.height}`
      );
    }
    const newWidth = other.width;
    const newHeight = this.height;
    const newBuffer = new Float32Array(newWidth * newHeight * 2);

    for (let r = 0; r < newHeight; r++) {
      for (let c = 0; c < newWidth; c++) {
        let sum = Complex.ZERO;
        for (let k = 0; k < this.width; k++) {
          // this.width is common dimension
          sum = sum.plus(this.cell(k, r).times(other.cell(c, k)));
        }
        const idx = (r * newWidth + c) * 2;
        newBuffer[idx] = sum.real;
        newBuffer[idx + 1] = sum.imag;
      }
    }
    return new Matrix(newWidth, newHeight, newBuffer);
  }

  adjoint() {
    const newMatrixBuffer = new Float32Array(this.width * this.height * 2);
    for (let r_orig = 0; r_orig < this.height; r_orig++) {
      for (let c_orig = 0; c_orig < this.width; c_orig++) {
        const val = this.cell(c_orig, r_orig).conjugate();
        const newIdx = (c_orig * this.height + r_orig) * 2;
        newMatrixBuffer[newIdx] = val.real;
        newMatrixBuffer[newIdx + 1] = val.imag;
      }
    }
    return new Matrix(this.height, this.width, newMatrixBuffer);
  }

  norm2() {
    let t = 0;
    for (let i = 0; i < this.buffer.length; i += 2) {
      t +=
        this.buffer[i] * this.buffer[i] +
        this.buffer[i + 1] * this.buffer[i + 1];
    }
    return t;
  }

  tensorProduct(other) {
    const newWidth = this.width * other.width;
    const newHeight = this.height * other.height;
    const newBuffer = new Float32Array(newWidth * newHeight * 2);

    for (let r1 = 0; r1 < this.height; r1++) {
      for (let c1 = 0; c1 < this.width; c1++) {
        const s = this.cell(c1, r1);
        for (let r2 = 0; r2 < other.height; r2++) {
          for (let c2 = 0; c2 < other.width; c2++) {
            const v = s.times(other.cell(c2, r2));
            const r = r1 * other.height + r2;
            const c = c1 * other.width + c2;
            const idx = (r * newWidth + c) * 2;
            newBuffer[idx] = v.real;
            newBuffer[idx + 1] = v.imag;
          }
        }
      }
    }
    return new Matrix(newWidth, newHeight, newBuffer);
  }

  static square(...complexComponents) {
    const n = Math.sqrt(complexComponents.length);
    if (!Number.isInteger(n))
      throw new Error("Need a square number of components for Matrix.square.");
    const buffer = new Float32Array(complexComponents.length * 2);
    for (let i = 0; i < complexComponents.length; i++) {
      const c = Complex.from(complexComponents[i]);
      buffer[i * 2] = c.real;
      buffer[i * 2 + 1] = c.imag;
    }
    return new Matrix(n, n, buffer);
  }

  static swapOperator(q1_engine, q2_engine, numQubitsSystem) {
    if (q1_engine === q2_engine) {
      return Matrix.identity(1 << numQubitsSystem);
    }

    const size = 1 << numQubitsSystem;
    const buffer = new Float32Array(size * size * 2).fill(0);

    const bit1 = Math.min(q1_engine, q2_engine); // Lower index bit
    const bit2 = Math.max(q1_engine, q2_engine); // Higher index bit

    for (let i = 0; i < size; i++) {
      // Iterate over input basis states (columns of the operator matrix)
      const val_at_bit1 = (i >> bit1) & 1;
      const val_at_bit2 = (i >> bit2) & 1;

      let j = i; // j will be the output basis state (row index for the '1' in this column)
      if (val_at_bit1 !== val_at_bit2) {
        // If the bits are different, SWAP them by flipping both
        j ^= 1 << bit1; // XOR with mask for bit1 to flip it
        j ^= 1 << bit2; // XOR with mask for bit2 to flip it
      }
      // If bits are the same, j remains i (state is unchanged by SWAP for these bits)

      // The matrix element M_ji should be 1 (where j is row, i is column)
      const buffer_index = (j * size + i) * 2; // (row_index * matrix_width + column_index) * 2
      buffer[buffer_index] = 1; // Real part of 1
      // buffer[buffer_index + 1] is already 0 (imaginary part) due to fill(0)
    }
    return new Matrix(size, size, buffer);
  }

  static col(...complexComponents) {
    const buffer = new Float32Array(complexComponents.length * 2);
    for (let i = 0; i < complexComponents.length; i++) {
      const c = Complex.from(complexComponents[i]);
      buffer[i * 2] = c.real;
      buffer[i * 2 + 1] = c.imag;
    }
    return new Matrix(1, complexComponents.length, buffer);
  }

  static identity(size) {
    if (size === 0) return new Matrix(0, 0, new Float32Array(0));
    const buffer = new Float32Array(size * size * 2);
    for (let i = 0; i < size; i++) {
      const idx = (i * size + i) * 2;
      buffer[idx] = 1;
    }
    return new Matrix(size, size, buffer);
  }

  /**
   * Creates the operator for a gate acting on specific qubits in a larger system.
   * @param {Matrix} gateMatrix - The matrix of the gate itself.
   * @param {number} targetQubit - The primary (e.g., lowest index) qubit the gate acts on.
   * @param {number} numQubitsSystem - Total number of qubits in the system.
   * @param {number} gateQubitSpan - The number of qubits the gateMatrix acts on.
   * @returns {Matrix} The system-wide operator.
   */
  static gateOperator(
    gateMatrix,
    targetQubitLsb,
    numQubitsSystem,
    gateQubitSpan = 1
  ) {
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
    if (
      targetQubitLsb < 0 ||
      targetQubitLsb + gateQubitSpan > numQubitsSystem
    ) {
      throw new Error(
        `Target qubit LSB index (${targetQubitLsb}) / gate span (${gateQubitSpan}) out of bounds for the system of ${numQubitsSystem} qubits.`
      );
    }

    // Handle the 0-qubit system case separately, though typically gates apply to 1 or more.
    if (numQubitsSystem === 0) {
      if (
        gateQubitSpan === 0 &&
        gateMatrix.width === 1 &&
        gateMatrix.height === 1
      ) {
        return gateMatrix; // e.g. a global phase on a 0-qubit system
      }
      // It's unusual to have a gate for a 0-qubit system that's not 1x1.
      // Return identity or throw error based on desired behavior.
      return Matrix.identity(1); // Default behavior
    }

    let finalOp = null;

    // Iterate through qubit indices from MSB (numQubitsSystem - 1) down to LSB (0)
    // to build the tensor product chain: Op_N-1 Otimes Op_N-2 ... Otimes Op_0
    for (let k = numQubitsSystem - 1; k >= 0; ) {
      let currentPartOp;

      // Check if the current MSB-indexed qubit 'k' is the MSB of the span where the gate should be placed.
      // The gate acts on qubits from targetQubitLsb to targetQubitLsb + gateQubitSpan - 1.
      // So, the MSB of this range is targetQubitLsb + gateQubitSpan - 1.
      if (k === targetQubitLsb + gateQubitSpan - 1) {
        currentPartOp = gateMatrix;
        k -= gateQubitSpan; // Move index k past all qubits covered by this gate
      } else {
        currentPartOp = Matrix.identity(2); // Identity for this single qubit
        k -= 1; // Move index k past this single identity qubit
      }

      if (finalOp === null) {
        finalOp = currentPartOp;
      } else {
        // finalOp is for higher indexed qubits (already processed, more MSB part of the chain)
        // currentPartOp is for lower indexed qubits (being processed now)
        finalOp = finalOp.tensorProduct(currentPartOp);
      }
    }

    // This case should ideally be caught by initial checks or loop logic.
    // If numQubitsSystem > 0 and finalOp is still null, it's an issue.
    if (finalOp === null) {
      // This might happen if numQubitsSystem < gateQubitSpan,
      // but that should be caught by the bounds check at the start.
      // If numQubitsSystem > 0 but the loop somehow didn't assign finalOp (e.g. numQubitsSystem=1, gateSpan=1, target=0)
      // k=0. k === (0+1-1) -> true. currentPartOp = gateMatrix. k = -1. finalOp = gateMatrix. This is correct.
      // Thus, finalOp should not be null if numQubitsSystem > 0.
      // If it can be (e.g. if numQubitsSystem=0 and not handled above), provide a default.
      return Matrix.identity(1 << numQubitsSystem); // Fallback, though indicates logic error if reached for numQubitsSystem > 0
    }

    return finalOp;
  }

  static controlledGateOperator(
    gateMatrix,
    targetQubitLsb,
    controlQubitIndices,
    antiControlQubitIndices,
    numQubitsSystem,
    gateQubitSpan = 1
  ) {
    const systemSize = 1 << numQubitsSystem;
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

    for (let i = 0; i < systemSize; i++) {
      // 遍历所有输入计算基态 |i⟩ (对应最终算符的第i列)
      // 检查基态 |i⟩ 是否满足所有控制条件
      // 注意：(i >> k) & 1 用于获取基态 i 中第 k 个量子比特的值 (0 或 1)，假设 k 是从 LSB (0) 开始计数的。

      let controlsMet = true;

      // 检查所有 "●" (control) 条件
      for (const controlQubit of controlQubitIndices) {
        if (!((i >> controlQubit) & 1)) {
          // 如果该控制量子比特为 |0⟩
          controlsMet = false;
          break;
        }
      }

      // 如果 "●" 条件已满足，则继续检查 "○" (anti-control) 条件
      if (controlsMet) {
        for (const antiControlQubit of antiControlQubitIndices) {
          if ((i >> antiControlQubit) & 1) {
            // 如果该反控制量子比特为 |1⟩
            controlsMet = false;
            break;
          }
        }
      }

      // 根据控制条件是否满足，填充 finalOperator 的第 i 列
      if (controlsMet) {
        // 控制条件满足，应用目标门：复制 gateSystemOperator 的第 i 列
        for (let r = 0; r < systemSize; r++) {
          // 遍历行 r
          const val = gateSystemOperator.cell(i, r); // 获取 gateSystemOperator[r][i]
          const idx = (r * systemSize + i) * 2; // finalOperator中 (r,i) 位置的实部索引
          finalOperator.buffer[idx] = val.real;
          finalOperator.buffer[idx + 1] = val.imag;
        }
      } else {
        // 控制条件不满足，应用单位门：复制 identitySystemOperator 的第 i 列
        for (let r = 0; r < systemSize; r++) {
          // 遍历行 r
          const val = identitySystemOperator.cell(i, r); // 获取 identitySystemOperator[r][i]
          const idx = (r * systemSize + i) * 2;
          finalOperator.buffer[idx] = val.real;
          finalOperator.buffer[idx + 1] = val.imag;
        }
      }
    }
    return finalOperator;
  }
  // ... (rest of the Matrix class, including PAULI_X etc.)
}

// Common Pauli Matrices (ensure they are defined or accessible)
Matrix.PAULI_X = Matrix.PAULI_X || Matrix.square(0, 1, 1, 0);
Matrix.PAULI_Y =
  Matrix.PAULI_Y || Matrix.square(0, Complex.I.times(-1), Complex.I, 0);
Matrix.PAULI_Z = Matrix.PAULI_Z || Matrix.square(1, 0, 0, -1);
Matrix.HADAMARD =
  Matrix.HADAMARD || Matrix.square(1, 1, 1, -1).times(1 / Math.sqrt(2));
// Define standard 2-qubit SWAP matrix (optional, not directly used by swapOperator but good for reference)
Matrix.SWAP_2_QUBIT =
  Matrix.SWAP_2_QUBIT ||
  Matrix.square(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
