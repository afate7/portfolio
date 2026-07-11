import React from 'react';
import { Composition } from 'remotion';
import { BrandLoop } from './BrandLoop';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BrandLoop"
      component={BrandLoop}
      durationInFrames={186}
      fps={30}
      width={1080}
      height={1080}
    />
  );
};
