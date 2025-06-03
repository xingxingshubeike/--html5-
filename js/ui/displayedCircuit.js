// Example1/js/ui/displayedCircuit.js
// 该类负责在HTML中渲染和管理量子线路的显示及交互。

// 定义常量用于线路布局
const GATE_SIZE = 50; // 量子门在UI上的尺寸 (像素)
const GATE_MARGIN = 5; // 量子门之间的边距 (像素)
const WIRE_HEIGHT = 60; // 每条量子比特线路的高度 (像素)
const QUBIT_LABEL_WIDTH = 130; // 量子比特标签区域的宽度 (像素)
const COLUMN_WIDTH = GATE_SIZE + GATE_MARGIN * 2; // 每个门列的总宽度 (像素)

class DisplayedCircuit {
  /**
   * 构造函数
   * @param {CircuitDefinition} circuitDefinition - 当前量子线路的定义对象。
   * @param {HTMLElement} circuitLanesContainerEl - 用于容纳量子线路通道的HTML元素。
   * @param {Function} onCircuitChangeCallback - 当线路发生变化时调用的回调函数。
   */
  constructor(
    circuitDefinition,
    circuitLanesContainerEl,
    onCircuitChangeCallback
  ) {
    this.circuitDefinition = circuitDefinition; // 量子线路定义
    this.circuitLanesContainerEl = circuitLanesContainerEl; // 线路通道的DOM容器
    this.onCircuitChange = onCircuitChangeCallback; // 线路变化回调
    this.painter = new Painter(null); // 创建一个Painter实例 (可能用于工具提示等，不直接绘图到主canvas)
    this.gateTooltipEl = document.getElementById("gateTooltip"); // 量子门工具提示的DOM元素
    this._draggedGateInfo = null; // 存储当前正在拖动的门的信息
    this.currentDropPlaceholder = null; // 当前显示的拖放占位符元素

    this.endOfLaneProbDivs = []; // 存储每条线路末端概率显示DOM元素的引用
    this.currentEndOfLaneProbs = []; // 存储当前线路末端的实际概率值
    this.currentNumQubitsForProbs = 0; // 当前用于概率计算的量子比特数

    // 监听线路容器的拖拽离开事件，用于在鼠标完全离开容器时清除高亮
    this.circuitLanesContainerEl.addEventListener("dragleave", (event) => {
      // 检查鼠标是否真的离开了容器，而不是进入了子元素
      if (!this.circuitLanesContainerEl.contains(event.relatedTarget)) {
        this.clearDropColumnHighlight(); // 清除拖放列的高亮
      }
    });
  }

  /**
   * 渲染整个量子线路的UI。
   * 包括量子比特标签、线路通道、已放置的门、连接线等。
   */
  render() {
    console.log("[DisplayedCircuit] render() called."); // 调试信息
    this.circuitLanesContainerEl.innerHTML = ""; // 清空线路容器的现有内容
    this.endOfLaneProbDivs = []; // 重置行末概率显示元素的引用

    const numQubits = this.circuitDefinition.numQubits; // 获取当前量子比特数

    // 为每个量子比特创建一条线路通道
    for (let i = 0; i < numQubits; i++) {
      // 创建通道元素 (div.qubit-lane)
      const laneEl = document.createElement("div");
      laneEl.classList.add("qubit-lane");
      laneEl.dataset.wireIndex = i; // 存储线路索引

      // 创建量子比特标签元素 (div.qubit-label)
      const qubitLabelDiv = document.createElement("div");
      qubitLabelDiv.classList.add("qubit-label");

      // 创建量子比特名称前缀 (span#qubit-name-prefix-i)
      const qNameSpan = document.createElement("span");
      qNameSpan.id = `qubit-name-prefix-${i}`;
      qNameSpan.textContent = `q${i}:`; // 例如 "q0:"

      // 创建量子比特初始状态选择器 (select#qubit-initial-state-selector-i)
      const qStateSelector = document.createElement("select");
      qStateSelector.id = `qubit-initial-state-selector-${i}`;
      qStateSelector.classList.add("qubit-initial-state-selector");

      // 将名称和选择器添加到标签div
      qubitLabelDiv.appendChild(qNameSpan);
      qubitLabelDiv.appendChild(qStateSelector);
      laneEl.appendChild(qubitLabelDiv); // 将标签div添加到通道

      // 创建门的拖放区域 (div.circuit-lane-dropzone)
      const dropZoneEl = document.createElement("div");
      dropZoneEl.classList.add("circuit-lane-dropzone");
      laneEl.appendChild(dropZoneEl); // 将拖放区域添加到通道

      // 创建行末概率显示元素 (div.prob-display-item)
      const probDisplayContainer = document.createElement("div");
      probDisplayContainer.classList.add("prob-display-item");
      const barFillContainer = document.createElement("div"); // 概率条的容器
      barFillContainer.classList.add("prob-bar-fill-container");
      const barFill = document.createElement("div"); // 概率条的填充部分
      barFill.classList.add("prob-bar-fill");
      const probText = document.createElement("span"); // 显示概率文本
      probText.classList.add("prob-text");
      barFillContainer.appendChild(barFill); // 组装概率条
      probDisplayContainer.appendChild(barFillContainer);
      probDisplayContainer.appendChild(probText);
      laneEl.appendChild(probDisplayContainer); // 将概率显示添加到通道
      this.endOfLaneProbDivs[i] = probDisplayContainer; // 存储引用

      this.circuitLanesContainerEl.appendChild(laneEl); // 将整个通道添加到线路容器
      this._addLaneEventListeners(dropZoneEl, i); // 为拖放区域添加事件监听器
    }
    this._renderGates(); // 渲染所有已放置的门
    this._renderConnectionLines(); // 渲染控制门的连接线
    this._renderSwapConnections(); // 渲染SWAP门的连接线 (新方法)
    this._positionEndOfLaneProbSlots(); // 定位行末概率显示槽
    this._updateActualProbValues(); // 更新行末概率的实际值
  }

