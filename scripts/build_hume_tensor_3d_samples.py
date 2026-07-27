#!/usr/bin/env python3
"""
Build a 3D visualization payload from local Hume AI CSV artifacts.

The model is intentionally close to the existing WordNode/WordLink shape:

  manifests/hume-tensor-3d-samples.json
  docs/hume-tensor-3d-samples.md

Only materialized CSV files are used. git-annex pointer files are skipped.
"""

from __future__ import annotations

import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np


ROOT = Path("dataset/participants")
JSON_OUT = Path("manifests/hume-tensor-3d-samples.json")
MD_OUT = Path("docs/hume-tensor-3d-samples.md")

MODALITIES = ["language", "prosody", "face", "burst"]
BIN_SECONDS = 10.0
EMOTION_ANCHOR_COUNT = 12
WORD_ANCHOR_COUNT = 80
WORD_DISTANCE_K = 3
SAME_WORD_K = 1

NON_FEATURE_COLUMNS = {
    "BeginTime",
    "EndTime",
    "BeginPosition",
    "EndPosition",
    "Time",
    "Frame",
    "Probability",
    "Confidence",
    "SpeakerConfidence",
    "Sentiment",
    "SentimentScore",
    "Text",
    "Speaker",
    "Channel",
    "Id",
    "file",
    "file_id",
}

MODALITY_COLORS = {
    "language": "#7c3aed",
    "prosody": "#0ea5e9",
    "face": "#f97316",
    "burst": "#22c55e",
}


def is_materialized(path: Path) -> bool:
    try:
        return not path.read_text(errors="ignore", encoding="utf-8").startswith("/annex")
    except Exception:
        return False


def hume_csv_files() -> list[Path]:
    return sorted(
        f
        for f in ROOT.rglob("*.csv")
        if "/csv/" in str(f) and f.stem in MODALITIES and is_materialized(f)
    )


def participant_id(path: Path) -> str:
    parts = path.parts
    return parts[parts.index("participants") + 1]


def registry_id(path: Path) -> str:
    return next((p for p in path.parts if p.startswith("registry_file-")), "unknown")


def is_emotion_column(column: str) -> bool:
    if column in NON_FEATURE_COLUMNS:
        return False
    if column.startswith("AU"):
        return False
    if column.startswith("Face"):
        return False
    if column.isdigit():
        return False
    return any(char.isalpha() for char in column)


def collect_common_emotions(files: list[Path]) -> list[str]:
    cols_by_modality: dict[str, set[str]] = defaultdict(set)
    for path in files:
        with path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for column in reader.fieldnames or []:
                if is_emotion_column(column):
                    cols_by_modality[path.stem].add(column)

    base_modalities = [m for m in ("language", "prosody", "face") if cols_by_modality[m]]
    if not base_modalities:
        return []

    common = set(cols_by_modality[base_modalities[0]])
    for modality in base_modalities[1:]:
        common &= cols_by_modality[modality]
    return sorted(common)


def row_time(row: dict[str, str], fallback_index: int) -> float:
    for column in ("BeginTime", "Time", "EndTime"):
        try:
            value = float(row.get(column, "") or "")
            if math.isfinite(value):
                return value
        except ValueError:
            pass
    return float(fallback_index)


Unit = tuple[str, str, int]


def session_data_path(pid: str) -> Path:
    return ROOT / pid / "session_data.json"


def load_json(path: Path) -> Any | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except FileNotFoundError:
        return None
    if not text.strip().startswith("{"):
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def load_session_word_windows() -> dict[str, list[dict[str, Any]]]:
    sessions_by_participant: dict[str, list[dict[str, Any]]] = {}

    for path in sorted(ROOT.glob("*/session_data.json")):
        pid = path.parent.name
        payload = load_json(path)
        if not isinstance(payload, dict):
            continue

        events = sorted(payload.get("events", []), key=lambda event: event.get("timestamp", 0))
        starts: dict[int, int] = {}
        for event in events:
            if event.get("type") not in {"recording_started", "session_started"}:
                continue
            session_number = event.get("payload", {}).get("session")
            timestamp = event.get("timestamp")
            if isinstance(session_number, int) and isinstance(timestamp, int):
                starts[session_number] = min(starts.get(session_number, timestamp), timestamp)

        sessions = [
            {"sessionNumber": number, "startMs": start_ms, "words": []}
            for number, start_ms in sorted(starts.items(), key=lambda item: item[1])
        ]
        if not sessions:
            continue

        current: dict[str, Any] | None = None
        for event in events:
            event_type = event.get("type")
            timestamp = event.get("timestamp")
            if not isinstance(timestamp, int):
                continue
            payload = event.get("payload", {})
            if event_type == "word_displayed":
                if current:
                    current["endMs"] = min(timestamp, current["startMs"] + 6500)
                    add_word_window(sessions, current)
                word = str(payload.get("word") or "").strip()
                current = {"word": word, "startMs": timestamp, "endMs": timestamp + 6000}
            elif event_type == "response_window_closed" and current:
                word = str(payload.get("word") or "").strip()
                if not word or word == current["word"]:
                    current["endMs"] = max(timestamp, current["startMs"] + 1)
                    add_word_window(sessions, current)
                    current = None
        if current:
            add_word_window(sessions, current)

        sessions_by_participant[pid] = sessions

    return sessions_by_participant


def add_word_window(sessions: list[dict[str, Any]], window: dict[str, Any]) -> None:
    if not window.get("word"):
        return
    session = max(
        (item for item in sessions if item["startMs"] <= window["startMs"]),
        key=lambda item: item["startMs"],
        default=None,
    )
    if session is None:
        session = sessions[0]
    session["words"].append(window.copy())


def registry_order(files: list[Path]) -> dict[tuple[str, str], int]:
    registries_by_participant: dict[str, set[str]] = defaultdict(set)
    for path in files:
        registries_by_participant[participant_id(path)].add(registry_id(path))
    order: dict[tuple[str, str], int] = {}
    for pid, registries in registries_by_participant.items():
        for index, registry in enumerate(sorted(registries, key=registry_sort_key)):
            order[(pid, registry)] = index
    return order


