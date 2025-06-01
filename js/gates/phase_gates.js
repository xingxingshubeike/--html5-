// js/gates/phase_gates.js

const S_GATE_MATRIX = Matrix.square(1, 0, 0, Complex.I);
const T_GATE_MATRIX = Matrix.square(
  1,
  0,
  0,
  new Complex(Math.sqrt(0.5), Math.sqrt(0.5))
); // e^(i*pi/4)

const S_DAG_GATE_MATRIX = S_GATE_MATRIX.adjoint();
const T_DAG_GATE_MATRIX = T_GATE_MATRIX.adjoint();

const SGate = new GateBuilder()
  .setSymbol("S")
  .setName("S Gate (Phase Gate)")
  .setBlurb("Rotates |1⟩ by π/2 around Z axis")
  .setMatrix(S_GATE_MATRIX)
  .build();

const SDaggerGate = new GateBuilder()
  .setSymbol("S†")
  .setName("S† Gate (Adjoint Phase Gate)")
  .setBlurb("Rotates |1⟩ by -π/2 around Z axis")
  .setMatrix(S_DAG_GATE_MATRIX)
  .build();

const TGate = new GateBuilder()
  .setSymbol("T")
  .setName("T Gate (π/8 Gate)")
  .setBlurb("Rotates |1⟩ by π/4 around Z axis")
  .setMatrix(T_GATE_MATRIX)
  .build();

const TDaggerGate = new GateBuilder()
  .setSymbol("T†")
  .setName("T† Gate (Adjoint π/8 Gate)")
  .setBlurb("Rotates |1⟩ by -π/4 around Z axis")
  .setMatrix(T_DAG_GATE_MATRIX)
  .build();

const GATE_DEFINITIONS_PHASE = {
  S: SGate,
  "S†": SDaggerGate,
  T: TGate,
  "T†": TDaggerGate,
};
