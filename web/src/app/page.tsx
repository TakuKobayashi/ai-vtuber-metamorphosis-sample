'use client';

import styles from './page.module.css';
import { PlayCanvasScene } from './components/PlayCanvasScene';
import { useState, createRef, useEffect } from 'react';
import { Grid, Button } from '@mui/material';
import type { AnimationInfo } from './components/types';

export default function Home() {
  const playCanvasSceneRef = createRef<PlayCanvasScene>();
  const playCanvasScene = <PlayCanvasScene ref={playCanvasSceneRef} />;
  const [animationInfos, setAnimationInfos] = useState<AnimationInfo[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/threedmodels/models-info.json');
      const data = await res.json();
      setAnimationInfos(data.animations);
    })();
  }, []);

  const onChangeAnimation = async (animationInfo: AnimationInfo) => {
    const res = await fetch(animationInfo.path);
    const buf = await res.arrayBuffer();
    playCanvasSceneRef?.current?.updateVrmAnimationArryaBuffer(buf);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {playCanvasScene}
        <h3>押したボタンのモーションに切り替わります</h3>
        <Grid container spacing={2}>
          {animationInfos.map((animationInfo, index) => (
            <Grid key={index} size={2}>
              <Button
                variant="contained"
                style={{ textAlign: 'center' }}
                onClick={() => onChangeAnimation(animationInfo)}
              >
                {animationInfo.displayName}
              </Button>
            </Grid>
          ))}
        </Grid>
      </main>
      <footer className={styles.footer}></footer>
    </div>
  );
}
