// 定义资源类型
type AssetType = "image" | "json" | "buffer";

export class AssetLoader {
  // 资源仓库：所有加载好的东西都存在这里
  private assets: Map<string, any> = new Map();
  
  // 待加载清单
  private toLoad: { id: string; url: string; type: AssetType }[] = [];

  // 进度回调
  public onProgress: (progress: number) => void = () => {};

  /**
   * 注册资源（还不加载）
   */
  add(id: string, url: string, type: AssetType) {
    this.toLoad.push({ id, url, type });
  }

  /**
   * 获取已加载的资源
   */
  get<T>(id: string): T {
    return this.assets.get(id);
  }

  /**
   * 开始加载所有资源
   */
  async loadAll(): Promise<void> {
    const total = this.toLoad.length;
    let loaded = 0;

    const promises = this.toLoad.map(async (item) => {
      let data;
      
      try {
        if (item.type === "json") {
          const res = await fetch(item.url);
          data = await res.json();
        } else if (item.type === "image") {
          data = await this.loadImage(item.url);
        } else if (item.type === "buffer") {
          const res = await fetch(item.url);
          data = await res.arrayBuffer(); // 适用于 .glb 或 .bin
        }
        
        this.assets.set(item.id, data);
      } catch (e) {
        console.error(`Failed to load ${item.id}`, e);
      }

      loaded++;
      this.onProgress(loaded / total);
    });

    await Promise.all(promises);
    // 加载完清空队列
    this.toLoad = []; 
  }

  // 辅助：加载图片对象
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }
}