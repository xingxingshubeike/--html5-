// js/ui/painter.js
// Simplified drawing utility class

class Painter {
  /**
   * @param {?HTMLCanvasElement} canvas - 画布元素，如果仅用于工具提示等非绘图功能，则可以为 null。
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null; // 初始化 ctx 为 null

    if (this.canvas && typeof this.canvas.getContext === "function") {
      // 仅当 canvas 有效且具有 getContext 方法时才获取上下文
      this.ctx = this.canvas.getContext("2d");
    } else if (this.canvas) {
      // 如果提供了 canvas 但它不是一个有效的 canvas 元素
      console.warn(
        "Painter: 提供的 canvas 对象不是有效的 HTMLCanvasElement 或不支持 getContext。",
        canvas
      );
    }
    // 如果 canvas 为 null，this.ctx 将保持为 null，
    // 这对于仅使用工具提示方法的场景是可接受的。

    this.tooltipEl = document.getElementById("gateTooltip");
    if (!this.tooltipEl) {
      console.warn("Painter: 未在 DOM 中找到工具提示元素 'gateTooltip'。");
    }
  }

  /**
   * 内部辅助函数，用于检查绘图上下文是否可用。
   * @returns {boolean} 如果上下文可用则为 true，否则为 false。
   */
  _checkContext() {
    if (!this.ctx) {
      // 可以选择性地取消注释下面的警告，以便在尝试在没有上下文的情况下绘图时获得通知。
      // console.warn("Painter: 尝试在没有有效画布上下文的情况下进行绘图。");
      return false;
    }
    return true;
  }

  clear(color = "#FFFFFF") {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  fillRect(x, y, w, h, color = "#CCCCCC") {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  strokeRect(x, y, w, h, color = "#000000", lineWidth = 1) {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, w, h);
  }

  strokeLine(x1, y1, x2, y2, color = "#000000", lineWidth = 1) {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  printText(
    text,
    x,
    y,
    color = "#000000",
    font = "12px sans-serif",
    textAlign = "center",
    textBaseline = "middle"
  ) {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;
    this.ctx.fillText(text, x, y);
  }

  fillCircle(cx, cy, r, color = "#000000") {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  strokeCircle(cx, cy, r, color = "#000000", lineWidth = 1) {
    if (!this._checkContext()) return; // 在使用 ctx 之前检查
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  // Tooltip 方法不依赖 this.ctx
  showTooltip(x, y, text) {
    if (!this.tooltipEl) {
      // console.warn("Painter.showTooltip: tooltipEl not found.");
      return;
    }
    this.tooltipEl.style.display = "block";
    this.tooltipEl.style.left = `${x + 10}px`; // Offset slightly from cursor
    this.tooltipEl.style.top = `${y + 10}px`;
    this.tooltipEl.textContent = text;
  }

  hideTooltip() {
    if (!this.tooltipEl) {
      // console.warn("Painter.hideTooltip: tooltipEl not found.");
      return;
    }
    this.tooltipEl.style.display = "none";
  }
}
