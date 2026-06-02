/**
 * Compresses an image file using Canvas API.
 * @param {File} file - The original image file.
 * @param {Object} options - Compression options.
 * @returns {Promise<Blob>} - The compressed image as a Blob.
 */
export async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas to Blob conversion failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export async function uploadImageToImgBB(
  file,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
  } = {}
) {
  if (!file) {
    throw new Error("Please choose an image to upload.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const compressedBlob = await compressImage(file, {
    maxWidth,
    maxHeight,
    quality,
  });

  const formData = new FormData();
  formData.append("image", compressedBlob);

  const apiKey = import.meta.env.VITE_IMGBB_API_KEY || "137614336ce818edd585fb7df6650421";
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (result.success) {
    return result.data.url;
  }

  throw new Error(result.error?.message || "ImgBB upload failed.");
}
