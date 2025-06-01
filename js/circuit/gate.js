// Simplified Gate class and GateBuilder inspired by Quirk
// Source: Adapted from Quirk-master/src/circuit/Gate.js

class Gate {
  constructor() {
    this.symbol = ""; // Text shown when drawing the gate
    this.name = ""; // Tooltip title
    this.blurb = ""; // Tooltip details
    this.matrix = null; // Operation matrix
    this.width = 1; // Columns spanned
    this.height = 1; // Wires spanned
    this.id = ""; // Unique ID for serialization and palette key
    this.customDrawer = null; // Optional custom drawing function
    this.controls = null; // Control information if this is a control gate
    this.param = undefined; // Optional parameter for gates like P-gate
    this._isDisplayGate = false; // If true, this gate visualizes state rather than altering it.
    this._isControlGate = false;
    this.isTimeDependent = false; // NEW: Flag for time-dependent gates
    this.matrixGenerator = null; // NEW: Function (t) => Matrix for time-dependent gates
  }

  get isDisplayGate() {
    return this._isDisplayGate;
  }

  get isControlGate() {
    return this._isControlGate;
  }

  // Basic implementation for applying gate to a state vector
  // This will be expanded in a full Circuit.js or simulator.js
  applyToState(stateVector) {
    if (!this.matrix) {
      console.warn(`Gate ${this.name} has no matrix to apply.`);
      return stateVector;
    }
    // This is a placeholder. Actual application needs to consider gate height
    // and specific qubits it acts upon within a larger state vector.
    // For a single-qubit gate acting on a single-qubit state:
    if (
      this.height === 1 &&
      stateVector.height === 2 &&
      stateVector.width === 1
    ) {
      return this.matrix.times(stateVector);
    }
    // For multi-qubit gates or gates acting on parts of a larger system,
    // this needs to be more sophisticated (e.g. tensor products, controlled ops).
    // console.warn("ApplyToState needs more sophisticated multi-qubit logic for gate:", this.name);
    return stateVector; // Return unchanged if not a simple case
  }

  /**
   * @returns {Gate} A copy of this gate.
   */
  copy() {
    const newGate = new Gate();
    Object.assign(newGate, this); // Copies all properties, including new ones

    // Deep copy matrix if it exists and is not time-dependent (or handle initial matrix for time-dependent)
    if (this.matrix) {
      newGate.matrix = new Matrix(
        this.matrix.width,
        this.matrix.height,
        new Float32Array(this.matrix.buffer)
      );
    }
    // matrixGenerator is a function, so shallow copy is fine.
    return newGate;
  }
}

class GateBuilder {
  constructor() {
    this.gate = new Gate();
  }

  setSymbol(symbol) {
    this.gate.symbol = symbol;
    if (!this.gate.id) this.gate.id = symbol; // Default id to symbol if not set
    return this;
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
    // Automatically set height based on matrix if not already set
    if (matrix && this.gate.height === 1 && matrix.height > 1) {
      // Assuming matrix is for N qubits, its size is 2^N x 2^N
      const numQubits = Math.log2(matrix.height);
      if (Number.isInteger(numQubits) && numQubits > 0) {
        this.gate.height = numQubits;
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

  markAsTimeDependent(isTD) {
    // NEW method
    this.gate.isTimeDependent = isTD;
    return this;
  }

  setMatrixGenerator(generatorFn) {
    // NEW method
    this.gate.matrixGenerator = generatorFn;
    return this;
  }

  setParam(param) {
    this.gate.param = param;
    return this;
  }

  build() {
    if (!this.gate.id) {
      this.gate.id =
        this.gate.symbol || `gate-${Math.random().toString(36).substr(2, 9)}`;
    }
    // If time-dependent, generate initial matrix for t=0
    if (
      this.gate.isTimeDependent &&
      this.gate.matrixGenerator &&
      !this.gate.matrix
    ) {
      this.gate.matrix = this.gate.matrixGenerator(0);
    }
    return this.gate;
  }
}
