// Example1/js/ui/probabilityDisplay.js

class ProbabilityDisplay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Probability canvas with id '${canvasId}' not found.`);
      return;
    }
    this.ctx = this.canvas.getContext("2d");
    this.painter = new Painter(this.canvas);
  }

  /**
   * @param {Array<Array<number>>} marginalProbsPerQubit - Array of [P0, P1] for each qubit.
   * @param {number} numQubits - The number of qubits.
   */
  update(marginalProbsPerQubit, numQubits) {
    if (!this.canvas || numQubits === 0) {
      if (this.canvas) this.painter.clear(); // Clear if no qubits
      return;
    }
    this.painter.clear(); // Clear the entire canvas once

    const mainCanvasWidth = this.canvas.width;
    const mainCanvasHeight = this.canvas.height;

    const gridCols = 2; // Display in a 2xN grid
    const gridRows = Math.ceil(numQubits / gridCols);

    // Adjust plot dimensions if gridRows becomes 1 to utilize full height for 1 or 2 qubits
    const effectiveGridRows = numQubits <= gridCols ? 1 : gridRows;

    const plotWidth = mainCanvasWidth / gridCols;
    const plotHeight = mainCanvasHeight / effectiveGridRows; // Use effectiveGridRows for height calculation

    for (let i = 0; i < numQubits; i++) {
      const currentProbs = marginalProbsPerQubit[i];
      if (!currentProbs) continue;

      const row = Math.floor(i / gridCols);
      const col = i % gridCols;

      const rect = {
        x: col * plotWidth,
        y: row * plotHeight,
        width: plotWidth,
        height: plotHeight,
      };
      const title = `Qubit ${i}`;

      // Use MathPainter to draw the bars for this single qubit in its designated rectangle
      MathPainter.drawSingleQubitProbabilityBars(
        this.painter,
        currentProbs,
        rect,
        title
      );
    }
  }
}

export default ProbabilityDisplay;
