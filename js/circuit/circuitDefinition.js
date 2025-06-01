// js/circuit/circuitDefinition.js
// Simplified version inspired by Quirk-master/src/circuit/CircuitDefinition.js

const MAX_QUBITS = 4;
const MIN_QUBITS = 1;

class CircuitDefinition {
  /**
   * @param {number} numQubits - The number of qubits in the circuit.
   * @param {Array<GateColumn>} columns - An array of GateColumn objects.
   */
  constructor(numQubits, columns = []) {
    if (numQubits < MIN_QUBITS || numQubits > MAX_QUBITS) {
      throw new Error(
        `Number of qubits must be between ${MIN_QUBITS} and ${MAX_QUBITS}.`
      );
    }
    this.numQubits = numQubits;
    this.columns = columns.map((col) => {
      // Ensure all columns have the correct number of gate slots
      const newGates = new Array(numQubits).fill(undefined);
      if (col && col.gates) {
        for (let i = 0; i < Math.min(col.gates.length, numQubits); i++) {
          newGates[i] = col.gates[i];
        }
      }
      return new GateColumn(newGates);
    });
  }

  /**
   * @param {number} colIndex
   * @param {number} wireIndex
   * @returns {Gate|undefined} The gate at the specified position, or undefined if empty or out of bounds.
   */
  gateAt(colIndex, wireIndex) {
    if (
      colIndex < 0 ||
      colIndex >= this.columns.length ||
      wireIndex < 0 ||
      wireIndex >= this.numQubits
    ) {
      return undefined;
    }
    return this.columns[colIndex].gates[wireIndex];
  }

  /**
   * Places a gate at a specified column and wire.
   * Handles multi-qubit gates by ensuring enough space and clearing covered slots.
   * If a gate is dropped on another gate, the old gate is replaced.
   * @param {Gate} gate - The gate to place.
   * @param {number} colIndex - The target column index.
   * @param {number} wireIndex - The target wire index (top-most wire for multi-qubit gates).
   * @returns {CircuitDefinition} A new CircuitDefinition with the gate placed.
   */
  withGatePlaced(gate, colIndex, wireIndex) {
    const newColumns = this.columns.map((c) => c.copy());

    // Ensure enough columns exist
    while (colIndex >= newColumns.length) {
      newColumns.push(GateColumn.empty(this.numQubits));
    }

    // Clear area for the new gate (and any gates it would overlap in the same column)
    for (let r = 0; r < this.numQubits; r++) {
      // Clear existing gates that the new gate's body would vertically overlap at its target column
      if (r >= wireIndex && r < wireIndex + gate.height) {
        if (
          newColumns[colIndex].gates[r] &&
          newColumns[colIndex].gates[r] !== gate
        ) {
          // TODO: Handle removing multi-qubit gates more gracefully if they were here
        }
        newColumns[colIndex].gates[r] = undefined; // Clear for main body
      }
    }
    // Also clear for multi-column gates (if any)
    for (let c = 0; c < gate.width; c++) {
      if (colIndex + c < newColumns.length) {
        for (let r = 0; r < gate.height; r++) {
          if (wireIndex + r < this.numQubits) {
            if (c > 0 || r > 0) {
              // Don't clear the primary slot again
              newColumns[colIndex + c].gates[wireIndex + r] = undefined;
            }
          }
        }
      }
    }

    // Place the new gate
    if (
      wireIndex + gate.height <= this.numQubits &&
      colIndex + gate.width <= newColumns.length
    ) {
      newColumns[colIndex].gates[wireIndex] = gate;
    } else {
      console.warn("Gate placement out of bounds or not enough space.");
      // Potentially return `this` or throw an error, depending on desired behavior
      return this; // For now, return original if placement fails
    }

    return new CircuitDefinition(this.numQubits, newColumns);
  }

