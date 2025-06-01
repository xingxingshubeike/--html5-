// Example1/js/ui/displayedCircuit.js

const GATE_SIZE = 50;
const GATE_MARGIN = 5;
const WIRE_HEIGHT = 60;
const QUBIT_LABEL_WIDTH = 130;
const COLUMN_WIDTH = GATE_SIZE + GATE_MARGIN * 2;

class DisplayedCircuit {
  constructor(
    circuitDefinition,
    circuitLanesContainerEl,
    onCircuitChangeCallback
  ) {
    this.circuitDefinition = circuitDefinition;
    this.circuitLanesContainerEl = circuitLanesContainerEl;
    this.onCircuitChange = onCircuitChangeCallback;
    this.painter = new Painter(null);
    this.gateTooltipEl = document.getElementById("gateTooltip");
    this._draggedGateInfo = null;
    this.currentDropPlaceholder = null;

    this.endOfLaneProbDivs = []; // To store references to the probability display DOM elements
    this.currentEndOfLaneProbs = []; // To store the actual probability values
    this.currentNumQubitsForProbs = 0;

    this.circuitLanesContainerEl.addEventListener("dragleave", (event) => {
      if (!this.circuitLanesContainerEl.contains(event.relatedTarget)) {
        this.clearDropColumnHighlight();
      }
    });
  }

  render() {
    console.log("[DisplayedCircuit] render() called.");
    this.circuitLanesContainerEl.innerHTML = "";
    this.endOfLaneProbDivs = [];

    const numQubits = this.circuitDefinition.numQubits;

    for (let i = 0; i < numQubits; i++) {
      // ... (laneEl, qubitLabelDiv, dropZoneEl creation - no changes here) ...
      const laneEl = document.createElement("div");
      laneEl.classList.add("qubit-lane");
      laneEl.dataset.wireIndex = i;

      const qubitLabelDiv = document.createElement("div");
      qubitLabelDiv.classList.add("qubit-label");

      const qNameSpan = document.createElement("span");
      qNameSpan.id = `qubit-name-prefix-${i}`;
      qNameSpan.textContent = `q${i}:`;

      const qStateSelector = document.createElement("select");
      qStateSelector.id = `qubit-initial-state-selector-${i}`;
      qStateSelector.classList.add("qubit-initial-state-selector");

      qubitLabelDiv.appendChild(qNameSpan);
      qubitLabelDiv.appendChild(qStateSelector);
      laneEl.appendChild(qubitLabelDiv);

      const dropZoneEl = document.createElement("div");
      dropZoneEl.classList.add("circuit-lane-dropzone");
      laneEl.appendChild(dropZoneEl);

      const probDisplayContainer = document.createElement("div");
      probDisplayContainer.classList.add("prob-display-item");
      const barFillContainer = document.createElement("div");
      barFillContainer.classList.add("prob-bar-fill-container");
      const barFill = document.createElement("div");
      barFill.classList.add("prob-bar-fill");
      const probText = document.createElement("span");
      probText.classList.add("prob-text");
      barFillContainer.appendChild(barFill);
      probDisplayContainer.appendChild(barFillContainer);
      probDisplayContainer.appendChild(probText);
      laneEl.appendChild(probDisplayContainer);
      this.endOfLaneProbDivs[i] = probDisplayContainer;

      this.circuitLanesContainerEl.appendChild(laneEl);
      this._addLaneEventListeners(dropZoneEl, i);
    }
    this._renderGates();
    this._renderConnectionLines(); // For control gates
    this._renderSwapConnections(); // For SWAP gates (new method)
    this._positionEndOfLaneProbSlots();
    this._updateActualProbValues();
  }
  _renderSwapConnections() {
    this.circuitLanesContainerEl
      .querySelectorAll(".swap-connection-line")
      .forEach((line) => line.remove());

    this.circuitDefinition.columns.forEach((column, colIndex) => {
      const swapGateUiIndices = [];
      column.gates.forEach((gate, wireIndex) => {
        if (gate && gate.id === "SWAP") {
          swapGateUiIndices.push(wireIndex);
        }
      });

      if (swapGateUiIndices.length === 2) {
        const wire1 = swapGateUiIndices[0];
        const wire2 = swapGateUiIndices[1];

        const topWireUiIndex = Math.min(wire1, wire2);
        const bottomWireUiIndex = Math.max(wire1, wire2);

        const lineEl = document.createElement("div");
        lineEl.classList.add("swap-connection-line"); // Specific class for styling
        lineEl.style.position = "absolute";
        lineEl.style.backgroundColor = "#333"; // Connection line color
        lineEl.style.width = "2px";
        lineEl.style.zIndex = "1"; // Above wires, below gate interactive elements

        const gateCenterOffsetX = GATE_SIZE / 2;
        const lineLeftPosition =
          QUBIT_LABEL_WIDTH +
          colIndex * COLUMN_WIDTH +
          GATE_MARGIN +
          gateCenterOffsetX -
          parseFloat(lineEl.style.width) / 2;

        // Calculate top and bottom Y of the connection line (centers of the gate visuals)
        const gateVisualTopOffsetInLane = (WIRE_HEIGHT - GATE_SIZE) / 2;
        const lineTopY =
          topWireUiIndex * WIRE_HEIGHT +
          gateVisualTopOffsetInLane +
          GATE_SIZE / 2;
        const lineBottomY =
          bottomWireUiIndex * WIRE_HEIGHT +
          gateVisualTopOffsetInLane +
          GATE_SIZE / 2;

        lineEl.style.left = `${lineLeftPosition}px`;
        lineEl.style.top = `${lineTopY}px`;
        lineEl.style.height = `${lineBottomY - lineTopY}px`;

        this.circuitLanesContainerEl.appendChild(lineEl);
      }
    });
  }

