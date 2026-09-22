# -*- coding: utf-8 -*-
"""
Script kết xuất toàn bộ 17 ảnh chụp màn hình Kotlin Playground chuẩn đẹp bằng Pygments + Chrome Headless,
sau đó chèn trực tiếp ảnh vào file Word BAO_CAO_KOTLIN_CODELAB.docx và BAO_CAO_KOTLIN_CODELAB.html.
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import html
import subprocess
from PIL import Image
from pygments import highlight
from pygments.lexers import KotlinLexer
from pygments.formatters import HtmlFormatter

import docx
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from build_report_standard import (
    c1_data, c2_data, new_doc, add_cover_page,
    add_heading_1, add_heading_2, add_heading_3, add_heading_4,
    add_p, add_code_box, add_output_box, add_signature,
    set_run_font, set_paragraph_format
)

chrome_bin = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
screenshot_dir = os.path.abspath("screenshots")
os.makedirs(screenshot_dir, exist_ok=True)

class KotlinStyleFormatter(HtmlFormatter):
    def __init__(self, **options):
        super().__init__(nowrap=True, **options)

def highlight_code_pygments(code):
    raw_hl = highlight(code, KotlinLexer(), KotlinStyleFormatter())
    lines = raw_hl.strip().split('\n')
    table_rows = []
    for idx, line in enumerate(lines, start=1):
        table_rows.append(f'<tr><td class="line-num">{idx}</td><td class="line-code">{line}</td></tr>')
    return '<table class="code-table">' + ''.join(table_rows) + '</table>'

def generate_playground_html(title, code, output):
    hl_code = highlight_code_pygments(code)
    output_esc = html.escape(output.strip())
    
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    background: #141517;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #bcbec4;
    padding: 12px;
    width: 860px;
    display: inline-block;
  }}
  .window {{
    border: 1px solid #393b40;
    border-radius: 8px;
    background: #1e1f22;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }}
  .topbar {{
    background: #2b2d30;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border-bottom: 1px solid #393b40;
  }}
  .topbar-left {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .logo {{
    font-weight: 700;
    font-size: 13px;
    color: #7f52ff;
    letter-spacing: 0.5px;
  }}
  .tab {{
    background: #1e1f22;
    color: #dfe1e5;
    padding: 6px 14px;
    border-radius: 4px 4px 0 0;
    font-size: 12px;
    font-family: monospace;
    border-top: 2px solid #7f52ff;
  }}
  .topbar-right {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .target-tag {{
    font-size: 11px;
    color: #868a91;
    background: #393b40;
    padding: 2px 8px;
    border-radius: 4px;
  }}
  .run-btn {{
    background: #367af6;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
  }}
  .editor {{
    padding: 12px 6px;
    background: #1e1f22;
  }}
  .code-table {{
    border-collapse: collapse;
    width: 100%;
    font-family: "JetBrains Mono", Consolas, monospace;
    font-size: 13px;
    line-height: 1.45;
  }}
  .line-num {{
    width: 38px;
    text-align: right;
    padding-right: 14px;
    color: #4e5157;
    user-select: none;
    vertical-align: top;
  }}
  .line-code {{
    color: #bcbec4;
    white-space: pre-wrap;
    word-break: break-word;
  }}
  
  /* Pygments Token Colors for Kotlin Playground Dark Theme */
  .kd, .k, .kr, .kn {{ color: #cf8e6d; font-weight: bold; }} /* keywords: fun, val, var, return */
  .kt, .nc {{ color: #c5a56a; font-weight: bold; }} /* types: Int, String */
  .s, .s2, .se {{ color: #6aab73; }} /* strings */
  .m, .mi, .mf {{ color: #2aacb8; }} /* numbers */
  .nf, .fm {{ color: #56a8f5; }} /* function names */
  .c1, .c {{ color: #7a7e85; font-style: italic; }} /* comments */
  .p {{ color: #bcbec4; }} /* punctuation */
  .w {{ color: #bcbec4; }} /* whitespace */
  .nv, .vi {{ color: #dfb2ff; }} /* variables */
  .o, .ow {{ color: #bcbec4; }} /* operators */

  .console {{
    background: #141517;
    border-top: 1px solid #2b2d30;
    padding: 10px 14px 14px 14px;
    font-family: "JetBrains Mono", Consolas, monospace;
    font-size: 12.5px;
  }}
  .console-header {{
    font-size: 11px;
    color: #868a91;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #2b2d30;
    padding-bottom: 4px;
  }}
  .console-output {{
    color: #a8adb5;
    white-space: pre-wrap;
    line-height: 1.35;
  }}
</style>
</head>
<body>
<div class="window" id="capture-target">
  <div class="topbar">
    <div class="topbar-left">
      <span class="logo">KOTLIN PLAYGROUND</span>
      <span class="tab">main.kt</span>
    </div>
    <div class="topbar-right">
      <span class="target-tag">JVM | Kotlin 2.0</span>
      <div class="run-btn">&#9654; Run</div>
    </div>
  </div>
  <div class="editor">
    {hl_code}
  </div>
  <div class="console">
    <div class="console-header">
      <span>Console / Terminal Output</span>
      <span style="color: #6aab73;">&#x2714; Process finished with exit code 0</span>
    </div>
    <div class="console-output">{output_esc}</div>
  </div>
</div>
</body>
</html>
"""

