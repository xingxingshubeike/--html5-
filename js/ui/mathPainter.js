// Example1/js/ui/mathPainter.js
// For drawing probabilities, amplitudes etc.

class MathPainter {
  /**
   * @param {Painter} painter
   * @param {number[]} probabilities Array of probabilities for each state [P(0), P(1)].
   * @param {object} rect - The rectangle {x, y, width, height} to draw within.
   * @param {string} title - The title for this sub-plot (e.g., "Qubit 0").
   */
  static drawSingleQubitProbabilityBars(painter, probabilities, rect, title) {
    const ctx = painter.ctx;
    const { x: rx, y: ry, width: rwidth, height: rheight } = rect;

    // Clear the sub-rectangle (optional, if main canvas is cleared before all subplots)
    // ctx.clearRect(rx, ry, rwidth, rheight); // Better to clear the whole canvas once in ProbabilityDisplay

    const numStates = 2; // Always |0> and |1>
    const barPadding = rwidth * 0.1; // Relative padding
    const labelAreaHeight = rheight * 0.2;
    const titleAreaHeight = rheight * 0.15;
    const maxBarHeight =
      rheight - labelAreaHeight - titleAreaHeight - rheight * 0.05; //Available height for bars

    const totalBarWidthArea = rwidth - 2 * barPadding;
    const barWidth =
      (totalBarWidthArea - barPadding * (numStates - 1)) / numStates;

    // Draw Title
    painter.printText(
      title,
      rx + rwidth / 2,
      ry + titleAreaHeight / 2 + 5, // Adjusted for better centering
      "#333333",
      `${Math.min(14, rheight * 0.08)}px sans-serif`, // Dynamic font size
      "center",
      "middle"
    );

    for (let i = 0; i < numStates; i++) {
      const prob = probabilities[i];
      const barHeight = prob * maxBarHeight;
      const currentX = rx + barPadding + i * (barWidth + barPadding);
      const currentY =
        ry + titleAreaHeight + (maxBarHeight - barHeight) + rheight * 0.05; // Align bars at their bottom

      ctx.fillStyle = i === 0 ? "#28a745" : "#ffc107"; // Green for |0>, Yellow for |1>
      ctx.strokeStyle = "#000000";

      ctx.fillRect(currentX, currentY, barWidth, barHeight);
      ctx.strokeRect(currentX, currentY, barWidth, barHeight);

      // Label for basis state
      const basisLabel = i === 0 ? "|0⟩" : "|1⟩";
      painter.printText(
        basisLabel,
        currentX + barWidth / 2,
        ry +
          titleAreaHeight +
          maxBarHeight +
          labelAreaHeight * 0.5 +
          rheight * 0.05, // Below the bar area
        "#000000",
        `${Math.min(12, rheight * 0.07)}px sans-serif`, // Dynamic font size
        "center",
        "middle"
      );
    }
  }

  /**
   * @param {Painter} painter
   * @param {number[]} probabilities Array of probabilities for each state.
   * @param {HTMLCanvasElement} canvas The canvas to draw on.
   * @param {number} numQubitsForLabels The number of qubits, used for formatting labels like |00>, |01> etc.
   */
  static drawProbabilityBars(
    painter,
    probabilities,
    canvas,
    numQubitsForLabels
  ) {
    const ctx = painter.ctx;
    const width = canvas.width;
    const height = canvas.height;
    const numStates = probabilities.length;
    if (numStates === 0) return;

    const barPadding = 5;
    const totalPadding = barPadding * (numStates + 1);
    const barWidth = (width - totalPadding) / numStates;
    const maxBarHeight = height - 30; // Leave space for labels

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#000000";

    for (let i = 0; i < numStates; i++) {
      const prob = probabilities[i];
      const barHeight = prob * maxBarHeight;
      const x = barPadding + i * (barWidth + barPadding);
      const y = height - 15 - barHeight; // 15px for bottom label space

      if (numStates > 1 && i >= numStates / 2 && numQubitsForLabels > 1) {
        ctx.fillStyle = "#ffc107";
      } else {
        ctx.fillStyle = "#28a745";
      }

      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.strokeRect(x, y, barWidth, barHeight);

      const labelQubits =
        numQubitsForLabels > 0 ? numQubitsForLabels : Math.log2(numStates);
      let basisString = i
        .toString(2)
        .padStart(labelQubits > 0 ? labelQubits : 1, "0"); // MODIFIED: used labelQubits instead of numQubits
      basisString = basisString.split("").reverse().join("");
      const basisLabel = `|${basisString}⟩`;
      painter.printText(
        basisLabel,
        x + barWidth / 2,
        height - 5,
        "#000000",
        "10px sans-serif",
        "center",
        "bottom"
      );
    }
  }