  /**
   * 渲染SWAP门之间的连接线。
   * SWAP操作通常需要两个SWAP符号在同一列的不同线路上。
   * @private
   */
  _renderSwapConnections() {
    // 移除所有已存在的SWAP连接线
    this.circuitLanesContainerEl
      .querySelectorAll(".swap-connection-line")
      .forEach((line) => line.remove());

    // 遍历线路定义中的每一列
    this.circuitDefinition.columns.forEach((column, colIndex) => {
      const swapGateUiIndices = []; // 存储当前列中SWAP门所在的UI线路索引
      // 查找列中的SWAP门
      column.gates.forEach((gate, wireIndex) => {
        if (gate && gate.id === "SWAP") {
          //
          swapGateUiIndices.push(wireIndex);
        }
      });

      // 如果正好有两个SWAP门在同一列，则绘制连接线
      if (swapGateUiIndices.length === 2) {
        const wire1 = swapGateUiIndices[0];
        const wire2 = swapGateUiIndices[1];

        const topWireUiIndex = Math.min(wire1, wire2); // 较小编号的线路索引 (更靠上)
        const bottomWireUiIndex = Math.max(wire1, wire2); // 较大编号的线路索引 (更靠下)

        // 创建连接线元素
        const lineEl = document.createElement("div");
        lineEl.classList.add("swap-connection-line"); // 添加特定样式类
        lineEl.style.position = "absolute"; // 绝对定位
        // lineEl.style.backgroundColor = "#FFFFFF"; // 连接线颜色 (可以通过CSS设置)
        lineEl.style.width = "2px"; // 连接线宽度
        lineEl.style.zIndex = "1"; // 层级，确保在导线之上，但在门的可交互元素之下

        const gateCenterOffsetX = GATE_SIZE / 2; // 门中心点的X偏移
        // 计算连接线的左侧位置 (相对于线路容器)
        const lineLeftPosition =
          QUBIT_LABEL_WIDTH + // 量子比特标签宽度
          colIndex * COLUMN_WIDTH + // 当前列的起始X位置
          GATE_MARGIN + // 门左侧边距
          gateCenterOffsetX - // 门中心偏移
          parseFloat(lineEl.style.width) / 2; // 线宽的一半，使线居中

        // 计算连接线的顶部和底部Y位置 (门视觉效果的中心)
        const gateVisualTopOffsetInLane = (WIRE_HEIGHT - GATE_SIZE) / 2; // 门在通道内的顶部偏移
        const lineTopY =
          topWireUiIndex * WIRE_HEIGHT + // 顶部SWAP门所在通道的Y偏移
          GATE_SIZE * 1.5; // 门高度的一半 (门的中心)
        const lineBottomY =
          bottomWireUiIndex * WIRE_HEIGHT + // 底部SWAP门所在通道的Y偏移
          GATE_SIZE * 1.5;
        lineEl.style.left = `${lineLeftPosition}px`;
        lineEl.style.top = `${lineTopY}px`;
        lineEl.style.height = `${lineBottomY - lineTopY}px`; // 连接线高度

        this.circuitLanesContainerEl.appendChild(lineEl); // 添加连接线到容器
      }
    });
  }

  /**
   * 更新线路末端的概率显示。
   * @param {Array<Array<number>>} marginalProbabilities - 每个量子比特的边缘概率数组 (UI顺序)。
   * 每个内部数组为 [P(0), P(1)]。
   * @param {number} numQubits - 量子比特的数量。
   */
  updateEndOfLaneProbabilities(marginalProbabilities, numQubits) {
    this.currentEndOfLaneProbs = marginalProbabilities; // 存储边缘概率 (UI顺序)
    this.currentNumQubitsForProbs = numQubits; // 存储量子比特数
    // 如果render()尚未运行，endOfLaneProbDivs可能为空。
    // _updateActualProbValues 和 _positionEndOfLaneProbSlots 在render()末尾调用。
    // 此处也调用它们，以便在初始渲染后发生更改时进行更新。
    if (
      this.circuitLanesContainerEl.children.length > 0 && // 确保线路容器非空
      this.endOfLaneProbDivs.length > 0 // 确保概率显示div已创建
    ) {
      this._positionEndOfLaneProbSlots(); // 重新定位 (以防门列数改变)
      this._updateActualProbValues(); // 更新实际值
    }
  }

  /**
   * 定位每条线路末端的概率显示槽。
   * @private
   */
  _positionEndOfLaneProbSlots() {
    if (!this.circuitLanesContainerEl || this.endOfLaneProbDivs.length === 0)
      return; // 如果容器或div数组为空，则返回

    const numGateColsInDef = this.circuitDefinition.columns.length; // 线路定义中的门列数
    // displayCols 是为门在视觉上分配的列数 (至少12列，以保证有足够空间)
    const displayColsForGates = Math.max(numGateColsInDef, 12);
    // 概率显示逻辑上位于这些门列之后的一列
    const probDisplayLogicalCol = displayColsForGates;

    for (let i = 0; i < this.circuitDefinition.numQubits; i++) {
      // 遍历每个量子比特
      const laneEl = this.circuitLanesContainerEl.children[i]; // 获取通道元素
      const dropZoneEl = laneEl?.querySelector(".circuit-lane-dropzone"); // 获取拖放区域
      const probDisplayContainer = this.endOfLaneProbDivs[i]; // 获取概率显示容器

      if (!laneEl || !dropZoneEl || !probDisplayContainer) continue; // 如果任何元素不存在，则跳过

      // 确保拖放区域有足够的宽度以容纳所有显示的门列
      const requiredDropZoneWidth = displayColsForGates * COLUMN_WIDTH;
      if (parseFloat(dropZoneEl.style.minWidth) < requiredDropZoneWidth) {
        dropZoneEl.style.minWidth = `${requiredDropZoneWidth}px`;
      }

      // 绝对定位概率显示容器在通道内
      probDisplayContainer.style.position = "absolute";
      // 计算左侧位置
      probDisplayContainer.style.left = `${
        probDisplayLogicalCol * COLUMN_WIDTH + GATE_MARGIN // 逻辑列位置 * 列宽 + 边距
      }px`;
      // 计算顶部位置 (使其在通道内垂直居中，与门对齐)
      probDisplayContainer.style.top = `${(WIRE_HEIGHT - GATE_SIZE) / 2}px`;
    }
  }