def registry_sort_key(registry: str) -> tuple[int, str]:
    try:
        return int(registry.split("-", 2)[1]), registry
    except (IndexError, ValueError):
        return 10_000, registry


def build_timebin_tensors(
    files: list[Path],
    emotions: list[str],
) -> tuple[dict[Unit, np.ndarray], dict[Unit, Any], dict[Unit, dict[str, int]]]:
    sums: dict[Unit, dict[str, np.ndarray]] = defaultdict(
        lambda: defaultdict(lambda: np.zeros(len(emotions), dtype=float))
    )
    counts: dict[Unit, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    metadata: dict[Unit, Any] = defaultdict(
        lambda: {
            "rowCounts": {},
            "topEmotionByModality": {},
            "participantId": "",
            "sessionLikeId": "",
            "timeBin": 0,
            "timeRange": [0.0, 0.0],
        }
    )
    text_counts: dict[Unit, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for path in files:
        pid = participant_id(path)
        sid = registry_id(path)
        modality = path.stem

        with path.open(newline="", encoding="utf-8") as handle:
            for row_index, row in enumerate(csv.DictReader(handle)):
                time_value = row_time(row, row_index)
                bin_index = int(max(0, math.floor(time_value / BIN_SECONDS)))
                unit: Unit = (pid, sid, bin_index)
                metadata[unit]["participantId"] = pid
                metadata[unit]["sessionLikeId"] = sid
                metadata[unit]["timeBin"] = bin_index
                metadata[unit]["timeRange"] = [bin_index * BIN_SECONDS, (bin_index + 1) * BIN_SECONDS]

                for index, emotion in enumerate(emotions):
                    try:
                        value = float(row.get(emotion, "") or 0)
                    except ValueError:
                        value = 0.0
                    sums[unit][modality][index] += value
                counts[unit][modality] += 1
                if modality == "language":
                    text = (row.get("Text") or "").strip()
                    if text:
                        for token in tokenize_text(text):
                            text_counts[unit][token] += 1

    tensors: dict[Unit, np.ndarray] = {}
    for unit in sorted(sums):
        tensor = np.zeros((len(MODALITIES), len(emotions)), dtype=float)
        for m_index, modality in enumerate(MODALITIES):
            count = counts[unit].get(modality, 0)
            metadata[unit]["rowCounts"][modality] = count
            if count:
                tensor[m_index] = sums[unit][modality] / count
                top_index = int(np.argmax(tensor[m_index]))
                metadata[unit]["topEmotionByModality"][modality] = {
                    "emotion": emotions[top_index],
                    "score": float(tensor[m_index][top_index]),
                }
        tensors[unit] = tensor

    return tensors, metadata, text_counts


def align_words_to_timebins(
    units: list[Unit],
    registry_indices: dict[tuple[str, str], int],
    sessions_by_participant: dict[str, list[dict[str, Any]]],
    fallback_text_counts: dict[Unit, dict[str, int]],
) -> tuple[dict[Unit, dict[str, float]], dict[str, int]]:
    aligned: dict[Unit, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    stats = {"aligned": 0, "fallback": 0, "unmapped": 0}

    for unit in units:
        pid, registry, _ = unit
        sessions = sessions_by_participant.get(pid, [])
        session_index = registry_indices.get((pid, registry), 0)
        if session_index >= len(sessions):
            stats["unmapped"] += 1
            aligned[unit].update({word: float(count) for word, count in fallback_text_counts.get(unit, {}).items()})
            continue

        session = sessions[session_index]
        start_ms = session["startMs"] + int(unit[2] * BIN_SECONDS * 1000)
        end_ms = session["startMs"] + int((unit[2] + 1) * BIN_SECONDS * 1000)
        for window in session["words"]:
            overlap = max(0, min(end_ms, window["endMs"]) - max(start_ms, window["startMs"]))
            if overlap:
                aligned[unit][window["word"]] += overlap / 1000.0

        if aligned[unit]:
            stats["aligned"] += 1
        else:
            fallback = fallback_text_counts.get(unit, {})
            if fallback:
                stats["fallback"] += 1
                aligned[unit].update({word: float(count) for word, count in fallback.items()})

    return aligned, stats


def tokenize_text(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) == 1 and not text.isascii():
        return [text]
    normalized = "".join(char.lower() if char.isalnum() else " " for char in text)
    tokens = []
    for token in normalized.split():
        if len(token) >= 2:
            tokens.append(token)
        elif token and not token.isascii():
            tokens.append(token)
    return tokens[:24]


def pca_3d(matrix: np.ndarray) -> tuple[np.ndarray, list[float]]:
    centered = matrix - matrix.mean(axis=0, keepdims=True)
    std = centered.std(axis=0, keepdims=True)
    normalized = centered / np.where(std == 0, 1, std)
    _, singular_values, vt = np.linalg.svd(normalized, full_matrices=False)
    coords = normalized @ vt[:3].T
    if coords.shape[1] < 3:
        coords = np.pad(coords, ((0, 0), (0, 3 - coords.shape[1])))
    max_abs = float(np.max(np.abs(coords))) or 1.0
    coords = coords / max_abs * 180.0
    variance = (singular_values**2) / max(1, len(matrix) - 1)
    explained = variance / variance.sum() if variance.sum() else variance
    return coords[:, :3], [float(x) for x in explained[:3]]


def classical_mds_3d(distances: np.ndarray) -> tuple[np.ndarray, list[float]]:
    n = distances.shape[0]
    if n == 0:
        return np.zeros((0, 3)), []
    squared = distances**2
    identity = np.eye(n)
    centering = identity - np.ones((n, n)) / n
    gram = -0.5 * centering @ squared @ centering
    values, vectors = np.linalg.eigh(gram)
    order = np.argsort(values)[::-1]
    values = values[order]
    vectors = vectors[:, order]
    positive = np.maximum(values[:3], 0)
    coords = vectors[:, :3] * np.sqrt(positive)
    if coords.shape[1] < 3:
        coords = np.pad(coords, ((0, 0), (0, 3 - coords.shape[1])))
    max_abs = float(np.max(np.abs(coords))) or 1.0
    coords = coords / max_abs * 210.0
    explained_base = values[values > 0].sum()
    explained = [float(v / explained_base) for v in positive] if explained_base else [0.0, 0.0, 0.0]
    return coords[:, :3], explained


def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 1.0
    return float(1.0 - np.dot(a, b) / denom)


def node_color(tensor: np.ndarray) -> str:
    totals = tensor.sum(axis=1)
    if float(totals.sum()) == 0:
        return "#94a3b8"
    return MODALITY_COLORS[MODALITIES[int(np.argmax(totals))]]


WordKey = tuple[str, str]


def build_word_response_signatures(
    tensors: dict[Unit, np.ndarray],
    word_counts: dict[Unit, dict[str, float]],
    emotions: list[str],
) -> tuple[dict[WordKey, np.ndarray], dict[WordKey, Any]]:
    session_baselines: dict[tuple[str, str], np.ndarray] = {}
    for unit, tensor in tensors.items():
        session_baselines.setdefault((unit[0], unit[1]), np.zeros_like(tensor))
    session_counts: dict[tuple[str, str], int] = defaultdict(int)
    for unit, tensor in tensors.items():
        key = (unit[0], unit[1])
        session_baselines[key] += tensor
        session_counts[key] += 1
    for key, total in session_baselines.items():
        session_baselines[key] = total / max(1, session_counts[key])

    sums: dict[WordKey, np.ndarray] = {}
    raw_sums: dict[WordKey, np.ndarray] = {}
    weights: dict[WordKey, float] = defaultdict(float)
    bins: dict[WordKey, list[dict[str, Any]]] = defaultdict(list)

    for unit, words in word_counts.items():
        tensor = tensors[unit]
        delta = tensor - session_baselines[(unit[0], unit[1])]
        for word, overlap in words.items():
            if overlap <= 0:
                continue
            key = (unit[0], word)
            sums.setdefault(key, np.zeros_like(delta))
            raw_sums.setdefault(key, np.zeros_like(tensor))
            sums[key] += delta * overlap
            raw_sums[key] += tensor * overlap
            weights[key] += overlap
            bins[key].append({"sessionLikeId": unit[1], "timeBin": unit[2], "overlapSeconds": float(overlap)})

    signatures: dict[WordKey, np.ndarray] = {}
    metadata: dict[WordKey, Any] = {}
    for key, total in sums.items():
        weight = max(weights[key], 1e-9)
        signature = total / weight
        raw = raw_sums[key] / weight
        mean_emotion = raw.mean(axis=0)
        top_indices = np.argsort(mean_emotion)[-8:][::-1]
        emotion = {emotions[i]: float(mean_emotion[i]) for i in top_indices if mean_emotion[i] > 0}
        signatures[key] = signature
        metadata[key] = {
            "participantId": key[0],
            "word": key[1],
            "overlapSeconds": float(weights[key]),
            "binCount": len(bins[key]),
            "bins": sorted(bins[key], key=lambda item: (registry_sort_key(item["sessionLikeId"]), item["timeBin"]))[:8],
            "emotion": emotion,
            "responseEnergy": float(np.linalg.norm(signature)),
            "color": node_color(np.abs(signature)),
        }

    return signatures, metadata


def build_word_distance_graph(
    tensors: dict[Unit, np.ndarray],
    word_counts: dict[Unit, dict[str, float]],
    alignment_stats: dict[str, int],
    emotions: list[str],
) -> dict[str, Any]:
    signatures, metadata = build_word_response_signatures(tensors, word_counts, emotions)
    keys = sorted(signatures)
    vectors = np.array([signatures[key].reshape(-1) for key in keys])
    distances = np.zeros((len(keys), len(keys)), dtype=float)
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            distance = cosine_distance(vectors[i], vectors[j])
            distances[i, j] = distance
            distances[j, i] = distance
    coords, explained = classical_mds_3d(distances)
    group_sums: dict[str, np.ndarray] = {}
    group_counts: dict[str, int] = defaultdict(int)
    for key in keys:
        group_sums.setdefault(key[1], np.zeros_like(signatures[key]))
        group_sums[key[1]] += signatures[key]
        group_counts[key[1]] += 1
    group_means = {word: total / max(1, group_counts[word]) for word, total in group_sums.items()}

    energies = np.array([metadata[key]["responseEnergy"] for key in keys], dtype=float)
    residuals = np.array([float(np.linalg.norm(signatures[key] - group_means[key[1]])) for key in keys], dtype=float)
    boundary_raw = np.zeros(len(keys), dtype=float)
    isolation_raw = np.zeros(len(keys), dtype=float)
    for i, key in enumerate(keys):
        neighbors = [
            j for _, j in sorted(
                (distances[i, j], j)
                for j, other in enumerate(keys)
                if i != j and other[0] == key[0]
            )[:8]
        ]
        if neighbors:
            local_gradient = float(np.mean(np.abs(energies[i] - energies[neighbors])))
            local_isolation = float(np.mean([distances[i, j] for j in neighbors]))
            isolation_raw[i] = local_isolation
            boundary_raw[i] = local_gradient + 0.35 * local_isolation
    energy_norm = normalize_values(energies)
    residual_norm = normalize_values(residuals)
    boundary_norm = normalize_values(boundary_raw)
    isolation_norm = normalize_values(isolation_raw)
    void_norm = normalize_values(isolation_norm * (1.0 - energy_norm))
    physics = compute_physics_layers(distances, energy_norm, boundary_norm, residual_norm, isolation_norm)
    coords[:, 2] = coords[:, 2] * 0.35 + (energy_norm - 0.5) * 240.0

    nodes = []
    key_to_node_index: dict[WordKey, int] = {}
    for index, key in enumerate(keys):
        meta = metadata[key]
        color = residual_color(residual_norm[index], meta["color"])
        key_to_node_index[key] = len(nodes)
        nodes.append(
            {
                "id": f"word-response:{key[0]}:{key[1]}",
                "label": key[1],
                "participantId": key[0],
                "word": key[1],
                "nodeType": "physiological_word_signature",
                "scale": 0.75 + min(2.6, 0.6 + energy_norm[index] * 2.0),
                "initial": [float(x) for x in coords[index]],
                "color": color,
                "modalityColor": meta["color"],
                "emotion": meta["emotion"],
                "responseEnergy": meta["responseEnergy"],
                "fieldValue": float(energy_norm[index]),
                "boundaryScore": float(boundary_norm[index]),
                "isolationScore": float(isolation_norm[index]),
                "residualScore": float(residual_norm[index]),
                "residualEnergy": float(residuals[index]),
                "voidScore": float(void_norm[index]),
                "physics": {name: float(values[index]) for name, values in physics.items()},
                "overlapSeconds": meta["overlapSeconds"],
                "binCount": meta["binCount"],
                "alignedWords": [{"word": key[1], "overlapSeconds": meta["overlapSeconds"]}],
                "sourceBins": meta["bins"],
                "tensorShape": [len(MODALITIES), len(emotions)],
            }
        )
    for index in sorted(range(len(nodes)), key=lambda item: nodes[item]["responseEnergy"], reverse=True)[:45]:
        nodes[index]["showLabel"] = True
    for index in sorted(range(len(nodes)), key=lambda item: nodes[item]["boundaryScore"], reverse=True)[:70]:
        nodes[index]["boundary"] = True
    for index in sorted(range(len(nodes)), key=lambda item: nodes[item]["boundaryScore"], reverse=True)[:42]:
        nodes[index]["membrane"] = True
        nodes[index]["collectiveMembrane"] = True
        nodes[index]["membraneType"] = "collective_response_membrane"

    indices_by_participant: dict[str, list[int]] = defaultdict(list)
    for index, node in enumerate(nodes):
        indices_by_participant[node["participantId"]].append(index)
    for indices in indices_by_participant.values():
        for index in sorted(indices, key=lambda item: nodes[item]["boundaryScore"], reverse=True)[:12]:
            nodes[index]["membrane"] = True
            nodes[index]["personalMembrane"] = True
            if not nodes[index].get("membraneType"):
                nodes[index]["membraneType"] = "personal_response_membrane"
    for index in sorted(
        range(len(nodes)),
        key=lambda item: nodes[item]["boundaryScore"] * nodes[item]["residualScore"],
        reverse=True,
    )[:24]:
        nodes[index]["wall"] = True

    void_indices = sorted(range(len(nodes)), key=lambda item: nodes[item]["voidScore"], reverse=True)[:14]
    for offset, source_index in enumerate(void_indices):
        source = nodes[source_index]
        x, y, z = source["initial"]
        nodes.append(
            {
                "id": f"void:{offset}:{source['participantId']}:{source['word']}",
                "label": "void",
                "participantId": source["participantId"],
                "word": source["word"],
                "nodeType": "void_region",
                "scale": 1.2 + source["voidScore"] * 1.8,
                "initial": [x * 1.04, y * 1.04, z - 46.0],
                "color": "#0f766e",
                "emotion": {},
                "fieldValue": 0.0,
                "boundaryScore": source["boundaryScore"],
                "residualScore": source["residualScore"],
                "voidScore": source["voidScore"],
                "sourceNode": source["id"],
            }
        )

    links = []
    seen: set[tuple[int, int]] = set()
    for i, key in enumerate(keys):
        same_participant = [
            (distances[i, j], j)
            for j, other in enumerate(keys)
            if i != j and other[0] == key[0]
        ]
        for distance, j in sorted(same_participant)[:WORD_DISTANCE_K]:
            add_distance_link(links, seen, i, j, distance, "body_distance")

        same_word = [
            (distances[i, j], j)
            for j, other in enumerate(keys)
            if i != j and other[1] == key[1] and other[0] != key[0]
        ]
        for distance, j in sorted(same_word)[:SAME_WORD_K]:
            add_distance_link(links, seen, i, j, distance, "same_stimulus")

    for indices in indices_by_participant.values():
        ordered = sorted(indices, key=lambda item: node_time_sort_key(nodes[item]))
        for source, target in zip(ordered, ordered[1:]):
            add_distance_link(links, seen, source, target, distances[source, target], "time_trace")

    relational_membranes = build_relational_membranes(
        keys,
        nodes,
        key_to_node_index,
        distances,
        energies,
        residuals,
    )
    for membrane in relational_membranes:
        for node_index in membrane["nodeIndices"]:
            nodes[node_index].setdefault("relationalMembranes", []).append(membrane["id"])

    pair_distances = distances[np.triu_indices(len(keys), k=1)] if len(keys) > 1 else np.array([])
    unique_words = len({key[1] for key in keys})
    participants = len({key[0] for key in keys})
    return {
        "model": "physiological_word_response_distance_v1",
        "title": "Physiological Word Distance",
        "description": "Stimulus words are embedded by non-voluntary Hume response signatures. Field height is response energy, boundary is local response-gradient/isolation, residual is deviation from the group mean for the same stimulus, and time traces follow stimulus order.",
        "axes": {
            "sample": "participant/stimulus word response signature",
            "modality": MODALITIES,
            "feature": emotions,
            "projection": "classical MDS over physiological response distance",
            "distance": "cosine distance over baseline-corrected modality x emotion response signature",
            "field": "normalized baseline-corrected response energy; also mapped to z height",
            "boundary": "local response-energy gradient plus local isolation in participant response space",
            "residual": "distance from the same-stimulus group mean response signature",
            "time": "participant-level stimulus order trace",
            "wordAnchor": "none; words are primary nodes",
            "timeBinSeconds": BIN_SECONDS,
        },
        "shape": {
            "samples": len(keys),
            "sampleNodes": len(keys),
            "wordResponseNodes": len(keys),
            "uniqueWords": unique_words,
            "participants": participants,
            "emotionAnchors": 0,
            "wordAnchors": 0,
            "nodes": len(nodes),
            "modalities": len(MODALITIES),
            "emotionFeatures": len(emotions),
            "flattenedFeatures": int(vectors.shape[1]) if len(keys) else 0,
            "timeBinSeconds": BIN_SECONDS,
            "boundaryNodes": sum(1 for node in nodes if node.get("boundary")),
            "membraneNodes": sum(1 for node in nodes if node.get("membrane")),
            "personalMembraneNodes": sum(1 for node in nodes if node.get("personalMembrane")),
            "collectiveMembraneNodes": sum(1 for node in nodes if node.get("collectiveMembrane")),
            "relationalMembranes": len(relational_membranes),
            "wallNodes": sum(1 for node in nodes if node.get("wall")),
            "voidRegions": sum(1 for node in nodes if node.get("nodeType") == "void_region"),
        },
        "alignment": {
            "wordAnchors": "not used; stimulus words are primary distance nodes",
            "sessionMapping": "per-participant sorted materialized Hume registry files mapped to sorted session starts",
            "stats": alignment_stats,
        },
        "pcaExplainedVarianceRatio": explained,
        "distanceSummary": {
            "min": float(pair_distances.min()) if pair_distances.size else None,
            "median": float(np.median(pair_distances)) if pair_distances.size else None,
            "max": float(pair_distances.max()) if pair_distances.size else None,
        },
        "spiritLayers": {
            "field": "node z/size encodes non-voluntary response energy",
            "boundary": "halo marks high local gradient or isolated response regions",
            "membrane": "personal and collective response membranes mark fluid high-gradient boundary surfaces",
            "personalMembrane": "per-participant high-gradient response surface",
            "collectiveMembrane": "group-level shared response boundary surface",
            "relationalMembrane": "pairwise response-coupling surface between participants",
            "wall": "red outer ring marks high-boundary/high-residual hard barriers",
            "void": "dark void markers indicate low-field but locally isolated regions",
            "residual": "node color shifts toward magenta when the participant differs from the same-word group response",
            "time": "green trace links connect the participant's stimulus sequence",
        },
        "physicsLayers": {
            "phaseField": "phi: soft membrane order parameter from boundary, residual, and response density",
            "diffuseInterface": "interface width proxy phi*(1-phi), high where membrane is soft and transitional",
            "rho": "response-energy density from baseline-corrected non-voluntary response energy",
            "cahnHilliard": "discrete chemical-potential proxy phi^3 - phi - epsilon^2 laplacian(phi)",
            "levelSet": "signed level-set proxy phi - median(phi), positive inside high membrane field",
            "homology": "local loop/cavity proxy from boundary, isolation, and neighbor closure",
        },
        "relationalMembranes": relational_membranes,
        "nodes": nodes,
        "links": links,
    }


def add_distance_link(
    links: list[dict[str, Any]],
    seen: set[tuple[int, int]],
    i: int,
    j: int,
    distance: float,
    relation: str,
) -> None:
    edge = tuple(sorted((i, j)))
    if edge in seen:
        return
    seen.add(edge)
    same_stimulus = relation == "same_stimulus"
    time_trace = relation == "time_trace"
    links.append(
        {
            "source": i,
            "target": j,
            "weight": float(max(0.01, 1.0 - distance)),
            "distance": float(distance),
            "mode": relation,
            "L0": 38.0 if time_trace else (45.0 if same_stimulus else 32.0 + 85.0 * float(distance)),
            "k": 0.05 if time_trace else (0.075 if same_stimulus else 0.14),
            "color": "#34d399" if time_trace else ("#facc15" if same_stimulus else "#7dd3fc"),
        }
    )


def build_relational_membranes(
    keys: list[WordKey],
    nodes: list[dict[str, Any]],
    key_to_node_index: dict[WordKey, int],
    distances: np.ndarray,
    energies: np.ndarray,
    residuals: np.ndarray,
) -> list[dict[str, Any]]:
    key_index = {key: index for index, key in enumerate(keys)}
    participants = sorted({key[0] for key in keys})
    words_by_participant = {pid: {word for p, word in keys if p == pid} for pid in participants}
    membrane_words = {
        pid: {
            nodes[key_to_node_index[(pid, word)]]["word"]
            for _, word in sorted(
                ((nodes[key_to_node_index[(pid, word)]]["boundaryScore"], word) for word in words_by_participant[pid]),
                reverse=True,
            )[:12]
        }
        for pid in participants
    }

    candidates = []
    for left_index, left in enumerate(participants):
        for right in participants[left_index + 1:]:
            common_words = sorted(words_by_participant[left] & words_by_participant[right])
            if len(common_words) < 6:
                continue
            same_word_distances = []
            left_energy = []
            right_energy = []
            left_residual = []
            right_residual = []
            word_scores = []
            for word in common_words:
                left_key = (left, word)
                right_key = (right, word)
                i = key_index[left_key]
                j = key_index[right_key]
                distance = float(distances[i, j])
                closeness = max(0.0, 1.0 - min(2.0, distance) / 2.0)
                left_node = nodes[key_to_node_index[left_key]]
                right_node = nodes[key_to_node_index[right_key]]
                boundary = 0.5 * (left_node["boundaryScore"] + right_node["boundaryScore"])
                residual_similarity = 1.0 - abs(left_node["residualScore"] - right_node["residualScore"])
                word_score = 0.52 * closeness + 0.32 * boundary + 0.16 * residual_similarity
                word_scores.append((word_score, word, left_key, right_key, distance))
                same_word_distances.append(distance)
                left_energy.append(float(energies[i]))
                right_energy.append(float(energies[j]))
                left_residual.append(float(residuals[i]))
                right_residual.append(float(residuals[j]))

            overlap = membrane_words[left] & membrane_words[right]
            union = membrane_words[left] | membrane_words[right]
            membrane_overlap = len(overlap) / max(1, len(union))
            energy_correlation = pearson(left_energy, right_energy)
            residual_correlation = pearson(left_residual, right_residual)
            closeness_mean = 1.0 - min(2.0, float(np.mean(same_word_distances))) / 2.0
            score = (
                0.42 * closeness_mean
                + 0.24 * membrane_overlap
                + 0.17 * max(0.0, energy_correlation)
                + 0.17 * max(0.0, residual_correlation)
            )
            candidates.append(
                {
                    "score": score,
                    "participants": [left, right],
                    "sameWordDistance": float(np.mean(same_word_distances)),
                    "membraneOverlap": float(membrane_overlap),
                    "energyCorrelation": float(energy_correlation),
                    "residualCorrelation": float(residual_correlation),
                    "overlapWords": sorted(overlap),
                    "wordScores": sorted(word_scores, reverse=True)[:9],
                }
            )

    membranes = []
    palette = ["#f472b6", "#facc15", "#a78bfa", "#fb923c", "#60a5fa", "#34d399"]
    for index, candidate in enumerate(sorted(candidates, key=lambda item: item["score"], reverse=True)[:6]):
        node_indices = []
        relation_words = []
        source_nodes = []
        for word_score, word, left_key, right_key, distance in candidate.pop("wordScores"):
            left_node = key_to_node_index[left_key]
            right_node = key_to_node_index[right_key]
            node_indices.extend([left_node, right_node])
            source_nodes.extend([nodes[left_node]["id"], nodes[right_node]["id"]])
            relation_words.append({"word": word, "score": float(word_score), "distance": float(distance)})
        node_indices = sorted(set(node_indices))
        if len(node_indices) < 3:
            continue
        membranes.append(
            {
                "id": f"relational_membrane:{index}:{candidate['participants'][0][:8]}:{candidate['participants'][1][:8]}",
                "label": f"{candidate['participants'][0][:8]} ↔ {candidate['participants'][1][:8]}",
                "type": "relational_response_membrane",
                "color": palette[index % len(palette)],
                "nodeIndices": node_indices,
                "sourceNodeIds": source_nodes,
                "relationWords": relation_words,
                **candidate,
            }
        )
    return membranes


def compute_physics_layers(
    distances: np.ndarray,
    rho: np.ndarray,
    boundary: np.ndarray,
    residual: np.ndarray,
    isolation: np.ndarray,
) -> dict[str, np.ndarray]:
    n = len(rho)
    if n == 0:
        empty = np.array([])
        return {
            "phaseField": empty,
            "diffuseInterface": empty,
            "rho": empty,
            "cahnHilliard": empty,
            "levelSet": empty,
            "homology": empty,
        }

    phase = normalize_values(0.54 * boundary + 0.28 * residual + 0.18 * rho)
    diffuse = normalize_values(4.0 * phase * (1.0 - phase))
    nearest = []
    for i in range(n):
        ranked = [j for _, j in sorted((distances[i, j], j) for j in range(n) if j != i)[:8]]
        nearest.append(ranked)

    laplacian = np.zeros(n, dtype=float)
    closure = np.zeros(n, dtype=float)
    for i, neighbors in enumerate(nearest):
        if not neighbors:
            continue
        laplacian[i] = float(np.mean([phase[j] - phase[i] for j in neighbors]))
        closed = 0
        possible = 0
        neighbor_set = set(neighbors)
        for a_index, a in enumerate(neighbors):
            for b in neighbors[a_index + 1:]:
                possible += 1
                if b in nearest[a] or a in nearest[b] or b in neighbor_set:
                    closed += 1 if distances[a, b] <= np.median(distances[i, neighbors]) else 0
        closure[i] = closed / max(1, possible)

    epsilon = 0.42
    cahn = normalize_values(np.abs(phase**3 - phase - (epsilon**2) * laplacian))
    level_set = phase - float(np.median(phase))
    max_abs = float(np.max(np.abs(level_set))) or 1.0
    level_set = level_set / max_abs
    homology = normalize_values(0.45 * boundary + 0.35 * isolation + 0.20 * closure)

    return {
        "phaseField": phase,
        "diffuseInterface": diffuse,
        "rho": normalize_values(rho),
        "cahnHilliard": cahn,
        "levelSet": level_set,
        "homology": homology,
    }


def pearson(left: list[float], right: list[float]) -> float:
    if len(left) < 3 or len(right) < 3:
        return 0.0
    a = np.array(left, dtype=float)
    b = np.array(right, dtype=float)
    if float(np.std(a)) < 1e-12 or float(np.std(b)) < 1e-12:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


def normalize_values(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return values
    low = float(np.min(values))
    high = float(np.max(values))
    if high - low < 1e-12:
        return np.zeros_like(values)
    return (values - low) / (high - low)


def residual_color(residual: float, base_color: str) -> str:
    residual = max(0.0, min(1.0, float(residual)))
    if residual < 0.2:
        return base_color
    # Magenta marks personal residual from the same-stimulus group response.
    r = int(120 + residual * 120)
    g = int(50 + (1.0 - residual) * 80)
    b = int(150 + residual * 85)
    return f"#{r:02x}{g:02x}{b:02x}"


def node_time_sort_key(node: dict[str, Any]) -> tuple[tuple[int, str], int, str]:
    bins = node.get("sourceBins") or []
    if not bins:
        return (10_000, ""), 10_000, node.get("word", "")
    first = min(bins, key=lambda item: (registry_sort_key(item["sessionLikeId"]), item["timeBin"]))
    return registry_sort_key(first["sessionLikeId"]), int(first["timeBin"]), node.get("word", "")


def build_graph(
    tensors: dict[Unit, np.ndarray],
    metadata: dict[Unit, Any],
    word_counts: dict[Unit, dict[str, float]],
    alignment_stats: dict[str, int],
    emotions: list[str],
) -> dict[str, Any]:
    units = sorted(tensors)
    flattened = np.array([tensors[unit].reshape(-1) for unit in units])
    coords, explained = pca_3d(flattened)

    nodes = []
    sample_index_by_unit: dict[Unit, int] = {}
    for index, unit in enumerate(units):
        tensor = tensors[unit]
        mean_emotion = tensor.mean(axis=0)
        top_indices = np.argsort(mean_emotion)[-8:][::-1]
        emotion = {emotions[i]: float(mean_emotion[i]) for i in top_indices if mean_emotion[i] > 0}
        magnitude = float(np.linalg.norm(flattened[index]))
        session_index = unit[1].split("-", 2)[1] if "-" in unit[1] else unit[1]
        sample_index_by_unit[unit] = len(nodes)
        nodes.append(
            {
                "id": f"{unit[0]}:{unit[1]}:{unit[2]}",
                "label": f"{unit[0][:8]} / {session_index} / t{unit[2]}",
                "participantId": unit[0],
                "sessionLikeId": unit[1],
                "timeBin": unit[2],
                "timeRange": metadata[unit]["timeRange"],
                "nodeType": "hume_tensor_timebin_sample",
                "scale": 0.65 + min(1.7, magnitude * 0.55),
                "initial": [float(x) for x in coords[index]],
                "color": node_color(tensor),
                "emotion": emotion,
                "alignedWords": [
                    {"word": word, "overlapSeconds": float(overlap)}
                    for word, overlap in sorted(word_counts.get(unit, {}).items(), key=lambda item: item[1], reverse=True)[:5]
                ],
                "tensorShape": [len(MODALITIES), len(emotions)],
                "rowCounts": metadata[unit]["rowCounts"],
                "topEmotionByModality": metadata[unit]["topEmotionByModality"],
            }
        )

    emotion_anchor_names = top_global_emotions(tensors, emotions, EMOTION_ANCHOR_COUNT)
    emotion_anchor_indices: dict[str, int] = {}
    radius = 260.0
    for anchor_offset, emotion_name in enumerate(emotion_anchor_names):
        angle = (math.pi * 2 * anchor_offset) / max(1, len(emotion_anchor_names))
        emotion_anchor_indices[emotion_name] = len(nodes)
        nodes.append(
            {
                "id": f"emotion:{emotion_name}",
                "label": emotion_name,
                "nodeType": "emotion_anchor",
                "fixed": True,
                "scale": 2.8,
                "initial": [math.cos(angle) * radius, math.sin(angle) * radius, 95.0],
                "color": emotion_color(anchor_offset, len(emotion_anchor_names)),
                "emotion": {emotion_name: 1.0},
            }
        )

    word_anchor_names = top_words(word_counts, WORD_ANCHOR_COUNT)
    word_anchor_indices: dict[str, int] = {}
    word_radius = 330.0
    for anchor_offset, word in enumerate(word_anchor_names):
        angle = (math.pi * 2 * anchor_offset) / max(1, len(word_anchor_names))
        band = -110.0 - 38.0 * (anchor_offset % 3)
        word_anchor_indices[word] = len(nodes)
        nodes.append(
            {
                "id": f"word:{word}",
                "label": word,
                "nodeType": "word_anchor",
                "fixed": True,
                "scale": 1.35,
                "initial": [math.cos(angle) * word_radius, math.sin(angle) * word_radius, band],
                "color": "#e2e8f0",
                "word": word,
                "source": "session_data.word_displayed aligned to Hume time bins",
            }
        )

    links = []
    seen: set[tuple[int, int]] = set()
    for i, unit in enumerate(units):
        distances = []
        for j, _ in enumerate(units):
            if i == j:
                continue
            distance = cosine_distance(flattened[i], flattened[j])
            distances.append((distance, j))

        # Tensor nearest-neighbor links.
        for distance, j in sorted(distances)[:4]:
            edge = tuple(sorted((i, j)))
            if edge in seen:
                continue
            seen.add(edge)
            same_participant = units[i][0] == units[j][0]
            links.append(make_link(sample_index_by_unit[unit], sample_index_by_unit[units[j]], distance, units, same_participant))

        # Temporal continuity links.
        next_unit = (unit[0], unit[1], unit[2] + 1)
        if next_unit in tensors:
            j = units.index(next_unit)
            edge = tuple(sorted((i, j)))
            if edge not in seen:
                seen.add(edge)
                distance = cosine_distance(flattened[i], flattened[j])
                links.append(make_link(sample_index_by_unit[unit], sample_index_by_unit[next_unit], distance, units, True, temporal=True))

        mean_emotion = tensors[unit].mean(axis=0)
        ranked_anchor_emotions = sorted(
            (
                (emotion_name, float(mean_emotion[emotions.index(emotion_name)]))
                for emotion_name in emotion_anchor_names
            ),
            key=lambda item: item[1],
            reverse=True,
        )[:2]
        for emotion_name, score in ranked_anchor_emotions:
            if score < 0.08:
                continue
            links.append(
                {
                    "source": sample_index_by_unit[unit],
                    "target": emotion_anchor_indices[emotion_name],
                    "weight": score,
                    "distance": float(max(0.0, 1.0 - score)),
                    "mode": "anchor",
                    "anchorType": "emotion",
                    "L0": 70.0,
                    "k": 0.08,
                    "color": "#f59e0b",
                }
            )

        for word, count in sorted(word_counts.get(unit, {}).items(), key=lambda item: item[1], reverse=True)[:3]:
            if word not in word_anchor_indices:
                continue
            weight = min(1.0, 0.12 + count * 0.035)
            links.append(
                {
                    "source": sample_index_by_unit[unit],
                    "target": word_anchor_indices[word],
                    "weight": weight,
                    "distance": float(max(0.0, 1.0 - weight)),
                    "mode": "anchor",
                    "anchorType": "word",
                    "L0": 115.0,
                    "k": 0.045,
                    "color": "#cbd5e1",
                }
            )

    pair_distances = [
        cosine_distance(flattened[i], flattened[j])
        for i in range(len(units))
        for j in range(i + 1, len(units))
    ]

    return {
        "model": "hume_tensor_timebin_3d_projection_v1",
        "description": "Materialized Hume AI CSV artifacts projected from time-binned modality x emotion tensors into 3D with PCA.",
        "axes": {
            "sample": "participant/session-like Hume registry file/time bin",
            "modality": MODALITIES,
            "feature": emotions,
            "projection": "z-scored flattened modality x emotion tensor, PCA to 3D",
            "distance": "cosine distance over flattened modality x emotion tensor",
            "wordAnchor": "session_data.word_displayed windows aligned to Hume registry time bins; Hume language Text is fallback only when session_data is unavailable",
            "timeBinSeconds": BIN_SECONDS,
        },
        "shape": {
            "samples": len(units),
            "sampleNodes": len(units),
            "emotionAnchors": len(emotion_anchor_names),
            "wordAnchors": len(word_anchor_names),
            "nodes": len(nodes),
            "modalities": len(MODALITIES),
            "emotionFeatures": len(emotions),
            "flattenedFeatures": int(flattened.shape[1]) if len(units) else 0,
            "timeBinSeconds": BIN_SECONDS,
        },
        "alignment": {
            "wordAnchors": "stimulus words from session_data.json word_displayed events",
            "sessionMapping": "per-participant sorted materialized Hume registry files mapped to sorted session starts",
            "stats": alignment_stats,
        },
        "pcaExplainedVarianceRatio": explained,
        "distanceSummary": {
            "min": float(min(pair_distances)) if pair_distances else None,
            "median": float(np.median(pair_distances)) if pair_distances else None,
            "max": float(max(pair_distances)) if pair_distances else None,
        },
        "nodes": nodes,
        "links": links,
    }


def top_global_emotions(tensors: dict[Unit, np.ndarray], emotions: list[str], limit: int) -> list[str]:
    if not tensors:
        return []
    scores = np.zeros(len(emotions), dtype=float)
    for tensor in tensors.values():
        scores += tensor.mean(axis=0)
    scores /= len(tensors)
    return [emotions[i] for i in np.argsort(scores)[-limit:][::-1]]


def top_words(text_counts: dict[Unit, dict[str, float]], limit: int) -> list[str]:
    totals: dict[str, float] = defaultdict(float)
    stop = {"the", "and", "for", "you", "that", "this", "with", "are", "was", "but", "not", "have", "has", "had", "from"}
    for counts in text_counts.values():
        for word, count in counts.items():
            if word in stop:
                continue
            totals[word] += count
    return [word for word, _ in sorted(totals.items(), key=lambda item: (-item[1], item[0]))[:limit]]


def emotion_color(index: int, total: int) -> str:
    hue = int((index / max(1, total)) * 360)
    return f"hsl({hue}, 78%, 58%)"


def make_link(i: int, j: int, distance: float, units: list[Unit], same_participant: bool, temporal: bool = False) -> dict[str, Any]:
    return {
        "source": i,
        "target": j,
        "weight": float(max(0.01, 1.0 - distance)),
        "distance": float(distance),
        "mode": "tension" if same_participant else "compression",
        "L0": 20.0 if temporal else (42.0 if same_participant else 95.0),
        "k": 0.2 if temporal else (0.1 if same_participant else 0.035),
        "temporal": temporal,
        "color": "#facc15" if temporal else ("#7dd3fc" if same_participant else "#475569"),
    }


def write_markdown(graph: dict[str, Any]) -> None:
    rows = []
    for node in graph["nodes"][:120]:
        top = sorted(node["emotion"].items(), key=lambda item: item[1], reverse=True)[:3]
        top_text = ", ".join(f"{name}={score:.3f}" for name, score in top)
        x, y, z = node["initial"]
        rows.append(
            f"| `{node['label']}` | `{node.get('participantId', '')[:8]}` | "
            f"{node.get('overlapSeconds', 0):.1f}s | {node.get('responseEnergy', 0):.4f} | "
            f"({x:.2f}, {y:.2f}, {z:.2f}) | {top_text} |"
        )

    content = [
        f"# {graph.get('title', 'Hume Tensor 3D Samples')}",
        "",
        graph["description"],
        "",
        "## Tensor Model",
        "",
        "```text",
        "R[participant, stimulus_word, modality, emotion]",
        "R = baseline-corrected non-voluntary response signature",
        f"modality = {', '.join(graph['axes']['modality'])}",
        f"emotion dims = {graph['shape']['emotionFeatures']}",
        f"distance = {graph['axes']['distance']}",
        f"3D = {graph['axes']['projection']}",
        "```",
        "",
        "## Summary",
        "",
        f"- word response nodes: {graph['shape'].get('wordResponseNodes', graph['shape']['sampleNodes'])}",
        f"- unique words: {graph['shape'].get('uniqueWords', 'n/a')}",
        f"- participants: {graph['shape'].get('participants', 'n/a')}",
        f"- emotion anchors: {graph['shape']['emotionAnchors']}",
        f"- word anchors: {graph['shape']['wordAnchors']}",
        f"- total nodes: {graph['shape']['nodes']}",
        f"- modalities: {graph['shape']['modalities']}",
        f"- emotion features: {graph['shape']['emotionFeatures']}",
        f"- flattened features: {graph['shape']['flattenedFeatures']}",
        f"- time bin seconds: {graph['shape']['timeBinSeconds']}",
        f"- links: {len(graph['links'])}",
        f"- word alignment: {graph['alignment']['stats']}",
        f"- projection explained variance ratio: {', '.join(f'{x:.3f}' for x in graph['pcaExplainedVarianceRatio'])}",
        f"- cosine distance min/median/max: {graph['distanceSummary']['min']:.4f} / {graph['distanceSummary']['median']:.4f} / {graph['distanceSummary']['max']:.4f}",
        "",
        "## Word Response Nodes",
        "",
        "| word | participant | overlap | response energy | 3D coordinate | top mean emotions |",
        "| --- | --- | --- | --- | --- | --- |",
        *rows,
        "",
        "## Visualization Contract",
        "",
        "Use `manifests/hume-tensor-3d-samples.json` as a graph payload. `nodes[*].initial` is the 3D coordinate. `links[*].distance` is non-voluntary physiological response distance. `nodes[*].alignedWords` contains the aligned stimulus word and total overlap seconds.",
        "",
    ]
    MD_OUT.write_text("\n".join(content), encoding="utf-8")


def main() -> None:
    files = hume_csv_files()
    emotions = collect_common_emotions(files)
    tensors, metadata, hume_text_counts = build_timebin_tensors(files, emotions)
    word_counts, alignment_stats = align_words_to_timebins(
        sorted(tensors),
        registry_order(files),
        load_session_word_windows(),
        hume_text_counts,
    )
    graph = build_word_distance_graph(tensors, word_counts, alignment_stats, emotions)

    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    MD_OUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(graph)

    print(json.dumps({
        "json": str(JSON_OUT),
        "markdown": str(MD_OUT),
        "shape": graph["shape"],
        "links": len(graph["links"]),
        "distanceSummary": graph["distanceSummary"],
        "pcaExplainedVarianceRatio": graph["pcaExplainedVarianceRatio"],
    }, indent=2))


if __name__ == "__main__":
    main()
