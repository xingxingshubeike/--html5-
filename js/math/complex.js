// Simplified Complex Number class inspired by Quirk's Complex.js
// Source: Adapted from Quirk-master/src/math/Complex.js
// 定义复数及其基本运算。

class Complex {
  /**
   * 构造函数
   * @param {!number} real - 复数的实部 (a + bi 中的 a)。
   * @param {!number} imag - 复数的虚部 (a + bi 中的 b)。
   */
  constructor(real, imag) {
    this.real = real; // 实部
    this.imag = imag; // 虚部
  }

  /**
   * 检查当前复数是否与另一个值相等。
   * @param {!number|!Complex|*} other - 要比较的另一个值 (可以是数字或Complex对象)。
   * @returns {!boolean} 如果相等则返回true。
   */
  isEqualTo(other) {
    if (other instanceof Complex) {
      // 如果对方是Complex对象
      return this.real === other.real && this.imag === other.imag; // 比较实部和虚部
    }
    if (typeof other === "number") {
      // 如果对方是数字 (实数)
      return this.real === other && this.imag === 0; // 比较实部，且虚部必须为0
    }
    return false; // 其他情况均不等
  }

  /**
   * 检查当前复数是否在给定容差内约等于另一个值。
   * @param {!number|!Complex|*} other - 要比较的另一个值。
   * @param {!number} epsilon - 容差。
   * @returns {!boolean} 如果约等于则返回true。
   */
  isApproximatelyEqualTo(other, epsilon) {
    const otherComplex = Complex.from(other); // 将对方转换为Complex对象
    // 检查实部和虚部的差的绝对值是否都小于等于容差
    return (
      Math.abs(this.real - otherComplex.real) <= epsilon &&
      Math.abs(this.imag - otherComplex.imag) <= epsilon
    );
  }

  /**
   * 返回复数的字符串表示形式。
   * @param {object} [formatOptions] - 格式化选项。
   * @param {number} [formatOptions.fixedDigits=2] - 小数位数。
   * @param {boolean} [formatOptions.includePlusForPositiveImag=true] - 正虚部是否显示"+"号。
   * @returns {!string} 例如 "1.00+2.00i"。
   */
  toString(
    formatOptions = { fixedDigits: 2, includePlusForPositiveImag: true }
  ) {
    const { fixedDigits, includePlusForPositiveImag } = formatOptions;
    const r = this.real.toFixed(fixedDigits); // 格式化实部
    const i = this.imag.toFixed(fixedDigits); // 格式化虚部

    if (this.imag == 0) return r; // 如果虚部为0，只返回实部
    if (this.real == 0) return `${i}i`; // 如果实部为0，只返回虚部 (例如 "2.00i")
    if (this.imag < 0) return `${r}${i}i`; // 如果虚部为负，例如 "1.00-2.00i" (toFixed会自动处理负号)
    // 如果虚部为正
    if (includePlusForPositiveImag) return `${r}+${i}i`; // 例如 "1.00+2.00i"
    return `${r}${i}i`; // 例如 "1.002.00i" (如果不加号)
  }

  /**
   * 计算复数的绝对值 (模)。
   * @returns {!number} sqrt(real^2 + imag^2)。
   */
  abs() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  /**
   * 计算复数的模的平方。
   * @returns {!number} real^2 + imag^2。
   */
  norm2() {
    return this.real * this.real + this.imag * this.imag;
  }

  /**
   * 计算复数的共轭。
   * @returns {!Complex} (a - bi) 如果原复数是 (a + bi)。
   */
  conjugate() {
    return new Complex(this.real, -this.imag);
  }

  /**
   * 复数加法。
   * @param {!number|!Complex} v - 要加的值。
   * @returns {!Complex} 当前复数与v相加的结果。
   */
  plus(v) {
    const c = Complex.from(v); // 将v转换为Complex对象
    return new Complex(this.real + c.real, this.imag + c.imag);
  }

  /**
   * 复数减法。
   * @param {!number|!Complex} v - 要减去的值。
   * @returns {!Complex} 当前复数减去v的结果。
   */
  minus(v) {
    const c = Complex.from(v);
    return new Complex(this.real - c.real, this.imag - c.imag);
  }

  /**
   * 复数乘法。
   * @param {!number|!Complex} v - 要乘以的值。
   * @returns {!Complex} 当前复数与v相乘的结果。
   * (a+bi)(c+di) = (ac-bd) + (ad+bc)i
   */
  times(v) {
    const c = Complex.from(v);
    return new Complex(
      this.real * c.real - this.imag * c.imag, // 实部
      this.real * c.imag + this.imag * c.real // 虚部
    );
  }

  /**
   * 复数除法。
   * @param {!number|!Complex} v - 除数。
   * @returns {!Complex} 当前复数除以v的结果。
   * (a+bi)/(c+di) = [(a+bi)(c-di)] / [(c+di)(c-di)] = [(ac+bd) + (bc-ad)i] / (c^2+d^2)
   */
  dividedBy(v) {
    const c = Complex.from(v);
    const d = c.norm2(); // 除数的模平方 (c^2+d^2)
    if (d === 0) throw new Error("Division by zero."); // 避免除以零
    const n = this.times(c.conjugate()); // 分子 = 当前复数 * 除数的共轭
    return new Complex(n.real / d, n.imag / d); // 返回结果
  }

  /**
   * 静态方法，从数字或已有的Complex对象创建新的Complex对象。
   * @param {!number|!Complex} v - 输入值。
   * @returns {!Complex}
   * @throws {Error} 如果无法转换。
   */
  static from(v) {
    if (v instanceof Complex) return v; // 如果已经是Complex对象，直接返回
    if (typeof v === "number") return new Complex(v, 0); // 如果是数字，创建虚部为0的复数
    throw new Error("Cannot convert to Complex: " + v); // 其他类型无法转换
  }
}

// 定义常用的复数常量
Complex.ZERO = new Complex(0, 0); // 0 + 0i
Complex.ONE = new Complex(1, 0); // 1 + 0i
Complex.I = new Complex(0, 1); // 0 + 1i
