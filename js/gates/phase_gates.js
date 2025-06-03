// js/gates/phase_gates.js
// 定义相位门 (S, T) 及其厄米共轭门 (S†, T†)。

// S门 (也称为 sqrt(Z) 门或 Phase 门) 的矩阵: [[1, 0], [0, i]]
const S_GATE_MATRIX = Matrix.square(1, 0, 0, Complex.I); //
// T门 (也称为 π/8 门) 的矩阵: [[1, 0], [0, e^(iπ/4)]]
const T_GATE_MATRIX = Matrix.square(
  //
  1,
  0,
  0,
  new Complex(Math.sqrt(0.5), Math.sqrt(0.5)) // e^(iπ/4) = cos(π/4) + i*sin(π/4) = 1/√2 + i/√2
);

// S† (S dagger) 门的矩阵，即S门的厄米共轭
const S_DAG_GATE_MATRIX = S_GATE_MATRIX.adjoint(); //
// T† (T dagger) 门的矩阵，即T门的厄米共轭
const T_DAG_GATE_MATRIX = T_GATE_MATRIX.adjoint(); //

// S门
const SGate = new GateBuilder() //
  .setSymbol("S") //
  .setName("S Gate (Phase Gate)") //
  .setBlurb("Rotates |1⟩ by π/2 around Z axis") // 描述：将|1⟩态绕Z轴旋转π/2
  .setMatrix(S_GATE_MATRIX) //
  .build(); //

// S† 门
const SDaggerGate = new GateBuilder() //
  .setSymbol("S†") //
  .setName("S† Gate (Adjoint Phase Gate)") //
  .setBlurb("Rotates |1⟩ by -π/2 around Z axis") // 描述：将|1⟩态绕Z轴旋转-π/2
  .setMatrix(S_DAG_GATE_MATRIX) //
  .build(); //

// T门
const TGate = new GateBuilder() //
  .setSymbol("T") //
  .setName("T Gate (π/8 Gate)") //
  .setBlurb("Rotates |1⟩ by π/4 around Z axis") // 描述：将|1⟩态绕Z轴旋转π/4
  .setMatrix(T_GATE_MATRIX) //
  .build(); //

// T† 门
const TDaggerGate = new GateBuilder() //
  .setSymbol("T†") //
  .setName("T† Gate (Adjoint π/8 Gate)") //
  .setBlurb("Rotates |1⟩ by -π/4 around Z axis") // 描述：将|1⟩态绕Z轴旋转-π/4
  .setMatrix(T_DAG_GATE_MATRIX) //
  .build(); //

// 存储相位门定义的集合
const GATE_DEFINITIONS_PHASE = {
  S: SGate,
  "S†": SDaggerGate, // 键名使用 "S†"
  T: TGate,
  "T†": TDaggerGate, // 键名使用 "T†"
};
