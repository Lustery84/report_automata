# -*- coding: utf-8 -*-
"""
Tạo Báo Cáo Thực Hành Kotlin Codelab chuẩn theo Form Dự Án baos caso (Nghị định 30/2020/NĐ-CP)
- Font: Times New Roman 100%
- Cỡ chữ: 13pt (Normal), 14-15pt (Heading)
- Căn lề: Trái 3.0cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm
- Dãn dòng: 1.15 lines, Căn đều (Justify), Thụt đầu dòng 1.0cm
- Tuyệt đối không dùng Icon / Emoji
- Phân cấp Heading 1-4 chuẩn cho Navigation Pane & Mục lục tự động
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

BLACK = RGBColor(0, 0, 0)
FONT = "Times New Roman"

def set_run_font(run, size=13, bold=False, italic=False, color=BLACK):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    rfonts.set(qn("w:ascii"), FONT)
    rfonts.set(qn("w:hAnsi"), FONT)
    rfonts.set(qn("w:eastAsia"), FONT)
    rfonts.set(qn("w:cs"), FONT)

def set_paragraph_format(p, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=6, line=1.15, first_line=None, left=None):
    pf = p.paragraph_format
    pf.alignment = align
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = line
    if first_line is not None:
        pf.first_line_indent = Cm(first_line)
    if left is not None:
        pf.left_indent = Cm(left)

def configure_styles(doc):
    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(13)
    normal.font.color.rgb = BLACK
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    nf = normal.paragraph_format
    nf.line_spacing = 1.15
    nf.space_after = Pt(6)

    specs = {
        "Heading 1": (15, True, False, 10, 6),
        "Heading 2": (14, True, False, 8, 4),
        "Heading 3": (13, True, True, 6, 3),
        "Heading 4": (13, False, True, 4, 2),
    }
    for name, (size, bold, italic, sp_before, sp_after) in specs.items():
        st = doc.styles[name]
        st.font.name = FONT
        st.font.size = Pt(size)
        st.font.bold = bold
        st.font.italic = italic
        st.font.color.rgb = BLACK
        st._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
        pf = st.paragraph_format
        pf.space_before = Pt(sp_before)
        pf.space_after = Pt(sp_after)
        pf.line_spacing = 1.15
        pf.alignment = WD_ALIGN_PARAGRAPH.LEFT

def new_doc():
    doc = Document()
    configure_styles(doc)
    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(3.0)
        section.right_margin = Cm(2.0)
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(2.0)
    return doc

def add_heading_1(doc, text):
    p = doc.add_heading(text, level=1)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for r in p.runs:
        set_run_font(r, size=15, bold=True, italic=False)
    return p

def add_heading_2(doc, text):
    p = doc.add_heading(text, level=2)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for r in p.runs:
        set_run_font(r, size=14, bold=True, italic=False)
    return p

def add_heading_3(doc, text):
    p = doc.add_heading(text, level=3)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for r in p.runs:
        set_run_font(r, size=13, bold=True, italic=True)
    return p

def add_heading_4(doc, text):
    p = doc.add_heading(text, level=4)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for r in p.runs:
        set_run_font(r, size=13, bold=False, italic=True)
    return p

def add_p(doc, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, first_line=1.0, space_after=6, space_before=0, left=None):
    p = doc.add_paragraph()
    set_paragraph_format(p, align=align, first_line=first_line, space_after=space_after, space_before=space_before, left=left)
    parts = text.split("**")
    for i, part in enumerate(parts):
        bold = (i % 2 == 1)
        subparts = part.split("*")
        for j, sub in enumerate(subparts):
            if not sub:
                continue
            r = p.add_run(sub)
            set_run_font(r, size=13, bold=bold, italic=(j % 2 == 1))
    return p

def add_center(doc, text, size=13, bold=False, italic=False, space_after=2, space_before=0):
    p = doc.add_paragraph()
    set_paragraph_format(p, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_after=space_after, space_before=space_before)
    r = p.add_run(text)
    set_run_font(r, size=size, bold=bold, italic=italic)
    return p

def add_left(doc, text, size=13, bold=False, italic=False, space_after=3, space_before=0):
    p = doc.add_paragraph()
    set_paragraph_format(p, align=WD_ALIGN_PARAGRAPH.LEFT, first_line=0, space_after=space_after, space_before=space_before)
    r = p.add_run(text)
    set_run_font(r, size=size, bold=bold, italic=italic)
    return p

def add_code_box(doc, code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Cm(16.0)
    
    cell = tbl.cell(0, 0)
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8F9FA"/>')
    tcPr.append(shd)
    
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="6" w:space="0" w:color="CCCCCC"/><w:left w:val="single" w:sz="18" w:space="0" w:color="333333"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="CCCCCC"/><w:right w:val="single" w:sz="6" w:space="0" w:color="CCCCCC"/></w:tcBorders>')
    tcPr.append(borders)
    
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)
    
    p = cell.paragraphs[0]
    set_paragraph_format(p, align=WD_ALIGN_PARAGRAPH.LEFT, first_line=0, space_before=2, space_after=2, line=1.1)
    r = p.add_run(code_text.strip())
    r.font.name = 'Consolas'
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph()

def add_output_box(doc, output_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Cm(16.0)
    
    cell = tbl.cell(0, 0)
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F1F5F9"/>')
    tcPr.append(shd)
    
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:left w:val="single" w:sz="18" w:space="0" w:color="475569"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/></w:tcBorders>')
    tcPr.append(borders)
    
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)
    
    p = cell.paragraphs[0]
    set_paragraph_format(p, align=WD_ALIGN_PARAGRAPH.LEFT, first_line=0, space_before=2, space_after=2, line=1.1)
    r_lbl = p.add_run("CONSOLE OUTPUT:\n")
    r_lbl.font.name = 'Consolas'
    r_lbl.font.size = Pt(9.5)
    r_lbl.font.bold = True
    r_lbl.font.color.rgb = RGBColor(71, 85, 105)
    
    r_out = p.add_run(output_text.strip())
    r_out.font.name = 'Consolas'
    r_out.font.size = Pt(10)
    r_out.font.color.rgb = RGBColor(15, 23, 42)
    doc.add_paragraph()

def add_screenshot_box(doc, ex_name):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Cm(16.0)
    
    cell = tbl.cell(0, 0)
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="FAFAFA"/>')
    tcPr.append(shd)
    
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="dashed" w:sz="8" w:space="0" w:color="7F7F7F"/><w:left w:val="dashed" w:sz="8" w:space="0" w:color="7F7F7F"/><w:bottom w:val="dashed" w:sz="8" w:space="0" w:color="7F7F7F"/><w:right w:val="dashed" w:sz="8" w:space="0" w:color="7F7F7F"/></w:tcBorders>')
    tcPr.append(borders)
    
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="180" w:type="dxa"/><w:bottom w:w="180" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)
    
    p = cell.paragraphs[0]
    set_paragraph_format(p, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=4, space_after=4)
    r = p.add_run(f"[HÌNH ẢNH MINH CHỨNG KẾT QUẢ CHẠY THỰC TẾ TRÊN KOTLIN PLAYGROUND: {ex_name}]\n(Sinh viên chụp ảnh màn hình gồm mã nguồn & kết quả chạy thử rồi dán vào đây)")
    set_run_font(r, size=11, bold=False, italic=True, color=RGBColor(100, 116, 139))
    doc.add_paragraph()

def add_cover_page(doc):
    # Header 2 columns table
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Cm(7.0)
    tbl.columns[1].width = Cm(9.0)
    
    c1 = tbl.cell(0, 0)
    p1 = c1.paragraphs[0]
    set_paragraph_format(p1, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_after=2)
    r1 = p1.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\n")
    set_run_font(r1, size=12, bold=False)
    r2 = p1.add_run("KHOA CÔNG NGHỆ THÔNG TIN")
    set_run_font(r2, size=12, bold=True)
    
    c2 = tbl.cell(0, 1)
    p2 = c2.paragraphs[0]
    set_paragraph_format(p2, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_after=2)
    r3 = p2.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n")
    set_run_font(r3, size=12, bold=True)
    r4 = p2.add_run("Độc lập - Tự do - Hạnh phúc\n")
    set_run_font(r4, size=12, bold=True, italic=True)
    r5 = p2.add_run("────────────────────")
    set_run_font(r5, size=11)
    
    doc.add_paragraph()
    doc.add_paragraph()
    
    add_center(doc, "BÁO CÁO KẾT QUẢ THỰC HÀNH LẬP TRÌNH KOTLIN", size=16, bold=True, space_before=12, space_after=4)
    add_center(doc, "CHUYÊN ĐỀ: CODELAB ANDROID BASICS WITH COMPOSE", size=14, bold=True, space_after=6)
    add_center(doc, "(Học phần: Phát triển Ứng dụng Di động - Android)", size=13, italic=True, space_after=24)
    
    # Information block
    tbl_info = doc.add_table(rows=5, cols=2)
    tbl_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_info.autofit = False
    tbl_info.columns[0].width = Cm(6.5)
    tbl_info.columns[1].width = Cm(9.5)
    
    info = [
        ("Giảng viên hướng dẫn:", "Thầy Vui"),
        ("Sinh viên thực hiện:", "................................................................"),
        ("Mã số sinh viên (MSSV):", "................................................................"),
        ("Lớp / Khóa đào tạo:", "................................................................"),
        ("Thời hạn nộp bài:", "Hết ngày 22 / 09 / 2026")
    ]
    for r_idx, (label, val) in enumerate(info):
        cell_l = tbl_info.cell(r_idx, 0)
        cell_r = tbl_info.cell(r_idx, 1)
        
        p_l = cell_l.paragraphs[0]
        set_paragraph_format(p_l, align=WD_ALIGN_PARAGRAPH.LEFT, first_line=0, space_after=3, space_before=2)
        r_l = p_l.add_run(label)
        set_run_font(r_l, size=13, bold=True)
        
        p_r = cell_r.paragraphs[0]
        set_paragraph_format(p_r, align=WD_ALIGN_PARAGRAPH.LEFT, first_line=0, space_after=3, space_before=2)
        r_r = p_r.add_run(val)
        set_run_font(r_r, size=13, bold=False)
        
    doc.add_paragraph()
    doc.add_paragraph()
    doc.add_paragraph()
    
    add_center(doc, "Hà Nội, tháng 09 năm 2026", size=13, italic=True)
    doc.add_page_break()

def add_signature(doc):
    doc.add_paragraph()
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Cm(8.0)
    table.columns[1].width = Cm(8.0)
    
    left = table.cell(0, 0)
    right = table.cell(0, 1)

    p_l = left.paragraphs[0]
    set_paragraph_format(p_l, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0)
    r = p_l.add_run("GIẢNG VIÊN HƯỚNG DẪN / CHẤM BÀI\n(Ký và ghi rõ họ tên)")
    set_run_font(r, size=13, bold=True)
    p_l2 = left.add_paragraph()
    set_paragraph_format(p_l2, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=48)
    r2 = p_l2.add_run("Thầy Vui")
    set_run_font(r2, size=13, bold=True)

    p_r = right.paragraphs[0]
    set_paragraph_format(p_r, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0)
    r = p_r.add_run("Hà Nội, ngày 22 tháng 09 năm 2026\nSINH VIÊN THỰC HIỆN\n(Ký và ghi rõ họ tên)")
    set_run_font(r, size=13, bold=True)
    p_r2 = right.add_paragraph()
    set_paragraph_format(p_r2, align=WD_ALIGN_PARAGRAPH.CENTER, first_line=0, space_before=48)
    r2 = p_r2.add_run("....................................................")
    set_run_font(r2, size=13)

# Data for 10 problems in Codelab 1
c1_data = [
    {
        "num": "1",
        "title": "In thông báo ra màn hình (Print messages)",
        "obj": "Rèn luyện kỹ năng định nghĩa hàm main() và sử dụng hàm xuất dữ liệu tiêu chuẩn println() để hiển thị văn bản theo cấu trúc nhiều dòng độc lập.",
        "analysis": "Hàm println() trong Kotlin thực hiện việc xuất một xâu ký tự ra thiết bị đầu ra chuẩn (console) và tự động nối thêm ký tự ngắt dòng (\\n). Đề bài yêu cầu in 4 câu quy tắc ngôn ngữ trên 4 dòng riêng biệt. Chương trình thực hiện 4 lời gọi liên tiếp tới hàm println() trong thân hàm main(). Cấu trúc chương trình đảm bảo tính tường minh và chuẩn mực của cú pháp khởi tạo trong Kotlin.",
        "code": """fun main() {
    println("Use the val keyword when the value doesn't change.")
    println("Use the var keyword when the value can change.")
    println("When you define a function, you define the parameters that can be passed to it.")
    println("When you call a function, you pass arguments for the parameters.")
}""",
        "output": """Use the val keyword when the value doesn't change.