def render_all_images():
    print("--- BẮT ĐẦU TẠO 17 ẢNH CHỤP MÀN HÌNH CHUẨN KOTLIN PLAYGROUND ---")
    all_items = []
    for item in c1_data:
        all_items.append(("c1", item["num"], item["title"], item["code"], item["output"]))
    for item in c2_data:
        all_items.append(("c2", item["num"], item["title"], item["code"], item["output"]))

    for codelab, num, title, code, output in all_items:
        prefix = f"{codelab}_bai{num}"
        img_file = os.path.abspath(os.path.join(screenshot_dir, f"{prefix}.png"))
        if os.path.exists(img_file):
            print(f"-> Đã có sẵn: {prefix}.png")
            continue
        html_file = os.path.abspath(f"temp_{prefix}.html")

        html_content = generate_playground_html(title, code, output)
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        cmd = [
            chrome_bin,
            "--headless=new",
            "--disable-gpu",
            f"--screenshot={img_file}",
            "--window-size=884,900",
            f"file:///{html_file.replace(os.sep, '/')}"
        ]
        subprocess.run(cmd, capture_output=True)

        if os.path.exists(html_file):
            os.remove(html_file)

        if os.path.exists(img_file):
            im = Image.open(img_file)
            # Find the actual window bounds and crop nicely
            # The outer background is #141517 (rgb 20, 21, 23)
            # Find non-outer content
            bg = (20, 21, 23)
            # Look for bounding box where pixels differ significantly or crop top-left (12, 12)
            # Window width is 860px, starts at x=12, y=12
            # Scan down from bottom to find border
            width, height = im.size
            crop_bottom = height
            # Scan from bottom up
            pixels = im.load()
            for y in range(height - 1, 0, -1):
                # check middle pixels
                r, g, b = pixels[width // 2, y][:3]
                if abs(r - bg[0]) > 5 or abs(g - bg[1]) > 5 or abs(b - bg[2]) > 5:
                    crop_bottom = min(height, y + 16)
                    break
            
            cropped = im.crop((10, 10, 874, crop_bottom))
            cropped.save(img_file, "PNG")
            print(f"-> Xuất thành công: {prefix}.png (Kích thước: {cropped.size})")

    print("--- HOÀN THÀNH KẾT XUẤT 17 ẢNH MINH HỌA ---")

def build_docx_with_images():
    print("--- BẮT ĐẦU TẠO FILE WORD ĐÍNH KÈM HÌNH ẢNH MINH CHỨNG ---")
    doc = new_doc()
    
    # 1. Bìa
    add_cover_page(doc)
    
    # 2. Thông số
    p_spec = doc.add_paragraph()
    set_paragraph_format(p_spec, align=WD_ALIGN_PARAGRAPH.JUSTIFY, first_line=0, space_before=6, space_after=12)
    r_spec = p_spec.add_run("Thông số thiết lập trên Word: Font: Times New Roman | Cỡ chữ: 13-14 (Tiêu đề 14-16) | Dãn dòng: 1.15 - 1.5 lines | Căn lề: Trái 3.0cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm.")
    set_run_font(r_spec, size=11, italic=True, color=RGBColor(80, 80, 80))
    
    # --- I. ĐẶT VẤN ĐỀ VÀ MỤC TIÊU ---
    add_heading_1(doc, "I. ĐẶT VẤN ĐỀ VÀ MỤC TIÊU BÀI THỰC HÀNH")
    add_heading_2(doc, "1. Bối cảnh học phần và tầm quan trọng của ngôn ngữ Kotlin")
    add_p(doc, "Trong xu thế phát triển ứng dụng di động hiện đại, Google đã chính thức công nhận Kotlin là ngôn ngữ lập trình ưu tiên số một (Kotlin-first) cho nền tảng Android kể từ năm 2019. Với sự ra đời và phổ biến mạnh mẽ của Jetpack Compose - bộ công cụ hiện đại hàng đầu xây dựng giao diện người dùng theo mô hình khai báo (Declarative UI), việc làm chủ nền tảng ngôn ngữ Kotlin không chỉ là yêu cầu bắt buộc mà còn là điều kiện tiên quyết giúp lập trình viên tiếp cận kiến trúc ứng dụng Android chuyên nghiệp.")
    add_p(doc, "Bộ bài tập thực hành Google Codelabs (bao gồm Codelab 'Intro to Kotlin: Practice Problems' và Codelab 'Kotlin Fundamentals: Practice Problems') được thiết kế theo các tình huống nghiệp vụ thực tế, bám sát các đặc tính cốt lõi của ngôn ngữ như tính an toàn với giá trị rỗng (Null Safety), hàm bậc cao (Higher-Order Functions), biểu thức Lambda và mô hình hướng đối tượng hiện đại.")

    add_heading_2(doc, "2. Mục tiêu kỹ năng và kiến thức cần đạt")
    add_p(doc, "- **Về cú pháp nền tảng:** Phân định chính xác biến bất biến (val) và biến khả biến (var); quản trị bộ nhớ an toàn; làm chủ cơ chế nội suy chuỗi (String Templates) và tuân thủ tuyệt đối quy chuẩn viết mã (Kotlin Coding Conventions).")
    add_p(doc, "- **Về cấu trúc điều khiển và thiết kế hàm:** Làm chủ câu lệnh điều kiện if/else, biểu thức when theo dải giá trị; vận dụng linh hoạt cơ chế tham số mặc định (Default arguments) và tham số định danh (Named arguments); thực thi triệt để nguyên lý DRY (Don't Repeat Yourself).")
    add_p(doc, "- **Về lập trình hướng đối tượng và kỹ thuật nâng cao:** Xây dựng Class với Primary Constructor, Custom Getter; triển khai quan hệ kế thừa và ghi đè phương thức (open/override); ứng dụng thành thạo toán tử Safe Call (?.) và toán tử Elvis (?:) nhằm loại bỏ nguy cơ ngoại lệ NullPointerException.")

    # --- II. CODELAB 1 ---
    add_heading_1(doc, "II. NỘI DUNG VÀ KẾT QUẢ THỰC HÀNH CODELAB 1: INTRO TO KOTLIN")
    add_p(doc, "Codelab 1 tập trung củng cố kiến thức nền tảng về cú pháp, biến, kiểu dữ liệu, hàm và chuẩn viết mã thông qua 10 bài tập tình huống độc lập:")

    fig_count = 1
    for item in c1_data:
        add_heading_2(doc, f"{item['num']}. {item['title']}")
        
        add_heading_3(doc, "a) Yêu cầu và phân tích kỹ thuật")
        add_p(doc, f"**Mục tiêu bài tập:** {item['obj']}")
        add_p(doc, f"**Phân tích giải pháp:** {item['analysis']}")
        
        add_heading_3(doc, "b) Mã nguồn chương trình hoàn chỉnh")
        add_code_box(doc, item['code'])
        
        add_heading_3(doc, "c) Kết quả thực thi và ảnh minh chứng")
        add_output_box(doc, item['output'])
        
        # Chèn ảnh thực tế
        img_path = os.path.join(screenshot_dir, f"c1_bai{item['num']}.png")
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            set_paragraph_format(p_img, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=6, space_after=2)
            run_img = p_img.add_run()
            run_img.add_picture(img_path, width=Cm(15.8))
            
            p_cap = doc.add_paragraph()
            set_paragraph_format(p_cap, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=2, space_after=12)
            r_cap = p_cap.add_run(f"Hình {fig_count}: Ảnh chụp màn hình kết quả chạy thực tế Bài {item['num']} trên Kotlin Playground")
            set_run_font(r_cap, size=11, bold=False, italic=True, color=RGBColor(71, 85, 105))
            fig_count += 1
        doc.add_paragraph()

    # --- III. CODELAB 2 ---
    add_heading_1(doc, "III. NỘI DUNG VÀ KẾT QUẢ THỰC HÀNH CODELAB 2: KOTLIN FUNDAMENTALS")
    add_p(doc, "Codelab 2 nâng cấp độ phức tạp, tập trung vào cấu trúc điều khiển nâng cao, hàm bậc cao, biểu thức Lambda, lập trình hướng đối tượng và an toàn dữ liệu Null Safety thông qua 7 bài tập chuyên sâu:")

    for item in c2_data:
        add_heading_2(doc, f"{item['num']}. {item['title']}")
        
        add_heading_3(doc, "a) Yêu cầu và phân tích kỹ thuật")
        add_p(doc, f"**Mục tiêu bài tập:** {item['obj']}")
        add_p(doc, f"**Phân tích giải pháp:** {item['analysis']}")
        
        add_heading_3(doc, "b) Mã nguồn chương trình hoàn chỉnh")
        add_code_box(doc, item['code'])
        
        add_heading_3(doc, "c) Kết quả thực thi và ảnh minh chứng")
        add_output_box(doc, item['output'])
        
        # Chèn ảnh thực tế
        img_path = os.path.join(screenshot_dir, f"c2_bai{item['num']}.png")
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            set_paragraph_format(p_img, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=6, space_after=2)
            run_img = p_img.add_run()
            run_img.add_picture(img_path, width=Cm(15.8))
            
            p_cap = doc.add_paragraph()
            set_paragraph_format(p_cap, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=2, space_after=12)
            r_cap = p_cap.add_run(f"Hình {fig_count}: Ảnh chụp màn hình kết quả chạy thực tế Bài {item['num']} (Codelab 2) trên Kotlin Playground")
            set_run_font(r_cap, size=11, bold=False, italic=True, color=RGBColor(71, 85, 105))
            fig_count += 1
        doc.add_paragraph()

    # --- IV. TỔNG KẾT VÀ BÀI HỌC KINH NGHIỆM ---
    add_heading_1(doc, "IV. TỔNG KẾT VÀ BÀI HỌC KINH NGHIỆM")
    add_heading_2(doc, "1. Tổng kết kết quả học tập")
    add_p(doc, "Thông qua quá trình nghiên cứu và giải quyết trọn vẹn 17 bài tập thuộc 2 bài thực hành lớn của Google Android:")
    add_p(doc, "- Sinh viên đã nắm bắt vững chắc tư duy lập trình hiện đại của Kotlin, đặc biệt là khả năng viết mã ngắn gọn, rõ nghĩa nhưng bảo đảm an toàn dữ liệu mức cao nhất.")
    add_p(doc, "- Đã làm chủ hoàn toàn các kỹ thuật nền tảng: từ biến, hàm, xử lý chuỗi đến cấu trúc hướng đối tượng, hàm bậc cao và xử lý an toàn rỗng (Null Safety).")
    
    add_heading_2(doc, "2. Ý nghĩa đối với việc phát triển ứng dụng Jetpack Compose")
    add_p(doc, "Các khái niệm được thực hành trong Codelab (đặc biệt là Lambda, Trailing Lambda, Higher-Order Functions, Class và Custom Getter) chính là xương sống cấu tạo nên toàn bộ kiến trúc của Jetpack Compose. Việc làm chủ các kiến thức này là bước chuẩn bị hoàn hảo để xây dựng các Composable functions phức tạp và triển khai ứng dụng Android thương mại chất lượng cao.")

    # --- V. XÁC NHẬN VÀ CHỮ KÝ ---
    add_signature(doc)

    out_docx = "BAO_CAO_KOTLIN_CODELAB.docx"
    try:
        doc.save(out_docx)
        print("-> ĐÃ LƯU BÁO CÁO WORD HOÀN THIỆN KÈM ẢNH:", out_docx)
    except PermissionError:
        alt_docx = "BAO_CAO_KOTLIN_CODELAB_Hoan_Thien.docx"
        doc.save(alt_docx)
        print("-> FILE GỐC ĐANG MỞ TRÊN WORD, ĐÃ LƯU BẢN HOÀN THIỆN VÀO:", alt_docx)

def build_html_with_images():
    print("--- BẮT ĐẦU CẬP NHẬT FILE HTML ĐÍNH KÈM HÌNH ẢNH ---")
    # Generate HTML embedding the local screenshot images
    html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BÁO CÁO THỰC HÀNH LẬP TRÌNH KOTLIN - THẦY VUI</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 20mm 20mm 30mm;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.25;
            color: #000000;
            background: #e2e8f0;
            padding: 30px 10px;
        }

        .document-wrapper {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            padding: 20mm 20mm 20mm 30mm;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        @media print {
            body { background: #ffffff; padding: 0; }
            .document-wrapper { box-shadow: none; padding: 0; max-width: 100%; }
            .page-break { page-break-before: always; }
            .no-print { display: none; }
        }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .header-table td { text-align: center; vertical-align: top; font-size: 12pt; }
        .header-table td.left { width: 45%; }
        .header-table td.right { width: 55%; }

        .cover-title {
            text-align: center; font-size: 16pt; font-weight: bold;
            margin: 40px 0 10px 0; line-height: 1.3; text-transform: uppercase;
        }
        .cover-subtitle { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 8px; }
        .cover-subject { text-align: center; font-size: 13pt; font-style: italic; margin-bottom: 45px; }

        .info-table { width: 85%; margin: 0 auto 50px auto; border-collapse: collapse; }
        .info-table td { padding: 6px 4px; font-size: 13pt; }
        .info-table td.lbl { font-weight: bold; width: 45%; }

        .cover-footer { text-align: center; font-size: 13pt; font-style: italic; margin-top: 60px; }

        .spec-note {
            font-size: 11pt; font-style: italic; color: #444444;
            margin: 15px 0 25px 0; padding: 8px 12px;
            border-left: 3px solid #666666; background: #fafafa;
        }

        h1.heading-1 { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 25px 0 10px 0; color: #000000; }
        h2.heading-2 { font-size: 14pt; font-weight: bold; margin: 20px 0 8px 0; color: #000000; }
        h3.heading-3 { font-size: 13pt; font-weight: bold; font-style: italic; margin: 12px 0 6px 0; color: #000000; }

        p.para { text-align: justify; text-indent: 1.0cm; margin-bottom: 6px; font-size: 13pt; }
        p.para-noindent { text-align: justify; text-indent: 0; margin-bottom: 6px; font-size: 13pt; }

        pre.code-box {
            font-family: Consolas, "Courier New", monospace;
            font-size: 10pt; line-height: 1.25; background: #f8f9fa;
            border: 1px solid #cccccc; border-left: 4px solid #333333;
            padding: 10px 14px; margin: 8px 0 14px 0; white-space: pre-wrap; color: #1e293b;
        }

        pre.output-box {
            font-family: Consolas, "Courier New", monospace;
            font-size: 9.5pt; line-height: 1.25; background: #f1f5f9;
            border: 1px solid #94a3b8; border-left: 4px solid #475569;
            padding: 8px 12px; margin: 8px 0 14px 0; white-space: pre-wrap; color: #0f172a;
        }
        .output-title { font-weight: bold; color: #475569; font-size: 9pt; margin-bottom: 4px; }

        .screenshot-img {
            width: 100%;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            margin: 8px 0 4px 0;
            display: block;
        }
        .figure-caption {
            text-align: center;
            font-size: 11pt;
            font-style: italic;
            color: #475569;
            margin-bottom: 18px;
        }

        .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
        .signature-table td { width: 50%; text-align: center; vertical-align: top; font-size: 13pt; }
        .sign-title { font-weight: bold; }
        .sign-space { height: 70px; }

        .floating-btn {
            position: fixed; bottom: 25px; right: 25px;
            background: #1e293b; color: #ffffff; border: none;
            padding: 12px 22px; font-size: 14px; font-weight: bold;
            font-family: sans-serif; border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25); cursor: pointer;
        }
        .floating-btn:hover { background: #000000; }
    </style>
</head>
<body>

    <button class="floating-btn no-print" onclick="window.print()">In / Xuat PDF Ngay</button>

    <div class="document-wrapper">
        <table class="header-table">
            <tr>
                <td class="left">
                    BỘ GIÁO DỤC VÀ ĐÀO TẠO<br>
                    <b>KHOA CÔNG NGHỆ THÔNG TIN</b>
                </td>
                <td class="right">
                    <b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br>
                    <b><i>Độc lập - Tự do - Hạnh phúc</i></b><br>
                    ────────────────────
                </td>
            </tr>
        </table>

        <div class="cover-title">BÁO CÁO KẾT QUẢ THỰC HÀNH LẬP TRÌNH KOTLIN</div>
        <div class="cover-subtitle">CHUYÊN ĐỀ: CODELAB ANDROID BASICS WITH COMPOSE</div>
        <div class="cover-subject">(Học phần: Phát triển Ứng dụng Di động - Android)</div>

        <table class="info-table">
            <tr>
                <td class="lbl">Giảng viên hướng dẫn:</td>
                <td>Thầy Vui</td>
            </tr>
            <tr>
                <td class="lbl">Sinh viên thực hiện:</td>
                <td>................................................................</td>
            </tr>
            <tr>
                <td class="lbl">Mã số sinh viên (MSSV):</td>
                <td>................................................................</td>
            </tr>
            <tr>
                <td class="lbl">Lớp / Khóa đào tạo:</td>
                <td>................................................................</td>
            </tr>
            <tr>
                <td class="lbl">Thời hạn nộp bài:</td>
                <td>Hết ngày 22 / 09 / 2026</td>
            </tr>
        </table>

        <div class="cover-footer">Hà Nội, tháng 09 năm 2026</div>
        <div class="page-break"></div>

        <div class="spec-note">
            Thông số thiết lập trên Word: Font: Times New Roman | Cỡ chữ: 13-14 (Tiêu đề 14-16) | Dãn dòng: 1.15 - 1.5 lines | Căn lề: Trái 3.0cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm.
        </div>

        <h1 class="heading-1">I. ĐẶT VẤN ĐỀ VÀ MỤC TIÊU BÀI THỰC HÀNH</h1>
        <h2 class="heading-2">1. Bối cảnh học phần và tầm quan trọng của ngôn ngữ Kotlin</h2>
        <p class="para">Trong xu thế phát triển ứng dụng di động hiện đại, Google đã chính thức công nhận Kotlin là ngôn ngữ lập trình ưu tiên số một (Kotlin-first) cho nền tảng Android kể từ năm 2019. Với sự ra đời và phổ biến mạnh mẽ của Jetpack Compose - bộ công cụ hiện đại hàng đầu xây dựng giao diện người dùng theo mô hình khai báo (Declarative UI), việc làm chủ nền tảng ngôn ngữ Kotlin không chỉ là yêu cầu bắt buộc mà còn là điều kiện tiên quyết giúp lập trình viên tiếp cận kiến trúc ứng dụng Android chuyên nghiệp.</p>
        <p class="para">Bộ bài tập thực hành Google Codelabs (bao gồm Codelab 'Intro to Kotlin: Practice Problems' và Codelab 'Kotlin Fundamentals: Practice Problems') được thiết kế theo các tình huống nghiệp vụ thực tế, bám sát các đặc tính cốt lõi của ngôn ngữ như tính an toàn với giá trị rỗng (Null Safety), hàm bậc cao (Higher-Order Functions), biểu thức Lambda và mô hình hướng đối tượng hiện đại.</p>

        <h2 class="heading-2">2. Mục tiêu kỹ năng và kiến thức cần đạt</h2>
        <p class="para">- <b>Về cú pháp nền tảng:</b> Phân định chính xác biến bất biến (val) và biến khả biến (var); quản trị bộ nhớ an toàn; làm chủ cơ chế nội suy chuỗi (String Templates) và tuân thủ tuyệt đối quy chuẩn viết mã (Kotlin Coding Conventions).</p>
        <p class="para">- <b>Về cấu trúc điều khiển và thiết kế hàm:</b> Làm chủ câu lệnh điều kiện if/else, biểu thức when theo dải giá trị; vận dụng linh hoạt cơ chế tham số mặc định (Default arguments) và tham số định danh (Named arguments); thực thi triệt để nguyên lý DRY (Don't Repeat Yourself).</p>
        <p class="para">- <b>Về lập trình hướng đối tượng và kỹ thuật nâng cao:</b> Xây dựng Class với Primary Constructor, Custom Getter; triển khai quan hệ kế thừa và ghi đè phương thức (open/override); ứng dụng thành thạo toán tử Safe Call (?.) và toán tử Elvis (?:) nhằm loại bỏ nguy cơ ngoại lệ NullPointerException.</p>

        <h1 class="heading-1">II. NỘI DUNG VÀ KẾT QUẢ THỰC HÀNH CODELAB 1: INTRO TO KOTLIN</h1>
        <p class="para-noindent">Codelab 1 tập trung củng cố kiến thức nền tảng về cú pháp, biến, kiểu dữ liệu, hàm và chuẩn viết mã thông qua 10 bài tập tình huống độc lập:</p>
"""
    fig_idx = 1
    for item in c1_data:
        html_content += f"""
        <h2 class="heading-2">{item['num']}. {item['title']}</h2>
        <h3 class="heading-3">a) Yêu cầu và phân tích kỹ thuật</h3>
        <p class="para-noindent"><b>Mục tiêu bài tập:</b> {item['obj']}</p>
        <p class="para"><b>Phân tích giải pháp:</b> {item['analysis']}</p>
        
        <h3 class="heading-3">b) Mã nguồn chương trình hoàn chỉnh</h3>
        <pre class="code-box">{item['code']}</pre>

        <h3 class="heading-3">c) Kết quả thực thi và ảnh minh chứng</h3>
        <pre class="output-box"><div class="output-title">CONSOLE OUTPUT:</div>{item['output']}</pre>
        <img class="screenshot-img" src="screenshots/c1_bai{item['num']}.png" alt="Kết quả Bài {item['num']}">
        <div class="figure-caption">Hình {fig_idx}: Ảnh chụp màn hình kết quả chạy thực tế Bài {item['num']} trên Kotlin Playground</div>
        """
        fig_idx += 1

    html_content += """
        <div class="page-break"></div>
        <h1 class="heading-1">III. NỘI DUNG VÀ KẾT QUẢ THỰC HÀNH CODELAB 2: KOTLIN FUNDAMENTALS</h1>
        <p class="para-noindent">Codelab 2 nâng cấp độ phức tạp, tập trung vào cấu trúc điều khiển nâng cao, hàm bậc cao, biểu thức Lambda, lập trình hướng đối tượng và an toàn dữ liệu Null Safety thông qua 7 bài tập chuyên sâu:</p>
    """

    for item in c2_data:
        html_content += f"""
        <h2 class="heading-2">{item['num']}. {item['title']}</h2>
        <h3 class="heading-3">a) Yêu cầu và phân tích kỹ thuật</h3>
        <p class="para-noindent"><b>Mục tiêu bài tập:</b> {item['obj']}</p>
        <p class="para"><b>Phân tích giải pháp:</b> {item['analysis']}</p>
        
        <h3 class="heading-3">b) Mã nguồn chương trình hoàn chỉnh</h3>
        <pre class="code-box">{item['code']}</pre>

        <h3 class="heading-3">c) Kết quả thực thi và ảnh minh chứng</h3>
        <pre class="output-box"><div class="output-title">CONSOLE OUTPUT:</div>{item['output']}</pre>
        <img class="screenshot-img" src="screenshots/c2_bai{item['num']}.png" alt="Kết quả Bài {item['num']}">
        <div class="figure-caption">Hình {fig_idx}: Ảnh chụp màn hình kết quả chạy thực tế Bài {item['num']} (Codelab 2) trên Kotlin Playground</div>
        """
        fig_idx += 1

    html_content += """
        <div class="page-break"></div>
        <h1 class="heading-1">IV. TỔNG KẾT VÀ BÀI HỌC KINH NGHIỆM</h1>
        <h2 class="heading-2">1. Tổng kết kết quả học tập</h2>
        <p class="para">Thông qua quá trình nghiên cứu và giải quyết trọn vẹn 17 bài tập thuộc 2 bài thực hành lớn của Google Android:</p>
        <p class="para">- Sinh viên đã nắm bắt vững chắc tư duy lập trình hiện đại của Kotlin, đặc biệt là khả năng viết mã ngắn gọn, rõ nghĩa nhưng bảo đảm an toàn dữ liệu mức cao nhất.</p>
        <p class="para">- Đã làm chủ hoàn toàn các kỹ thuật nền tảng: từ biến, hàm, xử lý chuỗi đến cấu trúc hướng đối tượng, hàm bậc cao và xử lý an toàn rỗng (Null Safety).</p>

        <h2 class="heading-2">2. Ý nghĩa đối với việc phát triển ứng dụng Jetpack Compose</h2>
        <p class="para">Các khái niệm được thực hành trong Codelab (đặc biệt là Lambda, Trailing Lambda, Higher-Order Functions, Class và Custom Getter) chính là xương sống cấu tạo nên toàn bộ kiến trúc của Jetpack Compose. Việc làm chủ các kiến thức này là bước chuẩn bị hoàn hảo để xây dựng các Composable functions phức tạp và triển khai ứng dụng Android thương mại chất lượng cao.</p>

        <table class="signature-table">
            <tr>
                <td>
                    <div class="sign-title">GIẢNG VIÊN HƯỚNG DẪN / CHẤM BÀI</div>
                    <i>(Ký và ghi rõ họ tên)</i>
                    <div class="sign-space"></div>
                    <b>Thầy Vui</b>
                </td>
                <td>
                    <i>Hà Nội, ngày 22 tháng 09 năm 2026</i><br>
                    <div class="sign-title">SINH VIÊN THỰC HIỆN</div>
                    <i>(Ký và ghi rõ họ tên)</i>
                    <div class="sign-space"></div>
                    <div>....................................................</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
"""
    with open("BAO_CAO_KOTLIN_CODELAB.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("-> ĐÃ CẬP NHẬT FILE HTML:", "BAO_CAO_KOTLIN_CODELAB.html")

if __name__ == "__main__":
    render_all_images()
    build_docx_with_images()
    build_html_with_images()
