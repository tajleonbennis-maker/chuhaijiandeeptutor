#!/usr/bin/env python3
"""Build an English-learning digest from The New York Times' official RSS feed."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import html
import sys
import urllib.request
import xml.etree.ElementTree as ET


FEED_URL = "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"


def text(node: ET.Element, tag: str) -> str:
    child = node.find(tag)
    return html.unescape((child.text or "").strip()) if child is not None else ""


def main() -> int:
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "NYT-English-Daily.md")
    request = urllib.request.Request(FEED_URL, headers={"User-Agent": "DeepTutor/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        root = ET.fromstring(response.read())

    channel = root.find("channel")
    if channel is None:
        raise RuntimeError("NYT RSS channel was not found")
    items = channel.findall("item")[:12]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    published = text(channel, "lastBuildDate") or text(channel, "pubDate")

    lines = [
        "# The New York Times — Daily English Learning Edition",
        "",
        f"- Feed edition: {published}",
        f"- Study edition generated: {generated}",
        f"- Official source: {FEED_URL}",
        "- Copyright: Headlines and summaries © The New York Times Company.",
        "",
        "> This study packet uses the official NYT RSS headlines and short summaries,",
        "> with links to the original reporting. It does not reproduce full articles.",
        "",
        "## How to study with this edition",
        "",
        "1. Read each headline aloud and predict the story before reading the summary.",
        "2. Ask DeepTutor to explain unfamiliar vocabulary in simple English and Chinese.",
        "3. Rewrite one summary in your own words, then ask DeepTutor to correct it.",
        "4. Discuss one story for five minutes using claim, evidence, and opinion.",
        "",
        "## Today's top stories",
        "",
    ]

    for index, item in enumerate(items, 1):
        title = text(item, "title")
        summary = text(item, "description")
        author = text(item, "{http://purl.org/dc/elements/1.1/}creator")
        date = text(item, "pubDate")
        link = text(item, "link")
        categories = [
            html.unescape((node.text or "").strip())
            for node in item.findall("category")[:4]
            if (node.text or "").strip()
        ]
        lines.extend(
            [
                f"### {index}. {title}",
                "",
                f"**Summary:** {summary}",
                "",
                f"**By:** {author or 'The New York Times'}  ",
                f"**Published:** {date}  ",
                f"**Topics:** {', '.join(categories) if categories else 'Top Stories'}  ",
                f"**Original article:** {link}",
                "",
                "**Learning tasks**",
                "",
                "- Explain the headline's grammar and any omitted words.",
                "- Select 3 useful words or phrases from the headline and summary.",
                "- Write one comprehension question and one opinion question.",
                "- Paraphrase the summary in CEFR B1 English.",
                "",
            ]
        )

    lines.extend(
        [
            "## Daily review",
            "",
            "- Compare two headlines: which verbs make them sound more urgent or persuasive?",
            "- Write a 120-word news briefing using at least three stories.",
            "- Record a one-minute spoken summary and ask DeepTutor for fluency feedback.",
            "- Make an Anki-style list of 10 words with definitions and example sentences.",
            "",
            "## Recommended DeepTutor prompts",
            "",
            '- "Use this NYT edition to give me a 20-minute B1 English lesson."',
            '- "Teach me the five most useful news-English expressions in today’s edition."',
            '- "Quiz me on the headlines one question at a time, and correct my grammar."',
            '- "Let’s discuss story 3. Ask follow-up questions and improve my answers."',
            '- "Help me shadow-read story 1 sentence by sentence."',
            "",
        ]
    )
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    print(f"stories={len(items)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
