'use client';

import styles from './page.module.css';
import { PlayCanvasScene } from './components/PlayCanvasScene';
import { useState, createRef, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { AnimationInfo } from './components/types';

// ローカルファイル由来のエントリは objectUrl を持つ
interface AnimationEntry extends AnimationInfo {
  objectUrl?: string;
}

const FILE_UPLOAD_VALUE = '__file_upload__';

export default function Home() {
  const playCanvasSceneRef = createRef<PlayCanvasScene>();
  const playCanvasScene = <PlayCanvasScene ref={playCanvasSceneRef} />;

  const [animations, setAnimations] = useState<AnimationEntry[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [appliedName, setAppliedName] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初回: models-info.json からアニメーション一覧を取得
  useEffect(() => {
    (async () => {
      const res = await fetch('/threedmodels/models-info.json');
      const data = await res.json();
      setAnimations(data.animations as AnimationEntry[]);
      if ((data.animations as AnimationEntry[]).length > 0) {
        setSelectedValue(data.animations[0].name);
      }
    })();
  }, []);

  // プルダウン変更
  const onSelectChange = (e: SelectChangeEvent<string>) => {
    const val = e.target.value;
    if (val === FILE_UPLOAD_VALUE) {
      setDialogOpen(true);
      return;
    }
    setSelectedValue(val);
  };

  // アニメーション適用
  const onApply = async () => {
    const entry = animations.find((a) => a.name === selectedValue);
    if (!entry) return;

    let buf: ArrayBuffer;
    if (entry.objectUrl) {
      const res = await fetch(entry.objectUrl);
      buf = await res.arrayBuffer();
    } else {
      const res = await fetch(entry.path);
      buf = await res.arrayBuffer();
    }
    await playCanvasSceneRef?.current?.updateVrmAnimationArryaBuffer(buf);
    setAppliedName(entry.displayName);
  };

  // vrma ファイルを追加してプルダウンに反映
  const addVrmaFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.vrma')) return;
      const objectUrl = URL.createObjectURL(file);
      const displayName = file.name.replace(/\.vrma$/, '');
      const newEntry: AnimationEntry = {
        name: displayName,
        displayName,
        path: '',
        objectUrl,
      };
      setAnimations((prev) => [...prev, newEntry]);
      setSelectedValue(displayName);
      setDialogOpen(false);
    },
    [],
  );

  // ファイル input から選択
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addVrmaFile(file);
    e.target.value = '';
  };

  // ダイアログ内ドロップ
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) addVrmaFile(file);
  };

  const selectedEntry = animations.find((a) => a.name === selectedValue);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {playCanvasScene}

        {/* コントロールエリア */}
        <Box className={styles.controls}>
          {/* プルダウン */}
          <FormControl size="small" className={styles.select}>
            <InputLabel id="anim-select-label">アニメーション</InputLabel>
            <Select
              labelId="anim-select-label"
              value={selectedValue}
              label="アニメーション"
              onChange={onSelectChange}
            >
              {animations.map((anim) => (
                <MenuItem key={anim.name} value={anim.name}>
                  {anim.displayName}
                </MenuItem>
              ))}
              <MenuItem value={FILE_UPLOAD_VALUE} divider>
                <em>＋ ファイルを追加...</em>
              </MenuItem>
            </Select>
          </FormControl>

          {/* 適用ボタン */}
          <Button variant="contained" onClick={onApply} disabled={!selectedValue}>
            適用
          </Button>
        </Box>

        {/* 現在適用中のアニメーション表示 */}
        <Typography variant="body2" className={styles.appliedLabel}>
          {appliedName ? `再生中: ${appliedName}` : ''}
        </Typography>
      </main>

      <footer className={styles.footer} />

      {/* vrma ファイル追加ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>vrma ファイルを追加</DialogTitle>
        <DialogContent>
          {/* ドロップゾーン */}
          <Box
            className={`${styles.dropZone} ${dragging ? styles.dropZoneDragging : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Typography variant="body2" color="text.secondary" align="center">
              ここにドラッグ＆ドロップ
              <br />
              またはクリックしてファイルを選択
            </Typography>
            <Typography variant="caption" color="text.disabled" align="center" sx={{ display: "block", mt: 1 }}>
              .vrma ファイルのみ対応
            </Typography>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".vrma"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