  updateEndOfLaneProbabilities(marginalProbabilities, numQubits) {
    this.currentEndOfLaneProbs = marginalProbabilities; // These are UI ordered
    this.currentNumQubitsForProbs = numQubits;
    // If render() hasn't run yet, endOfLaneProbDivs might be empty.
    // _updateActualProbValues and _positionEndOfLaneProbSlots are called at the end of render().
    // They will also be called here to update if things change after initial render.
    if (
      this.circuitLanesContainerEl.children.length > 0 &&
      this.endOfLaneProbDivs.length > 0
    ) {
      this._positionEndOfLaneProbSlots(); // Reposition in case number of gate columns changed
      this._updateActualProbValues();
    }
  }

  _positionEndOfLaneProbSlots() {
    if (!this.circuitLanesContainerEl || this.endOfLaneProbDivs.length === 0)
      return;

    const numGateColsInDef = this.circuitDefinition.columns.length;
    // displayCols is the number of columns visually allocated for gates
    const displayColsForGates = Math.max(numGateColsInDef, 12);
    // The probability display will be positioned as if it's in the next column
    const probDisplayLogicalCol = displayColsForGates;

    for (let i = 0; i < this.circuitDefinition.numQubits; i++) {
      const laneEl = this.circuitLanesContainerEl.children[i];
      const dropZoneEl = laneEl?.querySelector(".circuit-lane-dropzone");
      const probDisplayContainer = this.endOfLaneProbDivs[i];

      if (!laneEl || !dropZoneEl || !probDisplayContainer) continue;

      // Ensure dropZoneEl has enough width for gates up to displayColsForGates
      const requiredDropZoneWidth = displayColsForGates * COLUMN_WIDTH;
      if (parseFloat(dropZoneEl.style.minWidth) < requiredDropZoneWidth) {
        dropZoneEl.style.minWidth = `${requiredDropZoneWidth}px`;
      }

      // Position probDisplayContainer absolutely within laneEl
      probDisplayContainer.style.position = "absolute";
      probDisplayContainer.style.left = `${
        probDisplayLogicalCol * COLUMN_WIDTH + GATE_MARGIN
      }px`;
      probDisplayContainer.style.top = `${(WIRE_HEIGHT - GATE_SIZE) / 2}px`;
    }
  }

