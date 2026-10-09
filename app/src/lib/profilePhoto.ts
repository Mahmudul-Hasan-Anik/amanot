import { Platform } from 'react-native';
import { File } from 'expo-file-system';

export const MAX_PROFILE_PHOTO_BYTES = 120 * 1024;

/** Check the actual bytes, including when the picker does not report fileSize. */
export async function readProfilePhoto(uri: string) {
  const bytes = Platform.OS === 'web'
    ? new Uint8Array(await (await fetch(uri)).arrayBuffer())
    : await new File(uri).bytes();
  if (!bytes.byteLength || bytes.byteLength > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error('Profile photo must be at most 120 KB / প্রোফাইল ছবি সর্বোচ্চ ১২০ KB হতে পারবে।');
  }
  let extension: 'jpg' | 'png' | 'webp';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) extension = 'jpg';
  else if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) extension = 'png';
  else if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') extension = 'webp';
  else throw new Error('Choose a JPEG, PNG or WebP photo / JPEG, PNG অথবা WebP ছবি নির্বাচন করুন।');
  return { bytes, extension, contentType: extension === 'jpg' ? 'image/jpeg' : `image/${extension}` };
}
