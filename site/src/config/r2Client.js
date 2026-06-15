const r2PublicUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;

/**
 * Returns the public URL for a file stored in Cloudflare R2.
 * @param {string} filePath - The path/key of the file in the R2 bucket.
 * @returns {string} The complete public URL to access the file.
 */
export const getR2PublicUrl = (filePath) => {
  if (!r2PublicUrl) {
    console.warn("VITE_CLOUDFLARE_R2_PUBLIC_URL is not set in .env");
    return filePath;
  }
  
  // Ensure we don't have double slashes
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  return `${r2PublicUrl}/${cleanPath}`;
};