Use the var keyword when the value can change.
When you define a function, you define the parameters that can be passed to it.
When you call a function, you pass arguments for the parameters."""
    },
    {
        "num": "2",
        "title": "Khắc phục lỗi biên dịch chuỗi (Fix compile error)",
        "obj": "Phát hiện và hiệu chỉnh các lỗi cú pháp cơ bản liên quan đến dấu phân cách xâu ký tự (String literals) và dấu đóng mở danh sách đối số của hàm.",
        "analysis": "Đoạn mã gốc gặp lỗi biên dịch: println(\"New chat message from a friend'} do việc mở chuỗi bằng dấu ngoặc kép (\") nhưng lại kết thúc sai bằng dấu nháy đơn (') và đóng nhầm ngoặc nhọn (}). Trong Kotlin, một hằng chuỗi ký tự bắt buộc phải được bao bọc nhất quán bởi cặp ngoặc kép \"...\". Đồng thời, danh sách đối số truyền cho hàm phải được bao trong cặp ngoặc đơn tròn (...). Sau khi chuẩn hóa dấu đóng ngoặc kép và ngoặc tròn, chương trình biên dịch thành công.",
        "code": """fun main() { 
    println("New chat message from a friend")
}""",
        "output": "New chat message from a friend"
    },
    {
        "num": "3",
        "title": "Khai báo biến và chèn biến vào chuỗi (String templates)",
        "obj": "Phân biệt thuộc tính bất biến (val) và khả biến (var); vận dụng kỹ thuật chèn giá trị biến trực tiếp vào xâu ký tự thông qua cơ chế String Templates.",
        "analysis": "Mã nguồn gốc phát sinh lỗi biên dịch do biến discountPercentage và offer được khai báo bằng từ khóa 'val' (read-only reference) nhưng lại thực hiện phép gán giá trị lần thứ hai ở các dòng tiếp theo. Trong chuẩn lập trình an toàn của Kotlin, các biến có giá trị xác định nên được khởi tạo trực tiếp ngay tại thời điểm khai báo. Ký tự đô-la ($) đứng trước tên biến ($discountPercentage, $item) cho phép trình biên dịch thực hiện nội suy giá trị của biến vào chuỗi tại thời điểm chạy mà không cần sử dụng các phép toán nối chuỗi rườm rà.",
        "code": """fun main() {
    val discountPercentage = 20
    val item = "Google Chromecast"
    val offer = "Sale - Up to $discountPercentage% discount on $item! Hurry up!"
    
    println(offer)
}""",
        "output": "Sale - Up to 20% discount on Google Chromecast! Hurry up!"
    },
    {
        "num": "4",
        "title": "Phép toán số học và kiểu dữ liệu số (String concatenation)",
        "obj": "Phân biệt sự khác nhau giữa kiểu xâu ký tự (String) và kiểu số nguyên (Int); phân biệt ngữ nghĩa của toán tử '+' trong ngữ cảnh ghép chuỗi và phép cộng đại số.",
        "analysis": "Trong đoạn mã ban đầu, các giá trị \"20\" và \"30\" được đặt trong cặp ngoặc kép nên được hệ thống phân loại kiểu dữ liệu ngầm định là String. Do đó, toán tử '+' được nạp chồng (overload) theo ngữ nghĩa ghép nối chuỗi ký tự, dẫn đến kết quả sai lệch là \"2030\". Bằng cách loại bỏ dấu ngoặc kép, hai định danh biến numberOfAdults và numberOfKids trở thành kiểu số nguyên Int. Khi đó toán tử '+' thực thi phép cộng số học trả về tổng giá trị là 50, phản ánh chính xác quy mô số lượng người tham dự.",
        "code": """fun main() {
    val numberOfAdults = 20
    val numberOfKids = 30
    val total = numberOfAdults + numberOfKids
    println("The total party size is: $total")
}""",
        "output": "The total party size is: 50"
    },
    {
        "num": "5",
        "title": "Định dạng thông điệp và biểu thức số học (Message formatting)",
        "obj": "Thực thi phép tính số học giữa các biến và tích hợp kết quả tính toán vào định dạng chuỗi thông báo kết quả.",
        "analysis": "Đoạn mã gốc thực hiện phép gán: totalSalary = \"$baseSalary + $bonusAmount\" khiến giá trị của biến totalSalary trở thành chuỗi ký tự thuần túy hiển thị nguyên văn \"5000 + 1000\" thay vì tổng số tiền thực nhận. Để giải quyết, biến totalSalary cần được gán bằng biểu thức số học baseSalary + bonusAmount nhằm tính toán chính xác tổng thu nhập là 6000 đơn vị tiền tệ, trước khi được nội suy vào chuỗi thông báo chúc mừng.",
        "code": """fun main() {
    val baseSalary = 5000
    val bonusAmount = 1000
    val totalSalary = baseSalary + bonusAmount
    println("Congratulations for your bonus! You will receive a total of $totalSalary (additional bonus).")
}""",
        "output": "Congratulations for your bonus! You will receive a total of 6000 (additional bonus)."
    },
    {
        "num": "6",
        "title": "Xây dựng hàm toán học cơ bản (Implement basic math operations)",
        "obj": "Nắm vững kỹ thuật định nghĩa hàm người dùng tự đặt (User-defined functions) với tham số đầu vào và kiểu dữ liệu trả về xác định.",
        "analysis": "Cú pháp định nghĩa hàm trong Kotlin sử dụng từ khóa 'fun', theo sau là tên hàm, danh sách tham số có chỉ định kiểu dữ liệu tường minh (name: Type) và kiểu trả về được đặt sau dấu hai chấm. Hàm add(firstNumber: Int, secondNumber: Int): Int thực hiện trả về tổng hai số qua lệnh return. Tương tự, hàm subtract thực thi phép trừ đại số. Việc đóng gói các phép tính thành hàm độc lập cho phép tái sử dụng mã nguồn tối ưu và nâng cao tính module hóa của chương trình.",
        "code": """fun main() {
    val firstNumber = 10
    val secondNumber = 5
    val thirdNumber = 8
    
    val result = add(firstNumber, secondNumber)
    val anotherResult = subtract(firstNumber, thirdNumber)

    println("$firstNumber + $secondNumber = $result")
    println("$firstNumber - $thirdNumber = $anotherResult")
}

