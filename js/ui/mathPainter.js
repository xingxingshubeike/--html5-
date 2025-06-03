// Example1/js/ui/mathPainter.js
// 该类包含静态方法，用于在Canvas上绘制与数学相关的可视化图形，如概率条、振幅条等。

class MathPainter {
  /**
   * 在指定的Canvas区域绘制量子态的复数振幅条形图。
   * @param {Painter} painter - Painter类的实例，用于实际的绘图操作。
   * @param {Matrix} stateVector - 表示量子态的列向量 (N x 1)，其中N是状态数。
   * @param {HTMLCanvasElement} canvas - 用于绘图的HTML Canvas元素。
   * @param {number} numQubits - 量子比特的数量。
   */
  static drawAmplitudeBars(painter, stateVector, canvas, numQubits) {
    const ctx = painter.ctx; // 获取2D绘图上下文
    const width = canvas.width; // 画布宽度
    const height = canvas.height; // 画布高度
    const totalSystemStates = stateVector.height; // 系统总状态数 (等于 stateVector 的行数)
    if (totalSystemStates === 0) return; // 如果没有状态，则不绘制

    const barPadding = 5; // 条形图之间的间距
    const legendHeight = 20; // 图例区域的高度
    // 调整: 增加每行标签区域的高度以容纳两行文字 (基态标签 + 复数振幅)
    const labelAreaHeightPerRow = 35; // 原为 20, 增加到35 (例如 15px给基态, 15px给振幅, 5px间距)
    const rowSpacing = 10; // 行之间的间距

    // 调整: 为了给振幅文本足够的宽度，减少每行最大条形图数量
    // 假设振幅文本 " -0.71-0.71i " 大约需要 50px 宽度
    // (canvasWidth - barPadding) / (textWidth + barPadding) = (340-5) / (50+5) = 335 / 55 = ~6
    const maxBarsPerRow = 6; // 每行最多显示的条形图数量 (原为 8, 修改为 6)

    // 潜在需要显示的状态数 (受限于总状态数和量子比特数上限)
    const potentialDisplayStates = Math.min(
      totalSystemStates,
      numQubits > 0 ? 1 << numQubits : 1 // 2^numQubits 或 1 (对于0量子比特)
    );

    const maxRowsToRender = 4; // 最多渲染的行数 (保持不变)
    // 根据状态数和每行最大条数计算需要的行数
    const numRowsBasedOnStates = Math.ceil(
      potentialDisplayStates / maxBarsPerRow
    );
    // 实际渲染的行数 (不超过最大行数)
    const numRowsToActuallyRender = Math.min(
      maxRowsToRender,
      numRowsBasedOnStates
    );

    // 循环中实际绘制的状态数
    const statesToActuallyDrawInLoop = Math.min(
      potentialDisplayStates,
      numRowsToActuallyRender * maxBarsPerRow
    );

    // 可用于绘制条形图的画布高度
    const availableCanvasHeightForBars =
      height - // 总高度
      legendHeight - // 减去图例高度
      numRowsToActuallyRender * labelAreaHeightPerRow - // 减去所有行的标签区域高度
      (numRowsToActuallyRender > 0 ? numRowsToActuallyRender - 1 : 0) * // 减去行间距
        rowSpacing -
      10; // 底部额外留白

    // 每行状态条形图的高度
    const heightPerStateRow =
      numRowsToActuallyRender > 0
        ? availableCanvasHeightForBars / numRowsToActuallyRender
        : 0;
    // 注意: maxBarMagnitudeHeight 会因此变小，条形图会更短
    // 单个振幅分量 (实部或虚部) 的最大可视化高度
    const maxBarMagnitudeHeight = Math.max(5, heightPerStateRow / 2); // 确保至少有5px的高度

    ctx.clearRect(0, 0, width, height); // 清空画布
    ctx.strokeStyle = "#000000"; // 条形图轮廓颜色 (在暗色主题下可以考虑 #555 或不画轮廓)

    // 绘制图例
    const legendY = 10; // 图例的Y坐标
    painter.fillRect(10, legendY, 10, 10, "#4682B4"); // 绘制实部颜色块
    painter.printText(
      // 绘制实部文本
      "实部", // 文本内容
      25, // X坐标
      legendY + 5, // Y坐标 (垂直居中)
      "#FFFFFF", // 文本颜色
      "10px sans-serif", // 字体
      "left", // 水平对齐
      "middle" // 垂直对齐
    );
    painter.fillRect(70, legendY, 10, 10, "#FF6347"); // 绘制虚部颜色块
    painter.printText(
      // 绘制虚部文本
      "虚部",
      85,
      legendY + 5,
      "#FFFFFF",
      "10px sans-serif",
      "left",
      "middle"
    );

    // 遍历要绘制的每个状态
    for (let i = 0; i < statesToActuallyDrawInLoop; i++) {
      const amplitude = stateVector.cell(0, i); // 获取第i个状态的复数振幅
      const realPart = amplitude.real; // 实部
      const imagPart = amplitude.imag; // 虚部

      // 计算当前状态在网格中的行索引和列索引
      const rowIndex = Math.floor(i / maxBarsPerRow);
      const colIndexInRow = i % maxBarsPerRow;

      // 计算当前行实际显示的状态数 (最后一行可能不满)
      const statesInThisRow =
        rowIndex === numRowsToActuallyRender - 1 && // 是最后一行
        statesToActuallyDrawInLoop % maxBarsPerRow !== 0 // 并且总状态数不能被每行最大数整除
          ? statesToActuallyDrawInLoop % maxBarsPerRow // 则为余数
          : maxBarsPerRow; // 否则为每行最大数

      // 计算当前行总的内边距宽度
      const totalPaddingInRow = barPadding * (statesInThisRow + 1);
      // 计算单个条形图的宽度
      const barWidth =
        statesInThisRow > 0 ? (width - totalPaddingInRow) / statesInThisRow : 0;

      // 计算当前行的基准Y坐标 (条形图区域的起始Y)
      const rowBaseY =
        legendHeight + // 图例高度
        5 + // 图例后的小间距
        rowIndex * (heightPerStateRow + labelAreaHeightPerRow + rowSpacing); // 之前所有行的总高度
      // 当前行条形图的中心Y坐标 (用于从中心向上或向下绘制)
      const yCenterInRow = rowBaseY + heightPerStateRow / 2;
      // 当前条形图的X坐标
      const currentX = barPadding + colIndexInRow * (barWidth + barPadding);

      // --- 绘制实部条 ---
      ctx.fillStyle = "#4682B4"; // SteelBlue 钢蓝色
      let realBarVisualHeight = realPart * maxBarMagnitudeHeight; // 实部的视觉高度 (可能为负)
      if (realBarVisualHeight >= 0) {
        // 如果实部为正
        ctx.fillRect(
          // 从中心向上绘制
          currentX,
          yCenterInRow - realBarVisualHeight, // 起始Y
          barWidth,
          realBarVisualHeight // 高度
        );
        ctx.strokeRect(
          // 绘制边框
          currentX,
          yCenterInRow - realBarVisualHeight,
          barWidth,
          realBarVisualHeight
        );
      } else {
        // 如果实部为负
        ctx.fillRect(
          // 从中心向下绘制
          currentX,
          yCenterInRow, // 起始Y (中心线)
          barWidth,
          -realBarVisualHeight // 高度 (取绝对值)
        );
        ctx.strokeRect(currentX, yCenterInRow, barWidth, -realBarVisualHeight);
      }

      // --- 绘制虚部条 ---
      ctx.fillStyle = "#FF6347"; // Tomato 番茄色
      let imagBarVisualHeight = imagPart * maxBarMagnitudeHeight; // 虚部的视觉高度
      let imagYStart; // 虚部条的起始Y坐标

      // 虚部条形图应该堆叠在实部条形图的末端
      if (realPart >= 0) {
        // 如果实部为正，虚部在实部条的顶端开始
        imagYStart = yCenterInRow - realBarVisualHeight;
      } else {
        // 如果实部为负，虚部也在实部条的“顶端”(即更靠近0的位置)开始
        imagYStart = yCenterInRow - realBarVisualHeight; // realBarVisualHeight 此时为负
      }

      if (imagBarVisualHeight >= 0) {
        // 如果虚部为正
        ctx.fillRect(
          // 向上绘制 (从imagYStart开始)
          currentX,
          imagYStart - imagBarVisualHeight, // 起始Y
          barWidth,
          imagBarVisualHeight // 高度
        );
        ctx.strokeRect(
          currentX,
          imagYStart - imagBarVisualHeight,
          barWidth,
          imagBarVisualHeight
        );
      } else {
        // 如果虚部为负
        ctx.fillRect(
          // 向下绘制 (从imagYStart开始)
          currentX,
          imagYStart, // 起始Y
          barWidth,
          -imagBarVisualHeight // 高度 (取绝对值)
        );
        ctx.strokeRect(currentX, imagYStart, barWidth, -imagBarVisualHeight);
      }

      // --- 绘制基态标签 (如 |00⟩) ---
      // 有效的量子比特数，用于格式化标签 (例如，如果numQubits为0但有多个状态，则从状态数反推)
      const effectiveNumQubits =
        numQubits > 0
          ? numQubits
          : totalSystemStates > 1
          ? Math.log2(totalSystemStates) // 如果状态数是2的幂，则可以反推
          : 1; // 默认为1
      // 将状态索引i转换为二进制，并补零到effectiveNumQubits位
      const basisLabel = `|${i.toString(2).padStart(effectiveNumQubits, "0")}⟩`;
      // 基态标签的Y坐标 (在标签区域的偏上部分)
      const basisLabelY =
        rowBaseY + heightPerStateRow + labelAreaHeightPerRow * 0.4;
      painter.printText(
        //
        basisLabel,
        currentX + barWidth / 2, // X居中
        basisLabelY,
        "#FFFFFF", // 文本颜色
        "10px sans-serif", // 基态标签字体
        "center", // 水平居中
        "middle" // 垂直居中
      );

      // --- 绘制复数振幅标签 (如 1.00+0.00i) ---
      const amplitudeString = amplitude.toString({
        //
        fixedDigits: 2, // 保留两位小数
        includePlusForPositiveImag: true, // 正虚部显示"+"
      });
      // 振幅标签的Y坐标 (在基态标签下方)
      const amplitudeLabelY =
        rowBaseY + heightPerStateRow + labelAreaHeightPerRow * 0.8;
      painter.printText(
        //
        amplitudeString,
        currentX + barWidth / 2, // X居中
        amplitudeLabelY,
        "#FFFFFF", // 文本颜色
        "8px sans-serif", // 振幅数值使用稍小字体
        "center", // 水平居中
        "middle" // 垂直居中 (确保在分配的行内垂直居中)
      );
    }

    // 如果总状态数大于实际绘制的状态数，显示提示信息
    if (totalSystemStates > statesToActuallyDrawInLoop) {
      const textY = height - 10; // 提示信息的Y坐标 (靠近底部)
      painter.printText(
        //
        `(...${
          totalSystemStates - statesToActuallyDrawInLoop // 未显示的状态数
        } more states not shown)`,
        width - 5, // X坐标 (靠近右侧)
        textY,
        "#FFFFFF",
        "10px sans-serif",
        "right", // 右对齐
        "bottom" // 底部对齐
      );
    }
  }

