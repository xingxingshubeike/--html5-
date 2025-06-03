// js/circuit/circuitDefinition.js
// 简化版本，灵感来源于 Quirk-master/src/circuit/CircuitDefinition.js
// 定义量子线路的结构，包括量子比特数和门操作的列。

// 定义量子比特数的常量限制
const MAX_QUBITS = 4; // 最大量子比特数
const MIN_QUBITS = 1; // 最小量子比特数

class CircuitDefinition {
  /**
   * 构造函数
   * @param {number} numQubits - 电路中的量子比特数。
   * @param {Array<GateColumn>} columns - GateColumn对象的数组，代表电路的每一列。
   */
  constructor(numQubits, columns = []) {
    // 检查量子比特数是否在允许范围内
    if (numQubits < MIN_QUBITS || numQubits > MAX_QUBITS) {
      throw new Error(
        `Number of qubits must be between ${MIN_QUBITS} and ${MAX_QUBITS}.`
      );
    }
    this.numQubits = numQubits; // 量子比特数
    // 初始化列，确保每列都有正确数量的门槽位
    this.columns = columns.map((col) => {
      const newGates = new Array(numQubits).fill(undefined); // 创建一个用undefined填充的数组作为新列的门
      if (col && col.gates) {
        // 如果传入的列数据有效且包含门
        // 复制有效的门到新列，不超过当前电路的量子比特数
        for (let i = 0; i < Math.min(col.gates.length, numQubits); i++) {
          newGates[i] = col.gates[i];
        }
      }
      return new GateColumn(newGates); //
    });
  }

  /**
   * 获取指定列和线路索引处的门。
   * @param {number} colIndex - 列索引。
   * @param {number} wireIndex - 线路 (量子比特) 索引。
   * @returns {Gate|undefined} 如果位置有效则返回门对象，否则返回undefined。
   */
  gateAt(colIndex, wireIndex) {
    // 检查索引是否越界
    if (
      colIndex < 0 ||
      colIndex >= this.columns.length ||
      wireIndex < 0 ||
      wireIndex >= this.numQubits
    ) {
      return undefined; // 越界则返回undefined
    }
    return this.columns[colIndex].gates[wireIndex]; // 返回对应位置的门
  }

  /**
   * 在指定的列和线路放置一个门。
   * 处理多量子比特门时，确保有足够空间并清除被覆盖的槽位。
   * 如果在一个已有门的位置放置新门，旧门将被替换。
   * @param {Gate} gate - 要放置的门对象。
   * @param {number} colIndex - 目标列索引。
   * @param {number} wireIndex - 目标线路索引 (对于多量子比特门，这是其最顶部的线路)。
   * @returns {CircuitDefinition} 一个包含新放置门的新CircuitDefinition对象 (不可变性)。
   */
  withGatePlaced(gate, colIndex, wireIndex) {
    // 创建列的深拷贝副本，以保持不可变性
    const newColumns = this.columns.map((c) => c.copy()); //

    // 确保有足够的列存在，如果目标列索引超出当前列数，则添加空列
    while (colIndex >= newColumns.length) {
      newColumns.push(GateColumn.empty(this.numQubits)); //
    }

    // 清理新门将要占据的区域 (以及同一列中可能被垂直覆盖的门)
    for (let r = 0; r < this.numQubits; r++) {
      // 清除新门主体将垂直覆盖的现有门 (在目标列中)
      if (r >= wireIndex && r < wireIndex + gate.height) {
        //
        if (
          newColumns[colIndex].gates[r] && //
          newColumns[colIndex].gates[r] !== gate //
        ) {
          // TODO: 更优雅地处理移除多量子比特门 (如果它们在这里被覆盖)
        }
        newColumns[colIndex].gates[r] = undefined; // 清除主体的槽位
      }
    }
    // 同时为多列门清除空间 (如果 gate.width > 1)
    for (let c = 0; c < gate.width; c++) {
      //
      if (colIndex + c < newColumns.length) {
        // 确保目标列在范围内
        for (let r = 0; r < gate.height; r++) {
          //
          if (wireIndex + r < this.numQubits) {
            // 确保目标行在范围内
            if (c > 0 || r > 0) {
              // 不重复清除主槽位
              newColumns[colIndex + c].gates[wireIndex + r] = undefined; //
            }
          }
        }
      }
    }

    // 放置新门
    if (
      wireIndex + gate.height <= this.numQubits && // 检查门是否垂直越界
      colIndex + gate.width <= newColumns.length // 检查门是否水平越界 (已通过前面补列保证)
    ) {
      newColumns[colIndex].gates[wireIndex] = gate; // 放置门
    } else {
      console.warn("Gate placement out of bounds or not enough space."); // 放置失败警告
      // 根据期望行为，可以返回 `this` 或抛出错误
      return this; // 当前行为：如果放置失败，返回原始电路
    }

    return new CircuitDefinition(this.numQubits, newColumns); // 返回新的电路定义
  }

  /**
   * 从指定位置移除一个门。
   * 如果是多量子比特/多列门，其主槽位将被清除。
   * @param {number} colIndex - 门所在的列索引。
   * @param {number} wireIndex - 门所在的线路索引。
   * @returns {CircuitDefinition} 一个移除了该门的新CircuitDefinition对象。
   */
  withGateRemoved(colIndex, wireIndex) {
    // 检查索引是否越界
    if (
      colIndex < 0 ||
      colIndex >= this.columns.length ||
      wireIndex < 0 ||
      wireIndex >= this.numQubits
    ) {
      return this; // 越界则返回原电路
    }
    const newColumns = this.columns.map((c) => c.copy()); // 创建列的深拷贝
    newColumns[colIndex].gates[wireIndex] = undefined; // 将指定位置的门设为undefined
    // 注意: 这个简单版本没有自动处理移除多量子比特/多列门的“影子”部分。
    // 一个更健壮的版本会查找门的定义来清除其所有跨越的槽位。
    return new CircuitDefinition(this.numQubits, newColumns);
  }

