// Example1/js/circuit/circuitStats.js
// Simplified version inspired by Quirk-master/src/circuit/CircuitStats.js

class CircuitStats {
  /**
   * @param {CircuitDefinition} circuitDefinition
   * @param {Matrix} finalStateVector - A column vector representing the quantum state.
   */
  constructor(circuitDefinition, finalStateVector) {
    this.circuitDefinition = circuitDefinition;
    this.finalState = finalStateVector; // Should be a column vector

    if (
      !finalStateVector ||
      finalStateVector.width !== 1 ||
      finalStateVector.height !== 1 << circuitDefinition.numQubits
    ) {
      console.warn(
        "CircuitStats: finalStateVector is invalid or not provided. Defaulting to |0...0> state."
      );
      const numQubits = circuitDefinition.numQubits;
      const numStates = numQubits > 0 ? 1 << numQubits : 1; // Handle 0 qubits case if necessary
      const buffer = new Float32Array(numStates * 2);
      if (numStates > 0) {
        buffer[0] = 1; // Alpha for |0...0> is 1
      }
      this.finalState = new Matrix(1, numStates, buffer);
    }
  }

  /**
   * Calculates the probability of measuring each computational basis state.
   * @returns {number[]} An array of probabilities, index corresponds to basis state.
   */
  probabilities() {
    const numQubits = this.circuitDefinition.numQubits;
    if (numQubits === 0) return [1]; // Special case for 0 qubits
    const numStates = 1 << numQubits;
    const probs = new Array(numStates).fill(0);
    for (let i = 0; i < numStates; i++) {
      const amplitude = this.finalState.cell(0, i); // (0, i) for column vector
      probs[i] = amplitude.norm2();
    }
    return probs;
  }

  /**
   * Calculates the marginal probability for each qubit being in state |0> or |1>.
   * @returns {Array<Array<number>>} An array of arrays, where each inner array is [P(|0>), P(|1>)] for a qubit.
   * Example: [[P(q0=0), P(q0=1)], [P(q1=0), P(q1=1)], ...]
   */
  marginalProbabilitiesPerQubit() {
    const numQubits = this.circuitDefinition.numQubits;
    if (numQubits === 0) return [];

    const systemProbabilities = this.probabilities();
    const marginals = [];

    for (let q = 0; q < numQubits; q++) {
      let prob0 = 0;
      let prob1 = 0;
      for (let i = 0; i < systemProbabilities.length; i++) {
        if (!((i >> q) & 1)) {
          // If the q-th bit of i is 0
          prob0 += systemProbabilities[i];
        } else {
          // If the q-th bit of i is 1
          prob1 += systemProbabilities[i];
        }
      }
      marginals.push([prob0, prob1]);
    }
    return marginals;
  }