  /**
   * 更新线路末端概率显示的实际数值和条形图。
   * @private
   */
  _updateActualProbValues() {
    if (this.endOfLaneProbDivs.length === 0) return; // 如果没有概率显示div，则返回

    // 遍历当前用于概率计算的量子比特数
    for (let i = 0; i < this.currentNumQubitsForProbs; i++) {
      const probDisplayContainer = this.endOfLaneProbDivs[i]; // 获取对应量子比特的概率显示容器
      if (!probDisplayContainer) continue; // 如果容器不存在，则跳过

      const probTextEl = probDisplayContainer.querySelector(".prob-text"); // 获取概率文本元素
      const barFillEl = probDisplayContainer.querySelector(".prob-bar-fill"); // 获取概率条填充元素

      // 检查当前量子比特的概率数据是否存在
      if (this.currentEndOfLaneProbs && this.currentEndOfLaneProbs[i]) {
        const prob0 = this.currentEndOfLaneProbs[i][0]; // 获取测量到|0⟩的概率 P(q_i_UI = 0)
        if (probTextEl) probTextEl.textContent = `P(|0⟩): ${prob0.toFixed(2)}`; // 更新文本 (保留两位小数)
        if (barFillEl) barFillEl.style.width = `${prob0 * 100}%`; // 更新条形图宽度 (百分比)
      } else {
        // 如果数据不存在，显示占位符
        if (probTextEl) probTextEl.textContent = "P(|0⟩): -";
        if (barFillEl) barFillEl.style.width = `0%`;
      }
    }
  }

  /**
   * 高亮显示门的拖放目标列。
   * @param {number} colIndex - 目标列索引。
   * @param {number} wireIndex - 目标线路索引。
   * @param {Gate} gateToDrop - 准备拖放的门对象。
   * @param {HTMLElement} laneDropZoneEl - 目标线路的拖放区域元素。
   */
  highlightDropColumn(colIndex, wireIndex, gateToDrop, laneDropZoneEl) {
    this.clearDropColumnHighlight(); // 清除之前的高亮

    if (!gateToDrop) return; // 如果没有要拖放的门，则返回

    let tempCircuitDef = this.circuitDefinition; // 使用当前线路定义作为临时定义
    // 如果是从线路中拖动门 (移动操作)
    if (
      this._draggedGateInfo && // 存在拖动信息
      !this._draggedGateInfo.originalPalette && // 不是从工具箱拖来的
      this._draggedGateInfo.originalCol !== undefined && // 原始列索引有效
      this._draggedGateInfo.originalRow !== undefined // 原始行索引有效
    ) {
      // 从临时定义中移除被拖动的门，以正确判断放置有效性
      tempCircuitDef = tempCircuitDef.withGateRemoved(
        this._draggedGateInfo.originalCol,
        this._draggedGateInfo.originalRow
      );
    }

    // 检查放置是否有效
    if (
      !this._isPlacementValid(gateToDrop, colIndex, wireIndex, tempCircuitDef)
    ) {
      return; // 如果无效，则不显示高亮
    }
    // 检查多量子比特门是否会超出线路范围
    if (wireIndex + gateToDrop.height > this.circuitDefinition.numQubits) {
      //
      return;
    }

    // 创建占位符元素
    const placeholder = document.createElement("div");
    placeholder.classList.add("gate-drop-placeholder"); // 添加样式
    // 设置占位符位置
    placeholder.style.left = `${colIndex * COLUMN_WIDTH + GATE_MARGIN}px`;
    const topOffset = (WIRE_HEIGHT - GATE_SIZE) / 2; // 垂直居中偏移
    placeholder.style.top = `${topOffset}px`;
    // 注意：对于多高度的门，占位符的高度也应该相应调整。
    // placeholder.style.height = `${GATE_SIZE + (gateToDrop.height - 1) * WIRE_HEIGHT}px`; (如果需要精确高度)

    laneDropZoneEl.appendChild(placeholder); // 将占位符添加到拖放区域
    this.currentDropPlaceholder = placeholder; // 存储当前占位符的引用
  }

  /**
   * 清除拖放目标列的高亮占位符。
   */
  clearDropColumnHighlight() {
    if (this.currentDropPlaceholder) {
      // 如果存在占位符
      if (this.currentDropPlaceholder.parentElement) {
        // 确保它仍在DOM中
        this.currentDropPlaceholder.parentElement.removeChild(
          // 从父元素中移除
          this.currentDropPlaceholder
        );
      }
      this.currentDropPlaceholder = null; // 清除引用
    }
  }

