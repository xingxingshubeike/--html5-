// js/ui/painter.js
// 一个简化的绘图工具类，用于在Canvas上执行常见的绘图操作，并管理工具提示。

class Painter {
  /**
   * 构造函数
   * @param {?HTMLCanvasElement} canvas - 画布元素。如果仅用于工具提示等非绘图功能，则可以为 null。
   */
  constructor(canvas) {
    this.canvas = canvas; // HTML Canvas元素
    this.ctx = null; // 初始化2D绘图上下文为null

    // 仅当canvas有效且具有getContext方法时才获取上下文
    if (this.canvas && typeof this.canvas.getContext === "function") {
      this.ctx = this.canvas.getContext("2d");
    } else if (this.canvas) {
      // 如果提供了canvas但它不是一个有效的canvas元素
      console.warn(
        "Painter: 提供的 canvas 对象不是有效的 HTMLCanvasElement 或不支持 getContext。",
        canvas
      );
    }
    // 如果canvas为null (例如，Painter实例仅用于工具提示)，this.ctx将保持为null。

    // 获取工具提示的DOM元素
    this.tooltipEl = document.getElementById("gateTooltip");
    if (!this.tooltipEl) {
      // 如果未找到工具提示元素，则发出警告 (非阻塞)
      console.warn("Painter: 未在 DOM 中找到工具提示元素 'gateTooltip'。");
    }
  }

  /**
   * 内部辅助函数，用于检查绘图上下文是否可用。
   * @returns {boolean} 如果上下文可用则为 true，否则为 false。
   * @private
   */
  _checkContext() {
    if (!this.ctx) {
      // 可以选择性地取消注释下面的警告，以便在尝试在没有上下文的情况下绘图时获得通知。
      // console.warn("Painter: 尝试在没有有效画布上下文的情况下进行绘图。");
      return false; // 上下文不可用
    }
    return true; // 上下文可用
  }

  /**
   * 清除整个画布。
   * @param {string} [color="#FFFFFF"] - 清除时填充的颜色。
   */
  clear(color = "#FFFFFF") {
    if (!this._checkContext()) return; // 检查上下文是否有效
    this.ctx.fillStyle = color; // 设置填充颜色
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // 填充整个画布
  }

  /**
   * 绘制一个填充的矩形。
   * @param {number} x - 矩形左上角的X坐标。
   * @param {number} y - 矩形左上角的Y坐标。
   * @param {number} w - 矩形的宽度。
   * @param {number} h - 矩形的高度。
   * @param {string} [color="#CCCCCC"] - 矩形的填充颜色。
   */
  fillRect(x, y, w, h, color = "#CCCCCC") {
    if (!this._checkContext()) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  /**
   * 绘制一个矩形的边框。
   * @param {number} x - 矩形左上角的X坐标。
   * @param {number} y - 矩形左上角的Y坐标。
   * @param {number} w - 矩形的宽度。
   * @param {number} h - 矩形的高度。
   * @param {string} [color="#000000"] - 边框的颜色。
   * @param {number} [lineWidth=1] - 边框的宽度。
   */
  strokeRect(x, y, w, h, color = "#000000", lineWidth = 1) {
    if (!this._checkContext()) return;
    this.ctx.strokeStyle = color; // 设置边框颜色
    this.ctx.lineWidth = lineWidth; // 设置边框宽度
    this.ctx.strokeRect(x, y, w, h); // 绘制矩形边框
  }

  /**
   * 绘制一条线段。
   * @param {number} x1 - 起点的X坐标。
   * @param {number} y1 - 起点的Y坐标。
   * @param {number} x2 - 终点的X坐标。
   * @param {number} y2 - 终点的Y坐标。
   * @param {string} [color="#000000"] - 线条的颜色。
   * @param {number} [lineWidth=1] - 线条的宽度。
   */
  strokeLine(x1, y1, x2, y2, color = "#000000", lineWidth = 1) {
    if (!this._checkContext()) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath(); // 开始新的路径
    this.ctx.moveTo(x1, y1); // 将路径移动到起点
    this.ctx.lineTo(x2, y2); // 从当前点绘制直线到终点
    this.ctx.stroke(); // 绘制路径
  }

  /**
   * 在画布上打印文本。
   * @param {string} text - 要打印的文本。
   * @param {number} x - 文本的X坐标。
   * @param {number} y - 文本的Y坐标。
   * @param {string} [color="#000000"] - 文本的颜色。
   * @param {string} [font="12px sans-serif"] - 文本的字体样式。
   * @param {CanvasTextAlign} [textAlign="center"] - 文本的水平对齐方式。
   * @param {CanvasTextBaseline} [textBaseline="middle"] - 文本的垂直基线对齐方式。
   */
  printText(
    text,
    x,
    y,
    color = "#000000",
    font = "12px sans-serif",
    textAlign = "center",
    textBaseline = "middle"
  ) {
    if (!this._checkContext()) return;
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;
    this.ctx.fillText(text, x, y); // 绘制填充文本
  }

  /**
   * 绘制一个填充的圆形。
   * @param {number} cx - 圆心的X坐标。
   * @param {number} cy - 圆心的Y坐标。
   * @param {number} r - 圆的半径。
   * @param {string} [color="#000000"] - 圆的填充颜色。
   */
  fillCircle(cx, cy, r, color = "#000000") {
    if (!this._checkContext()) return;
    this.ctx.fillStyle = color;
    this.ctx.beginPath(); // 开始新的路径
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI); // 绘制圆形路径 (圆心x, 圆心y, 半径, 起始角, 结束角)
    this.ctx.fill(); // 填充路径
  }

  /**
   * 绘制一个圆形的边框。
   * @param {number} cx - 圆心的X坐标。
   * @param {number} cy - 圆心的Y坐标。
   * @param {number} r - 圆的半径。
   * @param {string} [color="#000000"] - 边框的颜色。
   * @param {number} [lineWidth=1] - 边框的宽度。
   */
  strokeCircle(cx, cy, r, color = "#000000", lineWidth = 1) {
    if (!this._checkContext()) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  // --- 工具提示方法 (不依赖 this.ctx) ---

  /**
   * 显示工具提示。
   * @param {number} x - 工具提示的X位置 (通常是鼠标X坐标)。
   * @param {number} y - 工具提示的Y位置 (通常是鼠标Y坐标)。
   * @param {string} text - 要在工具提示中显示的文本。
   */
  showTooltip(x, y, text) {
    if (!this.tooltipEl) {
      // 如果工具提示DOM元素不存在
      // console.warn("Painter.showTooltip: tooltipEl not found.");
      return;
    }
    this.tooltipEl.style.display = "block"; // 显示工具提示
    this.tooltipEl.style.left = `${x + 10}px`; // 设置位置 (轻微偏移鼠标指针)
    this.tooltipEl.style.top = `${y + 10}px`;
    this.tooltipEl.textContent = text; // 设置文本内容
  }

  /**
   * 隐藏工具提示。
   */
  hideTooltip() {
    if (!this.tooltipEl) {
      // console.warn("Painter.hideTooltip: tooltipEl not found.");
      return;
    }
    this.tooltipEl.style.display = "none"; // 隐藏工具提示
  }
}
