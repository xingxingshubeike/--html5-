// Example1/js/main.js
import BlochSphereDisplay from "./ui/blochSphere.js";
// import ProbabilityDisplay from "./ui/probabilityDisplay.js"; // REMOVED
import AmplitudeDisplay from "./ui/amplitudeDisplay.js";

document.addEventListener("DOMContentLoaded", () => {
  let currentNumQubits = 2; // 默认值, 会从输入更新
  const circuitLanesContainer = document.getElementById("circuitLanes");
  const gatePaletteContainer = document.getElementById("gatePalette");
  const clearCircuitButton = document.getElementById("clearCircuitButton");
  const numQubitsInput = document.getElementById("numQubitsInput");
  const circuitHeader = document.getElementById("circuitHeader");

  const overallStateDisplay = document.getElementById("overallStateDisplay");
  // const circuitRepresentationDisplay = document.getElementById(
  //   "circuitRepresentationDisplay"
  // );
  const deutschFunctionSelect = document.getElementById(
    "deutschFunctionSelect"
  );
  const setupDeutschCircuitButton = document.getElementById(
    "setupDeutschCircuitButton"
  );
  const deutschResultOutputP = document.getElementById("deutschResultOutput");

  let blochSphereDisplays = [];
  let amplitudeDisplay = new AmplitudeDisplay("amplitudeCanvas");
  if (setupDeutschCircuitButton) {
    setupDeutschCircuitButton.addEventListener("click", setupDeutschCircuit);
  }

  // 为每个量子比特的初始状态定义 Matrix 对象
  const PREDEFINED_QUBIT_STATES = {
    0: Matrix.col(Complex.ONE, Complex.ZERO), // |0⟩
    1: Matrix.col(Complex.ZERO, Complex.ONE), // |1⟩
    "+": Matrix.col(
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(1 / Math.sqrt(2), 0)
    ), // |+⟩
    "-": Matrix.col(
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(-1 / Math.sqrt(2), 0)
    ), // |-⟩
    i: Matrix.col(
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(0, 1 / Math.sqrt(2))
    ), // |i⟩ (即 |+i⟩)
    "-i": Matrix.col(
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(0, -1 / Math.sqrt(2))
    ), // |-i⟩
  };

  const PREDEFINED_QUBIT_STATE_OPTIONS = [
    { value: "0", text: "|0⟩" },
    { value: "1", text: "|1⟩" },
    { value: "+", text: "|+⟩" },
    { value: "-", text: "|-⟩" },
    { value: "i", text: "|i⟩" },
    { value: "-i", text: "|-i⟩" },
  ];

  let initialQubitStates = new Array(currentNumQubits).fill("0");

  // --- 时间演化相关 ---
  let globalTime_t = 0;
  let animationFrameId = null;
  const timeStepDuration = 50; // ms per step, controls speed of t
  let lastFrameTime = 0;
  let isPlaying = true; // Auto-play
  const targetCycleDuration = 5000; // Target duration for one full cycle (0 to 1) in ms
  // --- End 时间演化相关 ---

  window.addEventListener("resize", () => {
    blochSphereDisplays.forEach((bsd) => {
      if (bsd && typeof bsd.onResize === "function") {
        bsd.onResize();
      }
    });
    if (amplitudeDisplay) {
      // simulateAndDisplay(); // Will be handled by animation loop if playing
      if (!isPlaying) simulateAndDisplay(); // Update if paused
    }
  });

  let currentCircuitDef = CircuitDefinition.empty(currentNumQubits);
  let displayedCircuit = new DisplayedCircuit(
    currentCircuitDef,
    circuitLanesContainer,
    handleCircuitChange
  );

  const gateTypes = {
    ...GATE_DEFINITIONS_PAULI,
    ...GATE_DEFINITIONS_HADAMARD,
    ...GATE_DEFINITIONS_PHASE,
    ...GATE_DEFINITIONS_CONTROL,
    ...GATE_DEFINITIONS_SWAP,
    ...GATE_DEFINITIONS_RAISING, // 添加新的Raising门
    ...GATE_DEFINITIONS_IDENTITY,
  };

  function populateToolbox() {
    gatePaletteContainer.innerHTML = "";
    for (const gateId in gateTypes) {
      const gate = gateTypes[gateId];
      const gateEl = document.createElement("div");
      gateEl.classList.add("gate-item");
      gateEl.textContent = gate.symbol;
      gateEl.draggable = true;
      gateEl.title = `${gate.name}\n${gate.blurb}`;

      gateEl.addEventListener("dragstart", (event) => {
        console.log(
          `[Main.js - Toolbox] DRAGSTART event for gate: ${gate.symbol}, id: ${gate.id}`
        );
        // Pass a copy of the gate, so its timeParameter is fresh if it's time-dependent
        displayedCircuit.setDraggedGate(gate.copy(), true);
        try {
          event.dataTransfer.setData("text/plain", gate.id);
          console.log(
            `[Main.js - Toolbox] setData successful. effectAllowed: ${event.dataTransfer.effectAllowed}`
          );
        } catch (e) {
          console.error("[Main.js - Toolbox] setData FAILED:", e);
        }
        event.dataTransfer.effectAllowed = "copy";
      });

      gateEl.addEventListener("dragend", (event) => {
        displayedCircuit.clearDropColumnHighlight();
        if (
          displayedCircuit._draggedGateInfo &&
          displayedCircuit._draggedGateInfo.originalPalette &&
          displayedCircuit._draggedGateInfo.gate.id === gate.id
        ) {
          console.log(
            "[Main.js - Toolbox] Dragend for palette item, not dropped successfully. Clearing draggedGateInfo."
          );
          displayedCircuit.setDraggedGate(null);
        }
      });
      gatePaletteContainer.appendChild(gateEl);
    }
  }

  function handleCircuitChange(newCircuitDefinition) {
    currentCircuitDef = newCircuitDefinition;
    // When circuit changes, time-dependent gates in it might be new instances.
    // Their matrices will be updated in the next animation frame by updateGateMatrices.
    displayedCircuit.circuitDefinition = currentCircuitDef;
    displayedCircuit.render(); // This will use initial t=0 matrices for new time-dependent gates if defined in build()
    setupInitialStateSelectors();

    // If not playing, we need to ensure matrices are up-to-date for the current globalTime_t
    // and then simulate. If playing, the loop will handle it.
    if (!isPlaying) {
      updateGateMatrices(globalTime_t);
      simulateAndDisplay(currentCircuitDef);
    } else {
      // Ensure one update occurs if playing, as animation loop might have a slight delay
      updateGateMatrices(globalTime_t);
      simulateAndDisplay(currentCircuitDef);
    }
    updateCircuitRepresentationDisplay(currentCircuitDef);
  }

  function updateCircuitHeaderText() {
    circuitHeader.textContent = `量子线路 (${currentNumQubits} 量子比特${
      currentNumQubits > 1 ? "" : ""
    })`;
  }
  function setupDeutschCircuit() {
    currentNumQubits = 2;
    numQubitsInput.value = currentNumQubits; // 更新量子比特数输入框的值
    // updateCircuitHeaderText(); // handleCircuitChange 会间接调用它

    // Deutsch 算法的经典初始态是 |0⟩ 和 |1⟩，然后经过H门
    // 所以选择器应设置为 |0⟩ 和 |1⟩
    initialQubitStates = ["0", "1"];

    let newCircuitDef = CircuitDefinition.empty(currentNumQubits);

    // 从 gateTypes 获取门实例的副本
    const H = gateTypes["H"] ? gateTypes["H"].copy() : null;
    const X = gateTypes["X"] ? gateTypes["X"].copy() : null;
    const I = gateTypes["I"] ? gateTypes["I"].copy() : null;
    const Control = gateTypes["Control"] ? gateTypes["Control"].copy() : null;
    const AntiControl = gateTypes["AntiControl"]
      ? gateTypes["AntiControl"].copy()
      : null;

    if (!H || !X || !I || !Control || !AntiControl) {
      alert("错误：Deutsch 算法所需的基础门未完全定义。请检查 gateTypes。");
      return;
    }

    const selectedFunction = deutschFunctionSelect.value;

    // 第 0 列: 对两个量子比特应用 Hadamard 门
    newCircuitDef = newCircuitDef.withGatePlaced(H, 0, 0); // H on q0
    newCircuitDef = newCircuitDef.withGatePlaced(H, 0, 1); // H on q1

    // 第 1 列: Oracle U_f
    switch (selectedFunction) {
      case "f_const_zero": // f(0)=0, f(1)=0. Oracle U_f 是在第二个量子比特上的 Identity 门
        newCircuitDef = newCircuitDef.withGatePlaced(I, 1, 1); // I on q1
        // q0 在此列可以为空，或者也放置一个 I 门保持对齐
        newCircuitDef = newCircuitDef.withGatePlaced(I, 1, 0);
        break;
      case "f_const_one": // f(0)=1, f(1)=1. Oracle U_f 是在第二个量子比特上的 X 门
        newCircuitDef = newCircuitDef.withGatePlaced(X, 1, 1); // X on q1
        // q0 在此列可以为空或 I 门
        newCircuitDef = newCircuitDef.withGatePlaced(I, 1, 0);
        break;
      case "f_id": // f(0)=0, f(1)=1. Oracle U_f 是 CNOT 门 (q0 控制, q1 目标)
        newCircuitDef = newCircuitDef.withGatePlaced(Control, 1, 0); // Control on q0
        newCircuitDef = newCircuitDef.withGatePlaced(X, 1, 1); // X (target) on q1
        break;
      case "f_not": // f(0)=1, f(1)=0. Oracle U_f 是 q0 为反向控制的 CNOT 门
        newCircuitDef = newCircuitDef.withGatePlaced(AntiControl, 1, 0); // AntiControl on q0
        newCircuitDef = newCircuitDef.withGatePlaced(X, 1, 1); // X (target) on q1
        break;
    }

    // 第 2 列: 对第一个量子比特应用 Hadamard 门
    newCircuitDef = newCircuitDef.withGatePlaced(H, 2, 0); // H on q0
    // q1 在此列可以为空或 I 门，以保持线路整洁
    newCircuitDef = newCircuitDef.withGatePlaced(I, 2, 1);

    // 更新线路定义并触发重新渲染和模拟
    // handleCircuitChange 会负责调用 setupInitialStateSelectors, simulateAndDisplay 等
    handleCircuitChange(newCircuitDef);

    // 更新 Deutsch 结果的说明文字
    if (deutschResultOutputP) {
      if (
        selectedFunction === "f_const_zero" ||
        selectedFunction === "f_const_one"
      ) {
        deutschResultOutputP.textContent =
          "f(0)⊕f(1)=0, 因此q0 测量结果为 |0⟩ ";
      } else {
        // 'f_id' or 'f_not'
        deutschResultOutputP.textContent =
          "f(0)⊕f(1)=1, 因此q0 测量结果为 |1⟩ ";
      }
    }
  }

  function setupInitialStateSelectors() {
    for (let i = 0; i < currentNumQubits; i++) {
      const selector = document.getElementById(
        `qubit-initial-state-selector-${i}`
      );
      if (selector) {
        selector.innerHTML = "";
        PREDEFINED_QUBIT_STATE_OPTIONS.forEach((opt) => {
          const optionEl = document.createElement("option");
          optionEl.value = opt.value;
          optionEl.textContent = opt.text;
          selector.appendChild(optionEl);
        });
        selector.value = initialQubitStates[i] || "0";

        selector.onchange = (event) => {
          initialQubitStates[i] = event.target.value;
          if (!isPlaying) simulateAndDisplay(); // Update if paused
        };
      }
    }
  }

  function setupBlochSphereDisplays() {
    const container = document.getElementById("blochSpheresContainer");
    container.innerHTML = "";

    blochSphereDisplays.forEach((bsd) => {
      if (bsd && typeof bsd.dispose === "function") {
        bsd.dispose();
      }
    });
    blochSphereDisplays = [];

    if (!container) {
      console.error("Bloch spheres container not found!");
      return;
    }

    for (let i = 0; i < currentNumQubits; i++) {
      const canvasId = `blochSphereCanvasQ${i}`;
      const displayItemDiv = document.createElement("div");
      displayItemDiv.classList.add("display-item");

      const titleH4 = document.createElement("h4");
      titleH4.textContent = `布洛赫球 (量子比特 ${i})`;
      displayItemDiv.appendChild(titleH4);

      const canvas = document.createElement("canvas");
      canvas.id = canvasId;

      displayItemDiv.appendChild(canvas);
      container.appendChild(displayItemDiv);

      try {
        const bsd = new BlochSphereDisplay(canvasId);
        blochSphereDisplays.push(bsd);
      } catch (e) {
        console.error(
          `Failed to initialize BlochSphereDisplay for ${canvasId}:`,
          e
        );
      }
    }
    setTimeout(() => {
      blochSphereDisplays.forEach((bsd) => {
        if (bsd && typeof bsd.onResize === "function") {
          bsd.onResize();
        }
      });
    }, 0);
  }

  /**
   * Updates matrices of time-dependent gates in the current circuit definition.
   * @param {number} t - The current global time parameter (0 to 1).
   */
  function updateGateMatrices(t) {
    if (!currentCircuitDef) return;
    currentCircuitDef.columns.forEach((column) => {
      column.gates.forEach((gate) => {
        if (
          gate &&
          gate.isTimeDependent &&
          typeof gate.matrixGenerator === "function"
        ) {
          gate.matrix = gate.matrixGenerator(t);
        }
      });
    });
  }

  function simulateAndDisplay(circuitToSimulate = currentCircuitDef) {
    const defToUse = circuitToSimulate;
    const numQubits = defToUse.numQubits;
    let stateVector;

    if (numQubits > 0) {
      if (initialQubitStates.length !== numQubits) {
        initialQubitStates = new Array(numQubits).fill("0");
      }
      let firstStateKey = initialQubitStates[0] || "0";
      stateVector = PREDEFINED_QUBIT_STATES[firstStateKey].copy();

      for (let q = 1; q < numQubits; q++) {
        let stateKey = initialQubitStates[q] || "0";
        stateVector = stateVector.tensorProduct(
          PREDEFINED_QUBIT_STATES[stateKey].copy()
        );
      }
    } else {
      stateVector = new Matrix(1, 1, new Float32Array([1, 0]));
    }

    // At this point, time-dependent gates should have their matrices updated by updateGateMatrices

    defToUse.columns.forEach((column) => {
      let currentColumnOperator;
      if (numQubits > 0) {
        currentColumnOperator = Matrix.identity(1 << numQubits);
      } else {
        currentColumnOperator = Matrix.identity(1);
      }

      if (numQubits > 0) {
        const swapGateUiIndices = [];
        column.gates.forEach((gate, uiWireIndex) => {
          if (gate && gate.id === "SWAP") {
            swapGateUiIndices.push(uiWireIndex);
          }
        });

        if (swapGateUiIndices.length === 2) {
          const uiIdx1 = swapGateUiIndices[0];
          const uiIdx2 = swapGateUiIndices[1];
          const engineIdx1 = numQubits - 1 - uiIdx1;
          const engineIdx2 = numQubits - 1 - uiIdx2;
          currentColumnOperator = Matrix.swapOperator(
            engineIdx1,
            engineIdx2,
            numQubits
          );
        } else {
          const controlQubitIndices = [];
          const antiControlQubitIndices = [];

          column.gates.forEach((gate, uiWireIndex) => {
            if (gate && gate.isControlGate) {
              const engineWireIndexOfControl = numQubits - 1 - uiWireIndex;
              if (gate.symbol === "●") {
                controlQubitIndices.push(engineWireIndexOfControl);
              } else if (gate.symbol === "○") {
                antiControlQubitIndices.push(engineWireIndexOfControl);
              }
            }
          });

          let effectiveColumnOpForOtherGates = Matrix.identity(1 << numQubits);
          if (
            controlQubitIndices.length > 0 ||
            antiControlQubitIndices.length > 0
          ) {
            column.gates.forEach((gate, uiWireIndex) => {
              if (
                gate &&
                gate.id !== "SWAP" &&
                !gate.isControlGate &&
                !gate.isDisplayGate &&
                gate.matrix // Ensure matrix is present
              ) {
                const gateSpan = gate.height;
                const gateLsbInEngine =
                  numQubits - 1 - (uiWireIndex + gateSpan - 1);
                const op = Matrix.controlledGateOperator(
                  gate.matrix, // Use the (possibly time-updated) matrix
                  gateLsbInEngine,
                  controlQubitIndices,
                  antiControlQubitIndices,
                  numQubits,
                  gateSpan
                );
                effectiveColumnOpForOtherGates = op.times(
                  effectiveColumnOpForOtherGates
                );
              }
            });
          } else {
            column.gates.forEach((gate, uiWireIndex) => {
              if (
                gate &&
                gate.id !== "SWAP" &&
                !gate.isControlGate &&
                !gate.isDisplayGate &&
                gate.matrix // Ensure matrix is present
              ) {
                const gateSpan = gate.height;
                const gateLsbInEngine =
                  numQubits - 1 - (uiWireIndex + gateSpan - 1);
                const op = Matrix.gateOperator(
                  gate.matrix, // Use the (possibly time-updated) matrix
                  gateLsbInEngine,
                  numQubits,
                  gateSpan
                );
                effectiveColumnOpForOtherGates = op.times(
                  effectiveColumnOpForOtherGates
                );
              }
            });
          }
          currentColumnOperator = effectiveColumnOpForOtherGates;
        }
      }
      stateVector = currentColumnOperator.times(stateVector);
    });
    const stats = new CircuitStats(defToUse, stateVector);

    let stateStr = "";
    if (defToUse.numQubits > 0) {
      const numStatesToDisplay = Math.min(
        stats.finalState.height,
        1 << defToUse.numQubits
      );
      for (let i = 0; i < numStatesToDisplay; i++) {
        const amp = stats.finalState.cell(0, i);
        if (amp.norm2() > 1e-6) {
          let basisString = i.toString(2).padStart(defToUse.numQubits, "0");
          basisString = basisString.split("").reverse().join("");
          stateStr += `${amp.toString({
            fixedDigits: 2,
            includePlusForPositiveImag: true,
          })}|${basisString}⟩ `;
        }
      }
      if (stats.finalState.height > numStatesToDisplay && stateStr !== "") {
        stateStr += " ...";
      }
      // overallStateDisplay.innerHTML = `状态: |Ψ⟩ = ${
      //   stateStr || `|${"0".repeat(defToUse.numQubits)}⟩`
      // } (t=${globalTime_t.toFixed(2)})`; // Display current t
    } else {
      const scalarVal = stats.finalState.cell(0, 0);
      // overallStateDisplay.textContent = `State: Ψ = ${scalarVal.toString({
      //   fixedDigits: 2,
      //   includePlusForPositiveImag: true,
      // })} (0 qubits) (t=${globalTime_t.toFixed(2)})`;
    }

    if (defToUse.numQubits > 0) {
      blochSphereDisplays.forEach((bsd, i) => {
        if (bsd) {
          try {
            const statsQubitIndex = numQubits - 1 - i;
            const densityMatrixQ_i = stats.densityMatrix(statsQubitIndex);
            bsd.update(densityMatrixQ_i);
          } catch (e) {
            console.error(`Error updating Bloch sphere for Qubit ${i}:`, e);
            bsd.update(
              Matrix.square(
                Complex.ONE,
                Complex.ZERO,
                Complex.ZERO,
                Complex.ZERO
              )
            );
          }
        }
      });
    }

    if (
      displayedCircuit &&
      typeof displayedCircuit.updateEndOfLaneProbabilities === "function"
    ) {
      if (defToUse.numQubits > 0) {
        const marginalProbs = stats.marginalProbabilitiesPerQubit();
        const uiOrderedMarginalProbs = [];
        for (let ui_idx = 0; ui_idx < numQubits; ui_idx++) {
          const engine_idx = numQubits - 1 - ui_idx;
          uiOrderedMarginalProbs.push(marginalProbs[engine_idx]);
        }
        displayedCircuit.updateEndOfLaneProbabilities(
          uiOrderedMarginalProbs,
          defToUse.numQubits
        );
      } else {
        displayedCircuit.updateEndOfLaneProbabilities([], 0);
      }
    }

    if (amplitudeDisplay) {
      amplitudeDisplay.update(stats.finalState, defToUse.numQubits);
    }
  }

  function updateCircuitRepresentationDisplay(
    circuitToDisplay = currentCircuitDef
  ) {
    const defToUse = circuitToDisplay;
    // let circuitStr = "线路: ";
    if (defToUse.isEmpty()) {
      // circuitStr += "空";
    } else {
      defToUse.columns.forEach((col) => {
        // let colStr = "";
        col.gates.forEach((gate, wireIdx) => {
          if (gate) {
            // colStr += `G(${gate.symbol}@q${wireIdx}) `;
          }
        });
        // if (colStr) circuitStr += `[${colStr.trim()}]`;
      });
    }
    // circuitRepresentationDisplay.textContent = circuitStr;
  }

  numQubitsInput.addEventListener("change", () => {
    const newNumQubitsRaw = parseInt(numQubitsInput.value);
    const minQ = CircuitDefinition.MIN_QUBITS || 1;
    const maxQ = CircuitDefinition.MAX_QUBITS || 4;

    if (
      isNaN(newNumQubitsRaw) ||
      newNumQubitsRaw < minQ ||
      newNumQubitsRaw > maxQ
    ) {
      alert(`量子比特数必须在 ${minQ} 和 ${maxQ} 之间。`);
      numQubitsInput.value = currentNumQubits;
      return;
    }

    const newNumQubits = newNumQubitsRaw;
    if (newNumQubits === currentNumQubits) return;

    currentNumQubits = newNumQubits;
    numQubitsInput.value = currentNumQubits;

    initialQubitStates = new Array(currentNumQubits).fill("0");
    currentCircuitDef = CircuitDefinition.empty(currentNumQubits);

    handleCircuitChange(currentCircuitDef); // Will trigger simulation

    if (currentNumQubits > 0) {
      setupBlochSphereDisplays();
    } else {
      const container = document.getElementById("blochSpheresContainer");
      if (container) container.innerHTML = "";
      blochSphereDisplays.forEach((bsd) => {
        if (bsd && bsd.dispose) bsd.dispose();
      });
      blochSphereDisplays = [];
    }
    updateCircuitHeaderText();
  });

  clearCircuitButton.addEventListener("click", () => {
    currentCircuitDef = CircuitDefinition.empty(currentNumQubits);
    initialQubitStates = new Array(currentNumQubits).fill("0");
    handleCircuitChange(currentCircuitDef); // Will trigger simulation
  });

  // --- Animation Loop ---
  function animationLoop(timestamp) {
    if (!isPlaying) {
      animationFrameId = null; // Ensure we can restart if isPlaying becomes true
      return;
    }

    const deltaTime = timestamp - lastFrameTime;
    if (deltaTime >= timeStepDuration) {
      // Control update frequency
      lastFrameTime = timestamp;

      // Increment globalTime_t based on real time to achieve targetCycleDuration
      globalTime_t += deltaTime / targetCycleDuration;
      if (globalTime_t >= 1.0) {
        globalTime_t -= Math.floor(globalTime_t); // Loop t from 0 to 1
      }

      updateGateMatrices(globalTime_t);
      simulateAndDisplay(); // Simulate with updated matrices
    }

    animationFrameId = requestAnimationFrame(animationLoop);
  }
  // --- End Animation Loop ---

  // Initial setup
  const minQubitsAllowed =
    typeof CircuitDefinition.MIN_QUBITS !== "undefined"
      ? CircuitDefinition.MIN_QUBITS
      : 1;
  numQubitsInput.min = minQubitsAllowed;
  currentNumQubits = Math.max(minQubitsAllowed, parseInt(numQubitsInput.value));
  numQubitsInput.value = currentNumQubits;

  initialQubitStates = new Array(currentNumQubits).fill("0");
  currentCircuitDef = CircuitDefinition.empty(currentNumQubits);

  updateCircuitHeaderText();
  populateToolbox(); // Populates with new gates too
  displayedCircuit.circuitDefinition = currentCircuitDef;
  displayedCircuit.render();
  setupInitialStateSelectors();

  if (currentNumQubits > 0) {
    setupBlochSphereDisplays();
  }

  updateGateMatrices(globalTime_t); // Set initial matrices for t=0
  simulateAndDisplay(currentCircuitDef); // Initial simulation
  updateCircuitRepresentationDisplay(currentCircuitDef);

  if (isPlaying) {
    // Start the animation loop if isPlaying is true
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(animationLoop);
  }
});

document.addEventListener(
  "dragend",
  () => {
    if (
      displayedCircuit &&
      typeof displayedCircuit.clearDropColumnHighlight === "function"
    ) {
      displayedCircuit.clearDropColumnHighlight();
    }
  },
  false
);

// Optional: Add a play/pause button (not requested, but good for usability)
// const playPauseButton = document.createElement('button');
// playPauseButton.textContent = isPlaying ? "Pause Time" : "Play Time";
// playPauseButton.style.cssText = "position:absolute; top:10px; right:10px;";
// playPauseButton.onclick = () => {
//     isPlaying = !isPlaying;
//     playPauseButton.textContent = isPlaying ? "Pause Time" : "Play Time";
//     if (isPlaying && !animationFrameId) {
//         lastFrameTime = performance.now();
//         animationFrameId = requestAnimationFrame(animationLoop);
//     } else if (!isPlaying && animationFrameId) {
//         cancelAnimationFrame(animationFrameId);
//         animationFrameId = null;
//     }
// };
// document.body.appendChild(playPauseButton);