  /**
   * 为指定的线路拖放区域添加事件监听器。
   * @param {HTMLElement} laneDropZoneEl - 线路的拖放区域元素。
   * @param {number} wireIndex - 该线路的索引。
   * @private
   */
  _addLaneEventListeners(laneDropZoneEl, wireIndex) {
    // "dragover" 事件：当一个可拖动的元素在一个有效的放置目标上被拖动时触发
    laneDropZoneEl.addEventListener("dragover", (event) => {
      event.preventDefault(); // 阻止默认行为 (例如，不允许放置)

      // 如果没有拖动门的信息，则清除高亮并返回
      if (!this._draggedGateInfo || !this._draggedGateInfo.gate) {
        this.clearDropColumnHighlight();
        return;
      }
      const gateToDrop = this._draggedGateInfo.gate; // 获取要拖放的门

      // 根据允许的拖放效果设置实际的拖放效果
      if (event.dataTransfer.effectAllowed.includes("copy")) {
        event.dataTransfer.dropEffect = "copy"; // 复制操作
      } else if (event.dataTransfer.effectAllowed.includes("move")) {
        event.dataTransfer.dropEffect = "move"; // 移动操作
      } else {
        event.dataTransfer.dropEffect = "none"; // 不允许放置
        this.clearDropColumnHighlight();
        return;
      }

      // 计算鼠标在拖放区域内的相对X坐标，以确定目标列索引
      const rect = laneDropZoneEl.getBoundingClientRect(); // 获取拖放区域的边界
      const dropX = event.clientX - rect.left; // 鼠标X坐标 - 区域左边界
      let colIndex = Math.floor(dropX / COLUMN_WIDTH); // 计算列索引
      colIndex = Math.max(0, colIndex); // 确保列索引不为负

      // 防止在概率显示区域高亮
      const numGateColsInDef = this.circuitDefinition.columns.length;
      const displayColsForGates = Math.max(numGateColsInDef, 16); // 与 _positionEndOfLaneProbSlots 保持一致
      if (colIndex >= displayColsForGates) {
        this.clearDropColumnHighlight();
        event.dataTransfer.dropEffect = "none"; // 在此区域不允许放置
        return;
      }

      // 高亮目标列
      this.highlightDropColumn(colIndex, wireIndex, gateToDrop, laneDropZoneEl);
    });

    // "dragleave" 事件：当一个可拖动的元素离开一个有效的放置目标时触发
    laneDropZoneEl.addEventListener("dragleave", (event) => {
      // 主要由容器的 dragleave 事件处理，以避免在元素间移动时频繁清除
    });

    // "drop" 事件：当一个可拖动的元素在一个有效的放置目标上被释放时触发
    laneDropZoneEl.addEventListener("drop", (event) => {
      console.log(
        `[DisplayedCircuit] DROP EVENT TRIGGERED on wire: ${wireIndex}`
      );
      event.preventDefault(); // 阻止默认行为 (例如，浏览器打开链接)
      this.clearDropColumnHighlight(); // 清除高亮

      // 如果没有拖动门的信息，则报错并返回
      if (!this._draggedGateInfo || !this._draggedGateInfo.gate) {
        console.error(
          "[DisplayedCircuit] Drop event without draggedGateInfo. Gate cannot be placed."
        );
        this._draggedGateInfo = null; // 清除拖动信息
        return;
      }

      const gateToDrop = this._draggedGateInfo.gate; // 获取要放置的门
      const rect = laneDropZoneEl.getBoundingClientRect();
      const dropX = event.clientX - rect.left;
      let colIndex = Math.floor(dropX / COLUMN_WIDTH); // 计算目标列索引
      colIndex = Math.max(0, colIndex);

      // 防止在概率显示区域放置
      const numGateColsInDef = this.circuitDefinition.columns.length;
      const displayColsForGates = Math.max(numGateColsInDef, 16);
      if (colIndex >= displayColsForGates) {
        console.warn(
          "[DisplayedCircuit] Attempted to drop gate beyond valid gate area."
        );
        this._draggedGateInfo = null;
        // 如果是移动操作，可能需要恢复线路，但当前 onCircuitChange 会处理放置失败的情况
        this.onCircuitChange(this.circuitDefinition); // 通知线路未改变 (或恢复原状)
        return;
      }

      let newCircuitDef = this.circuitDefinition; // 基于当前线路创建新定义

      // 如果门是从线路中拖动过来的 (移动操作)，则先从原位置移除
      if (!this._draggedGateInfo.originalPalette) {
        newCircuitDef = newCircuitDef.withGateRemoved(
          this._draggedGateInfo.originalCol,
          this._draggedGateInfo.originalRow
        );
      }

      // 检查多量子比特门是否会超出线路范围
      if (wireIndex + gateToDrop.height > this.circuitDefinition.numQubits) {
        //
        console.warn(
          `[DisplayedCircuit] Gate ${gateToDrop.symbol} cannot be placed on wire ${wireIndex}, exceeds qubit count.`
        );
        this._draggedGateInfo = null;
        this.onCircuitChange(this.circuitDefinition); // 通知线路未改变 (或恢复原状)
        return;
      }

      // 检查放置是否有效，然后放置门
      if (
        this._isPlacementValid(gateToDrop, colIndex, wireIndex, newCircuitDef)
      ) {
        newCircuitDef = newCircuitDef.withGatePlaced(
          //
          gateToDrop,
          colIndex,
          wireIndex
        );
      } else {
        // 如果放置无效
        console.warn(
          `[DisplayedCircuit] Placement of ${gateToDrop.symbol} at (col: ${colIndex}, row: ${wireIndex}) is invalid.`
        );
        // 如果原始拖动信息存在 (例如，这是一个失败的移动操作)，
        // onCircuitChange(this.circuitDefinition) 会恢复到移动前的状态。
        // 如果是从工具箱拖来且放置无效，this.circuitDefinition 已经是正确的状态了。
        this.onCircuitChange(this.circuitDefinition);
        this._draggedGateInfo = null;
        return;
      }

      this._draggedGateInfo = null; // 清除拖动信息
      this.onCircuitChange(newCircuitDef); // 通知线路已改变
    });
  }