  _updateActualProbValues() {
    if (this.endOfLaneProbDivs.length === 0) return;

    for (let i = 0; i < this.currentNumQubitsForProbs; i++) {
      const probDisplayContainer = this.endOfLaneProbDivs[i];
      if (!probDisplayContainer) continue;

      const probTextEl = probDisplayContainer.querySelector(".prob-text");
      const barFillEl = probDisplayContainer.querySelector(".prob-bar-fill");

      if (this.currentEndOfLaneProbs && this.currentEndOfLaneProbs[i]) {
        const prob0 = this.currentEndOfLaneProbs[i][0]; // P(q_i_UI = 0)
        if (probTextEl) probTextEl.textContent = `P(|0⟩): ${prob0.toFixed(2)}`;
        if (barFillEl) barFillEl.style.width = `${prob0 * 100}%`;
      } else {
        if (probTextEl) probTextEl.textContent = "P(|0⟩): -";
        if (barFillEl) barFillEl.style.width = `0%`;
      }
    }
  }

  highlightDropColumn(colIndex, wireIndex, gateToDrop, laneDropZoneEl) {
    this.clearDropColumnHighlight();

    if (!gateToDrop) return;

    let tempCircuitDef = this.circuitDefinition;
    if (
      this._draggedGateInfo &&
      !this._draggedGateInfo.originalPalette &&
      this._draggedGateInfo.originalCol !== undefined &&
      this._draggedGateInfo.originalRow !== undefined
    ) {
      tempCircuitDef = tempCircuitDef.withGateRemoved(
        this._draggedGateInfo.originalCol,
        this._draggedGateInfo.originalRow
      );
    }

    if (
      !this._isPlacementValid(gateToDrop, colIndex, wireIndex, tempCircuitDef)
    ) {
      return;
    }
    if (wireIndex + gateToDrop.height > this.circuitDefinition.numQubits) {
      return;
    }

    const placeholder = document.createElement("div");
    placeholder.classList.add("gate-drop-placeholder");
    placeholder.style.left = `${colIndex * COLUMN_WIDTH + GATE_MARGIN}px`;
    const topOffset = (WIRE_HEIGHT - GATE_SIZE) / 2;
    placeholder.style.top = `${topOffset}px`;

    laneDropZoneEl.appendChild(placeholder);
    this.currentDropPlaceholder = placeholder;
  }

  clearDropColumnHighlight() {
    if (this.currentDropPlaceholder) {
      if (this.currentDropPlaceholder.parentElement) {
        this.currentDropPlaceholder.parentElement.removeChild(
          this.currentDropPlaceholder
        );
      }
      this.currentDropPlaceholder = null;
    }
  }