fun add(firstNumber: Int, secondNumber: Int): Int {
    return firstNumber + secondNumber
}

fun subtract(firstNumber: Int, secondNumber: Int): Int {
    return firstNumber - secondNumber
}""",
        "output": """10 + 5 = 15
10 - 8 = 2"""
    },
    {
        "num": "7",
        "title": "Thiết lập tham số mặc định và tham số theo tên (Default parameters)",
        "obj": "Làm chủ tính năng tham số có giá trị mặc định (Default arguments) và cơ chế truyền tham số định danh theo tên (Named arguments).",
        "analysis": "Kotlin hỗ trợ thiết lập giá trị mặc định cho tham số ngay tại khai báo hàm: operatingSystem: String = \"Unknown OS\". Khi lời gọi hàm không truyền giá trị cho tham số này, trình biên dịch sẽ tự động gán giá trị mặc định được thiết lập trước. Kết hợp cùng cơ chế Named Arguments (truyền rõ emailId = firstUserEmailId), lập trình viên có thể bỏ qua các tham số mặc định mà không phụ thuộc vào thứ tự vị trí xuất hiện của tham số trong hàm.",
        "code": """fun main() {
    val firstUserEmailId = "user_one@gmail.com"
    println(displayAlertMessage(emailId = firstUserEmailId))
    println()

    val secondUserOperatingSystem = "Windows"
    val secondUserEmailId = "user_two@gmail.com"
    println(displayAlertMessage(secondUserOperatingSystem, secondUserEmailId))
    println()

    val thirdUserOperatingSystem = "Mac OS"
    val thirdUserEmailId = "user_three@gmail.com"
    println(displayAlertMessage(thirdUserOperatingSystem, thirdUserEmailId))
    println()
}

