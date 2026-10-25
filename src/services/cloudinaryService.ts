import axios from "axios";

const cloudinaryClient = axios.create();

type CloudinaryUploadResponse = {
  secure_url?: string;
};

export async function uploadDocumentToCloudinary(
  file: File,
  onUploadProgress: (progress: number) => void,
) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await cloudinaryClient.post<CloudinaryUploadResponse>(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
      formData,
      {
        onUploadProgress: (event) => {
          if (event.total)
            onUploadProgress(
              Math.min(100, Math.round((event.loaded / event.total) * 100)),
            );
        },
      },
    );
    const secureUrl = response.data.secure_url;
    if (!secureUrl || !secureUrl.startsWith("https://")) {
      throw new Error("Cloudinary did not return a valid secure document URL.");
    }
    if (secureUrl.length > 500) {
      throw new Error(
        "Cloudinary returned a document URL longer than the 500-character limit.",
      );
    }
    onUploadProgress(100);
    return secureUrl;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData: unknown = error.response?.data;
      if (
        responseData &&
        typeof responseData === "object" &&
        "error" in responseData
      ) {
        const cloudinaryError = responseData.error;
        if (
          cloudinaryError &&
          typeof cloudinaryError === "object" &&
          "message" in cloudinaryError &&
          typeof cloudinaryError.message === "string"
        ) {
          throw new Error(
            `Cloudinary upload failed: ${cloudinaryError.message}`,
          );
        }
      }
      throw new Error(
        "Document upload failed. Check your connection and try again.",
      );
    }
    throw error;
  }
}
