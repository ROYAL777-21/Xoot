import { importOptionalNativePlugin, isOptionalNativePlatform } from "@/lib/optional-capacitor";

type NativeCameraModule = {
  Camera?: {
    getPhoto: (options: {
      resultType: unknown;
      source: unknown;
      quality: number;
      allowEditing: boolean;
    }) => Promise<{ format?: string; webPath?: string; path?: string }>;
  };
  CameraResultType?: { Uri?: unknown };
  CameraSource?: { Prompt?: unknown };
};

type NativeFilesystemModule = {
  Filesystem?: {
    readFile: (options: { path: string }) => Promise<{ data: string | Blob }>;
  };
};

const extensionForMime = (mimeType: string) => {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
};

const fileFromBase64 = (base64: string, mimeType: string) => {
  const clean = base64.includes(",") ? base64.split(",").pop() ?? "" : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};

const selectWebImage = () =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });

export async function captureOrSelectImage(): Promise<File | null> {
  if (!isOptionalNativePlatform()) return selectWebImage();

  try {
    const [cameraModule, filesystemModule] = await Promise.all([
      importOptionalNativePlugin<NativeCameraModule>("@capacitor/camera"),
      importOptionalNativePlugin<NativeFilesystemModule>("@capacitor/filesystem"),
    ]);
    const Camera = cameraModule?.Camera;
    const CameraResultType = cameraModule?.CameraResultType;
    const CameraSource = cameraModule?.CameraSource;
    const Filesystem = filesystemModule?.Filesystem;
    if (!Camera || !CameraResultType?.Uri || !CameraSource?.Prompt || !Filesystem) return selectWebImage();

    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 80,
      allowEditing: false,
    });

    const fallbackMime = `image/${photo.format === "png" || photo.format === "webp" ? photo.format : "jpeg"}`;
    let blob: Blob | null = null;

    if (photo.webPath) {
      const response = await fetch(photo.webPath);
      blob = await response.blob();
    } else if (photo.path) {
      const read = await Filesystem.readFile({ path: photo.path });
      if (typeof read.data === "string") blob = fileFromBase64(read.data, fallbackMime);
    }

    if (!blob) return null;

    const mimeType = blob.type || fallbackMime;
    const extension = extensionForMime(mimeType);
    return new File([blob], `zoot-upload-${Date.now()}.${extension}`, { type: mimeType });
  } catch {
    return null;
  }
}