  /**
   * Calculates the density matrix for a specific qubit.
   * Assumes other qubits are traced out.
   * @param {number} qubitIndex - The index of the qubit.
   * @returns {Matrix} A 2x2 density matrix.
   */
  densityMatrix(qubitIndex) {
    if (qubitIndex < 0 || qubitIndex >= this.circuitDefinition.numQubits) {
      throw new Error(
        "Qubit index out of range for density matrix calculation."
      );
    }
    if (this.circuitDefinition.numQubits === 0) {
      // Handle 0-qubit case: perhaps return an empty or default matrix, or error
      // For Bloch sphere, it typically expects a 2x2 density matrix.
      // Returning a default |0> state density matrix.
      return Matrix.square(
        Complex.ONE,
        Complex.ZERO,
        Complex.ZERO,
        Complex.ZERO
      );
    }

    const numQubits = this.circuitDefinition.numQubits;
    const numStates = 1 << numQubits;

    // rho_00, rho_01, rho_10, rho_11
    const rhoElements = [
      Complex.ZERO,
      Complex.ZERO,
      Complex.ZERO,
      Complex.ZERO,
    ];

    for (let i = 0; i < numStates; i++) {
      const amplitude_i = this.finalState.cell(0, i);
      if (amplitude_i.isEqualTo(Complex.ZERO)) continue;

      const qubit_i_is_0 = ((i >> qubitIndex) & 1) === 0;

      if (qubit_i_is_0) {
        rhoElements[0] = rhoElements[0].plus(
          amplitude_i.times(amplitude_i.conjugate())
        );
      } else {
        rhoElements[3] = rhoElements[3].plus(
          amplitude_i.times(amplitude_i.conjugate())
        );
      }

      const j = i ^ (1 << qubitIndex); // State j is i with qubitIndex flipped
      // Only compute for one pair (e.g., i < j) to fill rho_01, then rho_10 is its conjugate
      // Consider the case where i is the state with qubitIndex=0 and j with qubitIndex=1 for rho_01
      if (qubit_i_is_0 && j > i) {
        // i has |0> at qubitIndex, j has |1>
        const amplitude_j = this.finalState.cell(0, j);
        rhoElements[1] = rhoElements[1].plus(
          amplitude_i.times(amplitude_j.conjugate())
        );
      }
    }
    // A more direct way for off-diagonals:
    // rho_01 = sum_{k where q_idx=0} sum_{l where q_idx=1 and l matches k on other qubits} psi_k * psi_l^*
    // Iterate all states i. If qubit at qubitIndex is 0:
    //   Let j be state i with qubitIndex flipped to 1.
    //   rho_01 += amplitude_i * conjugate(amplitude_j)
    // This ensures we sum over all basis states for the trace.
    // Let's refine rho_01 calculation:
    rhoElements[1] = Complex.ZERO; // Reset before recalculation for clarity
    for (let i = 0; i < numStates; i++) {
      // Check if the qubit at qubitIndex is |0> for this basis state i
      if (!((i >> qubitIndex) & 1)) {
        const amplitude_i_q0 = this.finalState.cell(0, i); // Amplitude of |...0...⟩
        if (amplitude_i_q0.isEqualTo(Complex.ZERO)) continue;

        // Construct state j which is identical to i but with qubit at qubitIndex flipped to |1>
        const j = i | (1 << qubitIndex);
        const amplitude_j_q1 = this.finalState.cell(0, j); // Amplitude of |...1...⟩

        rhoElements[1] = rhoElements[1].plus(
          amplitude_i_q0.times(amplitude_j_q1.conjugate())
        );
      }
    }
    rhoElements[2] = rhoElements[1].conjugate(); // rho_10 = (rho_01)*

    return Matrix.square(
      rhoElements[0],
      rhoElements[1],
      rhoElements[2],
      rhoElements[3]
    );
  }

  /**
   * Converts the density matrix of a single qubit to its Bloch vector (x, y, z).
   * @param {number} qubitIndex
   * @returns {{x: number, y: number, z: number}}
   */
  blochVector(qubitIndex) {
    const rho = this.densityMatrix(qubitIndex);
    const rho00 = rho.cell(0, 0).real;
    const rho11 = rho.cell(1, 1).real;
    const rho01 = rho.cell(1, 0); // This is rho_{01} (row 0, col 1)
    const rho10 = rho.cell(0, 1); // This is rho_{10} (row 1, col 0)

    const x = rho01.plus(rho10).real;
    const y = rho10.minus(rho01).times(Complex.I).real;
    const z = rho00 - rho11;

    return { x, y, z };
  }

  /**
   * Creates a CircuitStats object for an empty circuit (default initial state |0...0>).
   * @param {CircuitDefinition} circuitDefinition
   * @returns {CircuitStats}
   */
  static forEmptyCircuit(circuitDefinition) {
    const numQubits = circuitDefinition.numQubits;
    const numStates = numQubits > 0 ? 1 << numQubits : 1;
    const buffer = new Float32Array(numStates * 2);
    if (numQubits > 0) {
      buffer[0] = 1; // |0...0> state: amplitude is 1+0i
    } else if (numQubits === 0) {
      buffer[0] = 1; // Scalar 1 for 0 qubits
    }

    const initialStateVector = new Matrix(1, numStates, buffer);
    return new CircuitStats(circuitDefinition, initialStateVector);
  }
}
