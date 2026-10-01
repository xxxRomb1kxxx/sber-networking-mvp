import { Composition } from 'remotion';
import { Video } from './Video.jsx';
import manifest from './manifest.json';

export function Root() {
  const common = {
    component: Video,
    durationInFrames: manifest.totalFrames,
    fps: manifest.fps,
  };
  return (
    <>
      <Composition id="Sberconnect" width={1920} height={1080} {...common} />
      <Composition id="SberconnectVertical" width={1080} height={1920} {...common} />
    </>
  );
}
