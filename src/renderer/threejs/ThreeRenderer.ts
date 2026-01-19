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
import { TrailParticleEmitter } from "../../game/effects/TrailParticleEmitter";
import { BulletLaserEmitter } from "../../game/effects/BulletLaserEmitter";
import { Debug, LogChannel } from "../../core/Debug";
import { vec3 } from "gl-matrix";
import { Ship } from "../../game/ships/Ship";
import { ThrusterFlame } from "../../game/effects/ThrusterFlame";
import { UIManager, UIElement, UISprite, UIRect, UIText } from "../../ui";

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

  // UI
  private uiScene: THREE.Scene;
  private uiCamera: THREE.OrthographicCamera;
  private uiObjects: Map<string, THREE.Object3D> = new Map();
  private uiPlaneGeometry = new THREE.PlaneGeometry(1, 1);

  // FX
  private flamePlaneGeometry = new THREE.PlaneGeometry(1, 1);
  private flameTexture?: THREE.Texture;

  constructor() {
    this.webglRenderer = null!;
    this.threeScene = null!;
    this.camera = null!;
    this.container = null!;
    this.uiScene = null!;
    this.uiCamera = null!;
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

    // UI Scene & Camera
    this.uiScene = new THREE.Scene();
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    this.uiCamera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 100);
    this.uiCamera.position.z = 10;

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

  public render(scene: Scene, uiManager?: UIManager) {
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

    // 4. Render World
    this.webglRenderer.autoClear = false;
    this.webglRenderer.clear();
    this.composer?.render();

    // 5. Render UI
    if (uiManager) {
      this.webglRenderer.clearDepth();
      this.syncUI(uiManager);
      this.webglRenderer.render(this.uiScene, this.uiCamera);
    }
  }

  private syncUI(uiManager: UIManager) {
    const visited = new Set<string>();
    const roots = uiManager.getElements();
    for (const root of roots) {
      this.syncUINode(root, this.uiScene, visited);
    }

    // Garbage Collection: Remove objects that are no longer in the UI tree
    for (const [id, obj] of this.uiObjects) {
      if (!visited.has(id)) {
        // Remove from parent
        if (obj.parent) {
          obj.parent.remove(obj);
        }
        
        // Dispose visual mesh if exists
        const visual = obj.children.find(c => c.name === "visual") as THREE.Mesh;
        if (visual) {
            visual.geometry.dispose(); // PlaneGeometry is shared, but safety check
            if (visual.material instanceof THREE.Material) {
                visual.material.dispose();
                // Dispose texture if it's a CanvasTexture (UIText)
                if ((visual.material as any).map && (visual.material as any).map.isCanvasTexture) {
                    (visual.material as any).map.dispose();
                }
            }
        }

        // Remove from map
        this.uiObjects.delete(id);
      }
    }
  }

  private syncUINode(node: UIElement, parentObj: THREE.Object3D, visited: Set<string>) {
    visited.add(node.id);

    // 1. 获取或创建 Group 容器
    let group = this.uiObjects.get(node.id) as THREE.Group;
    if (!group) {
      group = new THREE.Group();
      this.uiObjects.set(node.id, group);
      parentObj.add(group);
    }

    // 2. 处理可见性
    if (!node.visible) {
      group.visible = false;
      // Even if invisible, we keep it in visited so it's not GC'd
      // But we still need to process children if we want them to exist?
      // Actually if parent is invisible, children are invisible too.
      // But we must recurse to mark children as visited, otherwise they will be GC'd!
      // This is important: GC logic relies on recursion.
    } else {
      group.visible = true;
    }

    // 3. 更新 Group 的变换 (位置、旋转、逻辑缩放)
    group.position.set(node.position[0], node.position[1], node.zIndex);
    group.rotation.z = node.rotation;
    group.scale.set(node.scale[0], node.scale[1], 1);

    // 4. 处理视觉内容 (Mesh)
    let visual = group.children.find(c => c.name === "visual") as THREE.Mesh;
    
    // 判断是否需要 Visual
    const needsVisual = (node instanceof UISprite) || (node instanceof UIRect) || (node instanceof UIText);

    if (needsVisual) {
      if (!visual) {
        let material: THREE.Material;
        if (node instanceof UISprite || node instanceof UIText) {
          material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 1, // UIText 不需要 opacity 属性，但 UISprite 需要
            depthTest: false,
            depthWrite: false
          });
        } else { // UIRect
          material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            depthTest: false,
            depthWrite: false
          });
        }
        visual = new THREE.Mesh(this.uiPlaneGeometry, material);
        visual.name = "visual";
        group.add(visual);
      }

      // 更新 Visual 的大小 (Size)
      visual.scale.set(node.size[0], node.size[1], 1);

      // 更新 Visual 的材质属性
      const mat = visual.material as THREE.MeshBasicMaterial;
      
      if (node instanceof UISprite) {
        mat.opacity = node.opacity;
        const tex = this.textures.get(node.textureId);
        if (tex && mat.map !== tex) {
          mat.map = tex;
          mat.needsUpdate = true;
        }
        mat.color.setHex(0xffffff);
      } else if (node instanceof UIRect) {
        mat.color.setRGB(node.color[0], node.color[1], node.color[2]);
        mat.opacity = node.color[3];
        mat.map = null;
      } else if (node instanceof UIText) {
        if (node.isDirty) {
            if (mat.map) mat.map.dispose();
            const tex = new THREE.CanvasTexture(node.canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter; // 保持文字清晰
            mat.map = tex;
            mat.needsUpdate = true;
            node.isDirty = false;
        }
        mat.opacity = 1; // 确保文字不透明
        mat.color.setHex(0xffffff);
      }
    } else {
      if (visual) {
        group.remove(visual);
        (visual.material as THREE.Material).dispose();
      }
    }

    // 5. 确保层级关系正确
    if (group.parent !== parentObj) {
      parentObj.add(group);
    }

    // 6. 递归处理子节点
    for (const child of node.children) {
      this.syncUINode(child, group, visited);
    }
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

    // Handle visibility: if not visible, remove from scene and return
    if (!entity.visible) {
        if (object3d) {
            this.threeScene.remove(object3d);
            // If it's a particle emitter, we own the geometry/material and should clean it up
            if (entity instanceof TrailParticleEmitter && object3d instanceof THREE.Points) {
                object3d.geometry.dispose();
                (object3d.material as THREE.Material).dispose();
            }
        // Thruster flame owns its materials
        if (entity instanceof ThrusterFlame && object3d instanceof THREE.Group) {
          const meshes = object3d.userData?.meshes as THREE.Mesh[] | undefined;
          if (meshes) {
            for (const mesh of meshes) {
              if (mesh.material instanceof THREE.Material) {
                mesh.material.dispose();
              }
            }
          }
        }
            entity._rendererData = undefined; // Dereference
        }
        return;
    }

    // If visible but not yet created in the renderer, create it now
    if (!object3d) {
        if (entity instanceof TrailParticleEmitter) {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.PointsMaterial({
                color: 0xaaaaff,
                size: 0.08,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.6,
                sizeAttenuation: true, // Makes particles smaller further away
            });
            object3d = new THREE.Points(geometry, material);
        } else if (entity instanceof BulletLaserEmitter) {
          const geometry = new THREE.BufferGeometry();
          const material = new THREE.PointsMaterial({
            color: 0xff2222,
            size: 0.12,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            depthTest: true,
            sizeAttenuation: true,
            vertexColors: true,
          });
          (material as any).toneMapped = false;
          object3d = new THREE.Points(geometry, material);

        } else if (entity instanceof ThrusterFlame) {
          const group = new THREE.Group();
          const tex = this.getOrCreateFlameTexture();
          const material = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
          });
          // Keep flame bright under ACES tone mapping.
          (material as any).toneMapped = false;

          const meshes: THREE.Mesh[] = [];
          for (let i = 0; i < entity.engineOffsets.length; i++) {
            const mesh = new THREE.Mesh(this.flamePlaneGeometry, material.clone());
            mesh.name = `thruster_${i}`;
            group.add(mesh);
            meshes.push(mesh);
          }
          group.userData = { meshes };
          object3d = group;
        } else if (entity.meshConfig) {
            const template = this.models.get(entity.meshConfig.geometryId);
            if (template) {
                object3d = template.clone();
                object3d.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                        child.material.envMapIntensity = params.envMapIntensity;
                    }
                });
            } else {
                if (!entity._hasWarnedMissingMesh) {
                    Debug.warn(LogChannel.Rendering, `Model template missing: ${entity.meshConfig.geometryId}`);
                    entity._hasWarnedMissingMesh = true;
                }
                return; // Can't proceed without a model
            }
        } else {
            return; // Nothing to render for this entity
        }
        
        entity._rendererData = object3d;
        this.threeScene.add(object3d);
    }

    // Now, sync the created/existing object's state with the entity state
    if (entity instanceof TrailParticleEmitter) {
      const points = object3d as THREE.Points;
      const positions = new Float32Array(entity.particles.length * 3);
      
      // 如果你没有自定义 Shader，可以通过调整材质的整体透明度
      // 简单做法：根据飞船速度直接调整整个材质的透明度
      const shipSpeed = vec3.length((entity.parent as Ship).velocity);
      (points.material as THREE.PointsMaterial).opacity = Math.min(shipSpeed / 100, 1.0);
      (points.material as THREE.PointsMaterial).transparent = true;

      entity.particles.forEach((p, i) => {
          positions[i * 3 + 0] = p.position[0];
          positions[i * 3 + 1] = p.position[1];
          positions[i * 3 + 2] = p.position[2];
      });
      
      points.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      points.geometry.attributes.position.needsUpdate = true;

      // 同步位置和旋转
      object3d.position.fromArray(entity.parent!.position);
      object3d.quaternion.fromArray(entity.parent!.rotation);
    } else if (entity instanceof BulletLaserEmitter) {
      const points = object3d as THREE.Points;
      const positions = new Float32Array(entity.particles.length * 3);
      const colors = new Float32Array(entity.particles.length * 3);
      entity.particles.forEach((p, i) => {
        positions[i * 3 + 0] = p.position[0];
        positions[i * 3 + 1] = p.position[1];
        positions[i * 3 + 2] = p.position[2];
        // 用 alpha 控制红色亮度
        colors[i * 3 + 0] = 1.0 * p.alpha; // R
        colors[i * 3 + 1] = 0.0;           // G
        colors[i * 3 + 2] = 0.0;           // B
      });
      points.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      points.geometry.attributes.position.needsUpdate = true;
      points.geometry.attributes.color.needsUpdate = true;

      object3d.position.fromArray(entity.parent!.position);
      object3d.quaternion.fromArray(entity.parent!.rotation);
    } else if (entity instanceof ThrusterFlame) {
      const group = object3d as THREE.Group;
      const parentShip = entity.parent as Ship;
      if (!parentShip) return;

      // Follow ship transform.
      group.position.fromArray(parentShip.position);
      group.quaternion.fromArray(parentShip.rotation);
      group.scale.set(1, 1, 1);

      const intensity = Math.max(0, Math.min(1, entity.intensity));
      group.visible = intensity > 0.01;
      if (!group.visible) return;

      const meshes = group.userData?.meshes as THREE.Mesh[] | undefined;
      if (!meshes) return;

      const width = entity.baseWidth * (0.6 + 0.8 * intensity);
      const length = Math.max(0.2, entity.maxLength * intensity);

      // Camera position in the ship-local space (group-local).
      const invParent = group.quaternion.clone().invert();
      const cameraLocal = this.camera.position
        .clone()
        .sub(group.position)
        .applyQuaternion(invParent);

      const shipBackLocal = new THREE.Vector3(0, 0, -1);
      const shipUpLocal = new THREE.Vector3(0, 1, 0);

      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        const offset = entity.engineOffsets[i] ?? entity.engineOffsets[0];

        // Center the flame slightly behind the nozzle (along ship back axis).
        mesh.position.set(
          offset[0] + shipBackLocal.x * (length * 0.5),
          offset[1] + shipBackLocal.y * (length * 0.5),
          offset[2] + shipBackLocal.z * (length * 0.5)
        );
        mesh.scale.set(width, length, 1);

        // Oriented billboard:
        // - normal points to camera
        // - quad 'up' axis aligns with ship back direction projected onto the billboard plane
        const toCamera = cameraLocal.clone().sub(mesh.position).normalize();

        // up = project(shipBack) onto plane perpendicular to toCamera
        const up = shipBackLocal.clone().sub(toCamera.clone().multiplyScalar(shipBackLocal.dot(toCamera)));
        if (up.lengthSq() < 1e-6) {
          // Fallback when looking almost exactly along shipBack axis.
          up.copy(shipUpLocal).sub(toCamera.clone().multiplyScalar(shipUpLocal.dot(toCamera)));
        }
        up.normalize();

        const right = new THREE.Vector3().crossVectors(up, toCamera).normalize();
        // Re-orthonormalize up in case of numerical drift
        up.crossVectors(toCamera, right).normalize();

        const basis = new THREE.Matrix4().makeBasis(right, up, toCamera);
        mesh.quaternion.setFromRotationMatrix(basis);

        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15 + 0.85 * intensity;
        mat.needsUpdate = false;
      }
    } else if (object3d) { // For all other standard entities
        object3d.position.fromArray(entity.position);
        object3d.quaternion.fromArray(entity.rotation);
        object3d.scale.fromArray(entity.scale);
    }
  }

  private getOrCreateFlameTexture(): THREE.Texture {
    if (this.flameTexture) return this.flameTexture;

    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // Fallback: a 1x1 white texture
      const data = new Uint8Array([255, 255, 255, 255]);
      const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      tex.needsUpdate = true;
      this.flameTexture = tex;
      return tex;
    }

    // Radial core + soft tail gradient (top is brighter, bottom fades).
    ctx.clearRect(0, 0, size, size);

    const grad = ctx.createRadialGradient(size * 0.5, size * 0.35, 0, size * 0.5, size * 0.45, size * 0.6);
    grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
    grad.addColorStop(0.25, "rgba(120,200,255,0.9)");
    grad.addColorStop(0.6, "rgba(60,140,255,0.35)");
    grad.addColorStop(1.0, "rgba(0,0,0,0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Add a vertical fade to form a tail-like shape.
    const vgrad = ctx.createLinearGradient(0, 0, 0, size);
    vgrad.addColorStop(0.0, "rgba(255,255,255,1.0)");
    vgrad.addColorStop(0.35, "rgba(255,255,255,0.8)");
    vgrad.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = vgrad;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "source-over";

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    this.flameTexture = tex;
    return tex;
  }

  public resize(width: number, height: number) {
    if (!this.webglRenderer) return;
    this.webglRenderer.setSize(width, height);
    this.composer?.setSize(width, height);
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    if (this.uiCamera) {
      this.uiCamera.left = -width / 2;
      this.uiCamera.right = width / 2;
      this.uiCamera.top = height / 2;
      this.uiCamera.bottom = -height / 2;
      this.uiCamera.updateProjectionMatrix();
    }
  }
}