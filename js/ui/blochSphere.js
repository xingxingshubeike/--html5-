// Example1/js/ui/blochSphere.js
// (Add the dispose method and manage animationFrameId)

class BlochSphereDisplay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Bloch sphere canvas with id '${canvasId}' not found.`);
      return;
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.stateVectorArrow = null;
    this.sphereRadius = 1.0;
    this.textLabels = [];
    this.animationFrameId = null; // To store the animation frame request ID

    this._initThreeScene();
  }

  _initThreeScene() {
    if (!this.canvas) return; // Ensure canvas exists
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(
      this.sphereRadius * 2.0,
      this.sphereRadius * 1.6,
      this.sphereRadius * 2.8
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = this.sphereRadius * 1.5;
    this.controls.maxDistance = this.sphereRadius * 10;

    const ambientLight = new THREE.AmbientLight(0x404040, 3);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(2, 3, 1);
    this.scene.add(directionalLight);

    const sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x696969,
      transparent: true,
      opacity: 0.2,
      shininess: 20,
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(sphereMesh);

    this._createAxesAndLabels();

    this.stateVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), // Initial direction |0⟩
      new THREE.Vector3(0, 0, 0),
      this.sphereRadius,
      0x0077cc, // Blue
      0.2 * this.sphereRadius,
      0.1 * this.sphereRadius
    );
    this.scene.add(this.stateVectorArrow);

    this._animate();
  }

  _makeTextSprite(
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
    context.font = font; // Re-apply font after resizing canvas
    context.fillStyle = "rgba(255, 255, 255, 0)"; // Transparent background
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

  _createAxesAndLabels() {
    const axisLength = this.sphereRadius * 1.3;

    // Z-axis (|0⟩ to |1⟩) - maps to Three.js Y-axis
    const axisMaterialZ = new THREE.LineBasicMaterial({ color: 0x00aa00 }); // Green
    this.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -axisLength, 0),
          new THREE.Vector3(0, axisLength, 0),
        ]),
        axisMaterialZ
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|0⟩",
        new THREE.Vector3(0, axisLength * 1.05, 0),
        "#006400"
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|1⟩",
        new THREE.Vector3(0, -axisLength * 1.15, 0),
        "#006400"
      )
    );

    // X-axis (|+⟩ to |-⟩) - maps to Three.js X-axis
    const axisMaterialX = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red
    this.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-axisLength, 0, 0),
          new THREE.Vector3(axisLength, 0, 0),
        ]),
        axisMaterialX
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|+⟩ (X)",
        new THREE.Vector3(axisLength * 1.05, 0, 0),
        "#8B0000"
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|-⟩",
        new THREE.Vector3(-axisLength * 1.05, 0, 0),
        "#8B0000"
      )
    );

    // Y-axis (|+i⟩ to |-i⟩) - maps to Three.js Z-axis
    const axisMaterialY = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue
    this.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, -axisLength),
          new THREE.Vector3(0, 0, axisLength),
        ]),
        axisMaterialY
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|+i⟩ (Y)",
        new THREE.Vector3(0, 0, axisLength * 1.05),
        "#00008B"
      )
    );
    this.textLabels.push(
      this._makeTextSprite(
        "|-i⟩",
        new THREE.Vector3(0, 0, -axisLength * 1.05),
        "#00008B"
      )
    );

    this.textLabels.forEach((label) => this.scene.add(label));
  }

  _animate() {
    // Store the ID so it can be cancelled
    this.animationFrameId = requestAnimationFrame(this._animate.bind(this));
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera)
      this.renderer.render(this.scene, this.camera);
  }

  update(densityMatrix) {
    if (!this.stateVectorArrow || !this.scene) {
      // Check if disposed
      return;
    }
    if (
      !densityMatrix ||
      densityMatrix.width !== 2 ||
      densityMatrix.height !== 2
    ) {
      this.stateVectorArrow.setDirection(new THREE.Vector3(0, 1, 0)); // Point to |0⟩
      this.stateVectorArrow.setLength(
        this.sphereRadius,
        0.2 * this.sphereRadius,
        0.1 * this.sphereRadius
      );
      return;
    }

    const rho00 = densityMatrix.cell(0, 0).real;
    const rho11 = densityMatrix.cell(1, 1).real;
    const rho01 = densityMatrix.cell(1, 0);
    const rho10 = densityMatrix.cell(0, 1);

    const x = rho01.real + rho10.real;
    const y = rho10.minus(rho01).times(Complex.I).real;
    const z = rho00 - rho11;

    const threeJSDir = new THREE.Vector3(x, z, y).normalize();
    const length = Math.sqrt(x * x + y * y + z * z);

    this.stateVectorArrow.setDirection(threeJSDir);
    this.stateVectorArrow.setLength(
      length * this.sphereRadius,
      0.2 * this.sphereRadius * Math.min(1, length + 0.1),
      0.1 * this.sphereRadius * Math.min(1, length + 0.1)
    );
  }

  onResize() {
    if (this.camera && this.renderer && this.canvas) {
      const newWidth = this.canvas.clientWidth;
      const newHeight = this.canvas.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      this.camera.aspect = newWidth / newHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(newWidth, newHeight);
    }
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.isMesh || object.isLine || object.isSprite) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => {
                if (material.map) material.map.dispose();
                material.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        }
      });
      // Remove labels explicitly if they weren't caught by traverse (e.g. if not Mesh/Line/Sprite)
      this.textLabels.forEach((label) => {
        if (label.material.map) label.material.map.dispose();
        if (label.material) label.material.dispose();
        if (label.geometry) label.geometry.dispose();
        this.scene.remove(label);
      });
      this.textLabels = [];
      this.scene = null;
    }
    this.camera = null;
    this.stateVectorArrow = null; // ArrowHelper resources are managed by the scene graph typically
    // The canvas element itself is managed by main.js (created and removed from DOM)
    // console.log("BlochSphereDisplay disposed for canvas:", this.canvas ? this.canvas.id : 'N/A');
  }
}
export default BlochSphereDisplay;
