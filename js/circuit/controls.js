// js/circuit/controls.js
// Simplified version inspired by Quirk-master/src/circuit/Controls.js

class Controls {
  /**
   * @param {number} inclusionMask - A bitmask where set bits indicate a qubit is part of the control.
   * @param {number} desiredValueMask - A bitmask indicating the desired state (0 or 1) for included qubits.
   */
  constructor(inclusionMask, desiredValueMask) {
    this.inclusionMask = inclusionMask;
    this.desiredValueMask = desiredValueMask;
  }

  /**
   * Checks if a given computational basis state satisfies these controls.
   * @param {number} basisState - The computational basis state to check.
   * @returns {boolean}
   */
  isSatisfiedBy(basisState) {
    return (basisState & this.inclusionMask) === this.desiredValueMask;
  }

  /**
   * Creates controls for a single qubit.
   * @param {number} qubitIndex - The index of the control qubit.
   * @param {boolean} desiredValue - True for control-on-|1⟩, False for control-on-|0⟩.
   * @returns {!Controls}
   */
  static on(qubitIndex, desiredValue = true) {
    if (qubitIndex < 0) throw new Error("Qubit index cannot be negative.");
    const inclusion = 1 << qubitIndex;
    const desired = desiredValue ? 1 << qubitIndex : 0;
    return new Controls(inclusion, desired);
  }

  /**
   * Combines these controls with another set of controls using an AND logic.
   * @param {Controls} otherControls
   * @returns {Controls}
   * @throws {Error} if controls are contradictory.
   */
  and(otherControls) {
    const newInclusionMask = this.inclusionMask | otherControls.inclusionMask;

    // Check for contradictions
    const commonMask = this.inclusionMask & otherControls.inclusionMask;
    if (
      (this.desiredValueMask & commonMask) !==
      (otherControls.desiredValueMask & commonMask)
    ) {
      throw new Error("Contradictory controls.");
    }

    const newDesiredValueMask =
      this.desiredValueMask | otherControls.desiredValueMask;
    return new Controls(newInclusionMask, newDesiredValueMask);
  }

  /**
   * @returns {boolean} - True if these controls represent no actual control.
   */
  isNone() {
    return this.inclusionMask === 0;
  }

  /**
   * Creates a copy of these controls.
   * @returns {Controls}
   */
  copy() {
    return new Controls(this.inclusionMask, this.desiredValueMask);
  }

  /**
   * @returns {string} A string representation of the controls.
   */
  toString() {
    if (this.isNone()) return "Controls.NONE";
    let parts = [];
    for (let i = 0; i < 32; i++) {
      // Max reasonable qubits to check for string
      if ((this.inclusionMask >> i) & 1) {
        parts.push(`q${i}=${(this.desiredValueMask >> i) & 1}`);
      }
    }
    return `Controls(${parts.join(", ")})`;
  }
}

Controls.NONE = new Controls(0, 0);
