
const files = import.meta.glob('../assets/media/*.{mp4,webm,jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const mediaByName = {};

for (const [path, url] of Object.entries(files)) {
  const file = path.split('/').pop();
  const dot = file.lastIndexOf('.');
  const name = file.slice(0, dot);

  mediaByName[name] = { ...mediaByName[name], [file.slice(dot + 1)]: url };
}

const VIDEO_EXTENSIONS = ['webm', 'mp4'];
const IMAGE_EXTENSIONS = ['avif', 'webp', 'jpg', 'jpeg', 'png'];

const pickFirst = (entry, extensions) => {
  const extension = extensions.find((item) => entry?.[item]);

  return extension ? entry[extension] : null;
};

export const getVideo = (name) => {
  const sources = VIDEO_EXTENSIONS
    .filter((extension) => mediaByName[name]?.[extension])
    .map((extension) => ({ type: `video/${extension}`, src: mediaByName[name][extension] }));

  return sources.length ? { sources, poster: pickFirst(mediaByName[`${name}-poster`], IMAGE_EXTENSIONS) } : null;
};

export const getImage = (name) => pickFirst(mediaByName[name], IMAGE_EXTENSIONS);

export const centerMediaName = (centerName = '') => `center-${centerName
  .toLowerCase()
  .replace(/^noxfit\s+/, '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, '-')}`;