  /**
   * 检查电路是否为空 (即不包含任何门)。
   * @returns {boolean} 如果电路为空则返回true。
   */
  isEmpty() {
    return this.columns.every((col) => col.isEmpty()); //
  }

  /**
   * 检查当前电路是否与另一个电路相等。
   * @param {CircuitDefinition|*} other - 要比较的另一个对象。
   * @returns {boolean} 如果相等则返回true。
   */
  isEqualTo(other) {
    if (!(other instanceof CircuitDefinition)) return false; // 类型检查
    if (this.numQubits !== other.numQubits) return false; // 量子比特数检查
    if (this.columns.length !== other.columns.length) return false; // 列数检查
    // 逐列比较
    for (let i = 0; i < this.columns.length; i++) {
      if (!this.columns[i].isEqualTo(other.columns[i])) return false; //
    }
    return true; // 所有检查通过，则相等
  }

  /**
   * 创建一个具有默认量子比特数的空电路。
   * @param {number} [numQubits=2] - 新电路的量子比特数。
   * @returns {CircuitDefinition} 新的空电路定义。
   */
  static empty(numQubits = 2) {
    return new CircuitDefinition(numQubits, []);
  }

  /**
   * 返回一个具有可能不同量子比特数的新CircuitDefinition。
   * 超出新范围的门将被丢弃。新的线路将被初始化为空。
   * @param {number} newNumQubits - 新的量子比特数。
   * @returns {CircuitDefinition} 调整了量子比特数的新电路定义。
   */
  withNumQubits(newNumQubits) {
    // 确保新的量子比特数在允许的最小和最大值之间
    newNumQubits = Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, newNumQubits));
    if (newNumQubits === this.numQubits) return this; // 如果数量不变，返回原电路

    // 创建新的列数据
    const newColumns = this.columns.map((col) => {
      const newGates = new Array(newNumQubits).fill(undefined); // 初始化新列的门槽
      // 遍历原列中与新量子比特数重叠的部分
      for (let i = 0; i < Math.min(this.numQubits, newNumQubits); i++) {
        const gate = col.gates[i]; //
        // 如果门存在且在新量子比特数范围内仍然适合 (多量子比特门的高度检查)
        if (gate && i + gate.height <= newNumQubits) {
          //
          newGates[i] = gate; // 保留该门
        }
      }
      return new GateColumn(newGates); //
    });
    return new CircuitDefinition(newNumQubits, newColumns);
  }

  /**
   * 返回一个可能移除了特定列或在特定位置插入了新列（或空列）的新CircuitDefinition。
   * @param {number} colIndex - 要修改的列的索引。
   * @param {GateColumn | null} newColumn - 要插入的新列。如果为null，则移除该列。
   * @returns {CircuitDefinition} 修改了列的新电路定义。
   */
  withColumnAt(colIndex, newColumn) {
    const newColumns = this.columns.map((c) => c.copy()); // 创建列的深拷贝
    if (newColumn === null) {
      // 如果 newColumn 为 null，表示移除列
      if (colIndex >= 0 && colIndex < newColumns.length) {
        // 确保索引有效
        newColumns.splice(colIndex, 1); // 移除列
      }
    } else {
      // 否则，表示插入或替换列
      // 如果目标列索引超出当前列数，则添加空列直到达到目标索引
      while (colIndex >= newColumns.length) {
        newColumns.push(GateColumn.empty(this.numQubits)); //
      }
      newColumns[colIndex] = newColumn; // 在指定位置设置新列
    }
    return new CircuitDefinition(this.numQubits, newColumns);
  }

  /**
   * 返回电路中容纳所有门所需的最小线路数。
   * （即，考虑多量子比特门后，实际占用的最大线路索引 + 1）
   * @returns {number}
   */
  minimumRequiredWireCount() {
    let maxWire = 0; // 初始化最大线路索引为0
    this.columns.forEach((column) => {
      // 遍历每一列
      column.gates.forEach((gate, wireIndex) => {
        // 遍历列中的每个门
        if (gate) {
          // 如果门存在
          // 更新最大线路索引为当前门底部占据的线路索引 + 1
          maxWire = Math.max(maxWire, wireIndex + gate.height); //
        }
      });
    });
    // 确保返回的线路数至少是当前电路定义的量子比特数
    return Math.max(this.numQubits, maxWire);
  }

  /**
   * 移除电路末尾的空列。
   * @returns {CircuitDefinition} 一个移除了末尾空列的新CircuitDefinition，如果无变化则返回原对象。
   */
  trimmed() {
    let newColumns = [...this.columns]; // 创建列的浅拷贝 (GateColumn对象本身还是引用)
    // 注意：如果GateColumn是可变的，这里可能需要深拷贝
    // 但GateColumn的修改操作通常也是返回新对象，所以这里可能OK
    // 从后向前移除空列
    while (
      newColumns.length > 0 &&
      newColumns[newColumns.length - 1].isEmpty() //
    ) {
      newColumns.pop(); // 移除最后一列
    }
    // 如果列数没有变化，说明没有空列被移除，返回原电路
    if (newColumns.length === this.columns.length) return this;
    return new CircuitDefinition(this.numQubits, newColumns); // 返回新的电路定义
  }
}
