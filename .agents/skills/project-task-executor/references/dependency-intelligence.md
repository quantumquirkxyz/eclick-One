# Dependency Intelligence Reference

## Purpose

Extract, normalize, and reason about dependencies beyond simple body checklists so the agent avoids ordering issues that cause merge conflicts or incomplete features.

## Extraction Sources

1. **Body patterns**: parse `Closes #N`, `Depends on #N`, `Part of #N`, `Related to #N`, `Follow-up from #N` from issue body and comments.
2. **Linked issues**: use `gh issue view --json timelineItems` or `glab issue view --json notes` to find cross-references.
3. **Mentions**: if issue body or comments mention another issue by number (e.g., *"see #7"*), add as soft dependency.
4. **Implicit dependencies**: if two issues touch the same critical artifact (same contract, same endpoint, same DB table, same config key), treat them as implicitly dependent and order by `issue_id` ascending.

## Graph Rules

- **Explicit dependencies**: hard ordering. A must be merged before B.
- **Implicit dependencies**: soft ordering. Prefer sequential merge but allow parallel if risk is low.
- **Cycles**: report BLOCKED with the cycle members. Do not attempt to auto-resolve cycles.
- **Missing dependencies**: if an issue references a dependency not in the candidate set, warn but continue. Do not block the entire batch.

## Output

Save `dependencies.json` alongside `issues.json`:

```json
{
  "nodes": [42, 43, 44],
  "edges": [
    {"from": 43, "to": 42, "type": "explicit", "source": "body: Depends on #42"},
    {"from": 44, "to": 42, "type": "implicit", "reason": "touches OrderManager contract"}
  ],
  "cycles": [],
  "missing": []
}
```

Use this graph in step 3 (Prioritize) to enforce ordering and in step 2.6 (Batch orchestrator) to verify batch safety.