  _addLaneEventListeners(laneDropZoneEl, wireIndex) {
    laneDropZoneEl.addEventListener("dragover", (event) => {
      event.preventDefault();

      if (!this._draggedGateInfo || !this._draggedGateInfo.gate) {
        this.clearDropColumnHighlight();
        return;
      }
      const gateToDrop = this._draggedGateInfo.gate;

      if (event.dataTransfer.effectAllowed.includes("copy")) {
        event.dataTransfer.dropEffect = "copy";
      } else if (event.dataTransfer.effectAllowed.includes("move")) {
        event.dataTransfer.dropEffect = "move";
      } else {
        event.dataTransfer.dropEffect = "none";
        this.clearDropColumnHighlight();
        return;
      }

      const rect = laneDropZoneEl.getBoundingClientRect();
      const dropX = event.clientX - rect.left;
      let colIndex = Math.floor(dropX / COLUMN_WIDTH);
      colIndex = Math.max(0, colIndex);

      // Prevent highlighting if dropping over the probability display area
      const numGateColsInDef = this.circuitDefinition.columns.length;
      const displayColsForGates = Math.max(numGateColsInDef, 16);
      if (colIndex >= displayColsForGates) {
        this.clearDropColumnHighlight();
        event.dataTransfer.dropEffect = "none"; // Indicate no drop here
        return;
      }

      this.highlightDropColumn(colIndex, wireIndex, gateToDrop, laneDropZoneEl);
    });

    laneDropZoneEl.addEventListener("dragleave", (event) => {
      // Handled by container dragleave mostly
    });

    laneDropZoneEl.addEventListener("drop", (event) => {
      console.log(
        `[DisplayedCircuit] DROP EVENT TRIGGERED on wire: ${wireIndex}`
      );
      event.preventDefault();
      this.clearDropColumnHighlight();

      if (!this._draggedGateInfo || !this._draggedGateInfo.gate) {
        console.error(
          "[DisplayedCircuit] Drop event without draggedGateInfo. Gate cannot be placed."
        );
        this._draggedGateInfo = null;
        return;
      }

      const gateToDrop = this._draggedGateInfo.gate;
      const rect = laneDropZoneEl.getBoundingClientRect();
      const dropX = event.clientX - rect.left;
      let colIndex = Math.floor(dropX / COLUMN_WIDTH);
      colIndex = Math.max(0, colIndex);

      // Prevent dropping if over the probability display area
      const numGateColsInDef = this.circuitDefinition.columns.length;
      const displayColsForGates = Math.max(numGateColsInDef, 16);
      if (colIndex >= displayColsForGates) {
        console.warn(
          "[DisplayedCircuit] Attempted to drop gate beyond valid gate area."
        );
        this._draggedGateInfo = null;
        // Optionally, if it was a move, we might need to restore the circuit
        // but current onCircuitChange with original definition handles this if placement fails.
        this.onCircuitChange(this.circuitDefinition);
        return;
      }

      let newCircuitDef = this.circuitDefinition;

      if (!this._draggedGateInfo.originalPalette) {
        newCircuitDef = newCircuitDef.withGateRemoved(
          this._draggedGateInfo.originalCol,
          this._draggedGateInfo.originalRow
        );
      }

      if (wireIndex + gateToDrop.height > this.circuitDefinition.numQubits) {
        console.warn(
          `[DisplayedCircuit] Gate ${gateToDrop.symbol} cannot be placed on wire ${wireIndex}, exceeds qubit count.`
        );
        this._draggedGateInfo = null;
        this.onCircuitChange(this.circuitDefinition);
        return;
      }

      if (
        this._isPlacementValid(gateToDrop, colIndex, wireIndex, newCircuitDef)
      ) {
        newCircuitDef = newCircuitDef.withGatePlaced(
          gateToDrop,
          colIndex,
          wireIndex
        );
      } else {
        console.warn(
          `[DisplayedCircuit] Placement of ${gateToDrop.symbol} at (col: ${colIndex}, row: ${wireIndex}) is invalid.`
        );
        this.onCircuitChange(this.circuitDefinition);
        this._draggedGateInfo = null;
        return;
      }

      this._draggedGateInfo = null;
      this.onCircuitChange(newCircuitDef);
    });
  }

