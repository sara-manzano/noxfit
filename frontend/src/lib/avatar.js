const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const AVATAR_TRANSFORMATION = 'c_fill,g_auto,w_256,h_256,f_auto,q_auto';

export const imageFileToAvatar = async (file) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen');
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('La imagen no puede superar los 5 MB');
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary no está configurado (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET)');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body
  });

  if (!response.ok) {
    throw new Error('No se pudo subir la imagen a Cloudinary');
  }

  const { secure_url: secureUrl } = await response.json();

  return secureUrl.replace('/upload/', `/upload/${AVATAR_TRANSFORMATION}/`);
};