fun displayAlertMessage(
    operatingSystem: String = "Unknown OS",
    emailId: String
): String {
    return "There's a new sign-in request on $operatingSystem for your Google Account $emailId."
}""",
        "output": """There's a new sign-in request on Unknown OS for your Google Account user_one@gmail.com.

There's a new sign-in request on Windows for your Google Account user_two@gmail.com.

There's a new sign-in request on Mac OS for your Google Account user_three@gmail.com."""
    },
    {
        "num": "8",
        "title": "Chuẩn hóa định danh theo quy ước Kotlin (Pedometer)",
        "obj": "Áp dụng chuẩn quy tắc đặt tên chính thức của hệ sinh thái Kotlin (Kotlin Coding Conventions) - quy tắc lowerCamelCase.",
        "analysis": "Đoạn mã ban đầu vi phạm nghiêm trọng quy chuẩn định danh (viết hoa tùy tiện như PEDOMETERstepsTOcalories, NumberOFStepS, Steps) và chứa các dấu chấm phẩy không cần thiết. Trong Kotlin, tên hàm và tên biến bắt buộc tuân theo quy tắc lowerCamelCase: bắt đầu bằng chữ cái thường, các từ kế tiếp viết hoa chữ cái đầu (pedometerStepsToCalories, numberOfSteps, steps). Đồng thời, ngôn ngữ Kotlin quy định dấu chấm phẩy (;) ở cuối câu lệnh là tùy chọn và được khuyến nghị loại bỏ hoàn toàn.",
        "code": """fun main() {
    val steps = 4000
    val caloriesBurned = pedometerStepsToCalories(steps)
    println("Walking $steps steps burns $caloriesBurned calories") 
}

fun pedometerStepsToCalories(numberOfSteps: Int): Double {
    val caloriesBurnedForEachStep = 0.04
    val totalCaloriesBurned = numberOfSteps * caloriesBurnedForEachStep
    return totalCaloriesBurned
}""",
        "output": "Walking 4000 steps burns 160.0 calories"
    },
    {
        "num": "9",
        "title": "Xây dựng hàm so sánh điều kiện logic (Compare two numbers)",
        "obj": "Ứng dụng các toán tử so sánh quan hệ để xây dựng hàm trả về kiểu dữ liệu logic Boolean (true / false).",
        "analysis": "Hàm compareTime tiếp nhận 2 tham số số nguyên đại diện cho thời gian sử dụng điện thoại hôm nay và hôm qua. Biểu thức so sánh quan hệ timeSpentToday > timeSpentYesterday tự động đánh giá và trả về kết quả kiểu Boolean. Cú pháp ${compareTime(...)} trong String Template cho phép nhúng trực tiếp giá trị logic của biểu thức vào chuỗi in ra màn hình mà không cần trung gian biến phụ.",
        "code": """fun main() {
    println("Have I spent more time using my phone today: ${compareTime(300, 250)}")
    println("Have I spent more time using my phone today: ${compareTime(300, 300)}")
    println("Have I spent more time using my phone today: ${compareTime(200, 220)}")
}

fun compareTime(timeSpentToday: Int, timeSpentYesterday: Int): Boolean {
    return timeSpentToday > timeSpentYesterday
}""",
        "output": """Have I spent more time using my phone today: true
Have I spent more time using my phone today: false
Have I spent more time using my phone today: false"""
    },
    {
        "num": "10",
        "title": "Tối ưu hóa mã nguồn và loại bỏ trùng lặp (Duplicate code)",
        "obj": "Thực hiện nguyên lý kỹ nghệ phần mềm DRY (Don't Repeat Yourself) thông qua việc tái cấu trúc các lệnh in lặp lại thành một hàm tham số hóa.",
        "analysis": "Chương trình ban đầu lặp lại 4 khối lệnh println() cố định để in thời tiết của từng thành phố, gây dư thừa mã và tăng chi phí bảo trì khi dữ liệu thay đổi. Giải pháp tối ưu là gom nhóm cấu trúc in ấn thành hàm dùng chung printWeatherForCity tiếp nhận 4 tham số: tên thành phố, nhiệt độ thấp, nhiệt độ cao và xác suất mưa. Khi đó, hàm main() chỉ thực hiện gọi hàm với các bộ dữ liệu cụ thể, giúp mã nguồn cô đọng, dễ đọc và dễ mở rộng.",
        "code": """fun main() {
    printWeatherForCity("Ankara", 27, 31, 82)
    printWeatherForCity("Tokyo", 32, 36, 10)
    printWeatherForCity("Cape Town", 59, 64, 2)
    printWeatherForCity("Guatemala City", 50, 55, 7)
}

fun printWeatherForCity(cityName: String, lowTemp: Int, highTemp: Int, chanceOfRain: Int) {
    println("City: $cityName")
    println("Low temperature: $lowTemp, High temperature: $highTemp")
    println("Chance of rain: $chanceOfRain%")
    println()
}""",
        "output": """City: Ankara
Low temperature: 27, High temperature: 31
Chance of rain: 82%

City: Tokyo
Low temperature: 32, High temperature: 36
Chance of rain: 10%

City: Cape Town
Low temperature: 59, High temperature: 64
Chance of rain: 2%

City: Guatemala City
Low temperature: 50, High temperature: 55
Chance of rain: 7%"""
    }
]