  _isPlacementValid(gate, col, row, circuitDef) {
    console.log(
      `[_isPlacementValid] Checking placement for: ${gate.symbol} (height: ${gate.height}, width: ${gate.width}) at (col: ${col}, row: ${row}) on circuit with ${circuitDef.numQubits} qubits.`
    );

    if (row + gate.height > circuitDef.numQubits) {
      console.log(
        `[_isPlacementValid] Boundary check FAILED: row (${row}) + gate.height (${gate.height}) > circuitDef.numQubits (${circuitDef.numQubits})`
      );
      return false;
    }
    console.log(
      `[_isPlacementValid] Boundary check PASSED: row (${row}) + gate.height (${gate.height}) <= circuitDef.numQubits (${circuitDef.numQubits})`
    );

    // Prevent placement in the probability display area by checking col index
    const numGateColsInDef = circuitDef.columns.length; // Use the potentially modified circuitDef
    const displayColsForGates = Math.max(numGateColsInDef, 16);
    if (col >= displayColsForGates) {
      console.log(
        `[_isPlacementValid] Column check FAILED: col (${col}) is in or beyond the probability display area (max gate col: ${
          displayColsForGates - 1
        }).`
      );
      return false;
    }

    console.log(
      "[_isPlacementValid] Checking for overlaps for all cells the gate would occupy:"
    );
    for (let r_offset = 0; r_offset < gate.height; r_offset++) {
      for (let c_offset = 0; c_offset < gate.width; c_offset++) {
        const targetCol = col + c_offset;
        const targetRow = row + r_offset;
        const existingGate = circuitDef.gateAt(targetCol, targetRow);

        const isOriginalSlot =
          this._draggedGateInfo &&
          !this._draggedGateInfo.originalPalette &&
          targetCol === this._draggedGateInfo.originalCol &&
          targetRow === this._draggedGateInfo.originalRow;

        if (existingGate) {
          console.log(
            `[_isPlacementValid] Overlap check FAILED at (targetCol: ${targetCol}, targetRow: ${targetRow}): existingGate found ('${existingGate.symbol}'). isOriginalSlot: ${isOriginalSlot}`
          );
          return false;
        } else {
          console.log(
            `[_isPlacementValid] Overlap check at (targetCol: ${targetCol}, targetRow: ${targetRow}): PASSED (no existing gate).`
          );
        }
      }
    }
    console.log("[_isPlacementValid] All overlap checks PASSED.");
    if (gate.height > 1 && !gate.isControlGate && !gate.isDisplayGate) {
      console.log(
        `[_isPlacementValid] Gate ${gate.symbol} is multi-qubit operational. Checking for controls underneath.`
      );
      for (let i = 1; i < gate.height; i++) {
        const wireToCheck = row + i;
        if (wireToCheck < circuitDef.numQubits) {
          const gateBelowInColumn = circuitDef.gateAt(col, wireToCheck);
          if (gateBelowInColumn && gateBelowInColumn.isControlGate) {
            console.log(
              `[_isPlacementValid] Control conflict FAILED: Multi-qubit gate ${gate.symbol} at (col:${col}, row:${row}) would be placed over a control gate ('${gateBelowInColumn.symbol}') on wire ${wireToCheck}.`
            );
            return false;
          }
        }
      }
      console.log(
        `[_isPlacementValid] Gate ${gate.symbol}: No controls found underneath within its span.`
      );
    }
    if (gate.isControlGate) {
      console.log(
        `[_isPlacementValid] Gate ${gate.symbol} is a control gate. Checking if it's inside another gate.`
      );
      for (let r_other = 0; r_other < circuitDef.numQubits; r_other++) {
        if (r_other === row) continue;

        const otherGate = circuitDef.gateAt(col, r_other);
        if (
          otherGate &&
          otherGate.height > 1 &&
          !otherGate.isControlGate &&
          !otherGate.isDisplayGate
        ) {
          if (row > r_other && row < r_other + otherGate.height) {
            console.log(
              `[_isPlacementValid] Control conflict FAILED: Control gate ${gate.symbol} at (col:${col}, row:${row}) would be inside multi-qubit gate '${otherGate.symbol}' starting on wire ${r_other}.`
            );
            return false;
          }
        }
      }
      console.log(
        `[_isPlacementValid] Control Gate ${gate.symbol}: Not placed inside another multi-qubit operational gate.`
      );
    }
    console.log(
      "[_isPlacementValid] Control/Multi-qubit interaction checks PASSED (or not applicable)."
    );
    console.log(
      `[_isPlacementValid] All checks PASSED for ${gate.symbol} at (col: ${col}, row: ${row}).`
    );
    return true;
  }

