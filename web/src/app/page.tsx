'use client';

import styles from './page.module.css';
import { PlayCanvasScene } from './components/PlayCanvasScene';
import { useState, createRef, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Divider,
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
import type { AnimationInfo, VrmInfo } from './components/types';

// ローカルファイル追加用の sentinel 値
const FILE_UPLOAD_VALUE = '__file_upload__';

// ローカルファイル由来は objectUrl を持つ
interface AnimationEntry extends AnimationInfo {
  objectUrl?: string;
}
interface VrmEntry extends VrmInfo {
  objectUrl?: string;
}

// ファイル追加ダイアログ（vrm / vrma 共通）
interface UploadDialogProps {
  open: boolean;
  title: string;
  accept: string;
  hint: string;
  onClose: () => void;
  onFile: (file: File) => void;
}
function UploadDialog({ open, title, accept, hint, onClose, onFile }: UploadDialogProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box
          className={`${styles.dropZone} ${dragging ? styles.dropZoneDragging : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            ここにドラッグ＆ドロップ
            <br />
            またはクリックしてファイルを選択
          </Typography>
          <Typography variant="caption" color="text.disabled" align="center" sx={{ display: 'block', mt: 1 }}>
            {hint}
          </Typography>
        </Box>
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Home() {
  const playCanvasSceneRef = createRef<PlayCanvasScene>();
  const playCanvasScene = <PlayCanvasScene ref={playCanvasSceneRef} />;

  // ── アニメーション state ──
  const [animations, setAnimations] = useState<AnimationEntry[]>([]);
  const [selectedAnim, setSelectedAnim] = useState<string>('');
  const [appliedAnimName, setAppliedAnimName] = useState<string>('');
  const [animDialogOpen, setAnimDialogOpen] = useState(false);

  // ── VRM state ──
  const [vrms, setVrms] = useState<VrmEntry[]>([]);
  const [selectedVrm, setSelectedVrm] = useState<string>('');
  const [appliedVrmName, setAppliedVrmName] = useState<string>('');
  const [vrmDialogOpen, setVrmDialogOpen] = useState(false);

  // 初回: models-info.json からアニメーション・VRM 一覧を取得
  useEffect(() => {
    (async () => {
      const res = await fetch('/threedmodels/models-info.json');
      const data = await res.json();

      const anims = data.animations as AnimationEntry[];
      setAnimations(anims);
      if (anims.length > 0) {
        setSelectedAnim(anims[0].name);
        setAppliedAnimName(anims[0].displayName);
      }

      const vrmList = data.vrms as VrmEntry[];
      setVrms(vrmList);
      if (vrmList.length > 0) {
        setSelectedVrm(vrmList[0].name);
        setAppliedVrmName(vrmList[0].name);
      }
    })();
  }, []);

  // ── アニメーション操作 ──
  const onAnimSelectChange = (e: SelectChangeEvent<string>) => {
    if (e.target.value === FILE_UPLOAD_VALUE) {
      setAnimDialogOpen(true);
      return;
    }
    setSelectedAnim(e.target.value);
  };

  const onApplyAnim = async () => {
    const entry = animations.find((a) => a.name === selectedAnim);
    if (!entry) return;
    const res = await fetch(entry.objectUrl ?? entry.path);
    const buf = await res.arrayBuffer();
    await playCanvasSceneRef?.current?.updateVrmAnimationArryaBuffer(buf);
    setAppliedAnimName(entry.displayName);
  };

  const addVrmaFile = useCallback((file: File) => {
    if (!file.name.endsWith('.vrma')) return;
    const objectUrl = URL.createObjectURL(file);
    const displayName = file.name.replace(/\.vrma$/, '');
    setAnimations((prev) => [...prev, { name: displayName, displayName, path: '', objectUrl }]);
    setSelectedAnim(displayName);
    setAnimDialogOpen(false);
  }, []);

  // ── VRM 操作 ──
  const onVrmSelectChange = (e: SelectChangeEvent<string>) => {
    if (e.target.value === FILE_UPLOAD_VALUE) {
      setVrmDialogOpen(true);
      return;
    }
    setSelectedVrm(e.target.value);
  };

  const onApplyVrm = async () => {
    const entry = vrms.find((v) => v.name === selectedVrm);
    if (!entry) return;
    const res = await fetch(entry.objectUrl ?? entry.path);
    const buf = await res.arrayBuffer();
    await playCanvasSceneRef?.current?.replaceVrmArryaBuffer(buf);
    setAppliedVrmName(entry.name);
  };

  const addVrmFile = useCallback((file: File) => {
    if (!file.name.endsWith('.vrm')) return;
    const objectUrl = URL.createObjectURL(file);
    const name = file.name.replace(/\.vrm$/, '');
    setVrms((prev) => [...prev, { name, path: '', objectUrl }]);
    setSelectedVrm(name);
    setVrmDialogOpen(false);
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {playCanvasScene}

        <Box className={styles.controlsArea}>
          {/* ── VRM セクション ── */}
          <Box className={styles.section}>
            <Typography variant="subtitle2" className={styles.sectionLabel}>
              キャラクター (VRM)
            </Typography>
            <Box className={styles.controls}>
              <FormControl size="small" className={styles.select}>
                <InputLabel id="vrm-select-label">VRM</InputLabel>
                <Select labelId="vrm-select-label" value={selectedVrm} label="VRM" onChange={onVrmSelectChange}>
                  {vrms.map((v) => (
                    <MenuItem key={v.name} value={v.name}>
                      {v.name}
                    </MenuItem>
                  ))}
                  <MenuItem value={FILE_UPLOAD_VALUE} divider>
                    <em>＋ ファイルを追加...</em>
                  </MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={onApplyVrm} disabled={!selectedVrm}>
                適用
              </Button>
            </Box>
            <Typography variant="body2" className={styles.appliedLabel}>
              {appliedVrmName ? `表示中: ${appliedVrmName}` : ''}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* ── アニメーション セクション ── */}
          <Box className={styles.section}>
            <Typography variant="subtitle2" className={styles.sectionLabel}>
              アニメーション (VRMA)
            </Typography>
            <Box className={styles.controls}>
              <FormControl size="small" className={styles.select}>
                <InputLabel id="anim-select-label">アニメーション</InputLabel>
                <Select labelId="anim-select-label" value={selectedAnim} label="アニメーション" onChange={onAnimSelectChange}>
                  {animations.map((a) => (
                    <MenuItem key={a.name} value={a.name}>
                      {a.displayName}
                    </MenuItem>
                  ))}
                  <MenuItem value={FILE_UPLOAD_VALUE} divider>
                    <em>＋ ファイルを追加...</em>
                  </MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={onApplyAnim} disabled={!selectedAnim}>
                適用
              </Button>
            </Box>
            <Typography variant="body2" className={styles.appliedLabel}>
              {appliedAnimName ? `再生中: ${appliedAnimName}` : ''}
            </Typography>
          </Box>
        </Box>
      </main>

      <footer className={styles.footer} />

      {/* VRM 追加ダイアログ */}
      <UploadDialog
        open={vrmDialogOpen}
        title="VRM ファイルを追加"
        accept=".vrm"
        hint=".vrm ファイルのみ対応"
        onClose={() => setVrmDialogOpen(false)}
        onFile={addVrmFile}
      />

      {/* VRMA 追加ダイアログ */}
      <UploadDialog
        open={animDialogOpen}
        title="VRMA ファイルを追加"
        accept=".vrma"
        hint=".vrma ファイルのみ対応"
        onClose={() => setAnimDialogOpen(false)}
        onFile={addVrmaFile}
      />
    </div>
  );
}
