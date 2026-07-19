#!/usr/bin/env python3
"""Filter and prioritize project task issues.

The script keeps the ordering rules deterministic so execution can resume
without relying on an agent's memory of previous sorting decisions.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


READY_LABEL = "status:ready-to-start"
EXCLUDE_LABELS = {"blocked", "wontfix", "duplicate"}
PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}
PRIORITY_LABELS = {f"priority:{name}": name for name in PRIORITY_RANK}


class IssueError(ValueError):
    """Raised when issue input cannot be prioritized safely."""


def _label_names(raw_labels: Any) -> set[str]:
    labels: set[str] = set()
    if not isinstance(raw_labels, list):
        return labels

    for label in raw_labels:
        if isinstance(label, str):
            labels.add(label.strip().lower())
        elif isinstance(label, dict) and isinstance(label.get("name"), str):
            labels.add(label["name"].strip().lower())
    return {label for label in labels if label}


def _issue_id(issue: dict[str, Any]) -> int:
    value = issue.get("issue_id", issue.get("number", issue.get("id")))
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    raise IssueError(f"Issue is missing a numeric issue_id: {issue!r}")


def _priority(issue: dict[str, Any], labels: set[str]) -> str | None:
    raw_priority = issue.get("priority")
    if isinstance(raw_priority, str) and raw_priority.lower() in PRIORITY_RANK:
        return raw_priority.lower()

    for label, priority in PRIORITY_LABELS.items():
        if label in labels:
            return priority
    return None


def _created_at(issue: dict[str, Any]) -> datetime:
    value = issue.get("created_at")
    if not isinstance(value, str) or not value:
        raise IssueError(f"Issue #{_issue_id(issue)} is missing created_at")

    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise IssueError(f"Issue #{_issue_id(issue)} has invalid created_at: {value}") from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _dependency_ids(issue: dict[str, Any]) -> list[int]:
    raw_dependencies = issue.get("dependencies", [])
    if raw_dependencies is None:
        return []
    if not isinstance(raw_dependencies, list):
        raise IssueError(f"Issue #{_issue_id(issue)} dependencies must be a list")

    dependencies: list[int] = []
    for dependency in raw_dependencies:
        if isinstance(dependency, int):
            dependencies.append(dependency)
        elif isinstance(dependency, str):
            digit_groups = re.findall(r"\d+", dependency)
            if digit_groups:
                dependencies.append(int(digit_groups[-1]))
        elif isinstance(dependency, dict):
            dependencies.append(_issue_id(dependency))
        else:
            raise IssueError(
                f"Issue #{_issue_id(issue)} has unsupported dependency value: {dependency!r}"
            )
    return dependencies


def _base_sort_key(issue: dict[str, Any]) -> tuple[int, datetime, int]:
    labels = _label_names(issue.get("labels", []))
    priority = _priority(issue, labels)
    if priority is None:
        raise IssueError(f"Issue #{_issue_id(issue)} is missing priority")
    return (PRIORITY_RANK[priority], _created_at(issue), _issue_id(issue))


def filter_issues(issues: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for issue in issues:
        labels = _label_names(issue.get("labels", []))
        status = str(issue.get("status", "")).lower()
        priority = _priority(issue, labels)

        if status and status != "open":
            continue
        if READY_LABEL not in labels:
            continue
        if priority is None:
            continue
        if labels.intersection(EXCLUDE_LABELS):
            continue

        normalized = dict(issue)
        normalized["issue_id"] = _issue_id(issue)
        normalized["priority"] = priority
        normalized["dependencies"] = _dependency_ids(issue)
        filtered.append(normalized)
    return filtered


def prioritize_issues(issues: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {_issue_id(issue): issue for issue in issues}
    if len(by_id) != len(issues):
        raise IssueError("Duplicate issue IDs cannot be prioritized safely")

    indegree = {issue_id: 0 for issue_id in by_id}
    dependents: dict[int, set[int]] = defaultdict(set)
    missing_dependencies: dict[int, list[int]] = defaultdict(list)

    for issue_id, issue in by_id.items():
        for dependency_id in _dependency_ids(issue):
            if dependency_id == issue_id:
                raise IssueError(f"Issue #{issue_id} depends on itself")
            if dependency_id not in by_id:
                missing_dependencies[issue_id].append(dependency_id)
                continue
            if issue_id not in dependents[dependency_id]:
                dependents[dependency_id].add(issue_id)
                indegree[issue_id] += 1

    for issue_id, dependencies in sorted(missing_dependencies.items()):
        print(
            f"warning: issue #{issue_id} references dependencies not in input: {dependencies}",
            file=sys.stderr,
        )

    ready = sorted(
        (by_id[issue_id] for issue_id, count in indegree.items() if count == 0),
        key=_base_sort_key,
    )
    ordered: list[dict[str, Any]] = []

    while ready:
        current = ready.pop(0)
        current_id = _issue_id(current)
        ordered.append(current)

        for dependent_id in sorted(dependents[current_id], key=lambda item: _base_sort_key(by_id[item])):
            indegree[dependent_id] -= 1
            if indegree[dependent_id] == 0:
                ready.append(by_id[dependent_id])
        ready.sort(key=_base_sort_key)

    if len(ordered) != len(by_id):
        cyclic_ids = sorted(issue_id for issue_id, count in indegree.items() if count > 0)
        raise IssueError(f"Dependency cycle detected among issues: {cyclic_ids}")

    return ordered


def _load_issues(path: str) -> list[dict[str, Any]]:
    content = sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise IssueError(f"Input is not valid JSON: {exc}") from exc
    if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
        raise IssueError("Input must be a JSON list of issue objects")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Filter and prioritize project task issues")
    parser.add_argument("issues_json", nargs="?", default="-", help="Path to issues JSON, or '-' for stdin")
    parser.add_argument("--output", "-o", help="Write prioritized issue JSON to this path")
    args = parser.parse_args()

    try:
        prioritized = prioritize_issues(filter_issues(_load_issues(args.issues_json)))
    except IssueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    output = json.dumps(prioritized, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    else:
        sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
