import type { AssetFormat, IAsset } from "./Asset";

type LoadTask = {
  id: string;
  url: string;
  forcedFormat?: AssetFormat; // 用户可以强制指定格式 (比如 api 这种没有后缀的 url)
};

export class AssetLoader {
  // 存储加载完成的资源
  private assets: Map<string, IAsset> = new Map();
  
  // 等待加载的队列
  private queue: LoadTask[] = [];

  // 基础路径 (方便切换 CDN 或本地路径)
  private baseUrl: string = "";

  // 进度回调 (0.0 ~ 1.0)
  public onProgress: (progress: number) => void = () => {};

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * 设置基础路径
   * @param url e.g. "./assets/"
   */
  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * 注册待加载资源
   * @param id 资源唯一标识
   * @param url 文件路径
   * @param format (可选) 强制指定格式，不传则自动从后缀推断
   */
  public add(id: string, url: string, format?: AssetFormat) {
    this.queue.push({ 
      id, 
      url: this.baseUrl + url, 
      forcedFormat: format 
    });
  }

  /**
   * 获取资源 (泛型支持)
   * @example const mesh = loader.get<ArrayBuffer>("ship");
   */
  public get<T>(id: string): T | undefined {
    return this.assets.get(id)?.data;
  }

  /**
   * 获取完整的资产对象 (包含元数据)
   */
  public getAsset(id: string): IAsset | undefined {
    return this.assets.get(id);
  }

  /**
   * 获取所有资源 (供 Renderer 遍历)
   */
  public getAllAssets(): Map<string, IAsset> {
    return this.assets;
  }

  /**
   * 执行加载队列
   */
  public async loadAll(): Promise<void> {
    const total = this.queue.length;
    let loadedCount = 0;

    // 并发执行所有加载任务
    const promises = this.queue.map(async (task) => {
      try {
        // 1. 确定格式
        const format = task.forcedFormat || this.inferFormat(task.url);

        // 2. 根据格式选择加载策略
        let data: any;
        if (format === "glb" || format === "hdr" || format === "gltf") {
          // 二进制类：统一用 ArrayBuffer
          // 注意：虽然 gltf 是 json，但为了兼容 GLBParser 的设计，
          // 如果我们要处理 .bin 依赖，把它当 buffer 读在某些 parser 下也能处理，
          // 但通常 .gltf 是文本。不过既然我们决定只用 GLB，这里主要针对 glb/hdr。
          const res = await fetch(task.url);
          data = await res.arrayBuffer();
        } 
        else if (format === "json") {
          const res = await fetch(task.url);
          data = await res.json();
        } 
        else if (format === "png" || format === "jpg" || format === "jpeg") {
          // 图片类：加载为 Image 对象
          data = await this.loadImage(task.url);
        }
        else {
          // 默认当作文本或 Buffer? 这里为了安全抛错或当作 buffer
          console.warn(`[AssetLoader] Unknown format for ${task.url}, loading as buffer.`);
          const res = await fetch(task.url);
          data = await res.arrayBuffer();
        }

        // 3. 存储结果
        const asset: IAsset = {
          meta: { id: task.id, url: task.url, format },
          data
        };
        this.assets.set(task.id, asset);

      } catch (e) {
        console.error(`[AssetLoader] Failed to load ${task.id}:`, e);
      } finally {
        // 4. 更新进度
        loadedCount++;
        this.onProgress(loadedCount / total);
      }
    });

    await Promise.all(promises);
    
    // 清空队列
    this.queue = [];
  }

  // --- 辅助方法 ---

  private inferFormat(url: string): AssetFormat {
    const ext = url.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "glb": return "glb";
      case "gltf": return "gltf";
      case "hdr": return "hdr"; // 🔥 关键：hdr 被识别为独立格式
      case "png": return "png";
      case "jpg": 
      case "jpeg": return "jpg";
      case "json": return "json";
      default: return "unknown";
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // 跨域设置，这对于加载 CDN 图片非常重要
      img.crossOrigin = "Anonymous"; 
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  }

  public unload(id: string) {
    // 简单的内存释放
    this.assets.delete(id);
  }
}