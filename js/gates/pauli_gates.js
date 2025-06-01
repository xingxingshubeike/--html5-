// js/gates/pauli_gates.js

const PauliX = new GateBuilder()
  .setSymbol("+")
  .setName("Pauli X")
  .setBlurb("Bit flip gate (NOT gate)")
  .setMatrix(Matrix.PAULI_X)
  .build();

const PauliY = new GateBuilder()
  .setSymbol("Y")
  .setName("Pauli Y")
  .setBlurb("Bit and phase flip gate")
  .setMatrix(Matrix.PAULI_Y)
  .build();

const PauliZ = new GateBuilder()
  .setSymbol("Z")
  .setName("Pauli Z")
  .setBlurb("Phase flip gate")
  .setMatrix(Matrix.PAULI_Z)
  .build();

const GATE_DEFINITIONS_PAULI = {
  X: PauliX,
  Y: PauliY,
  Z: PauliZ,
};