  /**
   * (此方法已在 probabilityDisplay.js 中定义，此处保留MathPainter中的一个可能版本或占位符)
   * 在指定的矩形区域内绘制单个量子比特的测量概率条形图。
   * @param {Painter} painter - Painter类的实例。
   * @param {number[]} probabilities - 包含两个元素的数组 [P(0), P(1)]。
   * @param {object} rect - 包含 {x, y, width, height} 的矩形对象，定义绘图区域。
   * @param {string} title - 该子图的标题 (例如, "Qubit 0")。
   */
  static drawSingleQubitProbabilityBars(painter, probabilities, rect, title) {
    const ctx = painter.ctx; // 获取绘图上下文
    if (!ctx) return;

    // 绘图区域的参数
    const { x, y, width, height } = rect;
    const barPadding = 10; // 条形图之间的内边距
    const titleHeight = 20; // 标题区域高度
    const labelHeight = 15; // 标签区域高度 (P(0), P(1))
    const barAreaHeight = height - titleHeight - labelHeight - 5; // 条形图本身可用的高度

    // 清除此子图区域 (如果painter.clear()不是全局的)
    // painter.fillRect(x, y, width, height, painter.canvas.style.backgroundColor || "#FFFFFF");

    // 绘制标题
    painter.printText(
      //
      title,
      x + width / 2,
      y + titleHeight / 2,
      "#000000", // 标题颜色 (可调整)
      "12px sans-serif",
      "center",
      "middle"
    );

    const prob0 = probabilities[0]; // P(0)
    const prob1 = probabilities[1]; // P(1)

    const barWidth = (width - barPadding * 3) / 2; // 计算每个条的宽度

    // 绘制 P(0) 的条形图
    const bar0X = x + barPadding;
    const bar0Height = prob0 * barAreaHeight;
    const bar0Y = y + titleHeight + (barAreaHeight - bar0Height); // 从底部向上绘制
    painter.fillRect(bar0X, bar0Y, barWidth, bar0Height, "#4CAF50"); // 绿色
    painter.printText(
      //
      `P(0): ${prob0.toFixed(2)}`,
      bar0X + barWidth / 2,
      y + titleHeight + barAreaHeight + labelHeight / 2, // 标签位置
      "#000000",
      "10px sans-serif"
    );

    // 绘制 P(1) 的条形图
    const bar1X = x + barPadding * 2 + barWidth;
    const bar1Height = prob1 * barAreaHeight;
    const bar1Y = y + titleHeight + (barAreaHeight - bar1Height);
    painter.fillRect(bar1X, bar1Y, barWidth, bar1Height, "#F44336"); // 红色
    painter.printText(
      //
      `P(1): ${prob1.toFixed(2)}`,
      bar1X + barWidth / 2,
      y + titleHeight + barAreaHeight + labelHeight / 2,
      "#000000",
      "10px sans-serif"
    );
  }
}