  /**
   * 检查将门放置在指定位置是否有效。
   * @param {Gate} gate - 要放置的门。
   * @param {number} col - 目标列索引。
   * @param {number} row - 目标行 (线路) 索引。
   * @param {CircuitDefinition} circuitDef_before_potential_move - 潜在移动发生前的线路定义。
   * @returns {boolean} 如果放置有效则返回 true，否则返回 false。
   * @private
   */
  _isPlacementValid(gate, col, row, circuitDef_before_potential_move) {
    console.log(
      `[_isPlacementValid] Checking placement for: ${gate.symbol} (height: ${gate.height}, width: ${gate.width}) at (col: ${col}, row: ${row}) on circuit with ${this.circuitDefinition.numQubits} qubits.`
    );

    // 1. 边界检查：门的高度是否超出总量子比特数
    if (row + gate.height > this.circuitDefinition.numQubits) {
      //
      console.log(
        `[_isPlacementValid] Boundary check FAILED: row (${row}) + gate.height (${gate.height}) > numQubits (${this.circuitDefinition.numQubits})` //
      );
      return false;
    }
    console.log(`[_isPlacementValid] Boundary check PASSED.`);

    // 2. 防止放置在概率显示区域或其他非法区域
    const numGateColsInDef = this.circuitDefinition.columns.length;
    // 使用与 _positionEndOfLaneProbSlots 中相同的常量以保持一致性
    const displayColsForGates = Math.max(numGateColsInDef, 12); // 或 16 (如其他地方所用)，确保一致
    if (col >= displayColsForGates) {
      console.log(
        `[_isPlacementValid] Column check FAILED: col (${col}) is in or beyond the probability display area (max gate col: ${
          displayColsForGates - 1
        }).`
      );
      return false;
    }
    console.log(`[_isPlacementValid] Column boundary check PASSED.`);

    // 3. 特定门交互规则 (例如，控制门冲突)
    // 这些检查可能需要仔细评估。
    // 例如，如果检查在多量子比特门下的控制门：
    // circuitDef_before_potential_move.gateAt(col, wireToCheck) 指的是 *移位前* 的门。
    // 在 withGatePlaced 之后，新门位于 'col'，该列 'col' 中的 'wireToCheck' 将被清除。
    // 潜在的冲突是与 *被移位* 的门有关。
    // _isGateDisabled 方法 (在渲染期间调用) 更适合于对此类布局后问题的视觉反馈。
    // 对于 _isPlacementValid，专注于直接的不可能性。

    // 示例：如果放置一个多量子比特门，它是否与 *其自身跨度内* 的控制门冲突？
    // 由于新门放置的列 'col' 最初是空的，因此在该门的
    // 第一个列内的直接冲突不太可能。与其宽度相关的冲突由 withGatePlaced 中的清除操作处理。

    // 如果 `gate.isControlGate`：检查它是否被放置在 `circuitDef_before_potential_move` 中 `col` 处的多量子比特操作内部。
    // 如果 `gate.height > 1`：检查它是否被放置在 `circuitDef_before_potential_move` 中 `col` 处的控制门之上。
    // 这些检查是针对插入前“目标列”的状态。如果它们失败，则意味着
    // 特定列 `col` 处的结构对于这种类型的门已经存在问题，与移位无关。
    if (gate.isControlGate) {
      //
      for (
        // 遍历目标列中的其他线路
        let r_other = 0;
        r_other < this.circuitDefinition.numQubits;
        r_other++
      ) {
        if (r_other === row) continue; // 跳过自身
        const otherGate = circuitDef_before_potential_move.gateAt(col, r_other); //
        if (
          otherGate && // 如果该位置有其他门
          otherGate.height > 1 && // 并且是多量子比特门
          !otherGate.isControlGate && // 并且不是控制符号
          !otherGate.isDisplayGate // 并且不是显示门
        ) {
          // 检查控制门是否会落入这个多量子比特门的垂直跨度内
          if (row > r_other && row < r_other + otherGate.height) {
            //
            console.log(
              `[_isPlacementValid] Control conflict FAILED: Control gate ${gate.symbol} at (col:${col}, row:${row}) would be inside multi-qubit gate '${otherGate.symbol}' starting on wire ${r_other} in the target column before shift.`
            );
            return false; // 无效放置
          }
        }
      }
    }
    // 如果要放置的是多量子比特操作门 (非控制、非显示)
    if (gate.height > 1 && !gate.isControlGate && !gate.isDisplayGate) {
      //
      for (let i = 1; i < gate.height; i++) {
        // 检查其覆盖的其他线路
        const wireToCheck = row + i; // 被覆盖的线路索引
        if (wireToCheck < this.circuitDefinition.numQubits) {
          // 获取在该目标列、被覆盖线路上原有的门
          const gateBelowInColumn = circuitDef_before_potential_move.gateAt(
            col,
            wireToCheck
          ); //
          // 如果在多量子比特门下方存在控制门，则放置无效
          if (gateBelowInColumn && gateBelowInColumn.isControlGate) {
            //
            console.log(
              `[_isPlacementValid] Control conflict FAILED: Multi-qubit gate ${gate.symbol} at (col:${col}, row:${row}) would be placed over a control gate ('${gateBelowInColumn.symbol}') on wire ${wireToCheck} in the target column before shift.`
            );
            return false;
          }
        }
      }
    }
    console.log(
      "[_isPlacementValid] Control/Multi-qubit interaction checks PASSED (or not applicable for target column)."
    );
    return true; // 如果所有基本边界和列规则都满足，则允许放置。
  }

