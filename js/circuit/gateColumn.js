// js/circuit/gateColumn.js
// Simplified version inspired by Quirk-master/src/circuit/GateColumn.js

class GateColumn {
  /**
   * @param {Array<Gate|undefined>} gates - An array representing gates on each wire for this column.
   */
  constructor(gates = []) {
    this.gates = gates; // Undefined for empty slots
  }

  /**
   * @param {number} numQubits
   * @returns {!GateColumn} An empty column for the given number of qubits.
   */
  static empty(numQubits) {
    return new GateColumn(new Array(numQubits).fill(undefined));
  }

  /**
   * @returns {boolean} True if the column contains no gates.
   */
  isEmpty() {
    return this.gates.every((g) => g === undefined);
  }

  /**
   * @param {GateColumn|*} other
   * @returns {boolean}
   */
  isEqualTo(other) {
    if (!(other instanceof GateColumn)) return false;
    if (this.gates.length !== other.gates.length) return false;
    for (let i = 0; i < this.gates.length; i++) {
      const g1 = this.gates[i];
      const g2 = other.gates[i];
      if (g1 === undefined && g2 === undefined) continue;
      if (g1 === undefined || g2 === undefined) return false; // One is undefined, the other is not
      if (g1.id !== g2.id) return false; // Simplistic comparison, Quirk's is more robust
      // TODO: For a more robust comparison, compare parameters if gates are parametric
    }
    return true;
  }

  /**
   * @returns {number} The minimum number of wires required to accommodate the gates in this column.
   */
  minimumRequiredWireCount() {
    let maxWire = 0;
    this.gates.forEach((gate, wireIndex) => {
      if (gate) {
        maxWire = Math.max(maxWire, wireIndex + gate.height);
      }
    });
    return maxWire;
  }

  /**
   * Creates a copy of this GateColumn.
   * @returns {GateColumn}
   */
  copy() {
    return new GateColumn(this.gates.map((g) => (g ? g.copy() : undefined)));
  }
}