  _renderGates() {
    this.circuitLanesContainerEl
      .querySelectorAll(".circuit-lane-dropzone")
      .forEach((dz) => (dz.innerHTML = "")); // Clear only gates from dropzones

    const numDisplayColsForGates = Math.max(
      this.circuitDefinition.columns.length,
      15
    );

    this.circuitDefinition.columns.forEach((column, colIndex) => {
      column.gates.forEach((gate, wireIndex) => {
        const laneDropZoneEl = this.circuitLanesContainerEl.children[
          wireIndex
        ]?.querySelector(".circuit-lane-dropzone");
        if (!laneDropZoneEl) return;

        // Ensure placeholders for gates (not for the prob display area)
        this._ensurePlaceholders(laneDropZoneEl, numDisplayColsForGates - 1);

        if (gate) {
          const gateEl = this._createGateElement(gate, colIndex, wireIndex);
          this._placeGateInGrid(laneDropZoneEl, gateEl, colIndex, gate);

          if (this._isGateDisabled(gate, colIndex, wireIndex)) {
            gateEl.style.opacity = "0.5";
            gateEl.style.border = "2px dashed red";
            gateEl.title +=
              "\n(Disabled: Check console for reason or implement visual feedback)";
          }
        }
      });
    });
    // Ensure all dropzones have at least numDisplayColsForGates placeholders
    for (let i = 0; i < this.circuitDefinition.numQubits; i++) {
      const laneDropZoneEl = this.circuitLanesContainerEl.children[
        i
      ]?.querySelector(".circuit-lane-dropzone");
      if (laneDropZoneEl) {
        this._ensurePlaceholders(laneDropZoneEl, numDisplayColsForGates - 1);
      }
    }
  }

  _isGateDisabled(gate, colIndex, wireIndex) {
    if (gate.isControlGate) {
      for (let r = 0; r < this.circuitDefinition.numQubits; r++) {
        if (r === wireIndex) continue;
        const otherGate = this.circuitDefinition.gateAt(colIndex, r);
        if (
          otherGate &&
          !otherGate.isControlGate &&
          !otherGate.isDisplayGate &&
          wireIndex > r &&
          wireIndex < r + otherGate.height
        ) {
          console.warn(
            `Control on wire ${wireIndex} is inside gate ${otherGate.symbol} on wire ${r}`
          );
          return true;
        }
      }
    }
    if (gate.height > 1 && !gate.isControlGate && !gate.isDisplayGate) {
      for (let i = 1; i < gate.height; i++) {
        const gateBelow = this.circuitDefinition.gateAt(
          colIndex,
          wireIndex + i
        );
        if (gateBelow && gateBelow.isControlGate) {
          console.warn(
            `位于线路 ${wireIndex} 上的门 ${gate.symbol} 在其内部的线路 ${
              wireIndex + i
            } 上有控制门`
          );
          return true;
        }
      }
    }
    return false;
  }

  _ensurePlaceholders(laneDropZoneEl, targetColIndex) {
    for (let c = 0; c <= targetColIndex; c++) {
      if (!laneDropZoneEl.querySelector(`[data-col-placeholder='${c}']`)) {
        const placeholder = document.createElement("div");
        placeholder.classList.add("gate-item", "gate-placeholder"); // Ensure gate-item for sizing
        placeholder.style.width = `${GATE_SIZE}px`;
        placeholder.style.height = `${GATE_SIZE}px`;
        placeholder.style.visibility = "hidden"; // Keep it invisible
        placeholder.style.position = "absolute"; // Position like other gates
        placeholder.style.left = `${c * COLUMN_WIDTH + GATE_MARGIN}px`;
        placeholder.style.top = `${(WIRE_HEIGHT - GATE_SIZE) / 2}px`;
        placeholder.dataset.colPlaceholder = c;
        laneDropZoneEl.appendChild(placeholder);
      }
    }
  }

