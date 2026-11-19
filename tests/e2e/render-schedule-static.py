"""Render the exported source HTML/CSS for bounded STATIC layout inspection.

Requires separately installed WeasyPrint 65.1 and PyMuPDF; not part of npm test.
No browser launch, JavaScript execution, network fetch, or new product renderer.
CSS width media branches and viewport lengths are explicitly translated for the
selected evidence dimensions. All translations and renderer warnings are saved.
"""
import argparse
import hashlib
import io
import json
import logging
import math
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

import fitz
import tinycss2
import weasyprint
from weasyprint import CSS, HTML, default_url_fetcher
from weasyprint.text.fonts import FontConfiguration

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'site'
parser = argparse.ArgumentParser()
parser.add_argument('--input-dir', type=Path, default=ROOT / 'docs/reports/2026-11-19-beta0-schedule/static')
OUT = parser.parse_args().input_dir.resolve()
inputs = json.loads((OUT / 'html-evidence.json').read_text())
warning_stream = io.StringIO()
handler = logging.StreamHandler(warning_stream)
logging.getLogger('weasyprint').addHandler(handler)
logging.getLogger('weasyprint').setLevel(logging.WARNING)
css_sources = [SITE / 'css' / name for name in inputs.get('cssFiles', ['fonts.css', 'tokens.css', 'components.css', 'pages.css'])]
assert all(SITE.resolve() in source.resolve().parents for source in css_sources)
rendered = []
font_config = FontConfiguration()


def local_fetch(url, *args, **kwargs):
    parsed = urlparse(url)
    if parsed.scheme == 'data':
        return default_url_fetcher(url, *args, **kwargs)
    if parsed.scheme != 'file':
        raise ValueError('Static QA refuses network resource: ' + parsed.scheme)
    resource = Path(unquote(parsed.path)).resolve()
    if SITE.resolve() not in resource.parents:
        raise ValueError('Resource outside the source site')
    return default_url_fetcher(url, *args, **kwargs)


def selected_css(text, width, height, source, trace, container_width=None):
    result = []
    for rule in tinycss2.parse_stylesheet(text, skip_whitespace=False, skip_comments=False):
        if rule.type == 'at-rule' and rule.lower_at_keyword == 'media':
            condition = tinycss2.serialize(rule.prelude).strip()
            clauses = re.split(r'\s+and\s+', condition)
            active = True
            for clause in clauses:
                match = re.fullmatch(r'\((min|max)-width:\s*(\d+)px\)', clause.strip())
                if not match:
                    raise ValueError('Unsupported QA media condition: ' + condition)
                kind, bound = match.group(1), int(match.group(2))
                active = active and (width >= bound if kind == 'min' else width <= bound)
            trace.append({'source': source, 'media': condition, 'applied': active})
            if active:
                result.append(selected_css(tinycss2.serialize(rule.content), width, height, source, trace, container_width))
        else:
            result.append(tinycss2.serialize([rule]))
    output = ''.join(result)

    def viewport_length(match):
        unit = match.group(2)
        if unit == 'cqw' and container_width is None:
            raise ValueError('Container width must be source-derived for cqw evidence')
        basis = container_width if unit == 'cqw' else width if unit == 'vw' else height
        value = float(match.group(1)) * basis / 100
        replacement = f'{value:g}px'
        trace.append({'source': source, 'viewportLength': match.group(0), 'translated': replacement})
        return replacement

    output = re.sub(r'(?<![\w.-])((?:\d*\.)?\d+)(cqw|svh|dvh|vw|vh)\b', viewport_length, output)

    def simple_calc(match):
        value = float(match.group(1)) + (1 if match.group(2) == '+' else -1) * float(match.group(3))
        replacement = f'{value:g}px'
        trace.append({'source': source, 'calculation': match.group(0), 'translated': replacement})
        return replacement

    output = re.sub(r'calc\(\s*(\d+(?:\.\d+)?)px\s*([+-])\s*(\d+(?:\.\d+)?)px\s*\)', simple_calc, output)
    def numeric_limit(match):
        values = [float(value.strip()[:-2]) for value in match.group(2).split(',')]
        value = min(values) if match.group(1) == 'min' else max(values)
        replacement = f'{value:g}px'
        trace.append({'source': source, 'numericLimit': match.group(0), 'translated': replacement})
        return replacement
    output = re.sub(r'(?<![\w-])(min|max)\(\s*((?:\d+(?:\.\d+)?px\s*,\s*)+\d+(?:\.\d+)?px)\s*\)', numeric_limit, output)
    if re.search(r'\binset:\s*0\s*;', output):
        trace.append({'source': source, 'shorthand': 'inset:0', 'translated': 'top:0;right:0;bottom:0;left:0'})
        output = re.sub(r'\binset:\s*0\s*;', 'top:0;right:0;bottom:0;left:0;', output)
    return output


