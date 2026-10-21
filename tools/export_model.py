#!/usr/bin/env python3
"""Exporteer het getrainde model naar js/model.js (client-side inferentie).

Loop vanuit de backend-venv (sklearn + joblib nodig):
    <backend>/.venv/bin/python tools/export_model.py <backend>/data/model.joblib

Het model is CalibratedClassifierCV(method="sigmoid") over
StandardScaler + LogisticRegression; per fold exporteren we scaler,
coëfficiënten en de sigmoid-calibratie (a, b). js/engine.js middelt de folds,
precies zoals sklearn's predict_proba.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

import joblib

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT = Path(__file__).resolve().parents[1] / "js" / "model.js"


def main(model_path: Path) -> None:
    m = joblib.load(model_path)
    cal = m["pipeline"]
    if getattr(cal, "method", None) != "sigmoid":
        raise SystemExit("Alleen sigmoid-gekalibreerde modellen worden ondersteund")
    folds = []
    for cc in cal.calibrated_classifiers_:
        pipe = cc.estimator
        sc, lr = pipe.named_steps["scaler"], pipe.named_steps["clf"]
        c = cc.calibrators[0]
        folds.append({
            "mean": [round(float(x), 6) for x in sc.mean_],
            "scale": [round(float(x), 6) for x in sc.scale_],
            "coef": [round(float(x), 6) for x in lr.coef_[0]],
            "intercept": round(float(lr.intercept_[0]), 6),
            "a": round(float(c.a_), 6),
            "b": round(float(c.b_), 6),
        })
    spec = {
        "features": m["features"],
        "folds": folds,
        "thresholds": m["risk_thresholds"],
        "baseline": m["baseline_rate"],
        "stats": {k: round(v, 4) if isinstance(v, float) else v for k, v in m["stats"].items()},
    }
    OUT.write_text(
        "// Gegenereerd uit voetbal-voorspel-model/data/model.joblib (model v2).\n"
        "// CalibratedClassifierCV(sigmoid, 5 folds) over StandardScaler + LogisticRegression.\n"
        "// Opnieuw exporteren na hertrainen: zie tools/export_model.py.\n"
        f"export const MODEL = {json.dumps(spec, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    log.info("%s geschreven (%d folds, %d features)", OUT, len(folds), len(spec["features"]))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Gebruik: export_model.py <pad/naar/model.joblib>")
    main(Path(sys.argv[1]))
