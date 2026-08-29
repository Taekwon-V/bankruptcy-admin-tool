#!/usr/bin/env python3
"""
build_hwpx.py — AI 친화적 행정문서 가이드라인에 맞춘 HWPX(한글) 문서 생성기

사용법:
    python3 build_hwpx.py <입력.md> <출력.hwpx> [--template template.hwpx]

입력 파일(.md)의 줄 단위 마크업:
    # 제목            → 문서 제목
    > 요약문장        → 요약 문단 (문서 앞부분, 서술식)
    1. / 가. 로 시작  → 번호 항목(대제목, 굵게)
    □ 또는 [] 로 시작 → □ 대항목
    ○ 또는 * 로 시작  → ○ 중항목
    - 로 시작         → - 세부항목
    · 또는 . 로 시작  → · 세부항목
    (그 외 일반 줄)   → 서술식 본문 문단 (주어·서술어를 갖춘 문장)

규칙: 특수기호(□ ○ - ·)는 유니코드 문자로 출력하며, 글꼴은 템플릿의 함초롬바탕을 따른다.
"""
import sys, os, re, html, zipfile, shutil, tempfile

# 템플릿(예시1 가이드라인 문서)에서 검증된 스타일 ID (함초롬바탕 기반)
STYLE = {
    "title":   ("21", "12"),   # 제목
    "summary": ("24", "17"),   # 요약 / 굵은 문단
    "hnum":    ("24", "17"),   # 1. 가. 번호 대제목 (굵게)
    "box":     ("25", "16"),   # □ 대항목
    "bullet":  ("25", "16"),   # ○ 중항목
    "dash":    ("27", "16"),   # - 세부항목
    "dot":     ("27", "16"),   # · 세부항목
    "body":    ("24", "17"),   # 서술식 본문 문단
}
MARK = {"box": "□ ", "bullet": "○ ", "dash": "- ", "dot": "· "}


def esc(t):
    return html.escape(t, quote=False)


def classify(line):
    s = line.strip()
    if not s:
        return None, ""
    if s.startswith("# "):
        return "title", s[2:].strip()
    if s.startswith("> "):
        return "summary", s[2:].strip()
    if re.match(r"^(\d+\.|[가-힣]\.)\s", s):
        return "hnum", s
    if s.startswith("□") or s.startswith("[]"):
        return "box", re.sub(r"^(□|\[\])\s*", "", s)
    if s.startswith("○") or s.startswith("* "):
        return "bullet", re.sub(r"^(○|\*)\s*", "", s)
    if s.startswith("- "):
        return "dash", s[2:].strip()
    if s.startswith("·") or s.startswith(". "):
        return "dot", re.sub(r"^(·|\.)\s*", "", s)
    return "body", s


def make_p(kind, text, pid):
    para, char = STYLE[kind]
    marker = MARK.get(kind, "")
    body = esc(marker + text)
    return (f'<hp:p id="{pid}" paraPrIDRef="{para}" styleIDRef="0" '
            f'pageBreak="0" columnBreak="0" merged="0">'
            f'<hp:run charPrIDRef="{char}"><hp:t>{body}</hp:t></hp:run></hp:p>')


def make_title_p(secpr, text, pid):
    para, char = STYLE["title"]
    return (f'<hp:p id="{pid}" paraPrIDRef="{para}" styleIDRef="0" '
            f'pageBreak="0" columnBreak="0" merged="0">'
            f'<hp:run charPrIDRef="{char}">{secpr}</hp:run>'
            f'<hp:run charPrIDRef="{char}"><hp:t>{esc(text)}</hp:t></hp:run></hp:p>')


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    tpl = "template.hwpx"
    if "--template" in sys.argv:
        tpl = sys.argv[sys.argv.index("--template") + 1]
    here = os.path.dirname(os.path.abspath(__file__))
    if not os.path.isabs(tpl) and not os.path.exists(tpl):
        tpl = os.path.join(here, "template.hwpx")

    lines = open(src, encoding="utf-8").read().splitlines()
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(tpl) as z:
        z.extractall(tmp)

    sec_path = os.path.join(tmp, "Contents", "section0.xml")
    xml = open(sec_path, encoding="utf-8").read()

    # 헤더(선언 + <hs:sec ...>) 추출
    head = xml[:xml.index("<hp:p")]
    # secPr 블록 추출 (페이지 설정 유지)
    m = re.search(r"<hp:secPr\b.*?</hp:secPr>", xml, re.S)
    secpr = m.group(0) if m else ""

    # 본문 구성
    paras, pid = [], 1000
    title_done = False
    for ln in lines:
        kind, text = classify(ln)
        if kind is None:
            continue
        if kind == "title" and not title_done:
            paras.append(make_title_p(secpr, text, pid))
            title_done = True
        elif kind == "title":
            paras.append(make_p("hnum", text, pid))
        else:
            paras.append(make_p(kind, text, pid))
        pid += 1

    # 제목이 없으면 빈 secPr 문단을 맨 앞에 삽입
    if not title_done:
        paras.insert(0, make_title_p(secpr, "", pid))

    new_xml = head + "".join(paras) + "</hs:sec>"
    open(sec_path, "w", encoding="utf-8").write(new_xml)

    # 재패키징 (mimetype은 무압축·최상단)
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(tmp, "mimetype"), "mimetype",
                compress_type=zipfile.ZIP_STORED)
        for root, _, files in os.walk(tmp):
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, tmp)
                if rel == "mimetype":
                    continue
                z.write(full, rel)
    shutil.rmtree(tmp)
    print(f"생성 완료: {out} (문단 {len(paras)}개)")


if __name__ == "__main__":
    main()