  _placeGateInGrid(laneDropZoneEl, gateEl, colIndex, gateInstance = null) {
    gateEl.style.position = "absolute";
    gateEl.style.zIndex = "2"; // Higher z-index for actual gates over placeholders
    gateEl.style.left = `${colIndex * COLUMN_WIDTH + GATE_MARGIN}px`;

    let topOffset = (WIRE_HEIGHT - GATE_SIZE) / 2;

    if (gateInstance && gateInstance.height > 1) {
      // Height is set in _createGateElement
    }
    gateEl.style.top = `${topOffset}px`;
    laneDropZoneEl.appendChild(gateEl);
  }

  _renderConnectionLines() {
    const existingLines =
      this.circuitLanesContainerEl.querySelectorAll(".connection-line");
    existingLines.forEach((line) => line.remove());

    this.circuitDefinition.columns.forEach((column, colIndex) => {
      const controlsInColumn = [];
      const operationalGatesInColumn = [];

      column.gates.forEach((gate, wireIndex) => {
        if (gate) {
          if (gate.isControlGate) {
            controlsInColumn.push({ wire: wireIndex, gate: gate });
          } else if (
            !gate.isDisplayGate &&
            !gate.isControlGate &&
            gate.matrix
          ) {
            operationalGatesInColumn.push({ wire: wireIndex, gate: gate });
          }
        }
      });

      if (controlsInColumn.length > 0 && operationalGatesInColumn.length > 0) {
        operationalGatesInColumn.forEach((opGateInfo) => {
          let minWireInvolved = opGateInfo.wire;
          let maxWireInvolved = opGateInfo.wire + opGateInfo.gate.height - 1;

          controlsInColumn.forEach((controlInfo) => {
            // Only connect if control is relevant to this opGate or vice-versa (part of same "intended" compound gate)
            // This simple version connects all controls in a column to all ops in that column.
            minWireInvolved = Math.min(minWireInvolved, controlInfo.wire);
            maxWireInvolved = Math.max(maxWireInvolved, controlInfo.wire);
          });

          if (minWireInvolved < maxWireInvolved) {
            // Only draw if spans more than one wire effectively
            const lineEl = document.createElement("div");
            lineEl.classList.add("connection-line");
            lineEl.style.position = "absolute"; // Relative to circuitLanesContainerEl
            lineEl.style.backgroundColor = "#333";
            lineEl.style.width = "2px";
            lineEl.style.zIndex = "0"; // Behind gates

            const lineWidth = parseFloat(lineEl.style.width);
            // Adjust left position to be relative to circuitLanesContainerEl, considering qubit label width
            const lineLeft =
              QUBIT_LABEL_WIDTH + // Offset for the labels on the left of lanes
              colIndex * COLUMN_WIDTH +
              GATE_MARGIN +
              GATE_SIZE / 2 -
              lineWidth / 2;
            lineEl.style.left = `${lineLeft}px`;

            // Top is relative to circuitLanesContainerEl
            const lineTop = minWireInvolved * WIRE_HEIGHT + WIRE_HEIGHT / 2;
            const lineBottom = maxWireInvolved * WIRE_HEIGHT + WIRE_HEIGHT / 2;

            lineEl.style.top = `${lineTop}px`;
            const lineHeight = lineBottom - lineTop;
            lineEl.style.height = `${lineHeight}px`;

            this.circuitLanesContainerEl.appendChild(lineEl);
          }
        });
      }
    });
  }