  /**
   * @param {Painter} painter
   * @param {Matrix} stateVector A column vector of complex amplitudes.
   * @param {HTMLCanvasElement} canvas The canvas to draw on.
   * @param {number} numQubits The number of qubits in the system.
   */
  static drawAmplitudeBars(painter, stateVector, canvas, numQubits) {
    const ctx = painter.ctx;
    const width = canvas.width;
    const height = canvas.height;
    const totalSystemStates = stateVector.height;
    if (totalSystemStates === 0) return;

    const barPadding = 5;
    const legendHeight = 20;
    const labelAreaHeightPerRow = 20;
    const rowSpacing = 10;

    const maxBarsPerRow = 8;
    // How many states we *could* show if no row limit (up to 2^numQubits)
    const potentialDisplayStates = Math.min(
      totalSystemStates,
      numQubits > 0 ? 1 << numQubits : 1
    );

    // Determine the number of rows we will actually render, up to 4
    const maxRowsToRender = 4; // MODIFIED: Maximum number of rows for amplitude bars
    const numRowsBasedOnStates = Math.ceil(
      potentialDisplayStates / maxBarsPerRow
    );
    const numRowsToActuallyRender = Math.min(
      maxRowsToRender,
      numRowsBasedOnStates
    );

    // Calculate how many states will be shown given the row limit
    const statesToActuallyDrawInLoop = Math.min(
      potentialDisplayStates,
      numRowsToActuallyRender * maxBarsPerRow
    );

    const availableCanvasHeightForBars =
      height -
      legendHeight -
      numRowsToActuallyRender * labelAreaHeightPerRow -
      (numRowsToActuallyRender > 0 ? numRowsToActuallyRender - 1 : 0) *
        rowSpacing -
      10; /*top/bottom margin*/
    const heightPerStateRow =
      numRowsToActuallyRender > 0
        ? availableCanvasHeightForBars / numRowsToActuallyRender
        : 0;
    const maxBarMagnitudeHeight = heightPerStateRow / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#000000";

    // Legend
    const legendY = 10;
    painter.fillRect(10, legendY, 10, 10, "#4682B4");
    painter.printText(
      "实部",
      25,
      legendY + 5,
      "#000",
      "10px sans-serif",
      "left",
      "middle"
    );
    painter.fillRect(70, legendY, 10, 10, "#FF6347");
    painter.printText(
      "虚部",
      85,
      legendY + 5,
      "#000",
      "10px sans-serif",
      "left",
      "middle"
    );

    for (let i = 0; i < statesToActuallyDrawInLoop; i++) {
      // MODIFIED: Loop up to statesToActuallyDrawInLoop
      const amplitude = stateVector.cell(0, i);
      const realPart = amplitude.real;
      const imagPart = amplitude.imag;

      const rowIndex = Math.floor(i / maxBarsPerRow);
      const colIndexInRow = i % maxBarsPerRow;

      // This check is implicitly handled by looping up to statesToActuallyDrawInLoop
      // if (rowIndex >= numRowsToActuallyRender) continue;

      const statesInThisRow =
        rowIndex === numRowsToActuallyRender - 1 // For the last row to be rendered
          ? statesToActuallyDrawInLoop % maxBarsPerRow === 0
            ? maxBarsPerRow
            : statesToActuallyDrawInLoop % maxBarsPerRow
          : maxBarsPerRow;

      const totalPaddingInRow = barPadding * (statesInThisRow + 1);
      const barWidth =
        statesInThisRow > 0 ? (width - totalPaddingInRow) / statesInThisRow : 0;

      const rowBaseY =
        legendHeight +
        5 +
        rowIndex * (heightPerStateRow + labelAreaHeightPerRow + rowSpacing);
      const yCenterInRow = rowBaseY + heightPerStateRow / 2;
      const currentX = barPadding + colIndexInRow * (barWidth + barPadding);

      // Real part bar
      ctx.fillStyle = "#4682B4";
      let realBarVisualHeight = realPart * maxBarMagnitudeHeight;
      if (realBarVisualHeight >= 0) {
        ctx.fillRect(
          currentX,
          yCenterInRow - realBarVisualHeight,
          barWidth,
          realBarVisualHeight
        );
        ctx.strokeRect(
          currentX,
          yCenterInRow - realBarVisualHeight,
          barWidth,
          realBarVisualHeight
        );
      } else {
        ctx.fillRect(currentX, yCenterInRow, barWidth, -realBarVisualHeight);
        ctx.strokeRect(currentX, yCenterInRow, barWidth, -realBarVisualHeight);
      }

      // Imaginary part bar
      ctx.fillStyle = "#FF6347";
      let imagBarVisualHeight = imagPart * maxBarMagnitudeHeight;
      let imagYStart;

      if (realPart >= 0) {
        imagYStart = yCenterInRow - realBarVisualHeight;
      } else {
        imagYStart = yCenterInRow - realBarVisualHeight;
      }

      if (imagBarVisualHeight >= 0) {
        ctx.fillRect(
          currentX,
          imagYStart - imagBarVisualHeight,
          barWidth,
          imagBarVisualHeight
        );
        ctx.strokeRect(
          currentX,
          imagYStart - imagBarVisualHeight,
          barWidth,
          imagBarVisualHeight
        );
      } else {
        ctx.fillRect(currentX, imagYStart, barWidth, -imagBarVisualHeight);
        ctx.strokeRect(currentX, imagYStart, barWidth, -imagBarVisualHeight);
      }

      // Label for basis state
      const effectiveNumQubits =
        numQubits > 0
          ? numQubits
          : totalSystemStates > 1
          ? Math.log2(totalSystemStates)
          : 1;
      const basisLabel = `|${i.toString(2).padStart(effectiveNumQubits, "0")}⟩`;
      painter.printText(
        basisLabel,
        currentX + barWidth / 2,
        rowBaseY + heightPerStateRow + labelAreaHeightPerRow / 2,
        "#000000",
        "10px sans-serif",
        "center",
        "middle"
      );
    }

    if (totalSystemStates > statesToActuallyDrawInLoop) {
      // MODIFIED: Check against actually drawn states
      const textY = height - 10;
      painter.printText(
        `(...${
          totalSystemStates - statesToActuallyDrawInLoop
        } more states not shown)`, // MODIFIED: Correct count
        width - 5,
        textY,
        "#555",
        "10px sans-serif",
        "right",
        "bottom"
      );
    }
  }
}
