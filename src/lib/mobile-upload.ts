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
  CameraSource?: { Prompt?: unknown; Camera?: unknown };
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

/**
 * ── Why `capture` and not just `accept` ─────────────────────────────────────────
 * A bare `<input type="file" accept="image/*">` opens the device's FILE PICKER on Android and
 * iOS — exactly the bug the founder reported on the selfie button. Adding the `capture`
 * attribute tells a mobile browser to open a camera capture surface directly instead; desktop
 * browsers ignore it and still show a file chooser, which is the right behaviour there.
 *
 * `capture="user"` selects the FRONT camera, because the KYC selfie is a portrait of the
 * applicant holding their ID, not a rear-camera document shot.
 */
const selectWebImage = (mode: "camera" | "picker") =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (mode === "camera") input.capture = "user";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });

/**
 * Capture an image for KYC upload.
 *
 * `source: "camera"` (the default) MUST activate the device camera:
 *   - native shell → `CameraSource.Camera`, no prompt, no gallery
 *   - mobile browser → `capture="user"` input, front camera
 *   - desktop browser → file chooser (a desktop has no camera expectation; the attribute is ignored)
 *
 * `source: "picker"` keeps the previous behaviour for surfaces where choosing an existing photo
 * is the point.
 */
export async function captureOrSelectImage(source: "camera" | "picker" = "camera"): Promise<File | null> {
  if (!isOptionalNativePlatform()) return selectWebImage(source);

  try {
    const [cameraModule, filesystemModule] = await Promise.all([
      importOptionalNativePlugin<NativeCameraModule>("@capacitor/camera"),
      importOptionalNativePlugin<NativeFilesystemModule>("@capacitor/filesystem"),
    ]);
    const Camera = cameraModule?.Camera;
    const CameraResultType = cameraModule?.CameraResultType;
    const CameraSource = cameraModule?.CameraSource;
    const Filesystem = filesystemModule?.Filesystem;
    if (!Camera || !CameraResultType?.Uri || !CameraSource || !Filesystem) return selectWebImage(source);

    // `CameraSource.Prompt` opens a chooser; `CameraSource.Camera` goes straight to the lens.
    const resolvedSource =
      source === "camera" ? CameraSource.Camera ?? CameraSource.Prompt : CameraSource.Prompt;
    if (!resolvedSource) return selectWebImage(source);

    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: resolvedSource,
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
    return new File([blob], `xoot-upload-${Date.now()}.${extension}`, { type: mimeType });
  } catch {
    return null;
  }
}
