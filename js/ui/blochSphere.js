// Example1/js/ui/blochSphere.js
// 布洛赫球显示类，使用Three.js渲染单个量子比特的状态。
// (添加了dispose方法并管理animationFrameId)

class BlochSphereDisplay {
  /**
   * 构造函数
   * @param {string} canvasId - 用于渲染布洛赫球的Canvas元素的ID。
   */
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId); // 获取Canvas DOM元素
    if (!this.canvas) {
      // 如果找不到Canvas元素，则打印错误并返回
      console.error(`Bloch sphere canvas with id '${canvasId}' not found.`);
      return;
    }
    this.scene = null; // Three.js场景对象
    this.camera = null; // Three.js相机对象
    this.renderer = null; // Three.js渲染器对象
    this.controls = null; // Three.js OrbitControls控制器对象，用于鼠标交互
    this.stateVectorArrow = null; // 表示量子态向量的箭头对象
    this.sphereRadius = 1.0; // 布洛赫球的半径
    this.textLabels = []; // 存储文本标签(如|0⟩, |1⟩)的数组
    this.animationFrameId = null; // 用于存储动画帧请求的ID，方便取消

    this._initThreeScene(); // 初始化Three.js场景
  }

  /**
   * 初始化Three.js场景、相机、渲染器、光照和布洛赫球几何体。
   * @private
   */
  _initThreeScene() {
    if (!this.canvas) return; // 确保canvas存在

    // 1. 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff); // 设置场景背景色为白色 (可以根据主题调整)

    // 2. 创建相机
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight; // 计算宽高比
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100); // 透视相机 (FOV, aspect, near, far)
    this.camera.position.set(
      // 设置相机初始位置
      this.sphereRadius * 2.0,
      this.sphereRadius * 1.6,
      this.sphereRadius * 2.8
    );
    this.camera.lookAt(0, 0, 0); // 相机望向原点

    // 3. 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, // 指定渲染用的canvas
      antialias: true, // 开启抗锯齿
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight); // 设置渲染尺寸
    this.renderer.setPixelRatio(window.devicePixelRatio); // 设置设备像素比，以获得更清晰的图像

    // 4. 创建轨道控制器 (OrbitControls)
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true; // 开启阻尼效果，使旋转更平滑
    this.controls.dampingFactor = 0.05; // 阻尼系数
    this.controls.screenSpacePanning = false; // 禁止屏幕空间平移
    this.controls.minDistance = this.sphereRadius * 1.5; // 最小缩放距离
    this.controls.maxDistance = this.sphereRadius * 10; // 最大缩放距离

    // 5. 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 3); // 环境光 (颜色, 强度)
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // 平行光 (颜色, 强度)
    directionalLight.position.set(2, 3, 1); // 设置光源位置
    this.scene.add(directionalLight);

    // 6. 创建布洛赫球几何体 (半透明)
    const sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 32, 32); // 球体 (半径, 宽度分段, 高度分段)
    const sphereMaterial = new THREE.MeshPhongMaterial({
      // Phong材质，可以反射光线
      color: 0x696969, // 球体颜色 (暗灰色)
      transparent: true, // 开启透明
      opacity: 0.2, // 透明度
      shininess: 20, // 高光强度
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(sphereMesh);

    // 7. 创建坐标轴和标签
    this._createAxesAndLabels();

    // 8. 创建表示量子态的箭头
    this.stateVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), // 初始方向指向|0⟩ (Three.js的Y轴对应Bloch球的Z轴)
      new THREE.Vector3(0, 0, 0), // 箭头起点在原点
      this.sphereRadius, // 箭头长度等于球半径
      0x0077cc, // 箭头颜色 (蓝色)
      0.2 * this.sphereRadius, // 箭头头部长度
      0.1 * this.sphereRadius // 箭头头部宽度
    );
    this.scene.add(this.stateVectorArrow);

    // 9. 开始动画循环
    this._animate();
  }

  /**
   * 创建文本精灵作为标签。
   * @param {string} message - 要显示的文本。
   * @param {THREE.Vector3} position - 标签的位置。
   * @param {string} [color='black'] - 文本颜色。
   * @param {number} [fontSize=24] - 字体大小。
   * @param {number} [scale=0.3] - 精灵的缩放比例。
   * @returns {THREE.Sprite} 创建的文本精灵对象。
   * @private
   */
  _makeTextSprite(
    message,
    position,
    color = "black",
    fontSize = 24,
    scale = 0.3
  ) {
    const canvas = document.createElement("canvas"); // 创建一个临时的canvas用于绘制文本
    const context = canvas.getContext("2d");
    const font = `${fontSize}px Arial`; // 定义字体样式
    context.font = font;
    const metrics = context.measureText(message); // 测量文本宽度
    const textWidth = metrics.width;
    canvas.width = textWidth + 10; // 根据文本内容调整canvas大小
    canvas.height = fontSize + 10;
    context.font = font; // 重新应用字体，因为canvas大小改变可能会重置
    context.fillStyle = "rgba(255, 255, 255, 0)"; // 设置透明背景
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color; // 设置文本颜色
    context.fillText(message, 5, fontSize); // 绘制文本 (y坐标是基线位置)

    const texture = new THREE.CanvasTexture(canvas); // 从canvas创建纹理
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      // 创建精灵材质
      map: texture, // 使用文本纹理
      depthTest: false, // 关闭深度测试，确保标签总在最前 (根据需要调整)
    });
    const sprite = new THREE.Sprite(spriteMaterial); // 创建精灵
    sprite.position.copy(position); // 设置精灵位置
    // 调整精灵缩放，使其看起来大小合适
    sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1.0);
    return sprite;
  }

  /**
   * 创建布洛赫球的坐标轴和对应的文本标签。
   * Three.js 坐标系: Y轴向上。
   * Bloch球习惯: Z轴向上 (|0⟩)，X轴向右 (|+⟩)，Y轴向外 (|+i⟩)。
   * 映射关系: Bloch Z -> Three.js Y, Bloch X -> Three.js X, Bloch Y -> Three.js Z
   * @private
   */
  _createAxesAndLabels() {
    const axisLength = this.sphereRadius * 1.3; // 坐标轴长度略大于球半径

    // Z-axis (Bloch球的Z轴, 对应Three.js的Y轴, |0⟩ 到 |1⟩)
    const axisMaterialZ = new THREE.LineBasicMaterial({ color: 0x00aa00 }); // 绿色
    this.scene.add(
      new THREE.Line( // 创建线段
        new THREE.BufferGeometry().setFromPoints([
          // 定义线段的两个端点
          new THREE.Vector3(0, -axisLength, 0), // -Y 方向 (对应 |1⟩)
          new THREE.Vector3(0, axisLength, 0), // +Y 方向 (对应 |0⟩)
        ]),
        axisMaterialZ // 使用绿色材质
      )
    );
    this.textLabels.push(
      // 添加 |0⟩ 标签
      this._makeTextSprite(
        "|0⟩", // 文本内容
        new THREE.Vector3(0, axisLength * 1.05, 0), // 标签位置 (略高于轴末端)
        "#006400" // 深绿色
      )
    );
    this.textLabels.push(
      // 添加 |1⟩ 标签
      this._makeTextSprite(
        "|1⟩",
        new THREE.Vector3(0, -axisLength * 1.15, 0), // 标签位置 (略低于轴末端，考虑文字基线)
        "#006400"
      )
    );

    // X-axis (Bloch球的X轴, 对应Three.js的X轴, |+⟩ 到 |-⟩)
    const axisMaterialX = new THREE.LineBasicMaterial({ color: 0xff0000 }); // 红色
    this.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-axisLength, 0, 0), // -X 方向 (对应 |-⟩)
          new THREE.Vector3(axisLength, 0, 0), // +X 方向 (对应 |+⟩)
        ]),
        axisMaterialX
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|+⟩ (X)", // 标签包含轴向信息，便于区分
        new THREE.Vector3(axisLength * 1.05, 0, 0),
        "#8B0000" // 暗红色
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|-⟩",
        new THREE.Vector3(-axisLength * 1.05, 0, 0),
        "#8B0000"
      )
    );

    // Y-axis (Bloch球的Y轴, 对应Three.js的Z轴, |+i⟩ 到 |-i⟩)
    const axisMaterialY = new THREE.LineBasicMaterial({ color: 0x0000ff }); // 蓝色
    this.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, -axisLength), // -Z 方向 (对应 |-i⟩)
          new THREE.Vector3(0, 0, axisLength), // +Z 方向 (对应 |+i⟩)
        ]),
        axisMaterialY
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|+i⟩ (Y)",
        new THREE.Vector3(0, 0, axisLength * 1.05),
        "#00008B" // 暗蓝色
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|-i⟩",
        new THREE.Vector3(0, 0, -axisLength * 1.05),
        "#00008B"
      )
    );

    // 将所有文本标签添加到场景中
    this.textLabels.forEach((label) => this.scene.add(label));
  }

  /**
   * 动画循环函数，每帧调用。
   * @private
   */
  _animate() {
    // 保存请求ID，以便可以取消动画帧
    this.animationFrameId = requestAnimationFrame(this._animate.bind(this));
    if (this.controls) this.controls.update(); // 更新控制器 (处理阻尼等)
    if (this.renderer && this.scene && this.camera)
      // 确保渲染所需对象都存在
      this.renderer.render(this.scene, this.camera); // 渲染场景
  }

  /**
   * 更新布洛赫球上表示量子态的箭头。
   * @param {Matrix} densityMatrix - 2x2的密度矩阵，描述单个量子比特的状态。
   * rho = [[rho_00, rho_01], [rho_10, rho_11]]
   */
  update(densityMatrix) {
    if (!this.stateVectorArrow || !this.scene) {
      // 检查对象是否已被销毁
      return;
    }
    // 验证密度矩阵的有效性
    if (
      !densityMatrix ||
      densityMatrix.width !== 2 ||
      densityMatrix.height !== 2
    ) {
      // 如果密度矩阵无效，则将箭头指向|0⟩态（北极）
      this.stateVectorArrow.setDirection(new THREE.Vector3(0, 1, 0));
      this.stateVectorArrow.setLength(
        // 设置为纯态的长度
        this.sphereRadius,
        0.2 * this.sphereRadius,
        0.1 * this.sphereRadius
      );
      return;
    }

    // 从密度矩阵元素计算Bloch向量 (x, y, z)
    // rho_00 = <0|rho|0>, rho_11 = <1|rho|1>
    // rho_01 = <0|rho|1>, rho_10 = <1|rho|0>
    // 注意：densityMatrix.cell(row, col)
    const rho00 = densityMatrix.cell(0, 0).real; // <0|rho|0>
    const rho11 = densityMatrix.cell(1, 1).real; // <1|rho|1>
    const rho01 = densityMatrix.cell(0, 1); // <0|rho|1> (非对角元)
    const rho10 = densityMatrix.cell(1, 0); // <1|rho|0> (非对角元)

    // Bloch向量分量:
    // x = Tr(rho * sigma_x) = rho_01 + rho_10 (取实部，因为x是实数)
    // y = Tr(rho * sigma_y) = i * (rho_10 - rho_01) (取实部)
    // z = Tr(rho * sigma_z) = rho_00 - rho_11
    const x = rho01.real + rho10.real; // (rho_01 + rho_01.conjugate()).real = 2 * rho_01.real
    const y = rho10.minus(rho01).times(Complex.I).real; // i * (rho_10 - rho_01) -> i * (a+bi - (c+di)) = i*((a-c)+i(b-d)) = i(a-c) - (b-d) => -(b-d)
    // y = 2 * Im(rho_01) if rho_10 = rho_01.conj
    const z = rho00 - rho11;

    // 将Bloch向量 (x,y,z) 映射到Three.js坐标系 (X,Z,Y) 并归一化方向
    // Bloch (x, y, z) -> Three.js (x_val, z_val, y_val)
    // 这里我们的轴定义为 Bloch Z -> Three Y, Bloch X -> Three X, Bloch Y -> Three Z
    // 所以: Three.js X = Bloch X (x)
    //        Three.js Y = Bloch Z (z)
    //        Three.js Z = Bloch Y (y)
    const threeJSDir = new THREE.Vector3(x, z, y).normalize(); // 归一化得到方向向量
    const length = Math.sqrt(x * x + y * y + z * z); // 计算Bloch向量的长度 (0 <= length <= 1)
    // length = 1 表示纯态，length < 1 表示混合态

    // 更新箭头的方向和长度
    this.stateVectorArrow.setDirection(threeJSDir);
    this.stateVectorArrow.setLength(
      length * this.sphereRadius, // 箭头实际长度 = Bloch向量长度 * 球半径
      0.2 * this.sphereRadius * Math.min(1, length + 0.1), // 箭头头部的长度，随向量长度略微调整，但不小于0
      0.1 * this.sphereRadius * Math.min(1, length + 0.1) // 箭头头部的宽度
    );
  }

  /**
   * 当Canvas尺寸变化时调用，用于调整相机和渲染器。
   */
  onResize() {
    if (this.camera && this.renderer && this.canvas) {
      const newWidth = this.canvas.clientWidth; // 获取新的宽度
      const newHeight = this.canvas.clientHeight; // 获取新的高度
      if (newWidth === 0 || newHeight === 0) return; // 避免除以零

      this.camera.aspect = newWidth / newHeight; // 更新相机的宽高比
      this.camera.updateProjectionMatrix(); // 更新相机的投影矩阵
      this.renderer.setSize(newWidth, newHeight); // 更新渲染器的尺寸
    }
  }

  /**
   * 清理和释放Three.js相关的资源。
   */
  dispose() {
    if (this.animationFrameId) {
      // 如果动画循环正在运行
      cancelAnimationFrame(this.animationFrameId); // 取消动画帧请求
      this.animationFrameId = null;
    }
    if (this.controls) {
      // 如果控制器存在
      this.controls.dispose(); // 释放控制器资源
      this.controls = null;
    }
    if (this.renderer) {
      // 如果渲染器存在
      this.renderer.dispose(); // 释放渲染器资源
      this.renderer.domElement = null; // 移除对canvas的引用
      this.renderer = null;
    }
    if (this.scene) {
      // 如果场景存在
      // 遍历场景中的所有对象并释放它们的几何体和材质
      this.scene.traverse((object) => {
        if (object.isMesh || object.isLine || object.isSprite) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              // 处理多材质对象
              object.material.forEach((material) => {
                if (material.map) material.map.dispose(); // 释放纹理
                material.dispose(); // 释放材质
              });
            } else {
              // 处理单材质对象
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        }
      });
      // 显式移除标签，以防它们未被traverse捕获 (例如，如果它们不是Mesh/Line/Sprite)
      this.textLabels.forEach((label) => {
        if (label.material.map) label.material.map.dispose();
        if (label.material) label.material.dispose();
        if (label.geometry) label.geometry.dispose(); // 精灵通常没有 .geometry
        this.scene.remove(label); // 从场景中移除
      });
      this.textLabels = []; // 清空标签数组
      this.scene = null; // 置空场景对象
    }
    this.camera = null; // 置空相机对象
    this.stateVectorArrow = null; // 箭头辅助对象的资源通常由场景图管理
    // canvas元素本身由main.js管理 (创建和从DOM中移除)
    // console.log("BlochSphereDisplay disposed for canvas:", this.canvas ? this.canvas.id : 'N/A');
  }
}
export default BlochSphereDisplay; // 导出BlochSphereDisplay类
