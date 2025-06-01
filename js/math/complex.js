// Simplified Complex Number class inspired by Quirk's Complex.js
// Source: Adapted from Quirk-master/src/math/Complex.js

class Complex {
  /**
   * @param {!number} real The real part of the Complex number. The 'a' in a + bi.
   * @param {!number} imag The imaginary part of the Complex number. The 'b' in a + bi.
   */
  constructor(real, imag) {
    this.real = real;
    this.imag = imag;
  }

  /**
   * @param {!number|!Complex|*} other
   * @returns {!boolean}
   */
  isEqualTo(other) {
    if (other instanceof Complex) {
      return this.real === other.real && this.imag === other.imag;
    }
    if (typeof other === "number") {
      return this.real === other && this.imag === 0;
    }
    return false;
  }

  /**
   * @param {!number|!Complex|*} other
   * @param {!number} epsilon
   * @returns {!boolean}
   */
  isApproximatelyEqualTo(other, epsilon) {
    const otherComplex = Complex.from(other);
    return (
      Math.abs(this.real - otherComplex.real) <= epsilon &&
      Math.abs(this.imag - otherComplex.imag) <= epsilon
    );
  }

  /**
   * @returns {!string}
   */
  toString(
    formatOptions = { fixedDigits: 2, includePlusForPositiveImag: true }
  ) {
    const { fixedDigits, includePlusForPositiveImag } = formatOptions;
    const r = this.real.toFixed(fixedDigits);
    const i = this.imag.toFixed(fixedDigits);

    if (this.imag === 0) return r;
    if (this.real === 0) return `${i}i`;
    if (this.imag < 0) return `${r}${i}i`;
    if (includePlusForPositiveImag) return `${r}+${i}i`;
    return `${r}${i}i`;
  }

  /**
   * @returns {!number}
   */
  abs() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  /**
   * @returns {!number}
   */
  norm2() {
    return this.real * this.real + this.imag * this.imag;
  }

  /**
   * @returns {!Complex}
   */
  conjugate() {
    return new Complex(this.real, -this.imag);
  }

  /**
   * @param {!number|!Complex} v
   * @returns {!Complex}
   */
  plus(v) {
    const c = Complex.from(v);
    return new Complex(this.real + c.real, this.imag + c.imag);
  }

  /**
   * @param {!number|!Complex} v
   * @returns {!Complex}
   */
  minus(v) {
    const c = Complex.from(v);
    return new Complex(this.real - c.real, this.imag - c.imag);
  }

  /**
   * @param {!number|!Complex} v
   * @returns {!Complex}
   */
  times(v) {
    const c = Complex.from(v);
    return new Complex(
      this.real * c.real - this.imag * c.imag,
      this.real * c.imag + this.imag * c.real
    );
  }

  /**
   * @param {!number|!Complex} v
   * @returns {!Complex}
   */
  dividedBy(v) {
    const c = Complex.from(v);
    const d = c.norm2();
    if (d === 0) throw new Error("Division by zero.");
    const n = this.times(c.conjugate());
    return new Complex(n.real / d, n.imag / d);
  }

  /**
   * @param {!number|!Complex} v
   * @returns {!Complex}
   */
  static from(v) {
    if (v instanceof Complex) return v;
    if (typeof v === "number") return new Complex(v, 0);
    throw new Error("Cannot convert to Complex: " + v);
  }
}

Complex.ZERO = new Complex(0, 0);
Complex.ONE = new Complex(1, 0);
Complex.I = new Complex(0, 1);
