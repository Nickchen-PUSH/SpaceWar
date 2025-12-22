// 支持的文件格式
// glb: 二进制模型 (ArrayBuffer)
// hdr: 高动态范围贴图 (ArrayBuffer)
// png/jpg: 普通贴图 (HTMLImageElement)
// json: 配置文件 (Object)
export type AssetFormat = "glb" | "gltf" | "hdr" | "png" | "jpg" | "jpeg" | "json" | "unknown";

// 资产的元数据
export interface AssetMeta {
  id: string;
  url: string;
  format: AssetFormat;
}

// 统一的资产容器
export interface IAsset {
  meta: AssetMeta;
  // data 的类型取决于 format:
  // - glb/hdr -> ArrayBuffer
  // - png/jpg -> HTMLImageElement
  // - json    -> any
  data: any; 
}