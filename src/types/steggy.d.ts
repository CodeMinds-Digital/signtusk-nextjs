/**
 * Type definitions for steggy
 * Steggy is a steganography library for hiding data in PNG images
 */

declare module 'steggy' {
  /**
   * Conceal data in an image using steganography
   * @param password Optional password for encryption
   * @returns A function that takes (image: Buffer, data: string | Buffer, encoding?: string) => Buffer
   */
  export function conceal(password?: string): (
    image: Buffer,
    data: string | Buffer,
    encoding?: string
  ) => Buffer;

  /**
   * Reveal data hidden in an image
   * @param password Optional password for decryption
   * @returns A function that takes (image: Buffer, encoding?: string) => string | Buffer
   */
  export function reveal(password?: string): (
    image: Buffer,
    encoding?: string
  ) => string | Buffer;
}
