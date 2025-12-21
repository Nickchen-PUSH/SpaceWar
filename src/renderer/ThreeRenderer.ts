import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import * as dat from "dat.gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AssetLoader } from "../core/AssetLoader";
import { Scene } from "../scene/Scene";
import type { Renderer } from "./Renderer";
import { Entity } from "../scene/Entity";
import { Debug, LogChannel } from "../core/Debug";

// --- START RENDERER PARAMS ---
const params = {
  envMapIntensity: 1.0,
  directionalLightIntensity: 4.0,
  bloomThreshold: 0,
  bloomStrength: 1.5,
  bloomRadius: 0,
};
// --- END RENDERER PARAMS ---

export class ThreeRenderer implements Renderer {
  private webglRenderer: THREE.WebGLRenderer;
  private threeScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  private models: Map<string, THREE.Group> = new Map();
  private gltfLoader = new GLTFLoader();

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

  public async initAssets(loader: AssetLoader) {
    const modelAsset = loader.get<ArrayBuffer>("spaceship");
    if (modelAsset) {
      try {
        const gltf = await this.gltfLoader.parseAsync(modelAsset, "/UltimateSpaceships/Challenger/glTF/");
        this.models.set("spaceship", gltf.scene);
      } catch (e) {
        console.error("GLTF parsing failed:", e);
      }
    }
  }

  public init(container: HTMLElement) {
    this.container = container;
    this.webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.webglRenderer.setPixelRatio(window.devicePixelRatio);
    this.webglRenderer.setSize(container.offsetWidth, container.offsetHeight);
    this.webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    // --- Shadow Setup --- // Reverted
    // this.webglRenderer.shadowMap.enabled = true; // Reverted
    // this.webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // Reverted
    // --------------------
    container.appendChild(this.webglRenderer.domElement);

    this.threeScene = new THREE.Scene();

    // Create camera with placeholder values. It will be fully synced from the scene's mainCamera entity.
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

    this.setupEnvironment();
    this.setupLighting();
    this.setupPostprocessing();
    this.setupDebugGUI();
  }

  private setupEnvironment() {
    const loader = new RGBELoader();
    loader.load('/bg/environment.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.threeScene.background = texture;
      this.threeScene.environment = texture;
      this.updateAllMaterials(); // Update materials now that the environment is loaded
    });
  }

  private setupLighting() {
    this.directionalLight = new THREE.DirectionalLight(0xffffff, params.directionalLightIntensity);
    this.directionalLight.position.set(5, 10, 7.5);
    // --- Shadow Setup --- // Reverted
    // this.directionalLight.castShadow = true; // Reverted
    // this.directionalLight.shadow.camera.top = 20; // Reverted
    // this.directionalLight.shadow.camera.bottom = -20; // Reverted
    // this.directionalLight.shadow.camera.left = -20; // Reverted
    // this.directionalLight.shadow.camera.right = 20; // Reverted
    // this.directionalLight.shadow.camera.near = 0.5; // Reverted
    // this.directionalLight.shadow.camera.far = 50; // Reverted
    // this.directionalLight.shadow.bias = params.shadowBias; // Reverted
    // --------------------
    this.threeScene.add(this.directionalLight);
  }

  private setupPostprocessing() {
    const renderPass = new RenderPass(this.threeScene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(this.container.offsetWidth, this.container.offsetHeight), 1.5, 0.4, 0.85);
    this.bloomPass.threshold = params.bloomThreshold;
    this.bloomPass.strength = params.bloomStrength;
    this.bloomPass.radius = params.bloomRadius;

    this.composer = new EffectComposer(this.webglRenderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
  }

  private setupDebugGUI() {
    const gui = new dat.GUI();
    const lighting = gui.addFolder("Lighting");
    lighting.add(params, "envMapIntensity", 0, 3).name("Env Intensity").onChange(() => this.updateAllMaterials());
    lighting.add(params, "directionalLightIntensity", 0, 10).name("Light Intensity").onChange((value) => {
      if (this.directionalLight) {
        this.directionalLight.intensity = value;
      }
    });
    // lighting.add(params, "shadowBias", -0.01, 0.01, 0.0001).name("Shadow Bias").onChange(value => { // Reverted
    //   if (this.directionalLight) { // Reverted
    //     this.directionalLight.shadow.bias = value; // Reverted
    //   } // Reverted
    // });


    const bloom = gui.addFolder("Bloom");
    bloom.add(params, "bloomThreshold", 0.0, 1.0).name("Threshold").onChange(value => this.bloomPass && (this.bloomPass.threshold = value));
    bloom.add(params, "bloomStrength", 0.0, 3.0).name("Strength").onChange(value => this.bloomPass && (this.bloomPass.strength = value));
    bloom.add(params, "bloomRadius", 0.0, 1.0).name("Radius").onChange(value => this.bloomPass && (this.bloomPass.radius = value));
  }

  public render(scene: Scene) {
    const { mainCamera } = scene;

    // === Sync Renderer Camera with Scene Camera Entity ===
    // 1. Sync projection properties
    this.camera.fov = mainCamera.fov;
    this.camera.aspect = mainCamera.aspect;
    this.camera.near = mainCamera.near;
    this.camera.far = mainCamera.far;
    this.camera.updateProjectionMatrix();

    // 2. Sync transform (position and rotation)
    this.camera.position.fromArray(mainCamera.position);
    this.camera.quaternion.fromArray(mainCamera.rotation);
    // =====================================================

    scene.entities.forEach((entity) => {
      this.syncEntity(entity);
    });

    Debug.log(LogChannel.Rendering, "Rendered a frame");
    
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
    if (updatedCount > 0) {
      Debug.log(LogChannel.Rendering, `Updated envMapIntensity for ${updatedCount} materials.`);
    }
  }

  private syncEntity(entity: Entity) {
    let object3d = entity._rendererData as THREE.Object3D;

    if (!object3d) {
      if (entity.meshConfig) {
        const model = this.models.get(entity.meshConfig.geometryId);
        if (model) {
          object3d = model.clone();
          object3d.rotation.set(0, 0, 0); // Reset rotation from file
          
          // Apply environment map settings and shadow casting to the newly cloned model
          object3d.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // child.castShadow = true; // Reverted
              // child.receiveShadow = true; // Reverted
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.envMapIntensity = params.envMapIntensity;
              }
            }
          });

          entity._rendererData = object3d;
          this.threeScene.add(object3d);
        }
      }
    }
    
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
    // The actual camera update is now handled in the render loop
  }
}