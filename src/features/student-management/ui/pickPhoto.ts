/**
 * Opens the device gallery for a profile photo (S2). Kept in its own module so
 * screen tests can replace it; `expo-image-picker` is a native module.
 *
 * Per the SDK 57 docs, launching the image library needs no permission prompt
 * on Android. The square crop keeps profile photos uniform, and a quality of
 * 0.7 keeps typical phone photos well under the 5 MB upload limit.
 */
import { launchImageLibraryAsync } from "expo-image-picker";
import type { PhotoFile } from "../model/types";

/** The picked photo, or null when the user cancels. */
export async function pickPhoto(): Promise<PhotoFile | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) {
    return null;
  }
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    // A cropped photo is re-encoded as JPEG; the picker may omit its type.
    mimeType: asset.mimeType ?? "image/jpeg",
    fileSize: asset.fileSize,
  };
}