# Data for 7 problems in Codelab 2
c2_data = [
    {
        "num": "1",
        "title": "Điều kiện rẽ nhánh thông báo di động (Mobile notifications)",
        "obj": "Ứng dụng cấu trúc điều khiển rẽ nhánh if/else để xử lý logic tóm tắt số lượng thông báo theo ngưỡng giới hạn.",
        "analysis": "Chương trình mô phỏng tính năng gom nhóm thông báo trên hệ điều hành Android. Hàm printNotificationSummary sử dụng cấu trúc if/else để kiểm tra biến numberOfMessages. Nếu số lượng thông báo nhỏ hơn 100, hệ thống xuất thông báo cụ thể kèm số lượng chính xác; ngược lại nếu đạt từ 100 thông báo trở lên, hệ thống hiển thị chuỗi cảnh báo quy ước 99+ để tránh tràn giao diện người dùng.",
        "code": """fun main() {
    val morningNotification = 51
    val eveningNotification = 135
    
    printNotificationSummary(morningNotification)
    printNotificationSummary(eveningNotification)
}

fun printNotificationSummary(numberOfMessages: Int) {
    if (numberOfMessages < 100) {
        println("You have $numberOfMessages notifications.")
    } else {
        println("Your phone is blowing up! You have 99+ notifications.")
    }
}""",
        "output": """You have 51 notifications.
Your phone is blowing up! You have 99+ notifications."""
    },
    {
        "num": "2",
        "title": "Biểu thức kiểm tra theo dải giá trị tính giá vé (Movie-ticket price)",
        "obj": "Sử dụng biểu thức 'when' kết hợp dải giá trị (range in ..) để thay thế cấu trúc if-else phân nhánh phức tạp.",
        "analysis": "Trong Kotlin, 'when' là một biểu thức có khả năng trả về giá trị (expression) thay vì chỉ đóng vai trò câu lệnh điều khiển như switch-case truyền thống. Dải giá trị (in 0..12, in 13..60, in 61..100) giúp mã nguồn trực quan, dễ quản lý các khoảng độ tuổi. Tại nhóm tuổi lao động (13..60), một biểu thức điều kiện ngắn gọn if (isMonday) 25 else 30 được lồng ghép để áp dụng giá ưu đãi ngày đầu tuần. Ký tự escape \\$ được dùng để xuất biểu tượng tiền tệ đô-la ra màn hình mà không kích hoạt cú pháp String Template.",
        "code": """fun main() {
    val child = 5
    val adult = 28
    val senior = 87
    
    val isMonday = true
    
    println("The movie ticket price for a person aged $child is \$${ticketPrice(child, isMonday)}.")
    println("The movie ticket price for a person aged $adult is \$${ticketPrice(adult, isMonday)}.")
    println("The movie ticket price for a person aged $senior is \$${ticketPrice(senior, isMonday)}.")
}
 
fun ticketPrice(age: Int, isMonday: Boolean): Int {
    return when(age) {
        in 0..12 -> 15
        in 13..60 -> if (isMonday) 25 else 30
        in 61..100 -> 20
        else -> -1
    }
}""",
        "output": """The movie ticket price for a person aged 5 is $15.
The movie ticket price for a person aged 28 is $25.
The movie ticket price for a person aged 87 is $20."""
    },
    {
        "num": "3",
        "title": "Ứng dụng hàm bậc cao và biểu thức Lambda (Temperature converter)",
        "obj": "Làm chủ khái niệm Hàm bậc cao (Higher-Order Functions), cú pháp biểu thức Lambda và quy tắc Trailing Lambda trong Kotlin.",
        "analysis": "Hàm bậc cao printFinalTemperature nhận tham số cuối cùng là một biến kiểu hàm: conversionFormula: (Double) -> Double. Theo quy ước Trailing Lambda của Kotlin, nếu tham số cuối cùng của hàm là một lambda expression, ta có thể đặt khối mã lambda ngoài cặp ngoặc đơn. Trong thân biểu thức lambda, từ khóa ngầm định 'it' đại diện cho tham số đầu vào duy nhất (giá trị nhiệt độ ban đầu). Hàm String.format(\"%.2f\", ...) thực hiện làm tròn kết quả đến 2 chữ số thập phân trước khi xuất chuỗi.",
        "code": """fun main() {    
    printFinalTemperature(27.0, "Celsius", "Fahrenheit") { 9.0 / 5.0 * it + 32 }
    printFinalTemperature(350.0, "Kelvin", "Celsius") { it - 273.15 }
    printFinalTemperature(10.0, "Fahrenheit", "Kelvin") { 5.0 / 9.0 * (it - 32) + 273.15 }
}

fun printFinalTemperature(
    initialMeasurement: Double, 
    initialUnit: String, 
    finalUnit: String, 
    conversionFormula: (Double) -> Double
) {
    val finalMeasurement = String.format("%.2f", conversionFormula(initialMeasurement))
    println("$initialMeasurement degrees $initialUnit is $finalMeasurement degrees $finalUnit.")
}""",
        "output": """27.0 degrees Celsius is 80.60 degrees Fahrenheit.
350.0 degrees Kelvin is 76.85 degrees Celsius.
10.0 degrees Fahrenheit is 260.93 degrees Kelvin."""
    },
    {
        "num": "4",
        "title": "Lập trình hướng đối tượng với Class và Custom Getter (Song catalog)",
        "obj": "Khởi tạo lớp (Class), hàm khởi tạo chính (Primary Constructor) và thiết lập hàm lấy dữ liệu tùy biến (Custom Getter) cho thuộc tính động.",
        "analysis": "Lớp Song được khai báo gọn gàng với Primary Constructor chứa 4 thuộc tính cơ bản. Điểm đặc thù trong lập trình Kotlin là thuộc tính isPopular không cấp phát vùng nhớ lưu trữ tĩnh, mà sử dụng Custom Getter: get() = playCount >= 1000. Mỗi khi thuộc tính isPopular được truy xuất, trình biên dịch sẽ tự động tính toán lại điều kiện dựa trên giá trị playCount hiện tại. Phương thức printDescription() đảm nhiệm việc xuất thông tin mô tả chi tiết của đối tượng bài hát.",
        "code": """fun main() {    
    val brunoSong = Song("We Don't Talk About Bruno", "Encanto Cast", 2022, 1_000_000)
    brunoSong.printDescription()
    println(brunoSong.isPopular)
}

class Song(
    val title: String, 
    val artist: String, 
    val yearPublished: Int, 
    val playCount: Int
) {
    val isPopular: Boolean
        get() = playCount >= 1000

    fun printDescription() {
        println("$title, performed by $artist, was released in $yearPublished.")
    }   
}""",
        "output": """We Don't Talk About Bruno, performed by Encanto Cast, was released in 2022.
true"""
    },
    {
        "num": "5",
        "title": "Quản lý thuộc tính Nullable và cơ chế an toàn Null Safety (Internet profile)",
        "obj": "Áp dụng cơ chế an toàn bộ nhớ (Null Safety), kiểu dữ liệu cho phép chứa null (Nullable types) và kỹ thuật Smart Cast của Kotlin.",
        "analysis": "Trong lớp Person, hai thuộc tính hobby và referrer được khai báo kiểu Nullable (String? và Person?) cho phép mang giá trị null khi người dùng không cung cấp thông tin. Trong phương thức showProfile(), việc kiểm tra điều kiện if (hobby != null) và if (referrer != null) giúp kích hoạt tính năng Smart Cast của trình biên dịch Kotlin: tự động ép kiểu đối tượng về kiểu non-null tương ứng trong phạm vi khối lệnh. Điều này loại bỏ hoàn toàn nguy cơ phát sinh ngoại lệ kinh điển NullPointerException trong môi trường thực thi Android.",
        "code": """fun main() {    
    val amanda = Person("Amanda", 33, "play tennis", null)
    val atiqah = Person("Atiqah", 28, "climb", amanda)
    
    amanda.showProfile()
    atiqah.showProfile()
}

class Person(val name: String, val age: Int, val hobby: String?, val referrer: Person?) {
    fun showProfile() {
        println("Name: $name")
        println("Age: $age")
        if (hobby != null) {
            print("Likes to $hobby. ")
        }
        if (referrer != null) {
            print("Has a referrer named ${referrer.name}")
            if (referrer.hobby != null) {
                print(", who likes to ${referrer.hobby}.")
            } else {
                print(".")
            }
        } else {
            print("Doesn't have a referrer.")
        }
        print("\\n\\n")
    }
}""",
        "output": """Name: Amanda
Age: 33
Likes to play tennis. Doesn't have a referrer.

Name: Atiqah
Age: 28
Likes to climb. Has a referrer named Amanda, who likes to play tennis."""
    },
    {
        "num": "6",
        "title": "Cơ chế kế thừa và ghi đè phương thức (Foldable phones)",
        "obj": "Làm chủ tính kế thừa (Inheritance) trong Kotlin bằng từ khóa 'open' và ghi đè phương thức (method overriding) bằng từ khóa 'override'.",
        "analysis": "Mặc định trong Kotlin, mọi lớp và phương thức đều ở trạng thái 'final' (đóng, không cho phép kế thừa). Để cho phép lớp con kế thừa và tùy biến hành vi, lớp cha Phone và phương thức switchOn() bắt buộc phải được đánh dấu bằng từ khóa 'open'. Lớp con FoldablePhone kế thừa Phone và ghi đè lại hàm switchOn() với từ khóa 'override': màn hình điện thoại chỉ được kích hoạt bật sáng khi thiết bị đang ở trạng thái mở (!isFolded). Các phương thức fold() và unfold() điều khiển trạng thái vật lý của thiết bị.",
        "code": """open class Phone(var isScreenLightOn: Boolean = false) {
    open fun switchOn() {
        isScreenLightOn = true
    }
    
    fun switchOff() {
        isScreenLightOn = false
    }
    
    fun checkPhoneScreenLight() {
        val phoneScreenLight = if (isScreenLightOn) "on" else "off"
        println("The phone screen's light is $phoneScreenLight.")
    }
}

class FoldablePhone(var isFolded: Boolean = true) : Phone() {
    override fun switchOn() {
        if (!isFolded) {
            isScreenLightOn = true
        }
    }
    
    fun fold() {
        isFolded = true
    }
    
    fun unfold() {
        isFolded = false
    }
}

fun main() {    
    val newFoldablePhone = FoldablePhone()
    
    newFoldablePhone.switchOn()
    newFoldablePhone.checkPhoneScreenLight()
    newFoldablePhone.unfold()
    newFoldablePhone.switchOn()
    newFoldablePhone.checkPhoneScreenLight()
}""",
        "output": """The phone screen's light is off.
The phone screen's light is on."""
    },
    {
        "num": "7",
        "title": "Xử lý giá trị mặc định bằng toán tử Elvis và Safe Call (Special auction)",
        "obj": "Vận dụng kết hợp toán tử gọi an toàn (Safe Call ?.) và toán tử gán giá trị dự phòng Elvis (?:) để xử lý logic dữ liệu rỗng.",
        "analysis": "Hàm auctionPrice tiếp nhận tham số bid có thể null (Bid?) và minimumPrice: Int. Biểu thức bid?.amount ?: minimumPrice hoạt động theo cơ chế ngắn gọn: nếu đối tượng bid khác null, toán tử safe call lấy giá trị thuộc tính amount; ngược lại nếu bid là null, toán tử Elvis (?:) lập tức trả về giá trị mặc định minimumPrice. Cú pháp một dòng này giúp chương trình vừa an toàn tuyệt đối trước nguy cơ lỗi null, vừa tối ưu hóa độ dài và tính rõ ràng của mã nguồn.",
        "code": """fun main() {
    val winningBid = Bid(5000, "Private Collector")
    
    println("Item A is sold at ${auctionPrice(winningBid, 2000)}.")
    println("Item B is sold at ${auctionPrice(null, 3000)}.")
}

class Bid(val amount: Int, val bidder: String)

fun auctionPrice(bid: Bid?, minimumPrice: Int): Int {
    return bid?.amount ?: minimumPrice
}""",
        "output": """Item A is sold at 5000.
Item B is sold at 3000."""
    }
]

