import { useEffect, useRef } from "react";

const BackgroundMusic = ({ src, volume = 0.5 }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.loop = true;
      audio.play().catch((e) => {
        console.warn("Autoplay prevented:", e);
      });
    }

    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [src, volume]);

  return <audio ref={audioRef} src={src} autoPlay hidden />;
};

export default BackgroundMusic;
