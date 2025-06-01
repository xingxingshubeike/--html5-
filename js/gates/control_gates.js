// js/gates/control_gates.js

const Control = new GateBuilder()
  .setSymbol("●")
  .setName("Control")
  .setBlurb("Conditions on this qubit being |1⟩")
  .markAsControlGate() // Special property to identify it as a control
  .build();

const AntiControl = new GateBuilder()
  .setSymbol("○")
  .setName("Anti-Control")
  .setBlurb("Conditions on this qubit being |0⟩")
  .markAsControlGate() // Special property to identify it as a control
  .build();

// CNOT will be a "compound" gate conceptually,
// built in the UI by placing a Control and an X.
// For the toolbox, we might offer a CNOT template or handle it via specific logic.
// For now, we only define the control symbols.
// A full CNOT operation matrix would be:
// const CNOT_MATRIX = Matrix.square(
//     1, 0, 0, 0,
//     0, 1, 0, 0,
//     0, 0, 0, 1,
//     0, 0, 1, 0
// );
// We won't assign it to a single toolbox gate here, as it's constructed.

const GATE_DEFINITIONS_CONTROL = {
  Control: Control,
  AntiControl: AntiControl,
  // CNOT: CnotGate (if we were to make it a single toolbox item)
};