def build_full_report():
    doc = new_doc()
    
    # 1. BÌA BÁO CÁO CHUẨN
    add_cover_page(doc)
    
    # 2. KHỐI THÔNG SỐ ĐỊNH DẠNG BẮT BUỘC (MANDATORY HEADER)
    p_spec = doc.add_paragraph()
    set_paragraph_format(p_spec, align=WD_ALIGN_PARAGRAPH.JUSTIFY, first_line=0, space_before=6, space_after=12)
    r_spec = p_spec.add_run("Thông số thiết lập trên Word: Font: Times New Roman | Cỡ chữ: 13-14 (Tiêu đề 14-16) | Dãn dòng: 1.15 - 1.5 lines | Căn lề: Trái 3.0cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm.")
    set_run_font(r_spec, size=11, italic=True, color=RGBColor(80, 80, 80))
    
    # --- PHẦN I: ĐẶT VẤN ĐỀ VÀ MỤC TIÊU ---
    add_heading_1(doc, "I. ĐẶT VẤN ĐỀ VÀ MỤC TIÊU BÀI THỰC HÀNH")
    
    add_heading_2(doc, "1. Bối cảnh học phần và tầm quan trọng của ngôn ngữ Kotlin")
    add_p(doc, "Trong xu thế phát triển ứng dụng di động hiện đại, Google đã chính thức công nhận Kotlin là ngôn ngữ lập trình ưu tiên số một (Kotlin-first) cho nền tảng Android kể từ năm 2019. Với sự ra đời và phổ biến mạnh mẽ của Jetpack Compose - bộ công cụ hiện đại hàng đầu xây dựng giao diện người dùng theo mô hình khai báo (Declarative UI), việc làm chủ nền tảng ngôn ngữ Kotlin không chỉ là yêu cầu bắt buộc mà còn là điều kiện tiên quyết giúp lập trình viên tiếp cận kiến trúc ứng dụng Android chuyên nghiệp.")
    add_p(doc, "Bộ bài tập thực hành Google Codelabs (bao gồm Codelab 'Intro to Kotlin: Practice Problems' và Codelab 'Kotlin Fundamentals: Practice Problems') được thiết kế theo các tình huống nghiệp vụ thực tế, bám sát các đặc tính cốt lõi của ngôn ngữ như tính an toàn với giá trị rỗng (Null Safety), hàm bậc cao (Higher-Order Functions), biểu thức Lambda và mô hình hướng đối tượng hiện đại.")

    add_heading_2(doc, "2. Mục tiêu kỹ năng và kiến thức cần đạt")
    add_p(doc, "- **Về cú pháp nền tảng:** Phân định chính xác biến bất biến (val) và biến khả biến (var); quản trị bộ nhớ an toàn; làm chủ cơ chế nội suy chuỗi (String Templates) và tuân thủ tuyệt đối quy chuẩn viết mã (Kotlin Coding Conventions).")
    add_p(doc, "- **Về cấu trúc điều khiển và thiết kế hàm:** Làm chủ câu lệnh điều kiện if/else, biểu thức when theo dải giá trị; vận dụng linh hoạt cơ chế tham số mặc định (Default arguments) và tham số định danh (Named arguments); thực thi triệt để nguyên lý DRY (Don't Repeat Yourself).")
    add_p(doc, "- **Về lập trình hướng đối tượng và kỹ thuật nâng cao:** Xây dựng Class với Primary Constructor, Custom Getter; triển khai quan hệ kế thừa và ghi đè phương thức (open/override); ứng dụng thành thạo toán tử Safe Call (?.) và toán tử Elvis (?:) nhằm loại bỏ nguy cơ ngoại lệ NullPointerException.")

    # --- PHẦN II: CODELAB 1 ---
    add_heading_1(doc, "II. NỘI DUNG VÀ KẾT QUẢ THỰC HÀNH CODELAB 1: INTRO TO KOTLIN")
    add_p(doc, "Codelab 1 tập trung củng cố kiến thức nền tảng về cú pháp, biến, kiểu dữ liệu, hàm và chuẩn viết mã thông qua 10 bài tập tình huống độc lập:")

    for item in c1_data:
        add_heading_2(doc, f"{item['num']}. {item['title']}")
        
        add_heading_3(doc, "a) Yêu cầu và phân tích kỹ thuật")
        add_p(doc, f"**Mục tiêu bài tập:** {item['obj']}")
        add_p(doc, f"**Phân tích giải pháp:** {item['analysis']}")
        
        add_heading_3(doc, "b) Mã nguồn chương trình hoàn chỉnh")
        add_code_box(doc, item['code'])
        
        add_heading_3(doc, "c) Kết quả thực thi và ảnh minh chứng")
        add_output_box(doc, item['output'])
        add_screenshot_box(doc, item['title'])

    # --- PHẦN III: CODELAB 2 ---
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
        add_screenshot_box(doc, item['title'])

    # --- PHẦN IV: TỔNG KẾT VÀ ĐÁNH GIÁ ---
    add_heading_1(doc, "IV. TỔNG KẾT VÀ BÀI HỌC KINH NGHIỆM")
    add_heading_2(doc, "1. Tổng kết kết quả học tập")
    add_p(doc, "Thông qua quá trình nghiên cứu và giải quyết trọn vẹn 17 bài tập thuộc 2 bài thực hành lớn của Google Android:")
    add_p(doc, "- Sinh viên đã nắm bắt vững chắc tư duy lập trình hiện đại của Kotlin, đặc biệt là khả năng viết mã ngắn gọn, rõ nghĩa nhưng bảo đảm an toàn dữ liệu mức cao nhất.")
    add_p(doc, "- Đã làm chủ hoàn toàn các kỹ thuật nền tảng: từ biến, hàm, xử lý chuỗi đến cấu trúc hướng đối tượng, hàm bậc cao và xử lý an toàn rỗng (Null Safety).")
    
    add_heading_2(doc, "2. Ý nghĩa đối với việc phát triển ứng dụng Jetpack Compose")
    add_p(doc, "Các khái niệm được thực hành trong Codelab (đặc biệt là Lambda, Trailing Lambda, Higher-Order Functions, Class và Custom Getter) chính là xương sống cấu tạo nên toàn bộ kiến trúc của Jetpack Compose. Việc làm chủ các kiến thức này là bước chuẩn bị hoàn hảo để xây dựng các Composable functions phức tạp và triển khai ứng dụng Android thương mại chất lượng cao.")

    # --- PHẦN V: XÁC NHẬN VÀ CHỮ KÝ ---
    add_signature(doc)

    out_path = "BAO_CAO_KOTLIN_CODELAB.docx"
    doc.save(out_path)
    print("SAVED STANDARDIZED DOCX:", out_path)

if __name__ == "__main__":
    build_full_report()