  /**
   * 渲染线路中的所有门。
   * @private
   */
  _renderGates() {
    // 清空所有通道拖放区域中的现有门 (只清除门，保留其他可能的结构如占位符背景)
    this.circuitLanesContainerEl
      .querySelectorAll(".circuit-lane-dropzone")
      .forEach((dz) => (dz.innerHTML = ""));

    // 确定用于门显示的最小列数 (至少15列，或实际线路列数)
    const numDisplayColsForGates = Math.max(
      this.circuitDefinition.columns.length,
      15
    );

    // 遍历线路定义中的每一列
    this.circuitDefinition.columns.forEach((column, colIndex) => {
      // 遍历列中的每一个门槽
      column.gates.forEach((gate, wireIndex) => {
        //
        // 获取对应线路的拖放区域元素
        const laneDropZoneEl = this.circuitLanesContainerEl.children[
          wireIndex
        ]?.querySelector(".circuit-lane-dropzone");
        if (!laneDropZoneEl) return; // 如果找不到，则跳过

        // 确保为门创建足够的占位符 (不包括概率显示区域)
        this._ensurePlaceholders(laneDropZoneEl, numDisplayColsForGates - 1);

        if (gate) {
          // 如果该位置有门
          const gateEl = this._createGateElement(gate, colIndex, wireIndex); // 创建门的DOM元素
          this._placeGateInGrid(laneDropZoneEl, gateEl, colIndex, gate); // 将门放置在网格中

          // 检查门是否因为冲突等原因被禁用
          if (this._isGateDisabled(gate, colIndex, wireIndex)) {
            gateEl.style.opacity = "0.5"; //降低不透明度
            gateEl.style.border = "2px dashed red"; //红色虚线边框
            gateEl.title += "\n(禁用: 检查控制台获取原因或实现视觉反馈)"; // 更新工具提示
          }
        }
      });
    });
    // 确保所有拖放区域至少有 numDisplayColsForGates 个占位符
    for (let i = 0; i < this.circuitDefinition.numQubits; i++) {
      const laneDropZoneEl = this.circuitLanesContainerEl.children[
        i
      ]?.querySelector(".circuit-lane-dropzone");
      if (laneDropZoneEl) {
        this._ensurePlaceholders(laneDropZoneEl, numDisplayColsForGates - 1);
      }
    }
  }

  /**
   * 检查门在当前位置是否应该被禁用 (例如，控制门在多比特门内部)。
   * @param {Gate} gate - 要检查的门。
   * @param {number} colIndex - 门的列索引。
   * @param {number} wireIndex - 门的线路索引。
   * @returns {boolean} 如果门被禁用则返回 true。
   * @private
   */
  _isGateDisabled(gate, colIndex, wireIndex) {
    // 规则1: 控制门不能位于多量子比特操作门的“中间”
    if (gate.isControlGate) {
      //
      // 检查同一列的其他线路
      for (let r = 0; r < this.circuitDefinition.numQubits; r++) {
        if (r === wireIndex) continue; // 跳过自身
        const otherGate = this.circuitDefinition.gateAt(colIndex, r); //
        if (
          otherGate && // 如果存在其他门
          !otherGate.isControlGate && // 并且它不是控制符号
          !otherGate.isDisplayGate && // 并且它不是显示门
          // 检查控制门 (wireIndex) 是否在 otherGate (从r开始，高度为otherGate.height) 的跨度内
          wireIndex > r && // 控制门在线路r之下
          wireIndex < r + otherGate.height // 控制门在线路r + otherGate.height之上
        ) {
          console.warn(
            `Control on wire ${wireIndex} is inside gate ${otherGate.symbol} on wire ${r}`
          );
          return true; // 禁用
        }
      }
    }
    // 规则2: 多量子比特操作门 (非控制、非显示) 的“中间”不能有控制门
    if (gate.height > 1 && !gate.isControlGate && !gate.isDisplayGate) {
      //
      // 检查该门覆盖的下方线路
      for (let i = 1; i < gate.height; i++) {
        //
        const gateBelow = this.circuitDefinition.gateAt(
          //
          colIndex,
          wireIndex + i // 下方线路的索引
        );
        if (gateBelow && gateBelow.isControlGate) {
          // 如果下方是控制门
          console.warn(
            `位于线路 ${wireIndex} 上的门 ${gate.symbol} 在其内部的线路 ${
              wireIndex + i
            } 上有控制门`
          );
          return true; // 禁用
        }
      }
    }
    return false; // 默认不禁用
  }

  /**
   * 确保线路拖放区域中存在足够的（不可见的）占位符元素，用于网格对齐。
   * @param {HTMLElement} laneDropZoneEl - 线路的拖放区域元素。
   * @param {number} targetColIndex - 需要确保占位符存在的最大列索引。
   * @private
   */
  _ensurePlaceholders(laneDropZoneEl, targetColIndex) {
    // 遍历到目标列索引
    for (let c = 0; c <= targetColIndex; c++) {
      // 如果该列的占位符不存在
      if (!laneDropZoneEl.querySelector(`[data-col-placeholder='${c}']`)) {
        const placeholder = document.createElement("div");
        // 添加类名以应用基本尺寸和样式 (与gate-item一致，但不可见)
        placeholder.classList.add("gate-item", "gate-placeholder");
        placeholder.style.width = `${GATE_SIZE}px`;
        placeholder.style.height = `${GATE_SIZE}px`;
        placeholder.style.visibility = "hidden"; // 使其不可见，仅用于布局
        placeholder.style.position = "absolute"; // 绝对定位，像其他门一样
        placeholder.style.left = `${c * COLUMN_WIDTH + GATE_MARGIN}px`; // X位置
        placeholder.style.top = `${(WIRE_HEIGHT - GATE_SIZE) / 2}px`; // Y位置 (垂直居中)
        placeholder.dataset.colPlaceholder = c; // 存储列索引信息
        laneDropZoneEl.appendChild(placeholder);
      }
    }
  }

  /**
   * 将创建的门DOM元素放置在指定的线路拖放区域的网格位置。
   * @param {HTMLElement} laneDropZoneEl - 线路的拖放区域元素。
   * @param {HTMLElement} gateEl - 要放置的门的DOM元素。
   * @param {number} colIndex - 目标列索引。
   * @param {Gate} [gateInstance=null] - (可选) 门实例，用于获取高度信息。
   * @private
   */
  _placeGateInGrid(laneDropZoneEl, gateEl, colIndex, gateInstance = null) {
    gateEl.style.position = "absolute"; // 绝对定位
    gateEl.style.zIndex = "2"; // 确保实际门在占位符之上
    gateEl.style.left = `${colIndex * COLUMN_WIDTH + GATE_MARGIN}px`; // X位置

    let topOffset = (WIRE_HEIGHT - GATE_SIZE) / 2; // 默认垂直居中偏移

    // 如果是多量子比特门，其高度已在 _createGateElement 中设置
    if (gateInstance && gateInstance.height > 1) {
      //
      // 高度在 _createGateElement 中设置
    }
    gateEl.style.top = `${topOffset}px`; // Y位置
    laneDropZoneEl.appendChild(gateEl); // 添加到DOM
  }

