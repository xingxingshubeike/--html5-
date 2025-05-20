// interactive_qubit_viz.js
document.addEventListener("DOMContentLoaded", () => {
  const blochCanvas = document.getElementById("blochSphereCanvas");
  const probCanvas = document.getElementById("probBarChartCanvas");
  const probCtx = probCanvas.getContext("2d");

  const qubitStateDisplay = document.getElementById("qubitStateDisplay");
  const blochCoordsDisplay = document.getElementById("blochCoordsDisplay");
  const measurementResultDisplay = document.getElementById(
    "measurementResultDisplay"
  );
  const circuitDisplay = document.getElementById("circuitDisplay");

  // Circuit related DOM elements
  const gatePalette = document.getElementById("gatePalette");
  const circuitLane = document.getElementById("circuitLane");
  const phiAngleInput = document.getElementById("phiAngle");
  const runCircuitButton = document.getElementById("runCircuitButton");
  const clearCircuitButton = document.getElementById("clearCircuitButton");

  // Probability Bar Chart Canvas dimensions
  probCanvas.width = 300;
  probCanvas.height = 150;

  let qubitState = { alpha: { real: 1, imag: 0 }, beta: { real: 0, imag: 0 } }; // α|0⟩ + β|1⟩
  let previousBlochVector = null;
  let measured = false;
  let circuitSequence = [];
  let draggedGateInfo = null;

  // --- Three.js Setup ---
  let scene, camera, renderer, controls;
  let sphereMesh, axesLines, stateVectorArrow, prevStateVectorArrow;
  const sphereRadius = 1.0;
  const textLabels = [];

  function initThreeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const aspect = blochCanvas.clientWidth / blochCanvas.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    camera.position.set(
      sphereRadius * 1.8,
      sphereRadius * 1.8,
      sphereRadius * 2.8
    );
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({
      canvas: blochCanvas,
      antialias: true,
    });
    renderer.setSize(blochCanvas.clientWidth, blochCanvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = sphereRadius * 1.5;
    controls.maxDistance = sphereRadius * 10;
    const ambientLight = new THREE.AmbientLight(0x404040, 3); // Increased intensity
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased intensity
    directionalLight.position.set(2, 3, 1);
    scene.add(directionalLight);
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.2,
      shininess: 20,
    });
    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphereMesh);

    function makeTextSprite(
      message,
      position,
      color = "black",
      fontSize = 24,
      scale = 0.3
    ) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const font = `${fontSize}px Arial`;
      context.font = font;
      const metrics = context.measureText(message);
      const textWidth = metrics.width;
      canvas.width = textWidth + 10;
      canvas.height = fontSize + 10;
      context.font = font;
      context.fillStyle = "rgba(255, 255, 255, 0)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = color;
      context.fillText(message, 5, fontSize);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1.0);
      return sprite;
    }

    const axisLength = sphereRadius * 1.3;
    const axisMaterialZ = new THREE.LineBasicMaterial({ color: 0x00aa00 }); // Green for Z (Bloch Z |0>-|1>) maps to Three.js Y
    const pointsZ = [
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
    ];
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pointsZ),
        axisMaterialZ
      )
    );
    textLabels.push(
      makeTextSprite(
        "|0⟩",
        new THREE.Vector3(0, axisLength * 1.05, 0),
        "#006400"
      )
    );
    textLabels.push(
      makeTextSprite(
        "|1⟩",
        new THREE.Vector3(0, -axisLength * 1.15, 0),
        "#006400"
      )
    );

    const axisMaterialX = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red for X (Bloch X |+⟩-|-⟩) maps to Three.js X
    const pointsX = [
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ];
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pointsX),
        axisMaterialX
      )
    );
    textLabels.push(
      makeTextSprite(
        "|+⟩ (X)",
        new THREE.Vector3(axisLength * 1.05, 0, 0),
        "#8B0000"
      )
    );

    const axisMaterialY = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue for Y (Bloch Y |+i⟩-|-i⟩) maps to Three.js Z
    const pointsY = [
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength),
    ];
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pointsY),
        axisMaterialY
      )
    );
    textLabels.push(
      makeTextSprite(
        "|+i⟩ (Y)",
        new THREE.Vector3(0, 0, axisLength * 1.05),
        "#00008B"
      )
    );

    textLabels.forEach((label) => scene.add(label));

    stateVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      sphereRadius,
      0x0077cc,
      0.2 * sphereRadius,
      0.1 * sphereRadius
    );
    scene.add(stateVectorArrow);
    prevStateVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      sphereRadius,
      0xffa500,
      0.18 * sphereRadius,
      0.09 * sphereRadius
    );
    prevStateVectorArrow.visible = false;
    scene.add(prevStateVectorArrow);

    animateThreeScene();
  }

  function animateThreeScene() {
    requestAnimationFrame(animateThreeScene);
    controls.update();
    renderer.render(scene, camera);
  }

  function updateBlochSphere3D() {
    if (!scene) return;
    const currentBlochVec = stateToBlochVector(
      qubitState.alpha,
      qubitState.beta
    );
    const threeJSDir = new THREE.Vector3(
      currentBlochVec.x,
      currentBlochVec.z,
      currentBlochVec.y
    ).normalize();
    stateVectorArrow.setDirection(threeJSDir);
    stateVectorArrow.setLength(
      sphereRadius,
      0.2 * sphereRadius,
      0.1 * sphereRadius
    );

    if (previousBlochVector) {
      const prevThreeJSDir = new THREE.Vector3(
        previousBlochVector.x,
        previousBlochVector.z,
        previousBlochVector.y
      ).normalize();
      prevStateVectorArrow.setDirection(prevThreeJSDir);
      prevStateVectorArrow.setLength(
        sphereRadius * 0.95,
        0.18 * sphereRadius,
        0.09 * sphereRadius
      );
      prevStateVectorArrow.visible = true;
    } else {
      prevStateVectorArrow.visible = false;
    }
  }

  const Complex = {
    add: (c1, c2) => ({ real: c1.real + c2.real, imag: c1.imag + c2.imag }),
    subtract: (c1, c2) => ({
      real: c1.real - c2.real,
      imag: c1.imag - c2.imag,
    }),
    multiply: (c1, c2) => ({
      real: c1.real * c2.real - c1.imag * c2.imag,
      imag: c1.real * c2.imag + c1.imag * c2.real,
    }),
    conjugate: (c) => ({ real: c.real, imag: -c.imag }),
    magnitudeSq: (c) => c.real * c.real + c.imag * c.imag,
    multiplyScalar: (c, s) => ({ real: c.real * s, imag: c.imag * s }),
  };

  function stateToBlochVector(alpha, beta) {
    const alpha_conj = Complex.conjugate(alpha);
    const beta_alpha_conj = Complex.multiply(beta, alpha_conj);
    const x = 2 * beta_alpha_conj.real;
    const y = 2 * beta_alpha_conj.imag;
    const z = Complex.magnitudeSq(alpha) - Complex.magnitudeSq(beta);
    return { x, y, z };
  }

  function drawProbBarChart() {
    const prob0 = Complex.magnitudeSq(qubitState.alpha);
    const prob1 = Complex.magnitudeSq(qubitState.beta);
    probCtx.clearRect(0, 0, probCanvas.width, probCanvas.height);
    const barWidth = 80;
    const maxBarHeight = probCanvas.height - 30;
    const spacing = 40;
    const baseX = (probCanvas.width - (2 * barWidth + spacing)) / 2;
    const baseY = probCanvas.height - 15;

    probCtx.fillStyle = "#28a745"; // Green
    const height0 = prob0 * maxBarHeight;
    probCtx.fillRect(baseX, baseY - height0, barWidth, height0);
    probCtx.fillStyle = "black";
    probCtx.textAlign = "center";
    probCtx.fillText(
      `P(|0⟩) = ${prob0.toFixed(3)}`,
      baseX + barWidth / 2,
      baseY + 10
    );

    probCtx.fillStyle = "#ffc107"; // Orange/Yellow
    const height1 = prob1 * maxBarHeight;
    probCtx.fillRect(
      baseX + barWidth + spacing,
      baseY - height1,
      barWidth,
      height1
    );
    probCtx.fillStyle = "black";
    probCtx.fillText(
      `P(|1⟩) = ${prob1.toFixed(3)}`,
      baseX + barWidth + spacing + barWidth / 2,
      baseY + 10
    );
  }

  function updateUI() {
    const currentBlochVec = stateToBlochVector(
      qubitState.alpha,
      qubitState.beta
    );
    qubitStateDisplay.textContent = `状态: α=${qubitState.alpha.real.toFixed(
      2
    )}${qubitState.alpha.imag < 0 ? "" : "+"}${qubitState.alpha.imag.toFixed(
      2
    )}i, β=${qubitState.beta.real.toFixed(2)}${
      qubitState.beta.imag < 0 ? "" : "+"
    }${qubitState.beta.imag.toFixed(2)}i`;
    blochCoordsDisplay.textContent = `布洛赫矢量: (x=${currentBlochVec.x.toFixed(
      2
    )}, y=${currentBlochVec.y.toFixed(2)}, z=${currentBlochVec.z.toFixed(2)})`;
    updateBlochSphere3D();
    drawProbBarChart();
    updateCircuitDisplay(); // Keep circuit display text updated
  }

  function initializeQubit(clearFullCircuit = true) {
    qubitState = { alpha: { real: 1, imag: 0 }, beta: { real: 0, imag: 0 } };
    previousBlochVector = null;
    measured = false;
    measurementResultDisplay.textContent = "测量结果: --";
    enableDirectGateButtons(true);
    document.getElementById("measureButton").disabled = false;

    if (clearFullCircuit) {
      circuitSequence = [];
      renderCircuitLane();
      runCircuitButton.disabled = true;
    }
    updateUI();
  }

  function storePreviousState() {
    if (!measured) {
      previousBlochVector = stateToBlochVector(
        qubitState.alpha,
        qubitState.beta
      );
    }
  }

  function enableDirectGateButtons(enable) {
    document.getElementById("hButtonDirect").disabled = !enable;
    document.getElementById("xButtonDirect").disabled = !enable;
    document.getElementById("yButtonDirect").disabled = !enable;
    document.getElementById("zButtonDirect").disabled = !enable;
    document.getElementById("sButtonDirect").disabled = !enable;
    // Measure button state handled separately by measureQubit and initializeQubit
  }

  // --- Direct Quantum Gate Operations ---
  function applyHGateDirect() {
    if (measured) return;
    storePreviousState();
    const sqrt2_inv = 1 / Math.sqrt(2);
    const { alpha, beta } = qubitState;
    qubitState.alpha = Complex.multiplyScalar(
      Complex.add(alpha, beta),
      sqrt2_inv
    );
    qubitState.beta = Complex.multiplyScalar(
      Complex.subtract(alpha, beta),
      sqrt2_inv
    );
    updateUI();
  }

  function applyXGateDirect() {
    if (measured) return;
    storePreviousState();
    const tempAlpha = qubitState.alpha;
    qubitState.alpha = qubitState.beta;
    qubitState.beta = tempAlpha;
    updateUI();
  }

  function applyYGateDirect() {
    if (measured) return;
    storePreviousState();
    const { alpha, beta } = qubitState;
    qubitState.alpha = { real: beta.imag, imag: -beta.real }; // -i * beta
    qubitState.beta = { real: -alpha.imag, imag: alpha.real }; // i * alpha
    updateUI();
  }

  function applyZGateDirect() {
    if (measured) return;
    storePreviousState();
    qubitState.beta = Complex.multiplyScalar(qubitState.beta, -1);
    updateUI();
  }

  function applySGateDirect() {
    if (measured) return;
    storePreviousState();
    // S gate: Z^0.5, multiplies beta by i
    qubitState.beta = {
      real: -qubitState.beta.imag,
      imag: qubitState.beta.real,
    };
    updateUI();
  }

  // --- Drag and Drop for Quantum Circuit ---
  function setupDragAndDrop() {
    const paletteGates = gatePalette.querySelectorAll("[draggable='true']");
    paletteGates.forEach((gate) => {
      gate.addEventListener("dragstart", (event) => {
        draggedGateInfo = {
          type: event.target.dataset.gate,
          displayName: event.target.textContent.trim(),
        };
        if (draggedGateInfo.type === "P") {
          const angle = parseFloat(phiAngleInput.value);
          if (isNaN(angle)) {
            alert("请输入有效的φ角 (弧度制)！");
            event.preventDefault(); // Prevent drag if angle is invalid
            draggedGateInfo = null;
            return;
          }
          draggedGateInfo.angle = angle;
          draggedGateInfo.displayName = `P(${draggedGateInfo.angle.toFixed(
            2
          )})`;
        }
        event.dataTransfer.setData("text/plain", draggedGateInfo.type);
        event.dataTransfer.effectAllowed = "copy";
      });
    });

    circuitLane.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });

    circuitLane.addEventListener("drop", (event) => {
      event.preventDefault();
      if (draggedGateInfo) {
        circuitSequence.push({ ...draggedGateInfo });
        renderCircuitLane();
        draggedGateInfo = null;
        runCircuitButton.disabled = circuitSequence.length === 0;
        updateCircuitDisplay(); // Update text display of circuit
        runCircuit(); // ADDED: Re-evaluate and display the entire circuit
      }
    });
  }

  function renderCircuitLane() {
    circuitLane.innerHTML = ""; // Clear current visual circuit
    circuitSequence.forEach((gate, index) => {
      const gateElement = document.createElement("div");
      gateElement.classList.add("gate-item"); // Uses same base style as palette items
      gateElement.textContent = gate.displayName;
      gateElement.dataset.index = index;

      const deleteButton = document.createElement("span");
      deleteButton.classList.add("delete-gate");
      deleteButton.innerHTML = "&times;";
      deleteButton.title = "移除此门";
      deleteButton.onclick = (e) => {
        e.stopPropagation(); // Prevent triggering other listeners if any
        removeGateFromCircuit(index);
      };

      gateElement.appendChild(deleteButton);
      circuitLane.appendChild(gateElement);
    });
  }

  function removeGateFromCircuit(index) {
    circuitSequence.splice(index, 1);
    renderCircuitLane();
    updateCircuitDisplay();
    runCircuitButton.disabled = circuitSequence.length === 0;

    if (circuitSequence.length > 0) {
      runCircuit(); // MODIFIED: Re-evaluate and display the modified circuit
    } else {
      // If circuit is now empty, reset qubit state to |0> and clear measurement
      initializeQubit(false); // Reset state but not full circuit clear visually
      // measurementResultDisplay text is handled by initializeQubit
    }
  }

  function updateCircuitDisplay() {
    const gateNames = circuitSequence.map((g) => g.displayName).join(" → ");
    circuitDisplay.textContent = `当前线路: ${gateNames || "空"}`;
  }

  // --- Circuit Execution ---
  function runCircuit() {
    if (circuitSequence.length === 0) {
      measurementResultDisplay.textContent = "测量结果: 线路为空!";
      // If called when circuit is empty (e.g. by removeGateFromCircuit then it calls initializeQubit)
      // Or if "Run Circuit" button is pressed while empty.
      // We might want to ensure state is |0> if it's empty.
      // initializeQubit(false) handles this if called explicitly elsewhere.
      // For now, this just messages and returns if button is pressed on empty.
      return;
    }

    // Reset qubit to |0⟩ state before running the circuit
    qubitState = { alpha: { real: 1, imag: 0 }, beta: { real: 0, imag: 0 } };
    previousBlochVector = null;
    measured = false;
    measurementResultDisplay.textContent = "测量结果: --"; // Reset before run
    enableDirectGateButtons(true); // Keep direct gates enabled
    document.getElementById("measureButton").disabled = false; // Enable measure after a run

    updateUI(); // Show initial |0> state on Bloch sphere and clear previous arrow.

    // Apply each gate in sequence
    for (const gate of circuitSequence) {
      previousBlochVector = stateToBlochVector(
        qubitState.alpha,
        qubitState.beta
      ); // State *before* this gate

      const currentAlpha = { ...qubitState.alpha }; // Make copies for calculations
      const currentBeta = { ...qubitState.beta };
      const sqrt2_inv = 1 / Math.sqrt(2);

      switch (gate.type) {
        case "H":
          qubitState.alpha = Complex.multiplyScalar(
            Complex.add(currentAlpha, currentBeta),
            sqrt2_inv
          );
          qubitState.beta = Complex.multiplyScalar(
            Complex.subtract(currentAlpha, currentBeta),
            sqrt2_inv
          );
          break;
        case "X":
          qubitState.alpha = currentBeta;
          qubitState.beta = currentAlpha;
          break;
        case "Y":
          qubitState.alpha = {
            real: currentBeta.imag,
            imag: -currentBeta.real,
          };
          qubitState.beta = {
            real: -currentAlpha.imag,
            imag: currentAlpha.real,
          };
          break;
        case "Z":
          qubitState.beta = Complex.multiplyScalar(currentBeta, -1);
          break;
        case "S": // Phase P(PI/2)
          qubitState.beta = { real: -currentBeta.imag, imag: currentBeta.real }; // beta * i
          break;
        case "P":
          const phi = gate.angle;
          const cosPhi = Math.cos(phi);
          const sinPhi = Math.sin(phi);
          qubitState.beta = {
            real: currentBeta.real * cosPhi - currentBeta.imag * sinPhi,
            imag: currentBeta.real * sinPhi + currentBeta.imag * cosPhi,
          };
          break;
      }
      updateUI(); // Update UI after *each* gate application in the circuit
    }
    // Message reflects that the circuit (potentially updated by drag/drop) has been "run" or evaluated.
    measurementResultDisplay.textContent =
      "测量结果: 线路已更新/运行，可以测量。";
  }

  function clearCircuit() {
    circuitSequence = [];
    renderCircuitLane();
    updateCircuitDisplay();
    runCircuitButton.disabled = true;
    // Reset qubit state to |0⟩ and clear measurement when circuit is cleared
    initializeQubit(false); // false to not re-clear the (already empty) circuit lane visually
    // measurementResultDisplay text handled by initializeQubit
  }

  function measureQubit() {
    if (measured) {
      measurementResultDisplay.textContent =
        "测量结果: 已测量，请初始化或运行线路后重试。";
      return;
    }

    const prob0 = Complex.magnitudeSq(qubitState.alpha);
    const rand = Math.random();
    let outcome;

    // Capture state just before collapse for the previousBlochVector if it's not already the end of a sequence
    // This is tricky because previousBlochVector is managed by the runCircuit loop.
    // For a measurement after a circuit run, previousBlochVector shows state before *last gate*.
    // For measurement after direct op, previousBlochVector shows state before *direct op*.
    // This is generally fine. We are collapsing the *current* state.
    // To be precise, we could set previousBlochVector = stateToBlochVector(qubitState.alpha, qubitState.beta);
    // right before changing qubitState. But the current approach shows historical context.

    if (rand < prob0) {
      outcome = 0;
      qubitState = { alpha: { real: 1, imag: 0 }, beta: { real: 0, imag: 0 } };
    } else {
      outcome = 1;
      qubitState = { alpha: { real: 0, imag: 0 }, beta: { real: 1, imag: 0 } };
    }
    measured = true;
    measurementResultDisplay.textContent = `测量结果: ${outcome}`;
    enableDirectGateButtons(false); // Disable further gate operations
    document.getElementById("measureButton").disabled = true;
    updateUI(); // Update UI to show collapsed state
  }

  // --- Event Listeners ---
  document
    .getElementById("initButton")
    .addEventListener("click", () => initializeQubit(true));

  // Direct gate application buttons
  document
    .getElementById("hButtonDirect")
    .addEventListener("click", applyHGateDirect);
  document
    .getElementById("xButtonDirect")
    .addEventListener("click", applyXGateDirect);
  document
    .getElementById("yButtonDirect")
    .addEventListener("click", applyYGateDirect);
  document
    .getElementById("zButtonDirect")
    .addEventListener("click", applyZGateDirect);
  document
    .getElementById("sButtonDirect")
    .addEventListener("click", applySGateDirect);

  document
    .getElementById("measureButton")
    .addEventListener("click", measureQubit);

  // Circuit buttons
  runCircuitButton.addEventListener("click", runCircuit);
  clearCircuitButton.addEventListener("click", clearCircuit);

  // Initial setup
  initThreeScene();
  setupDragAndDrop();
  initializeQubit(); // Initialize qubit state, UI, and clear circuit stuff

  window.addEventListener("resize", () => {
    if (camera && renderer) {
      const newWidth = blochCanvas.clientWidth;
      const newHeight = blochCanvas.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }
  });
});
