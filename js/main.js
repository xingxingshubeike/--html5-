// Example1/js/main.js
// 导入 BlochSphereDisplay 类，用于显示布洛赫球
import BlochSphereDisplay from "./ui/blochSphere.js";
// import ProbabilityDisplay from "./ui/probabilityDisplay.js"; // 移除了概率显示功能
// 导入 AmplitudeDisplay 类，用于显示振幅
import AmplitudeDisplay from "./ui/amplitudeDisplay.js";

// 当DOM内容完全加载后执行
document.addEventListener("DOMContentLoaded", () => {
  let currentNumQubits = 2; // 当前量子比特数，默认值为2，会从输入框更新
  const circuitLanesContainer = document.getElementById("circuitLanes"); // 量子线路通道的容器元素
  const gatePaletteContainer = document.getElementById("gatePalette"); // 量子门调色板的容器元素
  const clearCircuitButton = document.getElementById("clearCircuitButton"); // “清空线路”按钮元素
  const numQubitsInput = document.getElementById("numQubitsInput"); // 量子比特数输入框元素
  const circuitHeader = document.getElementById("circuitHeader"); // 量子线路部分的标题元素

  const overallStateDisplay = document.getElementById("overallStateDisplay"); // (已注释掉) 用于显示整体量子态的元素
  // const circuitRepresentationDisplay = document.getElementById( // (已注释掉)
  //   "circuitRepresentationDisplay"
  // );
  const deutschFunctionSelect = document.getElementById(
    // Deutsch算法中函数 f 的选择下拉框元素
    "deutschFunctionSelect"
  );
  const setupDeutschCircuitButton = document.getElementById(
    // “设置 Deutsch 线路”按钮元素
    "setupDeutschCircuitButton"
  );
  const deutschResultOutputP = document.getElementById("deutschResultOutput"); // Deutsch算法结果输出的段落元素

  let blochSphereDisplays = []; // 存储布洛赫球显示对象的数组
  let amplitudeDisplay = new AmplitudeDisplay("amplitudeCanvas"); // 创建振幅显示对象
  if (setupDeutschCircuitButton) {
    // 如果存在“设置 Deutsch 线路”按钮
    setupDeutschCircuitButton.addEventListener("click", setupDeutschCircuit); // 为其添加点击事件监听器
  }

  // 为每个量子比特的初始状态定义 Matrix 对象
  const PREDEFINED_QUBIT_STATES = {
    // 预定义的量子比特初始状态及其对应的矩阵表示
    0: Matrix.col(Complex.ONE, Complex.ZERO), // |0⟩ 态
    1: Matrix.col(Complex.ZERO, Complex.ONE), // |1⟩ 态
    "+": Matrix.col(
      // |+⟩ 态
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(1 / Math.sqrt(2), 0)
    ),
    "-": Matrix.col(
      // |-⟩ 态
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(-1 / Math.sqrt(2), 0)
    ),
    i: Matrix.col(
      // |i⟩ 态 (即 |+i⟩)
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(0, 1 / Math.sqrt(2))
    ),
    "-i": Matrix.col(
      // |-i⟩ 态
      new Complex(1 / Math.sqrt(2), 0),
      new Complex(0, -1 / Math.sqrt(2))
    ),
  };

  // 预定义的量子比特初始状态选项，用于下拉选择器
  const PREDEFINED_QUBIT_STATE_OPTIONS = [
    { value: "0", text: "|0⟩" },
    { value: "1", text: "|1⟩" },
    { value: "+", text: "|+⟩" },
    { value: "-", text: "|-⟩" },
    { value: "i", text: "|i⟩" },
    { value: "-i", text: "|-i⟩" },
  ];

  // 存储当前所有量子比特的初始状态的数组，默认为 "0"
  let initialQubitStates = new Array(currentNumQubits).fill("0");

  // --- 时间演化相关变量 ---
  let globalTime_t = 0; // 全局时间参数 t，范围 0 到 1
  let animationFrameId = null; // 动画帧请求ID，用于控制动画循环
  const timeStepDuration = 50; // 每一步的时间间隔 (毫秒)，控制参数 t 的变化速度
  let lastFrameTime = 0; // 上一帧的时间戳
  let isPlaying = true; // 动画是否正在播放，默认为自动播放
  const targetCycleDuration = 5000; // 一个完整周期 (t 从 0 到 1) 的目标持续时间 (毫秒)
  // --- End 时间演化相关 ---

  // 窗口大小改变时的事件监听器
  window.addEventListener("resize", () => {
    // 调整所有布洛赫球显示的大小
    blochSphereDisplays.forEach((bsd) => {
      if (bsd && typeof bsd.onResize === "function") {
        bsd.onResize();
      }
    });
    // 如果振幅显示存在，也进行处理
    if (amplitudeDisplay) {
      // simulateAndDisplay(); // 如果正在播放，将由动画循环处理
      if (!isPlaying) simulateAndDisplay(); // 如果暂停，则更新显示
    }
  });

  // 当前量子线路的定义对象
  let currentCircuitDef = CircuitDefinition.empty(currentNumQubits);
  // 显示在UI上的量子线路对象
  let displayedCircuit = new DisplayedCircuit(
    currentCircuitDef, // 当前线路定义
    circuitLanesContainer, // 线路通道的DOM容器
    handleCircuitChange // 线路变化时的回调函数
  );

  // 所有可用的量子门类型定义
  const gateTypes = {
    ...GATE_DEFINITIONS_PAULI, // Pauli 门
    ...GATE_DEFINITIONS_HADAMARD, // Hadamard 门
    ...GATE_DEFINITIONS_PHASE, // 相位门
    ...GATE_DEFINITIONS_CONTROL, // 控制门
    ...GATE_DEFINITIONS_SWAP, // SWAP 门
    ...GATE_DEFINITIONS_RAISING, // 随时间演化门 (新增)
    ...GATE_DEFINITIONS_IDENTITY, // 单位门
  };

  // 填充工具箱中的量子门
  function populateToolbox() {
    gatePaletteContainer.innerHTML = ""; // 清空工具箱
    for (const gateId in gateTypes) {
      // 遍历所有量子门类型
      const gate = gateTypes[gateId]; // 获取门对象
      const gateEl = document.createElement("div"); // 创建门的DOM元素
      gateEl.classList.add("gate-item"); // 添加样式类
      gateEl.textContent = gate.symbol; // 显示门符号
      gateEl.draggable = true; // 设置为可拖动
      gateEl.title = `${gate.name}\n${gate.blurb}`; // 设置鼠标悬停提示信息

      // 拖动开始事件
      gateEl.addEventListener("dragstart", (event) => {
        console.log(
          `[Main.js - Toolbox] DRAGSTART event for gate: ${gate.symbol}, id: ${gate.id}`
        );
        // 传递门的副本，这样如果它是时间依赖的门，其 timeParameter 是新的
        displayedCircuit.setDraggedGate(gate.copy(), true); // 设置当前拖动的门 (来自工具箱)
        try {
          event.dataTransfer.setData("text/plain", gate.id); // 设置拖动数据
          console.log(
            `[Main.js - Toolbox] setData successful. effectAllowed: ${event.dataTransfer.effectAllowed}`
          );
        } catch (e) {
          console.error("[Main.js - Toolbox] setData FAILED:", e);
        }
        event.dataTransfer.effectAllowed = "copy"; // 设置拖动效果为复制
      });

      // 拖动结束事件
      gateEl.addEventListener("dragend", (event) => {
        displayedCircuit.clearDropColumnHighlight(); // 清除放置列的高亮
        // 如果拖动的门是来自调色板的，并且没有成功放置到线路上
        if (
          displayedCircuit._draggedGateInfo &&
          displayedCircuit._draggedGateInfo.originalPalette &&
          displayedCircuit._draggedGateInfo.gate.id === gate.id
        ) {
          console.log(
            "[Main.js - Toolbox] Dragend for palette item, not dropped successfully. Clearing draggedGateInfo."
          );
          displayedCircuit.setDraggedGate(null); // 清除拖动的门信息
        }
      });
      gatePaletteContainer.appendChild(gateEl); // 将门元素添加到工具箱
    }
  }

  // 处理量子线路变化的函数
  function handleCircuitChange(newCircuitDefinition) {
    currentCircuitDef = newCircuitDefinition; // 更新当前线路定义
    // 当线路改变时，其中的时间依赖门可能是新的实例。
    // 它们的矩阵将在下一个动画帧由 updateGateMatrices 更新。
    displayedCircuit.circuitDefinition = currentCircuitDef; // 更新显示线路的定义
    displayedCircuit.render(); // 重新渲染线路 (如果新门是时间依赖的，在build()中定义的话会使用初始t=0的矩阵)
    setupInitialStateSelectors(); // 设置初始状态选择器

    // 如果动画未播放，需要确保矩阵针对当前 globalTime_t 是最新的，然后进行模拟。
    // 如果正在播放，动画循环会处理它。
    if (!isPlaying) {
      updateGateMatrices(globalTime_t); // 更新门矩阵
      simulateAndDisplay(currentCircuitDef); // 模拟并显示结果
    } else {
      // 如果正在播放，确保至少发生一次更新，因为动画循环可能有轻微延迟
      updateGateMatrices(globalTime_t);
      simulateAndDisplay(currentCircuitDef);
    }
    updateCircuitRepresentationDisplay(currentCircuitDef); // (已注释掉) 更新线路的文本表示
  }

  // 更新量子线路区域的标题文本 (例如 "量子线路 (2 量子比特)")
  function updateCircuitHeaderText() {
    circuitHeader.textContent = `量子线路 (${currentNumQubits} 量子比特${
      currentNumQubits > 1 ? "" : "" // 复数形式处理 (此处中文不需要)
    })`;
  }

  // 设置Deutsch算法的量子线路
  function setupDeutschCircuit() {
    currentNumQubits = 2; // Deutsch算法固定使用2个量子比特
    numQubitsInput.value = currentNumQubits; // 更新量子比特数输入框的值
    // updateCircuitHeaderText(); // handleCircuitChange 会间接调用它

    // Deutsch 算法的经典初始态是 |0⟩ 和 |1⟩，然后经过H门
    // 所以选择器应设置为 |0⟩ 和 |1⟩
    initialQubitStates = ["0", "1"]; // 设置初始状态

    let newCircuitDef = CircuitDefinition.empty(currentNumQubits); // 创建一个空的2量子比特线路

    // 从 gateTypes 获取门实例的副本
    const H = gateTypes["H"] ? gateTypes["H"].copy() : null; // Hadamard门
    const X = gateTypes["X"] ? gateTypes["X"].copy() : null; // Pauli-X门
    const I = gateTypes["I"] ? gateTypes["I"].copy() : null; // 单位门
    const Control = gateTypes["Control"] ? gateTypes["Control"].copy() : null; // 控制位(●)
    const AntiControl = gateTypes["AntiControl"] // 反控制位(○)
      ? gateTypes["AntiControl"].copy()
      : null;

    // 检查所需的基础门是否都已定义
    if (!H || !X || !I || !Control || !AntiControl) {
      alert("错误：Deutsch 算法所需的基础门未完全定义。请检查 gateTypes。");
      return;
    }

    const selectedFunction = deutschFunctionSelect.value; // 获取用户选择的函数 f

    // 第 0 列: 对两个量子比特应用 Hadamard 门
    newCircuitDef = newCircuitDef.withGatePlaced(H, 0, 0); // q0 上作用 H 门
    newCircuitDef = newCircuitDef.withGatePlaced(H, 0, 1); // q1 上作用 H 门

    // 第 1 列: Oracle U_f (根据选择的函数构建)
    switch (selectedFunction) {
      case "f_const_zero": // f(0)=0, f(1)=0. Oracle U_f 是在第二个量子比特上的 Identity 门
        newCircuitDef = newCircuitDef.withGatePlaced(I, 1, 1); // q1 上作用 I 门
        newCircuitDef = newCircuitDef.withGatePlaced(I, 1, 0); // q0 上也放一个 I 门保持对齐
        break;
      case "f_const_one": // f(0)=1, f(1)=1. Oracle U_f 是在第二个量子比特上的 X 门
        newCircuitDef = newCircuitDef.withGatePlaced(X, 1, 1); // q1 上作用 X 门
        newCircuitDef = newCircuitDef.withGatePlaced(I, 1, 0); // q0 上也放一个 I 门
        break;
      case "f_id": // f(0)=0, f(1)=1. Oracle U_f 是 CNOT 门 (q0 控制, q1 目标)
        newCircuitDef = newCircuitDef.withGatePlaced(Control, 1, 0); // q0 上放置控制位
        newCircuitDef = newCircuitDef.withGatePlaced(X, 1, 1); // q1 上放置目标 X 门
        break;
      case "f_not": // f(0)=1, f(1)=0. Oracle U_f 是 q0 为反向控制的 CNOT 门
        newCircuitDef = newCircuitDef.withGatePlaced(AntiControl, 1, 0); // q0 上放置反控制位
        newCircuitDef = newCircuitDef.withGatePlaced(X, 1, 1); // q1 上放置目标 X 门
        break;
    }

    // 第 2 列: 对第一个量子比特应用 Hadamard 门
    newCircuitDef = newCircuitDef.withGatePlaced(H, 2, 0); // q0 上作用 H 门
    newCircuitDef = newCircuitDef.withGatePlaced(I, 2, 1); // q1 上放置 I 门保持线路整洁

    // 更新线路定义并触发重新渲染和模拟
    // handleCircuitChange 会负责调用 setupInitialStateSelectors, simulateAndDisplay 等
    handleCircuitChange(newCircuitDef);
    updateCircuitHeaderText(); // 更新线路标题
    setupBlochSphereDisplays(); // 设置布洛赫球显示

    // 更新 Deutsch 结果的说明文字
    if (deutschResultOutputP) {
      if (
        selectedFunction === "f_const_zero" ||
        selectedFunction === "f_const_one"
      ) {
        deutschResultOutputP.textContent =
          "f(0)⊕f(1)=0, 因此q0 测量结果为 |0⟩ "; // 常数函数结果
      } else {
        // 'f_id' or 'f_not'
        deutschResultOutputP.textContent =
          "f(0)⊕f(1)=1, 因此q0 测量结果为 |1⟩ "; // 平衡函数结果
      }
    }
  }

  // 设置每个量子比特的初始状态选择器
  function setupInitialStateSelectors() {
    for (let i = 0; i < currentNumQubits; i++) {
      // 遍历所有量子比特
      const selector = document.getElementById(
        `qubit-initial-state-selector-${i}` // 获取对应量子比特的选择器DOM元素
      );
      if (selector) {
        // 如果选择器存在
        selector.innerHTML = ""; // 清空现有选项
        PREDEFINED_QUBIT_STATE_OPTIONS.forEach((opt) => {
          // 添加预定义的初始状态选项
          const optionEl = document.createElement("option");
          optionEl.value = opt.value;
          optionEl.textContent = opt.text;
          selector.appendChild(optionEl);
        });
        selector.value = initialQubitStates[i] || "0"; // 设置选择器的当前值为该量子比特的初始状态

        // 当选择器值改变时
        selector.onchange = (event) => {
          initialQubitStates[i] = event.target.value; // 更新该量子比特的初始状态
          if (!isPlaying) simulateAndDisplay(); // 如果动画暂停，则立即模拟并显示
        };
      }
    }
  }

  // 设置布洛赫球显示区域
  function setupBlochSphereDisplays() {
    const container = document.getElementById("blochSpheresContainer"); // 获取布洛赫球容器元素
    container.innerHTML = ""; // 清空容器

    // 销毁旧的布洛赫球显示对象
    blochSphereDisplays.forEach((bsd) => {
      if (bsd && typeof bsd.dispose === "function") {
        bsd.dispose();
      }
    });
    blochSphereDisplays = []; // 重置数组

    if (!container) {
      // 如果容器不存在，则报错
      console.error("Bloch spheres container not found!");
      return;
    }

    // 为每个量子比特创建一个布洛赫球显示
    for (let i = 0; i < currentNumQubits; i++) {
      const canvasId = `blochSphereCanvasQ${i}`; // 为canvas元素生成唯一ID
      const displayItemDiv = document.createElement("div"); // 创建包裹canvas的div
      displayItemDiv.classList.add("display-item"); // 添加样式

      const titleH4 = document.createElement("h4"); // 创建标题
      titleH4.textContent = `布洛赫球 (量子比特 ${i})`;
      displayItemDiv.appendChild(titleH4);

      const canvas = document.createElement("canvas"); // 创建canvas元素
      canvas.id = canvasId;

      displayItemDiv.appendChild(canvas);
      container.appendChild(displayItemDiv); // 将显示项添加到容器

      try {
        const bsd = new BlochSphereDisplay(canvasId); // 创建新的布洛赫球显示对象
        blochSphereDisplays.push(bsd); // 添加到数组
      } catch (e) {
        console.error(
          `Failed to initialize BlochSphereDisplay for ${canvasId}:`,
          e
        );
      }
    }
    // 延迟执行resize，确保DOM更新完毕
    setTimeout(() => {
      blochSphereDisplays.forEach((bsd) => {
        if (bsd && typeof bsd.onResize === "function") {
          bsd.onResize(); // 调整大小以适应容器
        }
      });
    }, 0);
  }

  /**
   * 更新当前量子线路定义中时间依赖门的矩阵。
   * @param {number} t - 当前的全局时间参数 (0 到 1)。
   */
  function updateGateMatrices(t) {
    if (!currentCircuitDef) return; // 如果线路未定义，则返回
    currentCircuitDef.columns.forEach((column) => {
      // 遍历线路中的每一列
      column.gates.forEach((gate) => {
        // 遍历列中的每一个门
        if (
          gate && // 如果门存在
          gate.isTimeDependent && // 并且是时间依赖的
          typeof gate.matrixGenerator === "function" // 并且有矩阵生成函数
        ) {
          gate.matrix = gate.matrixGenerator(t); // 根据当前时间 t 生成新的矩阵
        }
      });
    });
  }

  // 模拟量子线路并更新所有显示
  function simulateAndDisplay(circuitToSimulate = currentCircuitDef) {
    const defToUse = circuitToSimulate; // 要模拟的线路定义
    const numQubits = defToUse.numQubits; // 量子比特数
    let stateVector; // 整个系统的状态向量

    if (numQubits > 0) {
      // 如果存在量子比特
      // 确保初始状态数组长度与量子比特数一致
      if (initialQubitStates.length !== numQubits) {
        initialQubitStates = new Array(numQubits).fill("0");
      }
      // 获取第一个量子比特的初始状态矩阵
      let firstStateKey = initialQubitStates[0] || "0";
      stateVector = PREDEFINED_QUBIT_STATES[firstStateKey].copy();

      // 通过张量积构建多量子比特系统的初始状态向量
      for (let q = 1; q < numQubits; q++) {
        let stateKey = initialQubitStates[q] || "0";
        stateVector = stateVector.tensorProduct(
          PREDEFINED_QUBIT_STATES[stateKey].copy()
        );
      }
    } else {
      // 0量子比特系统 (理论上，通常不这样使用)
      stateVector = new Matrix(1, 1, new Float32Array([1, 0])); // 标量1
    }

    // 此时，时间依赖门的矩阵应该已经被 updateGateMatrices 更新了

    // 遍历线路中的每一列，计算列算符并作用于状态向量
    defToUse.columns.forEach((column) => {
      let currentColumnOperator; // 当前列的算符
      if (numQubits > 0) {
        currentColumnOperator = Matrix.identity(1 << numQubits); // 初始化为单位矩阵
      } else {
        currentColumnOperator = Matrix.identity(1);
      }

      if (numQubits > 0) {
        const swapGateUiIndices = []; // 存储当前列中SWAP门所在的UI线路索引
        column.gates.forEach((gate, uiWireIndex) => {
          if (gate && gate.id === "SWAP") {
            swapGateUiIndices.push(uiWireIndex);
          }
        });

        // 如果列中有两个SWAP门，则构建SWAP算符
        if (swapGateUiIndices.length === 2) {
          const uiIdx1 = swapGateUiIndices[0];
          const uiIdx2 = swapGateUiIndices[1];
          // 将UI索引转换为引擎内部使用的索引 (通常是反向的)
          const engineIdx1 = numQubits - 1 - uiIdx1;
          const engineIdx2 = numQubits - 1 - uiIdx2;
          currentColumnOperator = Matrix.swapOperator(
            engineIdx1,
            engineIdx2,
            numQubits
          );
        } else {
          // 处理非SWAP门和控制门
          const controlQubitIndices = []; // 存储控制位(●)的引擎索引
          const antiControlQubitIndices = []; // 存储反控制位(○)的引擎索引

          column.gates.forEach((gate, uiWireIndex) => {
            if (gate && gate.isControlGate) {
              // 如果是控制类型的门符号
              const engineWireIndexOfControl = numQubits - 1 - uiWireIndex;
              if (gate.symbol === "●") {
                controlQubitIndices.push(engineWireIndexOfControl);
              } else if (gate.symbol === "○") {
                antiControlQubitIndices.push(engineWireIndexOfControl);
              }
            }
          });

          // 构建其他非控制、非SWAP、非显示门的有效列算符
          let effectiveColumnOpForOtherGates = Matrix.identity(1 << numQubits);
          if (
            controlQubitIndices.length > 0 ||
            antiControlQubitIndices.length > 0
          ) {
            // 如果存在控制位或反控制位
            column.gates.forEach((gate, uiWireIndex) => {
              if (
                gate && // 门存在
                gate.id !== "SWAP" && // 不是SWAP门
                !gate.isControlGate && // 不是控制符号本身
                !gate.isDisplayGate && // 不是显示类型的门
                gate.matrix // 门有矩阵定义
              ) {
                const gateSpan = gate.height; // 门占据的量子比特数
                // 计算门作用的最低有效位 (LSB) 的引擎索引
                const gateLsbInEngine =
                  numQubits - 1 - (uiWireIndex + gateSpan - 1);
                // 构建受控门算符
                const op = Matrix.controlledGateOperator(
                  gate.matrix, // 门的矩阵 (可能是时间更新后的)
                  gateLsbInEngine,
                  controlQubitIndices,
                  antiControlQubitIndices,
                  numQubits,
                  gateSpan
                );
                // 乘以现有算符 (注意矩阵乘法顺序)
                effectiveColumnOpForOtherGates = op.times(
                  effectiveColumnOpForOtherGates
                );
              }
            });
          } else {
            // 如果没有控制位或反控制位
            column.gates.forEach((gate, uiWireIndex) => {
              if (
                gate &&
                gate.id !== "SWAP" &&
                !gate.isControlGate &&
                !gate.isDisplayGate &&
                gate.matrix
              ) {
                const gateSpan = gate.height;
                const gateLsbInEngine =
                  numQubits - 1 - (uiWireIndex + gateSpan - 1);
                // 构建普通门算符
                const op = Matrix.gateOperator(
                  gate.matrix, // 门的矩阵
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
          currentColumnOperator = effectiveColumnOpForOtherGates; // 设置当前列的最终算符
        }
      }
      stateVector = currentColumnOperator.times(stateVector); // 将列算符作用于状态向量
    });

    // 创建线路统计对象
    const stats = new CircuitStats(defToUse, stateVector);

    let stateStr = ""; // 用于显示最终状态的字符串
    if (defToUse.numQubits > 0) {
      // 确定要显示的基态数量 (避免过多)
      const numStatesToDisplay = Math.min(
        stats.finalState.height, // 状态向量的高度 (基态数量)
        1 << defToUse.numQubits // 最大可能的基态数量
      );
      // 格式化最终状态向量为字符串
      for (let i = 0; i < numStatesToDisplay; i++) {
        const amp = stats.finalState.cell(0, i); // 获取第i个基态的振幅
        if (amp.norm2() > 1e-6) {
          // 只显示概率幅平方大于阈值的项
          // 将基态索引转换为二进制字符串，并反转以匹配UI显示顺序 (q0在最上面)
          let basisString = i.toString(2).padStart(defToUse.numQubits, "0");
          basisString = basisString.split("").reverse().join("");
          stateStr += `${amp.toString({
            // 格式化复数振幅
            fixedDigits: 2,
            includePlusForPositiveImag: true,
          })}|${basisString}⟩ `;
        }
      }
      if (stats.finalState.height > numStatesToDisplay && stateStr !== "") {
        stateStr += " ..."; // 如果有更多未显示的项
      }
      // (已注释掉) 更新整体状态显示DOM元素
      // overallStateDisplay.innerHTML = `状态: |Ψ⟩ = ${
      //   stateStr || `|${"0".repeat(defToUse.numQubits)}⟩`
      // } (t=${globalTime_t.toFixed(2)})`; // 显示当前时间 t
    } else {
      const scalarVal = stats.finalState.cell(0, 0);
      // (已注释掉)
      // overallStateDisplay.textContent = `State: Ψ = ${scalarVal.toString({
      //   fixedDigits: 2,
      //   includePlusForPositiveImag: true,
      // })} (0 qubits) (t=${globalTime_t.toFixed(2)})`;
    }

    // 更新每个量子比特的布洛赫球显示
    if (defToUse.numQubits > 0) {
      blochSphereDisplays.forEach((bsd, i) => {
        // i 是UI索引
        if (bsd) {
          try {
            // 获取对应量子比特的密度矩阵 (注意UI索引和引擎索引的转换)
            const statsQubitIndex = numQubits - 1 - i;
            const densityMatrixQ_i = stats.densityMatrix(statsQubitIndex);
            bsd.update(densityMatrixQ_i); // 更新布洛赫球
          } catch (e) {
            console.error(`Error updating Bloch sphere for Qubit ${i}:`, e);
            // 出错时显示默认的|0>态密度矩阵
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

    // 更新线路末端每个量子比特的概率显示
    if (
      displayedCircuit &&
      typeof displayedCircuit.updateEndOfLaneProbabilities === "function"
    ) {
      if (defToUse.numQubits > 0) {
        const marginalProbs = stats.marginalProbabilitiesPerQubit(); // 获取每个量子比特的边缘概率 (引擎顺序)
        const uiOrderedMarginalProbs = []; // 转换为UI顺序
        for (let ui_idx = 0; ui_idx < numQubits; ui_idx++) {
          const engine_idx = numQubits - 1 - ui_idx;
          uiOrderedMarginalProbs.push(marginalProbs[engine_idx]);
        }
        displayedCircuit.updateEndOfLaneProbabilities(
          // 更新UI显示
          uiOrderedMarginalProbs,
          defToUse.numQubits
        );
      } else {
        displayedCircuit.updateEndOfLaneProbabilities([], 0); // 0量子比特情况
      }
    }

    // 更新振幅分布图
    if (amplitudeDisplay) {
      amplitudeDisplay.update(stats.finalState, defToUse.numQubits);
    }
  }

  // (已注释掉) 更新线路的文本表示 (用于调试或简单显示)
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

  // 量子比特数输入框的change事件监听器
  numQubitsInput.addEventListener("change", () => {
    const newNumQubitsRaw = parseInt(numQubitsInput.value); // 获取输入值
    // 获取允许的最小和最大量子比特数
    const minQ = CircuitDefinition.MIN_QUBITS || 1;
    const maxQ = CircuitDefinition.MAX_QUBITS || 4;

    // 验证输入值是否在允许范围内
    if (
      isNaN(newNumQubitsRaw) ||
      newNumQubitsRaw < minQ ||
      newNumQubitsRaw > maxQ
    ) {
      alert(`量子比特数必须在 ${minQ} 和 ${maxQ} 之间。`);
      numQubitsInput.value = currentNumQubits; // 恢复为旧值
      return;
    }

    const newNumQubits = newNumQubitsRaw;
    if (newNumQubits === currentNumQubits) return; // 如果数量未改变，则不执行任何操作

    currentNumQubits = newNumQubits; // 更新当前量子比特数
    numQubitsInput.value = currentNumQubits; // 确保输入框显示正确的值

    initialQubitStates = new Array(currentNumQubits).fill("0"); // 重置初始状态
    currentCircuitDef = CircuitDefinition.empty(currentNumQubits); // 创建新的空线路

    handleCircuitChange(currentCircuitDef); // 处理线路变化 (会触发模拟)

    // 根据量子比特数设置或清除布洛赫球显示
    if (currentNumQubits > 0) {
      setupBlochSphereDisplays();
    } else {
      const container = document.getElementById("blochSpheresContainer");
      if (container) container.innerHTML = ""; // 清空容器
      blochSphereDisplays.forEach((bsd) => {
        // 销毁对象
        if (bsd && bsd.dispose) bsd.dispose();
      });
      blochSphereDisplays = [];
    }
    updateCircuitHeaderText(); // 更新线路标题
  });

  // “清空线路”按钮的点击事件监听器
  clearCircuitButton.addEventListener("click", () => {
    currentCircuitDef = CircuitDefinition.empty(currentNumQubits); // 创建新的空线路
    initialQubitStates = new Array(currentNumQubits).fill("0"); // 重置初始状态
    handleCircuitChange(currentCircuitDef); // 处理线路变化 (会触发模拟)
  });

  // --- 动画循环 ---
  function animationLoop(timestamp) {
    // timestamp 由 requestAnimationFrame 提供
    if (!isPlaying) {
      // 如果动画已暂停
      animationFrameId = null; // 清除动画帧ID，以便可以重新启动
      return;
    }

    const deltaTime = timestamp - lastFrameTime; // 计算自上一帧以来的时间差
    if (deltaTime >= timeStepDuration) {
      // 如果时间差达到设定的步长时间
      lastFrameTime = timestamp; // 更新上一帧的时间戳

      // 根据实际经过的时间增量全局时间参数 t，以达到 targetCycleDuration
      globalTime_t += deltaTime / targetCycleDuration;
      if (globalTime_t >= 1.0) {
        // 如果 t 超出1，则循环回到0
        globalTime_t -= Math.floor(globalTime_t); // 取小数部分
      }

      updateGateMatrices(globalTime_t); // 更新时间依赖门的矩阵
      simulateAndDisplay(); // 使用更新后的矩阵进行模拟和显示
    }

    animationFrameId = requestAnimationFrame(animationLoop); // 请求下一动画帧
  }
  // --- End 动画循环 ---

  // 初始化设置
  // 获取允许的最小量子比特数
  const minQubitsAllowed =
    typeof CircuitDefinition.MIN_QUBITS !== "undefined"
      ? CircuitDefinition.MIN_QUBITS
      : 1;
  numQubitsInput.min = minQubitsAllowed; // 设置输入框的最小值
  // 确保初始 currentNumQubits 不小于允许的最小值
  currentNumQubits = Math.max(minQubitsAllowed, parseInt(numQubitsInput.value));
  numQubitsInput.value = currentNumQubits; // 更新输入框的值

  initialQubitStates = new Array(currentNumQubits).fill("0"); // 初始化量子比特状态数组
  currentCircuitDef = CircuitDefinition.empty(currentNumQubits); // 创建空的线路定义

  updateCircuitHeaderText(); // 更新线路部分的标题
  populateToolbox(); // 填充量子门工具箱 (也会添加新定义的门)
  displayedCircuit.circuitDefinition = currentCircuitDef; // 设置显示线路的定义
  displayedCircuit.render(); // 渲染线路
  setupInitialStateSelectors(); // 设置初始状态选择器

  if (currentNumQubits > 0) {
    // 如果有量子比特，则设置布洛赫球显示
    setupBlochSphereDisplays();
  }

  updateGateMatrices(globalTime_t); // 为 t=0 设置初始的门矩阵
  simulateAndDisplay(currentCircuitDef); // 进行初始的模拟和显示
  updateCircuitRepresentationDisplay(currentCircuitDef); // (已注释掉) 更新线路的文本表示

  if (isPlaying) {
    // 如果设置为自动播放
    // 启动动画循环
    lastFrameTime = performance.now(); // 获取当前时间作为上一帧时间
    animationFrameId = requestAnimationFrame(animationLoop); // 请求第一帧
  }
});

// 全局的拖动结束事件监听器 (附加到 document)
document.addEventListener(
  "dragend",
  () => {
    // 如果 displayedCircuit 对象存在并且有清除高亮的方法
    if (
      displayedCircuit && // displayedCircuit 是在 DOMContentLoaded 中定义的，此处可能尚未初始化
      typeof displayedCircuit.clearDropColumnHighlight === "function"
    ) {
      displayedCircuit.clearDropColumnHighlight(); // 清除放置列的高亮
    }
  },
  false
);

// 可选: 添加播放/暂停按钮 (非原始需求，但对可用性有好处)
// const playPauseButton = document.createElement('button');
// playPauseButton.textContent = isPlaying ? "Pause Time" : "Play Time";
// playPauseButton.style.cssText = "position:absolute; top:10px; right:10px;";
// playPauseButton.onclick = () => {
//     isPlaying = !isPlaying;
//     playPauseButton.textContent = isPlaying ? "Pause Time" : "Play Time";
//     if (isPlaying && !animationFrameId) { // 如果从暂停到播放
//         lastFrameTime = performance.now();
//         animationFrameId = requestAnimationFrame(animationLoop); // 启动动画
//     } else if (!isPlaying && animationFrameId) { // 如果从播放到暂停
//         cancelAnimationFrame(animationFrameId); // 取消动画
//         animationFrameId = null;
//     }
// };
// document.body.appendChild(playPauseButton);