  /**
   * 渲染控制门与其目标操作之间的连接线。
   * @private
   */
  _renderConnectionLines() {
    // 移除所有已存在的连接线
    const existingLines =
      this.circuitLanesContainerEl.querySelectorAll(".connection-line");
    existingLines.forEach((line) => line.remove());

    // 遍历线路定义中的每一列
    this.circuitDefinition.columns.forEach((column, colIndex) => {
      const controlsInColumn = []; // 存储当前列中的控制符号信息
      const operationalGatesInColumn = []; // 存储当前列中的操作门信息

      // 查找列中的控制符号和操作门
      column.gates.forEach((gate, wireIndex) => {
        //
        if (gate) {
          if (gate.isControlGate) {
            //
            controlsInColumn.push({ wire: wireIndex, gate: gate });
          } else if (
            // 如果是操作门 (非显示、非控制、有矩阵)
            !gate.isDisplayGate && //
            !gate.isControlGate && //
            gate.matrix //
          ) {
            operationalGatesInColumn.push({ wire: wireIndex, gate: gate });
          }
        }
      });

      // 如果列中同时存在控制符号和操作门，则尝试绘制连接线
      if (controlsInColumn.length > 0 && operationalGatesInColumn.length > 0) {
        operationalGatesInColumn.forEach((opGateInfo) => {
          // 初始化连接线涉及的最小和最大线路索引
          let minWireInvolved = opGateInfo.wire; // 操作门的起始线路
          let maxWireInvolved = opGateInfo.wire + opGateInfo.gate.height - 1; // 操作门的结束线路

          // 扩展min/max以包含所有相关的控制符号
          controlsInColumn.forEach((controlInfo) => {
            // 当前简单版本将列中所有控制连接到所有操作。
            // 更复杂的逻辑可能只连接意图上相关的控制和操作。
            minWireInvolved = Math.min(minWireInvolved, controlInfo.wire);
            maxWireInvolved = Math.max(maxWireInvolved, controlInfo.wire);
          });

          // 如果连接线实际跨越了多于一条线路 (即不是单个门自身)
          if (minWireInvolved < maxWireInvolved) {
            const lineEl = document.createElement("div"); // 创建连接线DOM元素
            lineEl.classList.add("connection-line"); // 添加样式类
            lineEl.style.position = "absolute"; // 相对于线路容器绝对定位
            // lineEl.style.backgroundColor = "#FFFFFF"; // 连接线颜色 (可以通过CSS设置)
            lineEl.style.width = "2px"; // 线宽
            lineEl.style.zIndex = "0"; // 层级，在门之下

            const lineWidth = parseFloat(lineEl.style.width);
            // 计算连接线的左侧X位置 (使其在门的中心)
            const lineLeft =
              QUBIT_LABEL_WIDTH + // 左侧标签宽度偏移
              colIndex * COLUMN_WIDTH + // 当前列的X偏移
              GATE_MARGIN + // 门左侧边距
              GATE_SIZE / 2 - // 门宽度的一半
              lineWidth / 2; // 线宽的一半
            lineEl.style.left = `${lineLeft}px`;

            // 计算连接线的顶部Y位置 (最上方相关门/控制的中心)
            // 注意：这里的 WIRE_HEIGHT 可能是指通道的总高，而门的中心应该考虑 GATE_SIZE
            // 如果要连接门的中心，应该是 minWireInvolved * WIRE_HEIGHT + GATE_SIZE / 2 (或 WIRE_HEIGHT / 2 如果门垂直居中通道)
            // 原代码逻辑连接的是通道的“中线”或稍偏下的位置。
            // 为保持与原意图（连接控制点和操作门）一致，这里的 Y 值需要精确对准控制点和操作门的可视中心。
            // 假设控制点和单量子比特门都垂直居中于 WIRE_HEIGHT。
            const lineTop = minWireInvolved * WIRE_HEIGHT + WIRE_HEIGHT * 1.25; // 最上方相关线路的中心
            const lineBottom =
              maxWireInvolved * WIRE_HEIGHT + WIRE_HEIGHT * 1.25; // 最下方相关线路的中心

            lineEl.style.top = `${lineTop}px`; // 设置顶部位置
            const lineHeight = lineBottom - lineTop; // 计算高度
            lineEl.style.height = `${lineHeight}px`; // 设置高度

            this.circuitLanesContainerEl.appendChild(lineEl); // 添加连接线到DOM
          }
        });
      }
    });
  }

