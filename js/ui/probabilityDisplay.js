// Example1/js/ui/probabilityDisplay.js
// 该类负责在指定的Canvas上显示每个量子比特的测量概率。
// 注意：在 main.js 中，这个模块的导入和使用已被注释掉，
//      取而代之的是直接在 displayedCircuit.js 中实现行末概率显示。
//      因此，这个独立文件可能不再被主程序使用。

class ProbabilityDisplay {
  /**
   * 构造函数
   * @param {string} canvasId - 用于绘制概率的Canvas元素的ID。
   */
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId); // 获取Canvas DOM元素
    if (!this.canvas) {
      // 如果找不到Canvas元素，则打印错误并返回
      console.error(`Probability canvas with id '${canvasId}' not found.`);
      return;
    }
    this.ctx = this.canvas.getContext("2d"); // 获取2D绘图上下文
    this.painter = new Painter(this.canvas); // 创建Painter实例用于绘图
  }

  /**
   * 更新概率显示。
   * @param {Array<Array<number>>} marginalProbsPerQubit - 一个数组，每个元素是对应量子比特的边缘概率 [P(0), P(1)]。
   * @param {number} numQubits - 量子比特的数量。
   */
  update(marginalProbsPerQubit, numQubits) {
    if (!this.canvas || numQubits === 0) {
      // 如果Canvas不存在或没有量子比特
      if (this.canvas) this.painter.clear(); // 如果Canvas存在但无量子比特，则清空画布
      return;
    }
    this.painter.clear(); // 清空整个画布一次

    const mainCanvasWidth = this.canvas.width; // 主画布宽度
    const mainCanvasHeight = this.canvas.height; // 主画布高度

    const gridCols = 2; // 显示布局为2xN的网格
    const gridRows = Math.ceil(numQubits / gridCols); // 计算网格行数

    // 如果只有1行或2个量子比特，调整绘图维度以充分利用高度
    const effectiveGridRows = numQubits <= gridCols ? 1 : gridRows;

    // 计算每个子图的宽度和高度
    const plotWidth = mainCanvasWidth / gridCols;
    const plotHeight = mainCanvasHeight / effectiveGridRows; // 使用有效行数计算高度

    // 遍历每个量子比特
    for (let i = 0; i < numQubits; i++) {
      const currentProbs = marginalProbsPerQubit[i]; // 获取当前量子比特的概率
      if (!currentProbs) continue; // 如果数据不存在，则跳过

      // 计算当前子图在网格中的行列位置
      const row = Math.floor(i / gridCols);
      const col = i % gridCols;

      // 定义当前子图的绘图矩形区域
      const rect = {
        x: col * plotWidth,
        y: row * plotHeight,
        width: plotWidth,
        height: plotHeight,
      };
      const title = `Qubit ${i}`; // 子图标题

      // 使用 MathPainter (假设其存在并有此方法) 来绘制单个量子比特的概率条形图
      // 注意：MathPainter.drawSingleQubitProbabilityBars 方法是在 mathPainter.js 中定义的
      MathPainter.drawSingleQubitProbabilityBars(
        //
        this.painter,
        currentProbs,
        rect,
        title
      );
    }
  }
}

export default ProbabilityDisplay; // 导出 ProbabilityDisplay 类
