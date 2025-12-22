import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/Addons.js";
import * as dat from "dat.gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { AssetLoader } from "../../core/AssetLoader";
import { Scene } from "../../scene/Scene";
import type { Renderer } from "../Renderer";
import { Entity } from "../../scene/Entity";
import { Debug, LogChannel } from "../../core/Debug";

// --- START RENDERER PARAMS ---
const params = {
  envMapIntensity: 0.1,
  directionalLightIntensity: 2.0,
  bloomThreshold: 0,
  bloomStrength: 0.2,
  bloomRadius: 0,
};
// --- END RENDERER PARAMS ---

export class ThreeRenderer implements Renderer {
  private webglRenderer: THREE.WebGLRenderer;
  private threeScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  // Caches
  private models: Map<string, THREE.Object3D> = new Map(); // Changed to Object3D to support Groups/Meshes
  private textures: Map<string, THREE.Texture> = new Map();
  private dataCache: Map<string, any> = new Map(); // Cache for JSON/Config data

  // Loaders
  private hdrLoader = new HDRLoader();
  private gltfLoader = new GLTFLoader();

  // Background state
  private currentBgId: string | null = null;

  // Lighting
  private directionalLight?: THREE.DirectionalLight;

  // Post-processing
  private composer?: EffectComposer;
  private bloomPass?: UnrealBloomPass;

  constructor() {
    this.webglRenderer = null!;
    this.threeScene = null!;
    this.camera = null!;
    this.container = null!;
  }

  // =========================================================
  // Asset Initialization
  // =========================================================

  public async initAssets(loader: AssetLoader) {
    const assets = loader.getAllAssets();
    const promises: Promise<void>[] = [];

    Debug.log(LogChannel.Rendering, `Initializing assets... Total: ${assets.size}`);

    for (const [id, asset] of assets) {
      const { meta, data } = asset; // Destructure to get meta info

      switch (meta.format) {
        // --- 1. 模型 (GLB) ---
        case 'glb':
          promises.push(this.processModel(id, data as ArrayBuffer));
          break;
        case 'gltf':
          promises.push(this.processModel(id, data as ArrayBuffer));
          break;

        // --- 2. 环境贴图 (HDR) ---
        case 'hdr':
          promises.push(this.processHDR(id, data as ArrayBuffer));
          break;

        // --- 3. 普通纹理 (PNG / JPG) ---
        case 'png':
        case 'jpg':
        case 'jpeg':
          this.processTexture(id, data as HTMLImageElement);
          break;

        // --- 4. 纯数据 (JSON) ---
        case 'json':
          this.dataCache.set(id, data);
          Debug.log(LogChannel.Asset, `Cached JSON config: ${id}`);
          break;

        default:
          console.warn(`[ThreeRenderer] Skipping unknown format: ${meta.format} for ${id}`);
      }
    }

    await Promise.all(promises);
    Debug.log(LogChannel.Rendering, "All assets initialized and ready.");
  }

  private async processModel(id: string, buffer: ArrayBuffer) {
    try {
      const arrayBufferView = new Uint8Array(buffer);
      const gltf = await this.gltfLoader.parseAsync(arrayBufferView.buffer, "");

      // For simplicity, we take the first scene or first mesh
      let model: THREE.Object3D;
      if (gltf.scene) {
        model = gltf.scene;
      } else if (gltf.scenes && gltf.scenes.length > 0) {
        model = gltf.scenes[0];
      } else {
        throw new Error("GLTF has no scene or meshes.");
      }

      this.models.set(id, model);
      Debug.log(LogChannel.Rendering, `Loaded Model: ${id}`);
    } catch (e) {
      Debug.error(LogChannel.Rendering, `Failed to load model ${id}`, e);
    }
  }

  /**
   * Process HDR binary data using HDRLoader
   */
  private async processHDR(id: string, buffer: ArrayBuffer) {
    this.hdrLoader.setDataType(THREE.FloatType);
    const hdrData = this.hdrLoader.parse(buffer);
    const texture = new THREE.DataTexture(
      hdrData.data,
      hdrData.width,
      hdrData.height,
      THREE.RGBAFormat // Use RGBA format for HDR data
    );
    // 4. 重要配置
    texture.type = hdrData.type;
    texture.mapping = THREE.EquirectangularReflectionMapping; // 关键：设置为环境映射模式
    texture.needsUpdate = true;

    this.textures.set(id, texture);
    Debug.log(LogChannel.Rendering, `Loaded HDR Texture: ${id}`);
  }

  /**
   * Process Standard Images into Textures
   */
  private processTexture(id: string, image: HTMLImageElement) {
    const texture = new THREE.Texture(image);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace; // Important for diffuse maps
    texture.flipY = true; // WebGL standard
    this.textures.set(id, texture);
    Debug.log(LogChannel.Rendering, `Created Texture: ${id}`);
  }


  // =========================================================
  // Lifecycle & Rendering
  // =========================================================

  public init(container: HTMLElement) {
    this.container = container;

    // Renderer Setup
    this.webglRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.webglRenderer.setPixelRatio(window.devicePixelRatio);
    this.webglRenderer.setSize(container.offsetWidth, container.offsetHeight);
    this.webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Attach to DOM
    container.appendChild(this.webglRenderer.domElement);

    // Scene & Camera
    this.threeScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

    // Initial Setup
    this.setupLighting();
    this.setupPostprocessing();
    this.setupDebugGUI();
  }