  /**
   * 创建单个量子门的DOM元素。
   * @param {Gate} gate - 要创建元素的门对象。
   * @param {number} colIndex - 门所在的列索引。
   * @param {number} wireIndex - 门所在的线路索引。
   * @returns {HTMLElement} 创建的门DOM元素。
   * @private
   */
  _createGateElement(gate, colIndex, wireIndex) {
    const gateEl = document.createElement("div"); // 创建div作为门元素
    gateEl.classList.add("gate-item"); // 添加基本样式类
    gateEl.textContent = gate.symbol; // 显示门符号
    gateEl.style.color = "white"; // 文字颜色 (可以考虑从CSS变量读取)
    gateEl.draggable = true; // 使门可拖动
    gateEl.dataset.gateId = gate.id; // 存储门ID
    gateEl.dataset.col = colIndex; // 存储列索引
    gateEl.dataset.row = wireIndex; // 存储行索引

    // 默认背景色，或根据门类型特定设置
    let gateBgColor = gate.isDisplayGate //
      ? "#add8e6" // 显示门浅蓝色
      : gate.isControlGate //
      ? "#AAA" // 控制门灰色
      : "#6A90AF"; // 其他操作门默认颜色

    // 特殊处理SWAP门的外观和文本
    if (gate.id === "SWAP") {
      //
      const gatesInColumn = this.circuitDefinition.columns[colIndex]
        ? this.circuitDefinition.columns[colIndex].gates //
        : [];
      let swapCount = 0; // 统计当前列中SWAP门的数量
      gatesInColumn.forEach((g) => {
        if (g && g.id === "SWAP") {
          //
          swapCount++;
        }
      });

      if (swapCount === 1) {
        // 如果只有一个SWAP门，提示用户需要另一个
        gateEl.textContent = "need another SWAP"; // 提示文本
        gateEl.style.fontSize = "10px"; // 调整字体大小以适应长文本
        gateEl.style.lineHeight = "1.2"; // 调整行高
        gateEl.style.wordBreak = "break-word"; // 允许单词内换行
        gateBgColor = "#f0ad4e"; // 警告颜色 (Bootstrap橙色)
      } else if (swapCount > 2) {
        // 如果超过两个SWAP门，提示过多
        gateEl.textContent = "too many SWAPs";
        gateEl.style.fontSize = "10px";
        gateEl.style.lineHeight = "1.2";
        gateEl.style.wordBreak = "break-word";
        gateBgColor = "#d9534f"; // 错误颜色 (Bootstrap红色)
      } else if (swapCount === 2) {
        // 如果正好两个，显示SWAP符号 (原设计是显示X，此处遵循gate.symbol)
        gateEl.textContent = gate.symbol; //
        gateBgColor = "#5bc0de"; // 信息颜色 (Bootstrap蓝色)，或保持默认
      }
    }
    gateEl.style.backgroundColor = gateBgColor; // 设置背景色

    // 设置门的高度，特别是对于多量子比特门
    if (gate.height > 1) {
      //
      gateEl.style.height = `${GATE_SIZE + (gate.height - 1) * WIRE_HEIGHT}px`; // 高度 = 基础高度 + 额外跨越线路的高度
      // 对于多高度门，如果只是简单符号，则垂直居中文本
      if (gateEl.textContent.length <= 2) {
        // 简单启发式判断是否为符号
        gateEl.style.lineHeight = gateEl.style.height; // 行高等于元素高度
      } else {
        // 对于较长文本 (如 "need another SWAP")
        gateEl.style.display = "flex"; // 使用flex布局实现居中
        gateEl.style.alignItems = "center"; // 垂直居中
        gateEl.style.justifyContent = "center"; // 水平居中
        gateEl.style.textAlign = "center"; // 文本本身也居中
      }
    } else {
      // 单量子比特门
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
    gateEl.style.width = `${GATE_SIZE}px`; // 设置宽度

    // 拖动开始事件监听器
    gateEl.addEventListener("dragstart", (event) => {
      console.log(
        `[DisplayedCircuit - Gate] DRAGSTART event for gate: ${gate.symbol}, id: ${gate.id}` //
      );
      // 设置当前拖动的门信息 (来自线路，非工具箱)
      this._draggedGateInfo = {
        gate: gate.copy(), // 拖动门的副本
        originalPalette: false, // 标记非来自工具箱
        originalCol: colIndex, // 记录原始列
        originalRow: wireIndex, // 记录原始行
      };
      try {
        event.dataTransfer.setData("text/plain", gate.id); // 设置拖动数据
      } catch (e) {
        console.error("[DisplayedCircuit - Gate] setData FAILED:", e);
      }
      event.dataTransfer.effectAllowed = "move"; // 允许移动操作
    });

    // 拖动结束事件监听器
    gateEl.addEventListener("dragend", (event) => {
      this.clearDropColumnHighlight(); // 清除拖放高亮
    });

    // 鼠标进入事件监听器 (显示工具提示)
    gateEl.addEventListener("mouseenter", (event) => {
      this.painter.showTooltip(
        //
        event.pageX, // 鼠标X坐标
        event.pageY, // 鼠标Y坐标
        `${gate.name}\n${gate.blurb}` // 提示内容：名称和简介
      );
    });
    // 鼠标离开事件监听器 (隐藏工具提示)
    gateEl.addEventListener("mouseleave", () => {
      this.painter.hideTooltip(); //
    });

    // 创建删除按钮 (一个关闭符号 ×)
    const deleteBtn = document.createElement("span");
    deleteBtn.classList.add("delete-gate"); // 添加样式类
    deleteBtn.innerHTML = "&times;"; // "×" 符号
    deleteBtn.title = "移除门"; // 鼠标悬停提示
    // 删除按钮点击事件
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止事件冒泡到门元素本身 (例如，阻止门的拖动开始)
      // 创建一个移除了该门的新线路定义
      const newCircuitDef = this.circuitDefinition.withGateRemoved(
        //
        colIndex,
        wireIndex
      );
      this.onCircuitChange(newCircuitDef); // 通知线路已改变
    });
    gateEl.appendChild(deleteBtn); // 将删除按钮添加到门元素

    return gateEl; // 返回创建的门DOM元素
  }

  /**
   * 设置当前正在被拖动的门的信息。
   * 通常由工具箱或线路中的门在拖动开始时调用。
   * @param {Gate | null} gate - 被拖动的门对象，或 null 表示清除。
   * @param {boolean} [isFromPalette=false] - 是否从工具箱拖出。
   * @param {number} [originalCol=-1] - 如果从线路拖动，其原始列索引。
   * @param {number} [originalRow=-1] - 如果从线路拖动，其原始行索引。
   */
  setDraggedGate(
    gate,
    isFromPalette = false,
    originalCol = -1,
    originalRow = -1
  ) {
    if (gate === null) {
      // 如果传入null，则清除拖动信息
      this._draggedGateInfo = null;
      return;
    }
    // 存储拖动信息
    this._draggedGateInfo = {
      gate: gate.copy(), // 存储门的副本
      originalPalette: isFromPalette, // 标记来源
      originalCol, // 原始列
      originalRow, // 原始行
    };
  }
}
