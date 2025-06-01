// Example1/js/ui/amplitudeDisplay.js
class AmplitudeDisplay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Amplitude canvas with id '${canvasId}' not found.`);
      return;
    }
    this.ctx = this.canvas.getContext("2d");
    this.painter = new Painter(this.canvas); // Use our Painter utility
  }

  /**
   * @param {Matrix} stateVector - A column vector representing the state's complex amplitudes.
   * @param {number} numQubits - The number of qubits.
   */
  update(stateVector, numQubits) {
    if (!this.canvas) return;
    // Use MathPainter to draw the amplitude bars
    MathPainter.drawAmplitudeBars(
      this.painter,
      stateVector,
      this.canvas,
      numQubits
    );
  }
}

export default AmplitudeDisplay;