  private setupLighting() {
    // Directional Light (Sun)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, params.directionalLightIntensity);
    this.directionalLight.position.set(5, 10, 7.5);
    this.threeScene.add(this.directionalLight);

    // Ambient Light (Fill)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.threeScene.add(ambientLight);
  }

  private setupPostprocessing() {
    const renderPass = new RenderPass(this.threeScene, this.camera);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.offsetWidth, this.container.offsetHeight),
      1.5, 0.4, 0.85
    );
    this.bloomPass.threshold = params.bloomThreshold;
    this.bloomPass.strength = params.bloomStrength;
    this.bloomPass.radius = params.bloomRadius;

    this.composer = new EffectComposer(this.webglRenderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
  }

  private setupDebugGUI() {
    // Only init GUI in debug mode or if explicitly requested
    const gui = new dat.GUI();
    gui.close(); // Closed by default

    const lighting = gui.addFolder("Lighting");
    lighting.add(params, "envMapIntensity", 0, 3).name("Env Intensity").onChange(() => this.updateAllMaterials());
    lighting.add(params, "directionalLightIntensity", 0, 10).name("Sun Intensity").onChange((value) => {
      if (this.directionalLight) {
        this.directionalLight.intensity = value;
      }
    });

    const bloom = gui.addFolder("Bloom");
    bloom.add(params, "bloomThreshold", 0.0, 1.0).name("Threshold").onChange(value => this.bloomPass && (this.bloomPass.threshold = value));
    bloom.add(params, "bloomStrength", 0.0, 3.0).name("Strength").onChange(value => this.bloomPass && (this.bloomPass.strength = value));
    bloom.add(params, "bloomRadius", 0.0, 1.0).name("Radius").onChange(value => this.bloomPass && (this.bloomPass.radius = value));
  }

  public render(scene: Scene) {
    const { mainCamera } = scene;

    // 1. Sync Camera
    if (mainCamera) {
      this.camera.fov = mainCamera.fov;
      this.camera.aspect = mainCamera.aspect;
      this.camera.near = mainCamera.near;
      this.camera.far = mainCamera.far;
      this.camera.updateProjectionMatrix();

      this.camera.position.fromArray(mainCamera.position);
      this.camera.quaternion.fromArray(mainCamera.rotation);
    }

    // 2. Sync Background
    if (scene.background !== this.currentBgId) {
      this.updateBackground(scene.background);
      this.currentBgId = scene.background;
    }

    // 3. Sync Entities
    scene.entities.forEach((entity) => {
      this.syncEntity(entity);
    });

    // 4. Render Frame
    this.composer?.render();
  }

  private updateAllMaterials() {
    let updatedCount = 0;
    this.threeScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.envMapIntensity = params.envMapIntensity;
        updatedCount++;
      }
    });
  }

  private updateBackground(bgId: string | null) {
    if (!bgId) {
      this.threeScene.background = new THREE.Color(0x000000); // Default space black
      this.threeScene.environment = null;
      return;
    }

    const texture = this.textures.get(bgId);
    if (texture) {
      // Ensure correct mapping for skybox/HDRI
      const image = texture.image as { width: number; height: number };
      if (image && typeof image.width === "number" && typeof image.height === "number" && image.width / image.height === 2) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
      }

      this.threeScene.background = texture;
      this.threeScene.environment = texture; // Enable PBR reflections
      this.updateAllMaterials();
    } else {
      Debug.warn(LogChannel.Rendering, `Background texture not found: ${bgId}`);
    }
  }

  private syncEntity(entity: Entity) {
    // Retrieve associated Three.js object
    let object3d = entity._rendererData as THREE.Object3D;

    // If not created yet, instantiate from template
    if (!object3d) {
      if (entity.meshConfig) { // Changed from meshConfig to simpler meshId
        const template = this.models.get(entity.meshConfig.geometryId);
        if (template) {
          object3d = template.clone(); // Efficient clone

          // Apply initial settings
          object3d.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Enable shadows if needed
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.envMapIntensity = params.envMapIntensity;
              }
            }
          });

          // Bind to Entity
          entity._rendererData = object3d;
          this.threeScene.add(object3d);
        } else {
          // Prevents spamming warning every frame
          if (!entity._hasWarnedMissingMesh) {
            Debug.warn(LogChannel.Rendering, `Model template missing: ${entity.meshConfig.geometryId}`);
            entity._hasWarnedMissingMesh = true;
          }
        }
      }
    }

    if (!entity.visible) {
      if (object3d && this.threeScene.children.includes(object3d)) {
        this.threeScene.remove(object3d);
      }
      return;
    }

    // Sync Transform
    if (object3d) {
      object3d.position.fromArray(entity.position);
      object3d.quaternion.fromArray(entity.rotation);
      object3d.scale.fromArray(entity.scale);
    }
  }

  public resize(width: number, height: number) {
    if (!this.webglRenderer) return;
    this.webglRenderer.setSize(width, height);
    this.composer?.setSize(width, height);
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}