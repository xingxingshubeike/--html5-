// js/circuit/gateColumn.js
// 简化版本，灵感来源于 Quirk-master/src/circuit/GateColumn.js
// 表示量子线路中的一列门。

class GateColumn {
  /**
   * 构造函数
   * @param {Array<Gate|undefined>} gates - 一个数组，表示此列中每个线路上的门。
   * 数组中的 undefined 表示该线路上此列为空。
   */
  constructor(gates = []) {
    this.gates = gates; // 存储门对象的数组，undefined表示空槽位
  }

  /**
   * 创建一个指定量子比特数的空列。
   * @param {number} numQubits - 量子比特数。
   * @returns {!GateColumn} 一个新的空GateColumn对象。
   */
  static empty(numQubits) {
    // 创建一个长度为 numQubits 的数组，并用 undefined 填充
    return new GateColumn(new Array(numQubits).fill(undefined));
  }

  /**
   * 检查此列是否不包含任何门。
   * @returns {boolean} 如果列为空则返回true。
   */
  isEmpty() {
    // 检查数组中的每个元素是否都为 undefined
    return this.gates.every((g) => g === undefined);
  }

  /**
   * 检查此列是否与另一列相等。
   * @param {GateColumn|*} other - 要比较的另一个对象。
   * @returns {boolean} 如果相等则返回true。
   */
  isEqualTo(other) {
    if (!(other instanceof GateColumn)) return false; // 类型检查
    if (this.gates.length !== other.gates.length) return false; // 长度检查 (即量子比特数是否一致)

    // 逐个比较每个线路上的门
    for (let i = 0; i < this.gates.length; i++) {
      const g1 = this.gates[i]; // 当前列的门
      const g2 = other.gates[i]; // 另一列的门

      if (g1 === undefined && g2 === undefined) continue; // 如果两者都为空，则继续下一个
      if (g1 === undefined || g2 === undefined) return false; // 如果一个为空而另一个不为空，则不相等
      // 简化的门比较：仅比较门的ID。Quirk的比较更为健壮。
      if (g1.id !== g2.id) return false; //
      // TODO: 对于更健壮的比较，如果门是参数化的，还需要比较参数。
    }
    return true; // 所有门都相等
  }

  /**
   * 计算容纳此列中所有门所需的最小线路数 (量子比特数)。
   * 例如，如果一个高度为2的门放在第0条线上，则至少需要2条线。
   * @returns {number} 最小所需的线路数。
   */
  minimumRequiredWireCount() {
    let maxWire = 0; // 初始化最大线路索引
    this.gates.forEach((gate, wireIndex) => {
      // 遍历列中的每个门及其线路索引
      if (gate) {
        // 如果存在门
        // 更新最大线路索引：max(当前最大值, 门底部占据的线路索引 + 1)
        maxWire = Math.max(maxWire, wireIndex + gate.height); //
      }
    });
    return maxWire;
  }

  /**
   * 创建此GateColumn的副本。
   * @returns {GateColumn} GateColumn的一个新实例副本。
   */
  copy() {
    // 映射gates数组，如果元素是Gate对象，则调用其copy方法创建副本；否则保留undefined
    return new GateColumn(this.gates.map((g) => (g ? g.copy() : undefined))); //
  }
}

// 注意：原代码末尾有一个多余的右花括号，已在此处移除。
// class GateColumn { ... }
// } // <-- 这个是多余的
