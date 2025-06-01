// js/gates/hadamard_gate.js

const Hadamard = new GateBuilder()
  .setSymbol("H")
  .setName("Hadamard")
  .setBlurb("Creates superposition")
  .setMatrix(Matrix.HADAMARD)
  .build();

const GATE_DEFINITIONS_HADAMARD = {
  H: Hadamard,
};
