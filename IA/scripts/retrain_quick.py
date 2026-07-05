#!/usr/bin/env python3
"""Reentrena clasificador 3 clases y exporta a web/model/."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "dataset_final.csv"
CLASS_NAMES = ["rigido", "casual", "corporativo"]
LM = {"ls": 11, "rs": 12, "lh": 23, "rh": 24}

# Etiquetado muy permisivo — casi todo casual; rígido solo en carnet claro
RIGID_SLOPE_ELBOW = 0.020
RIGID_ELBOW = 0.09
RIGID_SLOPE = 0.014
CORP_RATIO = 1.19


def row_to_lm(row) -> np.ndarray:
    arr = np.zeros((33, 3), dtype=np.float32)
    for i in range(33):
        arr[i, 0] = row[f"x_{i}"]
        arr[i, 1] = row[f"y_{i}"]
        arr[i, 2] = row[f"z_{i}"]
    return arr


def normalize(lm: np.ndarray) -> np.ndarray | None:
    ls, rs = lm[LM["ls"], :2], lm[LM["rs"], :2]
    lh, rh = lm[LM["lh"], :2], lm[LM["rh"], :2]
    w = float(np.linalg.norm(rs - ls))
    if w < 1e-6:
        return None
    o = (lh + rh) / 2
    out = lm.copy()
    out[:, :2] = (lm[:, :2] - o) / w
    out[:, 2] = lm[:, 2] / w
    return out


def label_pose(lm: np.ndarray) -> int:
    """Etiquetado permisivo: más casual en entrenamiento → más fácil subir naturalidad."""
    ls, rs = lm[LM["ls"], :2], lm[LM["rs"], :2]
    le, re = lm[13, :2], lm[14, :2]
    ear_l, ear_r = lm[7, :2], lm[8, :2]

    slope = abs(float((rs[1] - ls[1]) / (rs[0] - ls[0] + 1e-6)))
    elbow = (float(np.linalg.norm(le - lm[23, :2])) + float(np.linalg.norm(re - lm[24, :2]))) / 2
    ratio = float(np.linalg.norm(rs - ls) / (np.linalg.norm(ear_r - ear_l) + 1e-6))

    if slope < RIGID_SLOPE_ELBOW and elbow < RIGID_ELBOW:
        return 0
    if slope < RIGID_SLOPE:
        return 0

    if ratio < CORP_RATIO:
        return 2

    return 1


def load_xy() -> tuple[np.ndarray, np.ndarray]:
    df = pd.read_csv(CSV)
    xs, ys = [], []
    for _, row in df.iterrows():
        lm = normalize(row_to_lm(row))
        if lm is None:
            continue
        feat = lm[:, :3].flatten()
        xs.append(feat)
        ys.append(label_pose(lm))
    return np.vstack(xs).astype(np.float32), np.array(ys, dtype=np.int32)


def export_tfjs(model: MLPClassifier, scaler: StandardScaler, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    weights = {
        "scaler_mean": scaler.mean_.astype(np.float32).tolist(),
        "scaler_scale": scaler.scale_.astype(np.float32).tolist(),
        "class_names": CLASS_NAMES,
        "n_outputs": int(model.coefs_[-1].shape[1]),
        "layers": [
            {"kernel": w.astype(np.float32).tolist(), "bias": b.astype(np.float32).tolist()}
            for w, b in zip(model.coefs_, model.intercepts_)
        ],
    }
    with open(out_dir / "weights.json", "w", encoding="utf-8") as f:
        json.dump(weights, f)
    with open(out_dir / "class_names.json", "w", encoding="utf-8") as f:
        json.dump(CLASS_NAMES, f)


def main() -> None:
    X, y = load_xy()
    print(f"Muestras: {len(y)} | distribución: {dict(zip(*np.unique(y, return_counts=True)))}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    clf = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        max_iter=300,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.15,
    )
    clf.fit(X_train, y_train, sample_weight=compute_sample_weight("balanced", y_train))
    print(f"Clases entrenadas: {clf.classes_}")
    print(f"Capa final: {clf.coefs_[-1].shape}")
    print(f"Accuracy test: {clf.score(X_test, y_test):.1%}")

    out = ROOT / "output" / "model"
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "scaler": scaler, "class_names": CLASS_NAMES}, out / "pose_model.joblib")

    tfjs = out / "tfjs"
    export_tfjs(clf, scaler, tfjs)
    web = ROOT / "web" / "model"
    web.mkdir(parents=True, exist_ok=True)
    for name in ("weights.json", "class_names.json"):
        shutil.copy2(tfjs / name, web / name)
    print(f"Exportado: {web / 'weights.json'}")


if __name__ == "__main__":
    main()