for item in inputs['cases']:
    trace = []
    width, height = item['width'], item['viewportHeight']
    warning_start = warning_stream.tell()
    styles = []
    for source in css_sources:
        css = selected_css(source.read_text(), width, height, str(source.relative_to(ROOT)), trace, item.get('containerWidth'))
        styles.append(CSS(string=css, base_url=source.parent.as_uri() + '/', media_type='screen', url_fetcher=local_fetch, font_config=font_config))
    if item.get('staticCss'):
        trace.append({'staticReaderGeometry': item['staticGeometry'], 'css': item['staticCss']})
        styles.append(CSS(string=item['staticCss'], media_type='screen', url_fetcher=local_fetch, font_config=font_config))
    styles.append(CSS(string=f'@page {{ size: {width}px 4000px; margin: 0; }} .qa-static-label {{ padding: 12px 16px; background: #fff3c4; color: #332600; border-bottom: 2px solid #946b00; font: 700 14px/1.5 sans-serif; overflow-wrap: anywhere; }}'))
    html = (OUT / (item['name'] + '.html')).read_text()
    # Original stylesheet links are replaced only in this renderer invocation;
    # exported HTML and all source stylesheets remain unchanged.
    html = re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*>', '', html)
    document = HTML(string=html, base_url=SITE.as_uri() + '/', media_type='screen', url_fetcher=local_fetch).render(stylesheets=styles, font_config=font_config)
    if len(document.pages) != 1 or 'qa-render-end' not in document.pages[0].anchors:
        raise RuntimeError('Static document exceeded the single evidence surface: ' + item['name'])
    anchor = document.pages[0].anchors['qa-render-end']
    crop_height = min(4000, max(height, math.ceil(anchor[3] + 24)))
    pdf = document.write_pdf()
    pdf_page = fitz.open(stream=pdf, filetype='pdf')[0]
    pixmap = pdf_page.get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), clip=fitz.Rect(0, 0, width * .75, crop_height * .75), alpha=False)
    target = OUT / (item['name'] + '.png')
    pixmap.save(target)
    text = pdf_page.get_text()
    expected = item.get('expectedText', ['這場的賽前判讀還沒出來。' if item['state'] == 'MISSING' else item['state']])
    # PDF text order is not a browser DOM test; retain the extracted text as evidence.
    (OUT / (item['name'] + '.txt')).write_text(text)
    warnings = warning_stream.getvalue()[warning_start:]
    rendered.append({**item, 'file': target.name, 'imageWidth': pixmap.width, 'imageHeight': pixmap.height,
                     'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'cssTranslation': trace,
                     'expectedTextFoundInPdf': all(value in text.replace('\n', '') for value in expected),
                     'anchors': {key: value for key, value in document.pages[0].anchors.items() if key in ['today', 'reader', 'qa-render-end']},
                     'warnings': sorted(set(warnings.splitlines()))})

(OUT / 'renderer-warnings.txt').write_text(warning_stream.getvalue())
(OUT / 'static-visual-evidence.json').write_text(json.dumps({
    'method': 'WEASYPRINT_STATIC_HTML_CSS', 'rendererVersion': weasyprint.__version__,
    'sourceHead': inputs['sourceHead'], 'baseHead': inputs.get('baseHead'), 'pageClock': inputs['pageClock'], 'sourceFiles': inputs['sourceFiles'],
    'componentSerialization': inputs.get('webComponents', 'NOT_EXECUTED'),
    'browserE2E': False, 'webComponentsExecuted': False, 'interactiveBehaviorVerified': False,
    'publicQualification': 'NOT_ASSERTED', 'mediaQueries': 'EXPLICIT_SOURCE_RULE_SELECTION_FOR_EVIDENCE_WIDTH',
    'viewportUnits': 'EXPLICIT_TEST_OUTPUT_TRANSLATION', 'screenshots': rendered
}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'method': 'WEASYPRINT_STATIC_HTML_CSS', 'rendered': len(rendered),
                  'textFound': sum(x['expectedTextFoundInPdf'] for x in rendered),
                  'files': [{'file': x['file'], 'width': x['imageWidth'], 'height': x['imageHeight']} for x in rendered]}))