  _createGateElement(gate, colIndex, wireIndex) {
    const gateEl = document.createElement("div");
    gateEl.classList.add("gate-item");
    gateEl.textContent = gate.symbol; // Default symbol
    gateEl.style.color = "white";
    gateEl.draggable = true;
    gateEl.dataset.gateId = gate.id;
    gateEl.dataset.col = colIndex;
    gateEl.dataset.row = wireIndex;

    // Default background for non-SWAP gates or correctly paired SWAP
    let gateBgColor = gate.isDisplayGate
      ? "#add8e6"
      : gate.isControlGate
      ? "#AAA"
      : "#6A90AF";

    if (gate.id === "SWAP") {
      const gatesInColumn = this.circuitDefinition.columns[colIndex]
        ? this.circuitDefinition.columns[colIndex].gates
        : [];
      let swapCount = 0;
      gatesInColumn.forEach((g) => {
        if (g && g.id === "SWAP") {
          swapCount++;
        }
      });

      if (swapCount === 1) {
        gateEl.textContent = "need another SWAP";
        gateEl.style.fontSize = "10px"; // Adjust font size for longer text
        gateEl.style.lineHeight = "1.2";
        gateEl.style.wordBreak = "break-word";
        gateBgColor = "#f0ad4e"; // Warning color (Bootstrap's orange)
      } else if (swapCount > 2) {
        gateEl.textContent = "too many SWAPs";
        gateEl.style.fontSize = "10px"; // Adjust font size
        gateEl.style.lineHeight = "1.2";
        gateEl.style.wordBreak = "break-word";
        gateBgColor = "#d9534f"; // Error color (Bootstrap's red)
      } else if (swapCount === 2) {
        gateEl.textContent = gate.symbol; // Show "X"
        // Use default SWAP color or specific color if desired
        gateBgColor = "#5bc0de"; // Info color (Bootstrap's blue), or keep #6A90AF
      }
    }
    gateEl.style.backgroundColor = gateBgColor;

    if (gate.height > 1) {
      gateEl.style.height = `${GATE_SIZE + (gate.height - 1) * WIRE_HEIGHT}px`;
      // For multi-height gates, ensure text remains centered if it's just a symbol
      if (gateEl.textContent.length <= 2) {
        // Simple heuristic for symbols
        gateEl.style.lineHeight = gateEl.style.height;
      } else {
        // For text like "need another SWAP"
        gateEl.style.display = "flex";
        gateEl.style.alignItems = "center";
        gateEl.style.justifyContent = "center";
        gateEl.style.textAlign = "center";
      }
    } else {
      gateEl.style.height = `${GATE_SIZE}px`;
      if (gateEl.textContent.length <= 2) {
        gateEl.style.lineHeight = `${GATE_SIZE}px`;
      } else {
        gateEl.style.display = "flex";
        gateEl.style.alignItems = "center";
        gateEl.style.justifyContent = "center";
        gateEl.style.textAlign = "center";
      }
    }
    gateEl.style.width = `${GATE_SIZE}px`;

    gateEl.addEventListener("dragstart", (event) => {
      // ... (existing dragstart logic)
      console.log(
        `[DisplayedCircuit - Gate] DRAGSTART event for gate: ${gate.symbol}, id: ${gate.id}`
      );
      this._draggedGateInfo = {
        gate: gate.copy(),
        originalPalette: false,
        originalCol: colIndex,
        originalRow: wireIndex,
      };
      try {
        event.dataTransfer.setData("text/plain", gate.id);
      } catch (e) {
        console.error("[DisplayedCircuit - Gate] setData FAILED:", e);
      }
      event.dataTransfer.effectAllowed = "move";
    });

    gateEl.addEventListener("dragend", (event) => {
      this.clearDropColumnHighlight();
    });

    gateEl.addEventListener("mouseenter", (event) => {
      this.painter.showTooltip(
        event.pageX,
        event.pageY,
        `${gate.name}\n${gate.blurb}`
      );
    });
    gateEl.addEventListener("mouseleave", () => {
      this.painter.hideTooltip();
    });

    const deleteBtn = document.createElement("span");
    deleteBtn.classList.add("delete-gate");
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = "移除门";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const newCircuitDef = this.circuitDefinition.withGateRemoved(
        colIndex,
        wireIndex
      );
      this.onCircuitChange(newCircuitDef);
    });
    gateEl.appendChild(deleteBtn);

    return gateEl;
  }

  setDraggedGate(
    gate,
    isFromPalette = false,
    originalCol = -1,
    originalRow = -1
  ) {
    if (gate === null) {
      this._draggedGateInfo = null;
      return;
    }
    this._draggedGateInfo = {
      gate: gate.copy(),
      originalPalette: isFromPalette,
      originalCol,
      originalRow,
    };
  }
}
