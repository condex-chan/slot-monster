// tests から .mjs を import するための型宣言
export const IMAGE_EXTS: Set<string>
export const AUDIO_EXTS: Set<string>
export function imageKeyFor(relPath: string): string
export function audioKeyFor(relPath: string): string
export function scanFiles(rootDir: string, exts: Set<string>): string[]
export function buildManifest(
  imageFiles: string[],
  audioFiles: string[],
): { images: Record<string, string>; audio: Record<string, string> }
export function generate(projectRoot: string): {
  images: Record<string, string>
  audio: Record<string, string>
}
