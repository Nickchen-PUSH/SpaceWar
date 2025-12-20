import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetLoader } from "../core/AssetLoader";
import { Scene } from "../scene/Scene";
import type { Renderer } from "./Renderer";
import { Entity } from "../scene/Entity";

export class ThreeRenderer implements Renderer {
  private webglRenderer: THREE.WebGLRenderer;
  private threeScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  private models: Map<string, THREE.Group> = new Map();
  private gltfLoader = new GLTFLoader();

  constructor() {}

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
    container.appendChild(this.webglRenderer.domElement);

    this.threeScene = new THREE.Scene();

    // Create camera with placeholder values. It will be fully synced from the scene's mainCamera entity.
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Reduced for more contrast
    this.threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 4); // Increased intensity for ACESFilmicToneMapping
    directionalLight.position.set(5, 10, 7.5);
    this.threeScene.add(directionalLight);
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
    this.camera.position.copy(mainCamera.position);
    this.camera.quaternion.copy(mainCamera.rotation);
    // =====================================================

    scene.entities.forEach((entity) => {
      this.syncEntity(entity);
    });

    // === Debugging Logs ===
    console.group("Renderer Debug Info");
    console.log("Renderer Camera Position:", this.camera.position);
    console.log("Renderer Camera Quaternion:", this.camera.quaternion);
    if (scene.entities.length > 0) {
      console.log("First Entity Position:", scene.entities[0].position);
    } else {
      console.log("No entities in scene.");
    }
    console.groupEnd();
    // ======================

    this.webglRenderer.render(this.threeScene, this.camera);
  }

  private syncEntity(entity: Entity) {
    let object3d = entity._rendererData as THREE.Object3D;

    if (!object3d) {
      if (entity.meshConfig) {
        const model = this.models.get(entity.meshConfig.geometryId);
        if (model) {
          object3d = model.clone();
          object3d.rotation.set(0, 0, 0); // Reset rotation from file
          entity._rendererData = object3d;
          this.threeScene.add(object3d);
        }
      }
    }
    
    if (object3d) {
      object3d.position.copy(entity.position);
      object3d.quaternion.copy(entity.rotation);
      object3d.scale.copy(entity.scale);
    }
  }

  public resize(width: number, height: number) {
    if (!this.webglRenderer) return;
    this.webglRenderer.setSize(width, height);
    // The actual camera update is now handled in the render loop
  }
}