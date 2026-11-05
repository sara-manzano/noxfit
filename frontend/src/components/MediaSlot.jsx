import { getImage, getVideo } from '../lib/media.js';
import './MediaSlot.css';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const MediaSlot = ({ name, kind, alt = '', autoPlay = false, label, className = '', fallback = null }) => {
  const video = kind === 'video' ? getVideo(name) : null;
  const image = kind === 'image' ? getImage(name) : null;
  const classes = `media-slot ${className}`.trim();

  if (video) {
    const shouldAutoPlay = autoPlay && !prefersReducedMotion();
    const startMuted = (element) => {
      if (element && shouldAutoPlay) {
        element.muted = true;
        element.play().catch(() => {});
      }
    };

    return (
      <video
        ref={startMuted}
        className={classes}
        poster={video.poster || undefined}
        autoPlay={shouldAutoPlay}
        muted={shouldAutoPlay}
        loop={shouldAutoPlay}
        controls={!shouldAutoPlay}
        playsInline
        preload="metadata"
        aria-label={alt || undefined}
      >
        {video.sources.map((source) => <source key={source.type} src={source.src} type={source.type} />)}
      </video>
    );
  }

  if (image) {
    return <img className={classes} src={image} alt={alt} loading="lazy" />;
  }

  if (fallback) {
    return fallback;
  }

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <span className={`${classes} media-slot-empty`} role="note">
      <strong>{label || (kind === 'video' ? 'Vídeo' : 'Foto')}</strong>
      <span>src/assets/media/{name}.{kind === 'video' ? 'mp4' : 'jpg'}</span>
    </span>
  );
};
