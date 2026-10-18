import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { LiveImage } from "@/lib/live/session";
/** Normalize gallery HEIC/PNG and camera orientation, bound cost and the API payload. */
export async function prepareAiImage(
  uri: string,
  width: number,
  height: number,
): Promise<LiveImage> {
  const resize =
    width >= height
      ? { width: Math.min(width, 1024) }
      : { height: Math.min(height, 1024) };
  const result = await manipulateAsync(uri, [{ resize }], {
    compress: 0.65,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64 || result.base64.length > 2_500_000)
    throw new Error("image-too-large");
  return { data: result.base64, media_type: "image/jpeg" };
}
