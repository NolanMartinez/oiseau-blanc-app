export interface ResizedImage {
  imageBase64: string;
  imageMimeType: string;
}

const MAX_DIMENSION = 800;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Redimensionne une image côté navigateur (canvas) et la renvoie en base64 JPEG.
// Garde le poids bas pour rester sous la limite de la requête JSON du serveur.
export async function resizeImageToBase64(file: File): Promise<ResizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image trop lourde (10 Mo maximum).');
  }

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Traitement de l'image impossible.");
  ctx.drawImage(img, 0, 0, width, height);

  const jpeg = canvas.toDataURL('image/jpeg', 0.8);
  const base64 = jpeg.split(',')[1] ?? '';
  return { imageBase64: base64, imageMimeType: 'image/jpeg' };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image invalide.'));
    img.src = src;
  });
}
