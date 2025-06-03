// Example1/js/ui/amplitudeDisplay.js
// 振幅显示类，用于在Canvas上绘制量子态的振幅信息

class AmplitudeDisplay {
  /**
   * 构造函数
   * @param {string} canvasId - 用于绘制振幅的Canvas元素的ID。
   */
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId); // 获取Canvas DOM元素
    if (!this.canvas) {
      // 如果找不到Canvas元素，则打印错误并返回
      console.error(`Amplitude canvas with id '${canvasId}' not found.`);
      return;
    }
    this.ctx = this.canvas.getContext("2d"); // 获取2D绘图上下文
    this.painter = new Painter(this.canvas); // 使用 Painter 工具类进行绘制
  }

  /**
   * 更新振幅显示。
   * @param {Matrix} stateVector - 一个列向量，表示量子态的复数振幅。
   * @param {number} numQubits - 量子比特的数量。
   */
  update(stateVector, numQubits) {
    if (!this.canvas) return; // 如果Canvas不存在，则不执行任何操作

    // 使用 MathPainter 来绘制振幅条形图
    MathPainter.drawAmplitudeBars(
      this.painter, // Painter实例
      stateVector, // 状态向量
      this.canvas, // Canvas元素
      numQubits // 量子比特数
    );
  }
}

export default AmplitudeDisplay; // 导出 AmplitudeDisplay 类
