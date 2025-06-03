// Example1/js/gates/raising_gates.js
// 定义随时间参数 t 演化的旋转门 (Rz, Ry, Rx 的 t 次幂形式)。
// 这些门通常表示为 R_axis(-2πt)，意味着当 t 从 0 变为 1 时，绕轴顺时针旋转 2π。

/**
 * 创建绕 Z 轴顺时针旋转的矩阵 Rz(-2*PI*t)。
 * Rz(theta) = [[exp(-i*theta/2), 0], [0, exp(i*theta/2)]]
 * 对于 theta = -2*PI*t, 则 theta/2 = -PI*t.
 * Rz(-2*PI*t) = [[exp(i*PI*t), 0], [0, exp(-i*PI*t)]]
 * exp(i*angle) = cos(angle) + i*sin(angle)
 * @param {number} t - 时间参数 (通常从 0 到 1)。
 * @returns {Matrix} 对应的旋转矩阵。
 */
function Rz_raising_matrix(t) {
  const angle = Math.PI * t; // 实际的旋转角度 PI*t
  const cos_angle = Math.cos(angle);
  const sin_angle = Math.sin(angle);
  return Matrix.square(
    //
    new Complex(cos_angle, sin_angle), // exp(i*PI*t)
    Complex.ZERO, //
    Complex.ZERO, //
    new Complex(cos_angle, -sin_angle) // exp(-i*PI*t)
  );
}

/**
 * 创建绕 Y 轴顺时针旋转的矩阵 Ry(-2*PI*t)。
 * Pauli Y: sigma_y = [[0, -i], [i, 0]] (标准定义)
 * 文件中 Matrix.PAULI_Y 定义为 [[0, -i], [i, 0]]。
 * Ry(theta) = cos(theta/2)*I - i*sin(theta/2)*sigma_y
 * = [[cos(theta/2), -sin(theta/2)], [sin(theta/2), cos(theta/2)]] (注意：这是标准的Ry定义，不是exp(-i*theta*Y/2))
 * (如果使用 exp(-i*theta*sigma_y/2)，则 sin项前应有 -i, 但这里是标准的实数 Ry 矩阵)
 * 对于 theta = -2*PI*t, 则 theta/2 = -PI*t.
 * Ry(-2*PI*t) = [[cos(-PI*t), -sin(-PI*t)], [sin(-PI*t), cos(-PI*t)]]
 * = [[cos(PI*t),  sin(PI*t)], [-sin(PI*t), cos(PI*t)]]
 * 文件中的实现是：[[cos(PI*t), -sin(PI*t)], [sin(PI*t), cos(PI*t)]]
 * 这对应于 Ry(theta) = [[cos(theta/2), -sin(theta/2)], [sin(theta/2), cos(theta/2)]] 中 theta/2 = -PI*t (即 theta = -2*PI*t)
 * 所以这是标准的 Ry(-2*PI*t) 矩阵。
 * @param {number} t - 时间参数 (通常从 0 到 1)。
 * @returns {Matrix} 对应的旋转矩阵。
 */
function Ry_raising_matrix(t) {
  const angle = Math.PI * t; // 实际的旋转角度 PI*t (对应 theta/2)
  const cos_angle = Math.cos(angle);
  const sin_angle = Math.sin(angle);
  return Matrix.square(
    //
    new Complex(cos_angle, 0), // cos(PI*t)
    new Complex(-sin_angle, 0), // -sin(PI*t) (代码中是 sin(-PI*t))
    new Complex(sin_angle, 0), //  sin(PI*t) (代码中是 -sin(-PI*t))
    new Complex(cos_angle, 0) // cos(PI*t)
  );
}

/**
 * 创建绕 X 轴顺时针旋转的矩阵 Rx(-2*PI*t)。
 * Rx(theta) = [[cos(theta/2), -i*sin(theta/2)], [-i*sin(theta/2), cos(theta/2)]]
 * 对于 theta = -2*PI*t, 则 theta/2 = -PI*t.
 * Rx(-2*PI*t) = [[cos(-PI*t), -i*sin(-PI*t)], [-i*sin(-PI*t), cos(-PI*t)]]
 * = [[cos(PI*t),  i*sin(PI*t)], [i*sin(PI*t),  cos(PI*t)]]
 * @param {number} t - 时间参数 (通常从 0 到 1)。
 * @returns {Matrix} 对应的旋转矩阵。
 */
function Rx_raising_matrix(t) {
  const angle = Math.PI * t; // 实际的旋转角度 PI*t
  const cos_angle = Math.cos(angle);
  const sin_angle = Math.sin(angle);
  return Matrix.square(
    //
    new Complex(cos_angle, 0), // cos(PI*t)
    new Complex(0, sin_angle), // i*sin(PI*t)
    new Complex(0, sin_angle), // i*sin(PI*t)
    new Complex(cos_angle, 0) // cos(PI*t)
  );
}

// Z^t 门 (时间演化的Z轴旋转门)
const ZRaisingGate = new GateBuilder() //
  .setSymbol("Z^t") //
  .setName("Z-Raising Gate") //
  .setBlurb("量子态绕Z轴顺时针匀速转动 (t 从 0 到 1)。矩阵为 Rz(-2πt)。") // 中文描述
  .markAsTimeDependent(true) // 标记为时间依赖门
  .setMatrixGenerator(Rz_raising_matrix) // 设置矩阵生成函数
  .build(); //

// Y^t 门 (时间演化的Y轴旋转门)
const YRaisingGate = new GateBuilder() //
  .setSymbol("Y^t") //
  .setName("Y-Raising Gate") //
  .setBlurb("量子态绕Y轴顺时针匀速转动 (t 从 0 到 1)。矩阵为 Ry(-2πt)。") //
  .markAsTimeDependent(true) //
  .setMatrixGenerator(Ry_raising_matrix) //
  .build(); //

// X^t 门 (时间演化的X轴旋转门)
const XRaisingGate = new GateBuilder() //
  .setSymbol("X^t") //
  .setName("X-Raising Gate") //
  .setBlurb("量子态绕X轴顺时针匀速转动 (t 从 0 到 1)。矩阵为 Rx(-2πt)。") //
  .markAsTimeDependent(true) //
  .setMatrixGenerator(Rx_raising_matrix) //
  .build(); //

// 存储时间演化旋转门定义的集合
const GATE_DEFINITIONS_RAISING = {
  "Z^t": ZRaisingGate, // 键名使用符号 "Z^t"
  "Y^t": YRaisingGate, // 键名使用符号 "Y^t"
  "X^t": XRaisingGate, // 键名使用符号 "X^t"
};
