---
title: Mermaid Diagram Guide
description: Guidelines and syntax references for creating beautiful charts inside your documentation.
category: Features
order: 2
---

# Mermaid Diagram Guide

Mermaid lets you create diagrams and visualizations using text and code. Since all diagrams are written in simple text, they can be version-controlled in Git alongside your standard text.

---

## 📈 Flowcharts

Flowcharts are declared with `graph` or `flowchart` followed by the direction (e.g. `TD` for top-down, `LR` for left-to-right).

```mermaid
graph LR
    A[Start] --> B(Process)
    B --> C{Decision}
    C -- Yes --> D[Success]
    C -- No --> E[Retry]
    E --> B
```

---

## ⏱️ Sequence Diagrams

A sequence diagram shows object interactions arranged in time sequence.

```mermaid
sequenceDiagram
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against cold
    end
    Note right of John: Rational thoughts<br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
```

---

## 📊 Pie Charts

You can easily render pie charts to represent structural data distributions:

```mermaid
pie title Key Components of Documentation
    "Markdown Text" : 45
    "Mermaid Diagrams" : 30
    "Images & Video" : 15
    "Code Blocks" : 10
```