  /**
   * Removes a gate from the specified location.
   * If it's a multi-qubit/column gate, its main slot is cleared.
   * @param {number} colIndex
   * @param {number} wireIndex
   * @returns {CircuitDefinition} A new CircuitDefinition with the gate removed.
   */
  withGateRemoved(colIndex, wireIndex) {
    if (
      colIndex < 0 ||
      colIndex >= this.columns.length ||
      wireIndex < 0 ||
      wireIndex >= this.numQubits
    ) {
      return this; // Out of bounds
    }
    const newColumns = this.columns.map((c) => c.copy());
    newColumns[colIndex].gates[wireIndex] = undefined;
    // Note: This doesn't automatically handle removing "shadows" of multi-qubit/column gates.
    // A more robust version would look up the gate's definition to clear all its spanned slots.
    return new CircuitDefinition(this.numQubits, newColumns);
  }

  /**
   * @returns {boolean} True if the circuit has no gates.
   */
  isEmpty() {
    return this.columns.every((col) => col.isEmpty());
  }

  /**
   * @param {CircuitDefinition|*} other
   * @returns {boolean}
   */
  isEqualTo(other) {
    if (!(other instanceof CircuitDefinition)) return false;
    if (this.numQubits !== other.numQubits) return false;
    if (this.columns.length !== other.columns.length) return false;
    for (let i = 0; i < this.columns.length; i++) {
      if (!this.columns[i].isEqualTo(other.columns[i])) return false;
    }
    return true;
  }

  /**
   * Creates an empty circuit with a default number of qubits.
   * @param {number} numQubits
   * @returns {CircuitDefinition}
   */
  static empty(numQubits = 2) {
    return new CircuitDefinition(numQubits, []);
  }

  /**
   * Returns a new CircuitDefinition with a potentially different number of qubits.
   * Gates outside the new range are discarded. New wires are initialized empty.
   * @param {number} newNumQubits
   * @returns {CircuitDefinition}
   */
  withNumQubits(newNumQubits) {
    newNumQubits = Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, newNumQubits));
    if (newNumQubits === this.numQubits) return this;

    const newColumns = this.columns.map((col) => {
      const newGates = new Array(newNumQubits).fill(undefined);
      for (let i = 0; i < Math.min(this.numQubits, newNumQubits); i++) {
        const gate = col.gates[i];
        if (gate && i + gate.height <= newNumQubits) {
          // Check if gate still fits
          newGates[i] = gate;
        }
      }
      return new GateColumn(newGates);
    });
    return new CircuitDefinition(newNumQubits, newColumns);
  }

  /**
   * Returns a new CircuitDefinition with a specific column possibly removed or an empty one added.
   * @param {number} colIndex - The index of the column to modify.
   * @param {GateColumn | null} newColumn - The new column to insert. If null, the column is removed.
   * @returns {CircuitDefinition}
   */
  withColumnAt(colIndex, newColumn) {
    const newColumns = this.columns.map((c) => c.copy());
    if (newColumn === null) {
      // Remove column
      if (colIndex >= 0 && colIndex < newColumns.length) {
        newColumns.splice(colIndex, 1);
      }
    } else {
      // Insert or replace column
      while (colIndex >= newColumns.length) {
        newColumns.push(GateColumn.empty(this.numQubits));
      }
      newColumns[colIndex] = newColumn;
    }
    return new CircuitDefinition(this.numQubits, newColumns);
  }

  /**
   * Returns the maximum wire index that has a gate or needs to exist due to a multi-qubit gate.
   * @returns {number}
   */
  minimumRequiredWireCount() {
    let maxWire = 0;
    this.columns.forEach((column) => {
      column.gates.forEach((gate, wireIndex) => {
        if (gate) {
          maxWire = Math.max(maxWire, wireIndex + gate.height);
        }
      });
    });
    return Math.max(this.numQubits, maxWire); // Ensure it's at least the current numQubits
  }

  /**
   * Removes empty columns from the end of the circuit.
   * @returns {CircuitDefinition}
   */
  trimmed() {
    let newColumns = [...this.columns];
    while (
      newColumns.length > 0 &&
      newColumns[newColumns.length - 1].isEmpty()
    ) {
      newColumns.pop();
    }
    if (newColumns.length === this.columns.length) return this;
    return new CircuitDefinition(this.numQubits, newColumns);
  }
}
