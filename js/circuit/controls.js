// js/circuit/controls.js
// 简化版本，灵感来源于 Quirk-master/src/circuit/Controls.js
// 该类用于表示和操作量子门上的控制位条件。

class Controls {
  /**
   * 构造函数
   * @param {number} inclusionMask - 一个位掩码，其中设置的位表示该量子比特是控制的一部分。
   * @param {number} desiredValueMask - 一个位掩码，指示被包含的量子比特的期望状态 (0 或 1)。
   * 例如，如果 inclusionMask 的第k位为1，
   * 则 desiredValueMask 的第k位为0表示控制在|0⟩上，为1表示控制在|1⟩上。
   */
  constructor(inclusionMask, desiredValueMask) {
    this.inclusionMask = inclusionMask; // 哪些量子比特是控制位
    this.desiredValueMask = desiredValueMask; // 这些控制位期望的值
  }

  /**
   * 检查给定的计算基态是否满足这些控制条件。
   * @param {number} basisState - 要检查的计算基态 (以整数表示，例如 |011⟩ 对应 3)。
   * @returns {boolean} 如果满足所有控制条件则返回true。
   */
  isSatisfiedBy(basisState) {
    // (basisState & this.inclusionMask) 获取 basisState 中所有被 inclusionMask 标记为控制位的实际值。
    // 然后与 desiredValueMask 比较，看是否所有控制位都达到了期望值。
    return (basisState & this.inclusionMask) === this.desiredValueMask;
  }

  /**
   * 创建单个量子比特的控制条件。
   * @param {number} qubitIndex - 控制量子比特的索引 (从 LSB 0 开始)。
   * @param {boolean} [desiredValue=true] - 期望值。true 表示控制在 |1⟩ (●)，false 表示控制在 |0⟩ (○)。
   * @returns {!Controls} 新的Controls对象。
   */
  static on(qubitIndex, desiredValue = true) {
    if (qubitIndex < 0) throw new Error("Qubit index cannot be negative."); // 量子比特索引不能为负
    const inclusion = 1 << qubitIndex; // 将第 qubitIndex 位置1，表示该位是控制位
    const desired = desiredValue ? 1 << qubitIndex : 0; // 如果期望为1，则第 qubitIndex 位为1；否则为0
    return new Controls(inclusion, desired);
  }

  /**
   * 将当前的控制条件与另一组控制条件通过逻辑“与” (AND) 合并。
   * @param {Controls} otherControls - 要合并的另一组控制条件。
   * @returns {Controls} 合并后的新Controls对象。
   * @throws {Error} 如果控制条件存在矛盾 (例如，同一量子比特既要求为0又要求为1)。
   */
  and(otherControls) {
    // 新的包含掩码是两者包含掩码的并集
    const newInclusionMask = this.inclusionMask | otherControls.inclusionMask;

    // 检查是否存在矛盾
    // commonMask 找出两组控制都涉及的量子比特
    const commonMask = this.inclusionMask & otherControls.inclusionMask;
    // 检查在这些共同涉及的量子比特上，期望值是否一致
    if (
      (this.desiredValueMask & commonMask) !==
      (otherControls.desiredValueMask & commonMask)
    ) {
      throw new Error("Contradictory controls."); // 控制条件矛盾
    }

    // 新的期望值掩码是两者期望值掩码的并集 (因为已经排除了矛盾)
    const newDesiredValueMask =
      this.desiredValueMask | otherControls.desiredValueMask;
    return new Controls(newInclusionMask, newDesiredValueMask);
  }

  /**
   * 检查这些控制条件是否代表“无控制”。
   * @returns {boolean} - 如果 inclusionMask 为0 (即没有量子比特被标记为控制位)，则返回true。
   */
  isNone() {
    return this.inclusionMask === 0;
  }

  /**
   * 创建这些控制条件的副本。
   * @returns {Controls} 新的Controls对象副本。
   */
  copy() {
    return new Controls(this.inclusionMask, this.desiredValueMask);
  }

  /**
   * 返回控制条件的字符串表示形式。
   * @returns {string} 例如 "Controls(q0=1, q2=0)"。
   */
  toString() {
    if (this.isNone()) return "Controls.NONE"; // 如果无控制
    let parts = [];
    // 假设最多检查32个量子比特 (对于字符串表示是合理的)
    for (let i = 0; i < 32; i++) {
      // 检查第i个量子比特是否是控制位
      if ((this.inclusionMask >> i) & 1) {
        // 获取其期望值 (0或1)
        parts.push(`q${i}=${(this.desiredValueMask >> i) & 1}`);
      }
    }
    return `Controls(${parts.join(", ")})`;
  }
}

// 静态属性，表示一个“无控制”的Controls对象实例。
Controls.NONE = new Controls(0, 0);
