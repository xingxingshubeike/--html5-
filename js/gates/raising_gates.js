// Example1/js/gates/raising_gates.js

/**
 * 创建绕 Z 轴顺时针旋转的矩阵 Rz(-2*PI*t)。
 * Rz(theta) = [[exp(-i*theta/2), 0], [0, exp(i*theta/2)]]
 * For theta = -2*PI*t, theta/2 = -PI*t.
 * Rz(-2*PI*t) = [[exp(i*PI*t), 0], [0, exp(-i*PI*t)]]
 * @param {number} t - 时间参数 (0 到 1)
 * @returns {Matrix}
 */
function Rz_raising_matrix(t) {
  const angle = Math.PI * t;
  const cos_angle = Math.cos(angle);
  const sin_angle = Math.sin(angle);
  return Matrix.square(
    new Complex(cos_angle, sin_angle), // exp(i*PI*t)
    Complex.ZERO,
    Complex.ZERO,
    new Complex(cos_angle, -sin_angle) // exp(-i*PI*t)
  );
}

/**
 * 创建绕 Y 轴顺时针旋转的矩阵 Ry(-2*PI*t)。
 * 使用源文件中定义的 Pauli Y: sigma_y = [[0,i],[-i,0]]
 * Ry(theta) = cos(theta/2)*I - i*sin(theta/2)*sigma_y
 * = [[cos(theta/2), sin(theta/2)], [-sin(theta/2), cos(theta/2)]]
 * For theta = -2*PI*t, theta/2 = -PI*t.
 * Ry(-2*PI*t) = [[cos(-PI*t), sin(-PI*t)], [-sin(-PI*t), cos(-PI*t)]]
 * = [[cos(PI*t), -sin(PI*t)], [sin(PI*t), cos(PI*t)]]
 * @param {number} t - 时间参数 (0 到 1)
 * @returns {Matrix}
 */
function Ry_raising_matrix(t) {
  const angle = Math.PI * t;
  const cos_angle = Math.cos(angle);
  const sin_angle = Math.sin(angle);
  return Matrix.square(
    new Complex(cos_angle, 0),
    new Complex(-sin_angle, 0),
    new Complex(sin_angle, 0),
    new Complex(cos_angle, 0)
  );
}

/**
 * 创建绕 X 轴顺时针旋转的矩阵 Rx(-2*PI*t)。
 * Rx(theta) = [[cos(theta/2), -i*sin(theta/2)], [-i*sin(theta/2), cos(theta/2)]]
 * For theta = -2*PI*t, theta/2 = -PI*t.
 * Rx(-2*PI*t) = [[cos(-PI*t), -i*sin(-PI*t)], [-i*sin(-PI*t), cos(-PI*t)]]
 * = [[cos(PI*t), i*sin(PI*t)], [i*sin(PI*t), cos(PI*t)]]
 * @param {number} t - 时间参数 (0 到 1)
 * @returns {Matrix}
 */
function Rx_raising_matrix(t) {
  const angle = Math.PI * t;
  const cos_angle = Math.cos(angle);
  const sin_angle = Math.sin(angle);
  return Matrix.square(
    new Complex(cos_angle, 0),
    new Complex(0, sin_angle),
    new Complex(0, sin_angle),
    new Complex(cos_angle, 0)
  );
}

const ZRaisingGate = new GateBuilder()
  .setSymbol("Z^t")
  .setName("Z-Raising Gate")
  .setBlurb("量子态绕Z轴顺时针匀速转动 (t 从 0 到 1)。矩阵为 Rz(-2πt)。")
  .markAsTimeDependent(true) // 标记为时间依赖
  .setMatrixGenerator(Rz_raising_matrix) // 设置矩阵生成函数
  .build();

const YRaisingGate = new GateBuilder()
  .setSymbol("Y^t")
  .setName("Y-Raising Gate")
  .setBlurb("量子态绕Y轴顺时针匀速转动 (t 从 0 到 1)。矩阵为 Ry(-2πt)。")
  .markAsTimeDependent(true)
  .setMatrixGenerator(Ry_raising_matrix)
  .build();

const XRaisingGate = new GateBuilder()
  .setSymbol("X^t")
  .setName("X-Raising Gate")
  .setBlurb("量子态绕X轴顺时针匀速转动 (t 从 0 到 1)。矩阵为 Rx(-2πt)。")
  .markAsTimeDependent(true)
  .setMatrixGenerator(Rx_raising_matrix)
  .build();

const GATE_DEFINITIONS_RAISING = {
  "Z^t": ZRaisingGate,
  "Y^t": YRaisingGate,
  "X^t": XRaisingGate,
};
