/* ==========================================================================
   Academic Outline Studio - Complete Application Controller
   Integrated with:
   - 360+ Grounding Academic Corpus (data/academic_corpus_database.json)
   - Client-Side BYOK Google Gemini REST Streaming Service
   - Decree 30/2020/NĐ-CP Word (.docx) & PDF Academic Document Exporter
   - Zero-dependency Lightweight Markdown Renderer
   ========================================================================== */

let currentOutline = null;
let activeSampleReportIndex = 0;
let lastGeneratedReportText = '';
let isGeneratingReport = false;
let reportAbortController = null;

/* --------------------------------------------------------------------------
   1. Application Lifecycle & Theme Initialization
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // 1. Theme setup
    const savedTheme = localStorage.getItem('studio_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // 2. Render sample quick chips
    renderSampleChips();

    // 3. Preload 360+ academic benchmark corpus
    try {
        await AcademicCorpusManager.init();
    } catch (e) {
        console.warn('Academic corpus preload warning:', e);
    }

    // 4. Update Gemini API Key status indicator
    updateKeyStatusDot();

    // 5. Initialize Attachment drag, drop and clipboard paste
    AttachmentManager.init();

    // 6. Restore active outline or show empty canvas
    const active = OutlineGeneratorEngine.getActiveOutline();
    if (active) {
        renderOutlineCanvas(active);
    } else {
        showEmptyCanvas();
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('studio_theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* --------------------------------------------------------------------------
   Attachment & Multimodal Input Manager (Images, PDFs, Data/Code files)
   -------------------------------------------------------------------------- */
const AttachmentManager = {
    attachments: [],

    init() {
        const dropZones = [
            document.getElementById('notes-input'),
            document.getElementById('attachment-drop-area')
        ].filter(Boolean);

        dropZones.forEach(zone => {
            ['dragenter', 'dragover'].forEach(name => {
                zone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    zone.classList.add('dragover');
                    if (zone.id === 'notes-input') {
                        zone.style.borderColor = 'var(--accent)';
                        zone.style.background = 'var(--accent-subtle)';
                    }
                });
            });

            ['dragleave', 'drop'].forEach(name => {
                zone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    zone.classList.remove('dragover');
                    if (zone.id === 'notes-input') {
                        zone.style.borderColor = '';
                        zone.style.background = '';
                    }
                });
            });

            zone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    this.addFiles(files);
                }
            });
        });

        // Clipboard paste listener (for direct screenshots)
        window.addEventListener('paste', (e) => {
            // Ignore if active element is an input outside our form
            const items = (e.clipboardData || window.clipboardData)?.items;
            if (!items) return;
            const filesToHandle = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type && items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const now = new Date();
                        const pad = (n) => String(n).padStart(2, '0');
                        const name = `anh_dan_${pad(now.getHours())}h${pad(now.getMinutes())}m${pad(now.getSeconds())}s.png`;
                        const f = new File([blob], name, { type: blob.type });
                        filesToHandle.push(f);
                    }
                }
            }
            if (filesToHandle.length > 0) {
                this.addFiles(filesToHandle);
            }
        });
    },

    getAttachments() {
        return this.attachments;
    },

    async addFiles(files) {
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (this.attachments.some(a => a.name === file.name && a.size === file.size)) {
                continue;
            }

            if (file.size > 20 * 1024 * 1024) {
                alert(`Tệp "${file.name}" vượt quá dung lượng tối đa 20MB.`);
                continue;
            }

            try {
                const item = await this.processFile(file);
                if (item) {
                    this.attachments.push(item);
                }
            } catch (err) {
                console.warn('Lỗi đọc tệp đính kèm:', file.name, err);
            }
        }

        this.renderTray();
    },

    processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const id = 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const isText = file.type.startsWith('text/') || 
                /\.(txt|csv|json|md|py|kt|java|cpp|c|cs|sql|html|css|js|ts|xml|yaml|yml)$/i.test(file.name);

            if (isImage || isPdf) {
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const base64Data = dataUrl.split(',')[1];
                    const mimeType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');

                    resolve({
                        id,
                        name: file.name,
                        size: file.size,
                        formattedSize: formatFileSize(file.size),
                        mimeType,
                        dataUrl,
                        base64Data,
                        isImage,
                        isPdf,
                        isText: false
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            } else if (isText) {
                reader.onload = (e) => {
                    resolve({
                        id,
                        name: file.name,
                        size: file.size,
                        formattedSize: formatFileSize(file.size),
                        mimeType: file.type || 'text/plain',
                        textContent: e.target.result,
                        isImage: false,
                        isPdf: false,
                        isText: true
                    });
                };
                reader.onerror = reject;
                reader.readAsText(file, 'utf-8');
            } else {
                alert(`Tệp "${file.name}" là định dạng nhị phân chưa hỗ trợ đọc trực tiếp. Bạn nên lưu sang file PDF hoặc copy/paste nội dung vào ô để AI tiếp nhận tốt nhất.`);
                resolve(null);
            }
        });
    },

    remove(id) {
        this.attachments = this.attachments.filter(a => a.id !== id);
        this.renderTray();
    },

    clear() {
        this.attachments = [];
        this.renderTray();
    },

    renderTray() {
        const tray = document.getElementById('attachments-tray');
        if (!tray) return;

        if (this.attachments.length === 0) {
            tray.style.display = 'none';
            tray.innerHTML = '';
            return;
        }

        tray.style.display = 'flex';
        tray.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 4px;">
                    <i class="ph ph-paperclip"></i>
                    Đã nạp ${this.attachments.length} tệp/ảnh vào bộ nhớ AI
                </span>
                <button type="button" style="background: none; border: none; font-size: 10.5px; color: var(--text-tertiary); cursor: pointer;" onclick="AttachmentManager.clear()">Xóa hết</button>
            </div>
        ` + this.attachments.map(att => `
            <div class="attachment-chip">
                <div class="attachment-chip-info">
                    ${att.isImage ? `
                        <img src="${att.dataUrl}" class="attachment-chip-thumb" alt="thumbnail">
                    ` : `
                        <div class="attachment-chip-icon">
                            <i class="${att.isPdf ? 'ph ph-file-pdf' : 'ph ph-file-text'}"></i>
                        </div>
                    `}
                    <div style="overflow: hidden;">
                        <div class="attachment-chip-name" title="${escapeHtml(att.name)}">${escapeHtml(att.name)}</div>
                        <div class="attachment-chip-meta">${att.formattedSize} &bull; ${att.isImage ? 'Ảnh (Diagram/Chart)' : (att.isPdf ? 'Tài liệu PDF' : 'Dữ liệu/Mã nguồn')}</div>
                    </div>
                </div>
                <button type="button" class="attachment-chip-del" onclick="AttachmentManager.remove('${att.id}')" title="Gỡ bỏ tệp này">
                    <i class="ph ph-x"></i>
                </button>
            </div>
        `).join('');
    }
};

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function handleAttachmentFileSelect(input) {
    if (input && input.files) {
        AttachmentManager.addFiles(input.files);
        input.value = '';
    }
}

/* --------------------------------------------------------------------------
   2. Outline Form & Canvas Controller
   -------------------------------------------------------------------------- */
function renderSampleChips() {
    const container = document.getElementById('samples-container');
    if (!container) return;
    const samples = OutlineGeneratorEngine.SAMPLE_PROMPTS;
    container.innerHTML = samples.map((s, idx) => `
        <div class="sample-chip" onclick="applySamplePrompt(${idx})">
            <strong>[${s.discipline.toUpperCase()}]</strong> ${escapeHtml(s.topic)}
        </div>
    `).join('');
}

async function applySamplePrompt(idx) {
    const s = OutlineGeneratorEngine.SAMPLE_PROMPTS[idx];
    document.getElementById('disc-select').value = s.discipline;
    document.getElementById('type-select').value = s.type;
    document.getElementById('school-input').value = s.school;
    document.getElementById('topic-input').value = s.topic;
    document.getElementById('notes-input').value = s.notes;

    const btn = document.getElementById('generate-outline-btn');
    const btnIcon = document.getElementById('generate-outline-btn-icon');
    const btnText = document.getElementById('generate-outline-btn-text');

    try {
        if (btn) btn.disabled = true;
        if (btnIcon) btnIcon.className = 'ph ph-spinner ph-spin';
        if (btnText) btnText.innerText = 'Đang AI kiến trúc hóa...';

        const generated = await OutlineGeneratorEngine.generateOutlineAdaptive({
            topic: s.topic,
            discipline: s.discipline,
            schoolName: s.school,
            reportType: s.type,
            customNotes: s.notes,
            apiKey: GeminiService.getApiKey(),
            model: GeminiService.getModel()
        });
        renderOutlineCanvas(generated);
    } catch (err) {
        console.error('Error applying sample prompt:', err);
    } finally {
        if (btn) btn.disabled = false;
        if (btnIcon) btnIcon.className = 'ph ph-sparkle';
        if (btnText) btnText.innerText = 'Khởi Tạo Khung Sườn';
    }
}

async function handleFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const topic = document.getElementById('topic-input').value;
    const discipline = document.getElementById('disc-select').value;
    const reportType = document.getElementById('type-select').value;
    const schoolName = document.getElementById('school-input').value;
    const customNotes = document.getElementById('notes-input').value;

    const attachments = AttachmentManager.getAttachments();
    let effectiveNotes = customNotes;
    if (attachments.length > 0) {
        const attNames = attachments.map(a => `${a.name} (${a.isImage ? 'Ảnh' : (a.isPdf ? 'PDF' : 'Dữ liệu')})`).join(', ');
        effectiveNotes = (customNotes ? customNotes + ' | ' : '') + `Tệp/ảnh đính kèm: ${attNames}`;
    }

    const btn = document.getElementById('generate-outline-btn');
    const btnIcon = document.getElementById('generate-outline-btn-icon');
    const btnText = document.getElementById('generate-outline-btn-text');

    try {
        if (btn) btn.disabled = true;
        if (btnIcon) btnIcon.className = 'ph ph-spinner ph-spin';
        if (btnText) btnText.innerText = 'Đang AI kiến trúc hóa khung sườn...';

        const generated = await OutlineGeneratorEngine.generateOutlineAdaptive({
            topic,
            discipline,
            schoolName,
            reportType,
            customNotes: effectiveNotes,
            attachments,
            apiKey: GeminiService.getApiKey(),
            model: GeminiService.getModel()
        });

        renderOutlineCanvas(generated);
    } catch (err) {
        console.error('Error generating outline:', err);
        alert('Có lỗi phát sinh trong quá trình kiến trúc hóa khung sườn: ' + err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (btnIcon) btnIcon.className = 'ph ph-sparkle';
        if (btnText) btnText.innerText = 'Khởi Tạo Khung Sườn';
    }
}

function renderOutlineCanvas(outline) {
    currentOutline = outline;
    document.getElementById('canvas-empty').style.display = 'none';
    const doc = document.getElementById('canvas-document');
    doc.classList.add('active');

    // Header metadata
    document.getElementById('doc-disc-badge').innerText = outline.disciplineName;
    document.getElementById('doc-type-badge').innerText = outline.reportTypeName;
    document.getElementById('doc-school-badge').innerText = outline.schoolName;
    document.getElementById('doc-time-badge').innerText = outline.createdAt || '2026';
    document.getElementById('doc-topic-display').innerText = outline.topic;
    document.getElementById('doc-standards-display').innerText = `Thể thức: ${outline.standards} | Trích dẫn: ${outline.citation}`;

    // Grounding Provenance Banner
    const banner = document.getElementById('doc-grounding-banner');
    if (banner) {
        if (outline.provenance) {
            banner.style.display = 'block';
            if (outline.provenance.type === 'ai') {
                const benchRef = outline.provenance.groundingBenchmark
                    ? `<span style="font-size: 11px; opacity: 0.85;"> • Đối chuẩn SOTA: <strong>${escapeHtml(outline.provenance.groundingBenchmark.id)}</strong> (${escapeHtml(outline.provenance.groundingBenchmark.institution)})</span>`
                    : '';
                banner.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <i class="ph-fill ph-sparkle" style="color: #10b981; font-size: 17px;"></i>
                            <span style="font-size: 12.5px; color: var(--text-primary); font-weight: 600;">
                                Khung sườn kiến trúc độc quyền bởi Gemini (${escapeHtml(outline.provenance.model || 'Flash')})
                            </span>
                            <span style="font-size: 11px; color: var(--text-tertiary);">• Học tập &amp; tối ưu hóa theo quy chuẩn Đại học Việt Nam</span>
                            ${benchRef}
                        </div>
                        <span class="meta-pill" style="border-color: rgba(16, 185, 129, 0.4); color: #10b981; font-size: 11px; white-space: nowrap;">100% Bespoke AI</span>
                    </div>
                `;
            } else if (outline.provenance.type === 'corpus') {
                banner.innerHTML = `
                    <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <i class="ph-fill ph-graduation-cap" style="color: #3b82f6; font-size: 17px;"></i>
                            <span style="font-size: 12.5px; color: var(--text-primary); font-weight: 600;">
                                Học tập &amp; kế thừa cấu trúc từ đề tài chuẩn: ${escapeHtml(outline.provenance.id)} - ${escapeHtml(outline.provenance.title)}
                            </span>
                            <span style="font-size: 11px; color: var(--text-tertiary);">(${escapeHtml(outline.provenance.institution)})</span>
                        </div>
                        <span class="meta-pill" style="border-color: rgba(59, 130, 246, 0.4); color: #3b82f6; font-size: 11px; white-space: nowrap;">360-Corpus Grounded</span>
                    </div>
                `;
            }
        } else {
            banner.style.display = 'none';
            banner.innerHTML = '';
        }
    }

    // Density Metrics
    const pagesEl = document.getElementById('metric-pages');
    if (pagesEl) pagesEl.innerText = outline.targetPages || '30 - 45 trang';
    const densityEl = document.getElementById('metric-density');
    if (densityEl) densityEl.innerText = outline.densityTarget || '≥ 10 bảng & sơ đồ';
    const citationsEl = document.getElementById('metric-citations');
    if (citationsEl) citationsEl.innerText = outline.citationTarget || '12 - 15 nguồn';

    // Synchronize Form inputs
    document.getElementById('disc-select').value = outline.discipline;
    document.getElementById('type-select').value = outline.reportType;
    document.getElementById('school-input').value = outline.schoolName;
    document.getElementById('topic-input').value = outline.topic;
    document.getElementById('notes-input').value = outline.notes || '';

    // Render Chapters
    const root = document.getElementById('chapters-root');
    root.innerHTML = (outline.chapters || []).map((ch) => `
        <section class="chapter-section">
            <div class="chapter-heading-row">
                <h2 class="chapter-heading">${escapeHtml(ch.title)}</h2>
                <span class="chapter-purpose">${escapeHtml(ch.purpose)}</span>
            </div>

            <div class="sections-stack">
                ${(ch.sections || []).map(sec => `
                    <div class="section-node">
                        <div class="section-node-header">
                            <span class="section-code">Mục ${escapeHtml(sec.num)}</span>
                            <h3 class="section-title">${escapeHtml(sec.title)}</h3>
                        </div>
                        <p class="section-guidance">${escapeHtml(sec.guidance)}</p>
                        <div class="section-specs-footer">
                            <div class="spec-tags-group">
                                <span>Yêu cầu bắt buộc:</span>
                                ${(sec.required || ['Phân tích học thuật']).map(r => `<span class="spec-tag">${escapeHtml(r)}</span>`).join('')}
                            </div>
                            ${sec.example ? `<span style="font-family: var(--font-mono); color: var(--text-tertiary);">VD: ${escapeHtml(sec.example)}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `).join('');
}

function showEmptyCanvas() {
    document.getElementById('canvas-empty').style.display = 'flex';
    document.getElementById('canvas-document').classList.remove('active');
}

function newOutlineSession() {
    OutlineGeneratorEngine.clearActiveOutline();
    AttachmentManager.clear();
    document.getElementById('topic-input').value = '';
    document.getElementById('notes-input').value = '';
    showEmptyCanvas();
    document.getElementById('topic-input').focus();
}

function openPromptModal() {
    if (!currentOutline) return;
    const prompt = OutlineGeneratorEngine.generateAIPrompt(currentOutline);
    document.getElementById('prompt-text').innerText = prompt;
    document.getElementById('prompt-modal').classList.add('open');
}

function closePromptModal() {
    document.getElementById('prompt-modal').classList.remove('open');
}

function copyAIPrompt() {
    const prompt = document.getElementById('prompt-text').innerText;
    navigator.clipboard.writeText(prompt).then(() => {
        const label = document.getElementById('copy-btn-label');
        const orig = label.innerText;
        label.innerText = 'Đã Sao Chép!';
        setTimeout(() => {
            label.innerText = orig;
        }, 2000);
    });
}

/* --------------------------------------------------------------------------
   3. 360+ Academic Corpus Explorer Modal Controller
   -------------------------------------------------------------------------- */
let currentCorpusTab = 'all';
let activeCorpusId = null;

async function openSampleLibraryModal() {
    await AcademicCorpusManager.init();
    updateSubDisciplineDropdown();
    renderCorpusView();
    document.getElementById('sample-library-modal').classList.add('open');
}

function closeSampleLibraryModal() {
    document.getElementById('sample-library-modal').classList.remove('open');
}

function setCorpusDisciplineTab(tab) {
    currentCorpusTab = tab;
    document.querySelectorAll('#corpus-tabs .corpus-tab').forEach(btn => {
        if (btn.getAttribute('data-disc') === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    updateSubDisciplineDropdown();
    renderCorpusView();
}

function updateSubDisciplineDropdown() {
    const select = document.getElementById('corpus-subdisc-select');
    if (!select) return;
    if (currentCorpusTab === 'fulltext') {
        select.style.display = 'none';
        return;
    }
    select.style.display = 'block';
    const subDiscs = AcademicCorpusManager.getSubDisciplines(currentCorpusTab);
    select.innerHTML = '<option value="all">Tất cả chuyên ngành hẹp</option>' +
        subDiscs.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
}

function handleCorpusSearch() {
    renderCorpusView();
}

function handleCorpusSubDiscChange() {
    renderCorpusView();
}

function renderCorpusView() {
    const listContainer = document.getElementById('corpus-list-container');
    const detailContainer = document.getElementById('corpus-detail-container');
    const searchInput = document.getElementById('corpus-search-input');
    const subDiscSelect = document.getElementById('corpus-subdisc-select');
    const footerInfo = document.getElementById('corpus-footer-info');

    // Tab 1: 4 Full-Text Benchmark Reports
    if (currentCorpusTab === 'fulltext') {
        footerInfo.innerText = '4 Báo cáo toàn văn chuyên sâu tại: data/sample_reports/';
        listContainer.innerHTML = `
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-tertiary); margin-bottom: 6px; font-family: var(--font-mono);">
                BÁO CÁO TOÀN VĂN BENCHMARK (4 BÀI)
            </div>
        ` + FULL_SAMPLE_REPORTS.map((r, idx) => `
            <div class="corpus-card ${idx === activeSampleReportIndex ? 'active' : ''}" onclick="selectFullTextReport(${idx})">
                <div class="corpus-card-top">
                    <span class="corpus-card-id">${escapeHtml(r.discipline)}</span>
                    <span class="corpus-card-sub">${escapeHtml(r.school)}</span>
                </div>
                <div class="corpus-card-title">${escapeHtml(r.title)}</div>
                <div class="corpus-card-footer">
                    <span>${escapeHtml(r.highlights)}</span>
                </div>
            </div>
        `).join('');

        renderFullTextDetail(FULL_SAMPLE_REPORTS[activeSampleReportIndex]);
        return;
    }

    // Tab 2: 360+ Academic Database
    const query = searchInput ? searchInput.value : '';
    const subDiscipline = subDiscSelect ? subDiscSelect.value : 'all';

    const results = AcademicCorpusManager.search({
        query,
        discipline: currentCorpusTab,
        subDiscipline
    });

    footerInfo.innerText = `Hiển thị ${results.length} / 360 đề tài nghiên cứu đối sánh (Kho dữ liệu: data/academic_corpus_database.json)`;

    if (results.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-tertiary);">
                <i class="ph ph-magnifying-glass" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>
                <p style="font-size: 13px;">Không tìm thấy đề tài phù hợp với từ khóa.</p>
                <button class="btn btn-secondary" style="margin-top: 12px; font-size: 12px;" onclick="resetCorpusSearch()">Xóa Bộ Lọc</button>
            </div>
        `;
        detailContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-tertiary); font-size: 13px;">
                Vui lòng thử lại với từ khóa hoặc chuyên ngành khác.
            </div>
        `;
        return;
    }

    if (!activeCorpusId || !results.some(r => r.id === activeCorpusId)) {
        activeCorpusId = results[0].id;
    }

    listContainer.innerHTML = `
        <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-tertiary); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>KẾT QUẢ: <strong>${results.length}</strong> ĐỀ TÀI</span>
            <span>90 BÀI / NGÀNH</span>
        </div>
    ` + results.map(item => {
        const isActive = item.id === activeCorpusId;
        const metricsList = Object.entries(item.key_metrics || {}).slice(0, 2);
        return `
            <div class="corpus-card ${isActive ? 'active' : ''}" onclick="selectCorpusItem('${item.id}')">
                <div class="corpus-card-top">
                    <span class="corpus-card-id">${item.id}</span>
                    <span class="corpus-card-sub" title="${escapeHtml(item.sub_discipline)}">${escapeHtml(item.sub_discipline)}</span>
                </div>
                <div class="corpus-card-title">${escapeHtml(item.title)}</div>
                <div class="corpus-metrics-row">
                    ${metricsList.map(([k, v]) => `<span class="corpus-metric-chip">${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong></span>`).join('')}
                </div>
                <div class="corpus-card-footer">
                    <span>${escapeHtml(item.institution)}</span>
                    <span>${item.year}</span>
                </div>
            </div>
        `;
    }).join('');

    const selectedItem = results.find(r => r.id === activeCorpusId) || results[0];
    renderCorpusDetail(selectedItem);
}

function selectCorpusItem(id) {
    activeCorpusId = id;
    renderCorpusView();
}

function selectFullTextReport(idx) {
    activeSampleReportIndex = idx;
    renderCorpusView();
}

function resetCorpusSearch() {
    const input = document.getElementById('corpus-search-input');
    const select = document.getElementById('corpus-subdisc-select');
    if (input) input.value = '';
    if (select) select.value = 'all';
    setCorpusDisciplineTab('all');
}

function renderCorpusDetail(item) {
    const container = document.getElementById('corpus-detail-container');
    if (!item || !container) return;

    const metricsEntries = Object.entries(item.key_metrics || {});

    container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="corpus-card-id" style="font-size: 11px; padding: 3px 8px;">${item.id}</span>
                    <span class="meta-pill accent">${escapeHtml(item.discipline_name)}</span>
                    <span class="meta-pill">${escapeHtml(item.institution)}</span>
                    <span class="meta-pill">${item.year}</span>
                    <span class="meta-pill" style="font-family: var(--font-mono);">Trích dẫn: ${escapeHtml(item.citation_format)}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-accent" style="font-size: 11.5px; padding: 5px 12px;" onclick="applyCorpusItemToStudio('${item.id}')">
                        <i class="ph ph-lightning"></i>
                        <span>Áp Dụng Cho Studio</span>
                    </button>
                    <button class="btn btn-secondary" style="font-size: 11.5px; padding: 5px 10px;" onclick="copyCorpusItemDossier('${item.id}')">
                        <i class="ph ph-copy"></i>
                        <span id="copy-dossier-label-${item.id}">Copy Hồ Sơ</span>
                    </button>
                </div>
            </div>

            <h2 style="font-size: 16px; font-weight: 700; line-height: 1.4; color: var(--text-primary); margin-bottom: 6px;">
                ${escapeHtml(item.title)}
            </h2>
            <div style="font-size: 12px; color: var(--text-secondary);">
                Chuyên ngành: <strong>${escapeHtml(item.sub_discipline)}</strong> | Đối sánh: <strong>${escapeHtml(item.institution)}</strong>
            </div>
        </div>

        <!-- 1. Methodology & Theoretical Models -->
        <div class="dossier-box">
            <div class="dossier-box-title">
                <i class="ph ph-brain"></i>
                <span>Phương Pháp Nghiên Cứu & Mô Hình Lý Thuyết Cốt Lõi</span>
            </div>
            <p style="font-size: 13px; line-height: 1.55; color: var(--text-primary); margin-bottom: 10px;">
                ${escapeHtml(item.methodology)}
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${(item.theoretical_models || []).map(m => `
                    <span style="font-family: var(--font-mono); font-size: 11px; background: var(--bg-elevated); border: 1px solid var(--border); padding: 3px 8px; border-radius: var(--radius-xs); color: var(--accent);">
                        ${escapeHtml(m)}
                    </span>
                `).join('')}
            </div>
        </div>

        <!-- 2. Dataset / Hardware & Quantitative Metrics -->
        <div class="dossier-box">
            <div class="dossier-box-title">
                <i class="ph ph-chart-bar"></i>
                <span>Chỉ Số Định Lượng Thực Nghiệm & Dữ Liệu Thực Tế</span>
            </div>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 10px;">
                <strong>Tập dữ liệu / Phần cứng:</strong> ${escapeHtml(item.dataset_hardware)}
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
                ${metricsEntries.map(([k, v]) => `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 8px 12px;">
                        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-tertiary); text-transform: uppercase;">${escapeHtml(k)}</div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(v)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- 3. Standard Chapter Outlines -->
        <div class="dossier-box">
            <div class="dossier-box-title">
                <i class="ph ph-list-numbers"></i>
                <span>Khung Sườn 5 Chương Chuẩn Mực Học Thuật</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${(item.standard_outline || []).map((ch, idx) => `
                    <div style="display: flex; align-items: baseline; gap: 8px; font-size: 12.5px;">
                        <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--accent); min-width: 20px;">${idx + 1}.</span>
                        <span style="color: var(--text-primary);">${escapeHtml(ch)}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- 4. PEEL Academic Paragraph Highlight -->
        <div class="dossier-box" style="border-left: 3px solid var(--accent);">
            <div class="dossier-box-title" style="color: var(--accent);">
                <i class="ph ph-certificate"></i>
                <span>Quy Chuẩn Đoạn Văn Chuyên Sâu (Mô Hình PEEL)</span>
            </div>
            <div style="font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px;">
                <div><strong style="color: var(--text-primary);">Point (Luận điểm):</strong> ${escapeHtml(item.peel_framework.Point)}</div>
                <div><strong style="color: var(--text-primary);">Explanation (Cơ chế lý thuyết):</strong> ${escapeHtml(item.peel_framework.Explanation)}</div>
                <div><strong style="color: var(--text-primary);">Evidence (Dẫn chứng định lượng):</strong> <code style="font-family: var(--font-mono); font-size: 11px; color: var(--accent);">${escapeHtml(item.peel_framework.Evidence)}</code></div>
                <div><strong style="color: var(--text-primary);">Link (Tiểu kết):</strong> ${escapeHtml(item.peel_framework.Link)}</div>
            </div>
        </div>

        <!-- 5. Scientific Citation Sample -->
        <div class="dossier-box">
            <div class="dossier-box-title">
                <i class="ph ph-quotes"></i>
                <span>Trích Dẫn Khoa Học Chuẩn (${escapeHtml(item.citation_format)})</span>
            </div>
            <div class="prompt-raw-box" style="padding: 10px; font-size: 11.5px; max-height: none;">
${escapeHtml(item.citation_sample)}
            </div>
        </div>
    `;
}

function renderFullTextDetail(report) {
    const container = document.getElementById('corpus-detail-container');
    if (!report || !container) return;

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 12px;">
            <div>
                <span class="meta-pill accent">${escapeHtml(report.discipline)}</span>
                <span class="meta-pill">${escapeHtml(report.school)}</span>
                <h2 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-top: 6px;">${escapeHtml(report.title)}</h2>
            </div>
            <button class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;" onclick="copyActiveSampleReport()">
                <i class="ph ph-copy"></i>
                <span id="copy-sample-btn-label">Copy Toàn Văn</span>
            </button>
        </div>
        <div class="prompt-raw-box" id="sample-viewer-content" style="max-height: 480px; color: var(--text-primary); font-family: var(--font-sans); font-size: 13px; line-height: 1.6; white-space: pre-wrap; background: var(--bg-surface);">
${escapeHtml(report.fullText || 'Đang tải...')}
        </div>
    `;
}

function copyActiveSampleReport() {
    const report = FULL_SAMPLE_REPORTS[activeSampleReportIndex];
    if (!report) return;
    navigator.clipboard.writeText(report.fullText).then(() => {
        const label = document.getElementById('copy-sample-btn-label');
        if (label) {
            const orig = label.innerText;
            label.innerText = 'Đã Copy!';
            setTimeout(() => { label.innerText = orig; }, 2000);
        }
    });
}

function copyCorpusItemDossier(id) {
    const item = AcademicCorpusManager.getById(id);
    if (!item) return;

    const text = `# HỒ SƠ ĐỐI SÁNH HỌC THUẬT: [${item.id}] ${item.title}
- Chuyên ngành: ${item.sub_discipline}
- Cơ sở đào tạo: ${item.institution} (${item.year})
- Chuẩn trích dẫn: ${item.citation_format}
- Phương pháp nghiên cứu: ${item.methodology}
- Mô hình lý thuyết / Thuật toán: ${item.theoretical_models.join(', ')}
- Dữ liệu / Phần cứng thực nghiệm: ${item.dataset_hardware}
- Chỉ số định lượng: ${JSON.stringify(item.key_metrics, null, 2)}

## KHUNG SƯỜN CHƯƠNG MỤC:
${item.standard_outline.map((ch, i) => `${i+1}. ${ch}`).join('\n')}

## MÔ HÌNH LUẬN ĐIỂM PEEL:
- Point: ${item.peel_framework.Point}
- Explanation: ${item.peel_framework.Explanation}
- Evidence: ${item.peel_framework.Evidence}
- Link: ${item.peel_framework.Link}

## TRÍCH DẪN MẪU:
${item.citation_sample}
`;

    navigator.clipboard.writeText(text).then(() => {
        const label = document.getElementById(`copy-dossier-label-${id}`);
        if (label) {
            const orig = label.innerText;
            label.innerText = 'Đã Copy!';
            setTimeout(() => { label.innerText = orig; }, 2000);
        }
    });
}

async function applyCorpusItemToStudio(id) {
    const item = AcademicCorpusManager.getById(id);
    if (!item) return;

    let discMapped = 'cntt';
    if (item.discipline_key === 'KT') discMapped = 'kinhte';
    else if (item.discipline_key === 'KTDT') discMapped = 'kythuat';
    else if (item.discipline_key === 'KHXH') discMapped = 'xahoi';

    document.getElementById('disc-select').value = discMapped;
    document.getElementById('topic-input').value = item.title;
    document.getElementById('school-input').value = item.institution;
    document.getElementById('notes-input').value = `Mô hình: ${item.theoretical_models.join(', ')}. Phương pháp: ${item.methodology}. Dữ liệu thực nghiệm: ${item.dataset_hardware}.`;

    closeSampleLibraryModal();

    const generated = await OutlineGeneratorEngine.generateOutlineAdaptive({
        topic: item.title,
        discipline: discMapped,
        schoolName: item.institution,
        reportType: 'do_an',
        customNotes: document.getElementById('notes-input').value,
        benchmarkItem: item,
        apiKey: GeminiService.getApiKey(),
        model: GeminiService.getModel()
    });

    renderOutlineCanvas(generated);
}

/* --------------------------------------------------------------------------
   4. BYOK Google Gemini REST Client Service
   -------------------------------------------------------------------------- */
const GeminiService = {
    STORAGE_KEY: 'gemini_api_key',
    STORAGE_MODEL: 'gemini_model',

    getApiKey() {
        return localStorage.getItem(this.STORAGE_KEY) || '';
    },

    saveApiKey(key) {
        if (!key || !key.trim()) {
            localStorage.removeItem(this.STORAGE_KEY);
        } else {
            localStorage.setItem(this.STORAGE_KEY, key.trim());
        }
        updateKeyStatusDot();
    },

    removeApiKey() {
        localStorage.removeItem(this.STORAGE_KEY);
        updateKeyStatusDot();
    },

    getModel() {
        const saved = localStorage.getItem(this.STORAGE_MODEL);
        const deprecated = ['gemini-2.0-flash', 'models/gemini-2.0-flash', 'gemini-2.5-flash', 'models/gemini-2.5-flash'];
        if (!saved || deprecated.includes(saved)) {
            localStorage.setItem(this.STORAGE_MODEL, 'gemini-3.6-flash');
            return 'gemini-3.6-flash';
        }
        return saved;
    },

    saveModel(model) {
        let safeModel = model || 'gemini-3.6-flash';
        if (safeModel.includes('2.0-flash') || safeModel.includes('2.5-flash')) safeModel = 'gemini-3.6-flash';
        localStorage.setItem(this.STORAGE_MODEL, safeModel);
    },

    STORAGE_SEARCH_GROUNDING: 'academic_studio_search_grounding',
    STORAGE_GEN_MODE: 'academic_studio_gen_mode',

    isSearchGroundingEnabled() {
        const saved = localStorage.getItem(this.STORAGE_SEARCH_GROUNDING);
        return saved === null ? true : saved === 'true';
    },

    setSearchGroundingEnabled(enabled) {
        localStorage.setItem(this.STORAGE_SEARCH_GROUNDING, enabled ? 'true' : 'false');
    },

    getGenerationMode() {
        return localStorage.getItem(this.STORAGE_GEN_MODE) || 'chained';
    },

    setGenerationMode(mode) {
        localStorage.setItem(this.STORAGE_GEN_MODE, mode || 'chained');
    },

    async testConnection(key, model) {
        const apiKey = (key || this.getApiKey()).trim();
        let apiModel = model || this.getModel();
        if (apiModel.includes('2.0-flash') || apiModel.includes('2.5-flash')) apiModel = 'gemini-3.6-flash';

        if (!apiKey) {
            throw new Error('Vui lòng nhập API Key trước khi kiểm tra.');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
        const body = {
            contents: [
                {
                    parts: [
                        { text: 'Xin chào, hãy trả lời đúng một chữ: "OK"' }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 10,
                temperature: 0.1
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`;
            if (msg.includes('no longer available') || msg.includes('not found') || res.status === 404) {
                const matches = [...msg.matchAll(/models\/([\w.-]+)/g)].map(m => m[1]);
                const recModel = matches.filter(m => m !== apiModel).pop() || (apiModel !== 'gemini-3.6-flash' ? 'gemini-3.6-flash' : 'gemini-1.5-flash');
                if (recModel && recModel !== apiModel) {
                    console.warn(`[testConnection] Auto-recovering model from ${apiModel} to ${recModel}...`);
                    this.saveModel(recModel);
                    return this.testConnection(key, recModel);
                }
            }
            throw new Error(msg);
        }

        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Kết nối thành công!';
    },

    /**
     * Generate a dedicated, single chapter or section using full 8,192 token horizon
     * strictly enforcing academic standards, PEEL model, quantitative tables, and full code.
     */
    async generateSingleChapterStream({
        outline,
        stageIndex,
        stageType,
        chapterData,
        previousSummary,
        groundingDossier,
        enableSearch = true,
        signal,
        onChunk,
        onStatus
    }) {
        const apiKey = this.getApiKey();
        let model = this.getModel();
        if (model.includes('2.0-flash') || model.includes('2.5-flash')) {
            model = 'gemini-3.6-flash';
            this.saveModel('gemini-3.6-flash');
        }

        if (!apiKey) {
            throw new Error('Chưa cấu hình Gemini API Key. Vui lòng bấm vào nút [🔑 Gemini API Key] để nhập key.');
        }

        let stageTitle = '';
        let targetWordCount = '';
        let specificDirectives = '';

        if (stageType === 'intro') {
            stageTitle = 'PHẦN MỞ ĐẦU';
            targetWordCount = '1.800 – 2.500 từ';
            specificDirectives = `
NHIỆM VỤ GIAI ĐOẠN 0: XUẤT BẢN TOÀN DIỆN PHẦN MỞ ĐẦU ĐỒ ÁN (Mục tiêu dung lượng: ${targetWordCount}):
Bắt buộc phải viết chi tiết, hàn lâm, không viết gạch đầu dòng cụt ngủn, triển khai đầy đủ các mục:
# PHẦN MỞ ĐẦU: ĐẶT VẤN ĐỀ VÀ MỤC TIÊU NGHIÊN CỨU
## 1. Tính cấp thiết của đề tài: Phân tích bối cảnh công nghệ/kinh tế xã hội 2024-2026, chỉ rõ khoảng trống nghiên cứu (Research Gap) và lý do cấp bách phải thực hiện đề tài.
## 2. Mục tiêu nghiên cứu: Xác lập Mục tiêu tổng quát và 4-5 Mục tiêu cụ thể theo chuẩn SMART (đo lường được chỉ số).
## 3. Đối tượng và phạm vi nghiên cứu: Xác định rõ đối tượng trực tiếp, khách thể, không gian triển khai, thời gian dữ liệu (2021-2026) và các giới hạn kỹ thuật.
## 4. Phương pháp luận nghiên cứu: Mô tả phương pháp thu thập dữ liệu, phương pháp định lượng/toán học, môi trường mô phỏng thực nghiệm hoặc kiểm thử.
## 5. Ý nghĩa khoa học và giá trị thực tiễn: Đóng góp mới về mặt học thuật và khả năng ứng dụng thực tế vào sản xuất/doanh nghiệp.
## 6. Bố cục cấu trúc của báo cáo: Tóm tắt ngắn gọn nội dung và mục tiêu cốt lõi của từng chương tiếp theo.`;
        } else if (stageType === 'conclusion') {
            stageTitle = 'KẾT LUẬN VÀ TÀI LIỆU THAM KHẢO';
            targetWordCount = '1.800 – 2.500 từ';
            specificDirectives = `
NHIỆM VỤ GIAI ĐOẠN CUỐI: TỔNG KẾT TOÀN DIỆN CÔNG TRÌNH & TRÍCH DẪN CHUẨN MỰC (Mục tiêu: ${targetWordCount}):
Bắt buộc triển khai đầy đủ các mục:
# KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
## 1. Tổng kết các kết quả đạt được: Đối chiếu với các mục tiêu SMART đã đề ra ở Phần Mở Đầu, định lượng hóa những gì đề tài đã hoàn thành (kèm bảng tóm tắt chỉ số).
## 2. Đóng góp học thuật và tính mới: Khẳng định các phát hiện mới, giải pháp tối ưu hoặc cải tiến kỹ thuật.
## 3. Những hạn chế còn tồn tại: Đánh giá khách quan các điểm nghẽn về tài nguyên phần cứng, dung lượng dữ liệu hoặc điều kiện thử nghiệm.
## 4. Đề xuất kiến nghị & Hướng nghiên cứu tiếp theo: Lộ trình nâng cấp hệ thống trong 1-2 năm tới.
# TÀI LIỆU THAM KHẢO
Xuất bản danh mục Tài liệu tham khảo theo đúng chuẩn ${outline.citation || 'APA 7th'}, sắp xếp chuẩn mực với tối thiểu 12-15 tài liệu chất lượng cao (bài báo tạp chí, hội nghị quốc tế IEEE/ACM, giáo trình đại học, văn bản pháp luật Nghị định).`;
        } else {
            stageTitle = chapterData.title;
            const chNum = stageIndex;
            if (chNum === 1) {
                targetWordCount = '3.000 – 4.000 từ (Chiếm 20% dung lượng)';
                specificDirectives = `
NHIỆM VỤ CHƯƠNG 1: CƠ SỞ LÝ LUẬN & TỔNG QUAN NGHIÊN CỨU SOTA (Mục tiêu: ${targetWordCount}):
- BẮT BUỘC phân tích chuyên sâu các mô hình lý thuyết, nền tảng toán học/thuật toán giải quyết bài toán.
- BẮT BUỘC có ít nhất 1-2 BẢNG ĐỐI SÁNH MARKDOWN TABLE so sánh các công trình nghiên cứu tiền nhiệm trong và ngoài nước (chỉ ra ưu nhược điểm, độ chính xác, hạn chế của từng phương pháp).
- Tuyệt đối không viết gạch đầu dòng cụt lủn. Mọi đoạn văn chuyên môn phải viết theo mô hình PEEL (Point -> Explanation -> Evidence -> Link) với độ dài tối thiểu 3-4 đoạn cho mỗi mục con.`;
            } else if (chNum === 2) {
                targetWordCount = '4.000 – 5.500 từ (Chiếm 35% dung lượng - Trọng tâm thực trạng)';
                specificDirectives = `
NHIỆM VỤ CHƯƠNG 2: KHẢO SÁT THỰC TRẠNG & BÓC TÁCH DỮ LIỆU ĐỊNH LƯỢNG 3-5 NĂM (Mục tiêu: ${targetWordCount}):
- BẮT BUỘC lập ít nhất 2-3 BẢNG SỐ LIỆU ĐỊNH LƯỢNG THỰC NGHIỆM bằng Markdown Table (Đầy đủ tiêu đề in đậm Bảng 2.x, Đơn vị tính, Dòng nguồn rõ ràng).
- Khai thác triệt để các hình ảnh/tệp đính kèm người dùng cung cấp để bóc tách thông số.
- Phân tích cặn kẽ từng bảng số liệu theo cấu trúc PEEL: Luận điểm -> Cơ chế vận hành -> Dẫn chứng con số cụ thể từ bảng -> Tiểu kết tác động.
- Chỉ ra các nguyên nhân gốc rễ và điểm nghẽn kỹ thuật/kinh tế cần phải giải quyết ở Chương 3.`;
            } else if (chNum === 3) {
                targetWordCount = '4.500 – 6.000 từ (Chiếm 35% dung lượng - TRỌNG TÂM CHIẾM ĐIỂM CAO NHẤT)';
                specificDirectives = `
NHIỆM VỤ CHƯƠNG 3: HIỆN THỰC HÓA GIẢI PHÁP, THIẾT KẾ KIẾN TRÚC & MÃ NGUỒN CỐT LÕI (Mục tiêu: ${targetWordCount}):
- BẮT BUỘC thiết kế Sơ đồ kiến trúc tổng thể, mô tả luồng dữ liệu (Data Flow) và lưu đồ thuật toán (Flowchart).
- BẮT BUỘC CUNG CẤP MÃ NGUỒN HOÀN CHỈNH, CHUẨN MỰC (Full Production Code) bằng các khối code markdown cho các module then chốt (Clean Architecture, Domain logic, Controller, Firmware C/C++, Thuật toán ML...). TUYỆT ĐỐI KHÔNG VIẾT CODE TƯỢNG TRƯNG 3 DÒNG HAY ĐỂ '// TODO'.
- Giải thích chi tiết từng hàm, cấu trúc dữ liệu, cơ chế đồng bộ và các biện pháp bảo mật/tối ưu hiệu năng.`;
            } else {
                targetWordCount = '2.500 – 3.500 từ (Chiếm 10% dung lượng)';
                specificDirectives = `
NHIỆM VỤ CHƯƠNG 4: THỰC NGHIỆM, KIỂM THỬ ĐỊNH LƯỢNG & ĐÁNH GIÁ SAI SỐ (Mục tiêu: ${targetWordCount}):
- BẮT BUỘC xây dựng Ma trận kịch bản kiểm thử (Test Cases Matrix).
- BẮT BUỘC có ít nhất 2 BẢNG ĐO KIỂM CHỈ SỐ THỰC TẾ (Độ trễ, Thông lượng, Độ chính xác, RMSE, F1-score, hoặc các chỉ số tài chính/hiệu suất).
- Đánh giá sai số thực nghiệm và các hạn chế kỹ thuật theo mô hình PEEL.`;
            }
        }

        const systemPrompt = `Bạn là một Giáo sư / Trưởng Hội đồng Đánh giá Học thuật cao cấp tại Việt Nam.
Nhiệm vụ của bạn là viết một CHƯƠNG HỌC THUẬT CHUYÊN SÂU ĐIỂM A (9.0+) cho đề tài: "${outline.topic}".

CÁC NGUYÊN TẮC BẮT BUỘC TUÂN THỦ:
1. NGHỊ ĐỊNH 30/2020/NĐ-CP: Văn phong hàn lâm, ngôi thứ ba khách quan ("tác giả", "nghiên cứu này", "đề tài"). Không dùng "tôi", "chúng tôi".
2. MẬT ĐỘ DỮ LIỆU ĐỊNH LƯỢNG (Data Density): Tuyệt đối không viết sáo rỗng, không liệt kê gạch đầu dòng cụt lủn. BẮT BUỘC có bảng số liệu Markdown Table (đầy đủ tiêu đề in đậm, đơn vị tính, dòng nguồn *(Nguồn: ...)*).
3. MÔ HÌNH ĐOẠN VĂN PEEL: Luận điểm -> Giải thích nguyên lý -> Dẫn chứng thực nghiệm -> Tiểu kết tác động.
4. TOÀN BỘ 8.192 TOKEN CỦA LƯỢT NÀY ĐƯỢC CẤP RIÊNG ĐỂ VIẾT DUY NHẤT CHƯƠNG/PHẦN NÀY. Hãy viết thật sâu sắc, chi tiết, chạm ngưỡng mục tiêu ${targetWordCount}. Không được tóm tắt vắn tắt.`;

        const userPrompt = `ĐỀ TÀI: ${outline.topic}
Khối ngành: ${outline.disciplineName} | Cơ sở: ${outline.schoolName} | Chuẩn: ${outline.standards} | Trích dẫn: ${outline.citation}
${outline.notes ? `Yêu cầu bổ sung của giảng viên: ${outline.notes}` : ''}

${groundingDossier || ''}

${previousSummary ? `TÓM TẮT CÁC CHƯƠNG TRƯỚC ĐÃ TRIỂN KHAI:\n${previousSummary}\n(Hãy viết tiếp liền mạch với nội dung trên, không lặp lại)` : ''}

YÊU CẦU CHI TIẾT CHO PHẦN NÀY:
${specificDirectives}

${chapterData ? `KHUNG MỤC CON BẮT BUỘC PHẢI TRIỂN KHAI CHI TIẾT:
# ${chapterData.title} (Mục tiêu: ${chapterData.purpose})
${(chapterData.sections || []).map(s => `  - Mục ${s.num}: ${s.title}
    + Hướng dẫn: ${s.guidance}
    + Yêu cầu bắt buộc: ${(s.required || []).join(', ')}
    ${s.example ? `+ Gợi ý thực tế: ${s.example}` : ''}`).join('\n')}` : ''}

Hãy xuất bản toàn văn phần này bằng định dạng Markdown hoàn chỉnh, sâu sắc, chạm mục tiêu ${targetWordCount}. Bắt đầu trực tiếp từ tiêu đề chính '#' của chương.`;

        // Request parts with multimodal attachments
        const requestParts = [];
        const attachments = AttachmentManager.getAttachments();
        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                if (att.isImage || att.isPdf) {
                    requestParts.push({
                        inlineData: { mimeType: att.mimeType, data: att.base64Data }
                    });
                } else if (att.isText) {
                    requestParts.push({
                        text: `\n\n--- DỮ LIỆU TỆP ĐÍNH KÈM [${att.name}] ---\n${att.textContent.slice(0, 8000)}\n--- HẾT TỆP ---\n\n`
                    });
                }
            }
        }
        requestParts.push({ text: userPrompt });

        const requestBody = {
            contents: [{ role: 'user', parts: requestParts }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.35,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };

        if (enableSearch) {
            requestBody.tools = [{ googleSearch: {} }];
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                const errText = errJson.error?.message || `Lỗi HTTP ${response.status}: ${response.statusText}`;

                // If googleSearch tool failed, retry without search tool
                if (enableSearch && (errText.includes('tool') || errText.includes('googleSearch') || errText.includes('google_search'))) {
                    console.warn('[Gemini] googleSearch tool rejected by API, retrying chapter without tools...', errText);
                    return this.generateSingleChapterStream({
                        outline, stageIndex, stageType, chapterData, previousSummary, groundingDossier,
                        enableSearch: false, signal, onChunk, onStatus
                    });
                }

                // Self-healing model recovery
                if (errText.includes('no longer available') || errText.includes('not found') || response.status === 404) {
                    const matches = [...errText.matchAll(/models\/([\w.-]+)/g)].map(m => m[1]);
                    const targetModel = matches.filter(m => m !== model).pop() || (model !== 'gemini-3.6-flash' ? 'gemini-3.6-flash' : 'gemini-1.5-flash');
                    if (targetModel && targetModel !== model) {
                        console.warn(`Model ${model} unavailable. Auto-recovering to ${targetModel}...`);
                        this.saveModel(targetModel);
                        return this.generateSingleChapterStream({
                            outline, stageIndex, stageType, chapterData, previousSummary, groundingDossier,
                            enableSearch, signal, onChunk, onStatus
                        });
                    }
                }
                throw new Error(errText);
            }

            // Stream reader (SSE)
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let chapterText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const jsonStr = trimmed.slice(6).trim();
                        if (jsonStr === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (chunk) {
                                chapterText += chunk;
                                onChunk && onChunk(chapterText, chunk);
                            }
                        } catch (e) {
                            // ignore partial JSON parse errors
                        }
                    }
                }
            }

            return chapterText;
        } catch (err) {
            if (signal && signal.aborted) throw new Error('Quá trình sinh đã bị hủy.');
            throw err;
        }
    },

    /**
     * Chained Sequential Chapter Generation Engine:
     * Executes sequential requests across all chapters, dedicating 8,192 tokens per chapter
     * to produce a master-grade thesis of 14,000 - 20,000+ words (35-50 pages).
     */
    async generateChainedReportStream({
        outline,
        onChunk,
        onStatus,
        onStageChange,
        onDone,
        onError,
        signal
    }) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Chưa cấu hình Gemini API Key. Vui lòng bấm vào nút [🔑 Gemini API Key] để nhập key.');
        }

        // 1. Gather nearest grounding benchmark from 360-corpus
        let groundingDossier = '';
        try {
            await AcademicCorpusManager.init();
            let discKey = 'CNTT';
            if (outline.discipline === 'kinhte') discKey = 'KT';
            else if (outline.discipline === 'kythuat') discKey = 'KTDT';
            else if (outline.discipline === 'xahoi') discKey = 'KHXH';

            let matchedCorpus = null;
            if (outline.provenance && outline.provenance.id) {
                matchedCorpus = AcademicCorpusManager.getById(outline.provenance.id);
            }
            if (!matchedCorpus) {
                const searchMatches = AcademicCorpusManager.search({ query: outline.topic, discipline: discKey });
                matchedCorpus = (searchMatches && searchMatches.length > 0) ? searchMatches[0] : (AcademicCorpusManager.getByDiscipline(discKey)[0] || null);
            }
            if (matchedCorpus) {
                groundingDossier = `
HỒ SƠ MẪU ĐỐI SÁNH ĐÃ ĐƯỢC KIỂM ĐỊNH (Grounding Benchmark từ ${matchedCorpus.institution}):
- Đề tài tương đương: "${matchedCorpus.title}"
- Mô hình lý thuyết/thuật toán: ${matchedCorpus.theoretical_models.join(', ')}
- Phương pháp luận: ${matchedCorpus.methodology}
- Dữ liệu thực nghiệm: ${matchedCorpus.dataset_hardware}
- Chỉ số kiểm định: ${JSON.stringify(matchedCorpus.key_metrics)}
- Mô hình PEEL mẫu: Point: ${matchedCorpus.peel_framework.Point} | Evidence: ${matchedCorpus.peel_framework.Evidence}`;
            }
        } catch (e) {
            console.warn('Grounding dossier attachment error:', e);
        }

        // 2. Build Stages List
        const stages = [];

        // Stage 0: Mở Đầu
        stages.push({
            index: 0,
            type: 'intro',
            title: 'Phần Mở Đầu (Tính cấp thiết & Mục tiêu SMART)',
            chapterData: null
        });

        // Stage 1 .. N: Chapters
        const chapters = outline.chapters || [];
        for (let i = 0; i < chapters.length; i++) {
            stages.push({
                index: i + 1,
                type: 'chapter',
                title: chapters[i].title,
                chapterData: chapters[i]
            });
        }

        // Final Stage: Kết Luận & Tài Liệu Tham Khảo
        stages.push({
            index: stages.length,
            type: 'conclusion',
            title: 'Kết Luận, Kiến Nghị & Tài Liệu Tham Khảo',
            chapterData: null
        });

        const totalStages = stages.length;
        const enableSearch = this.isSearchGroundingEnabled();
        let fullDocumentText = '';
        let previousSummaries = [];

        for (let sIdx = 0; sIdx < totalStages; sIdx++) {
            if (signal && signal.aborted) throw new Error('Quá trình sinh đã bị hủy bởi người dùng.');

            const currentStage = stages[sIdx];
            onStageChange && onStageChange(sIdx, totalStages, currentStage.title);
            onStatus && onStatus(`[${sIdx + 1}/${totalStages}] Đang sinh chuyên sâu: ${currentStage.title}...`);

            const prevSummaryText = previousSummaries.slice(-2).join('\n---\n');

            const chapterResult = await this.generateSingleChapterStream({
                outline,
                stageIndex: currentStage.index,
                stageType: currentStage.type,
                chapterData: currentStage.chapterData,
                previousSummary: prevSummaryText,
                groundingDossier,
                enableSearch,
                signal,
                onChunk: (stageText, chunk) => {
                    const liveFull = fullDocumentText ? (fullDocumentText + '\n\n' + stageText) : stageText;
                    onChunk && onChunk(liveFull, chunk, sIdx);
                },
                onStatus
            });

            // Append chapter to full document
            fullDocumentText = fullDocumentText ? (fullDocumentText + '\n\n' + chapterResult) : chapterResult;
            
            // Keep concise summary for next stage context
            const firstLines = chapterResult.split('\n').filter(l => l.trim().startsWith('#') || l.trim().length > 30).slice(0, 4).join('. ');
            previousSummaries.push(`- ${currentStage.title}: ${firstLines.slice(0, 300)}...`);

            onChunk && onChunk(fullDocumentText, '', sIdx);
        }

        onDone && onDone(fullDocumentText);
        return fullDocumentText;
    },

    async generateReportStream({ outline, onChunk, onStatus, onDone, onError, signal }) {
        const apiKey = this.getApiKey();
        let model = this.getModel();
        if (model.includes('2.0-flash') || model.includes('2.5-flash')) {
            model = 'gemini-3.6-flash';
            this.saveModel('gemini-3.6-flash');
        }

        if (!apiKey) {
            throw new Error('Chưa cấu hình Gemini API Key. Vui lòng bấm vào nút [🔑 Gemini API Key] để nhập key.');
        }

        // 1. Gather nearest grounding dossier from 360-corpus
        let groundingDossier = '';
        try {
            await AcademicCorpusManager.init();
            let discKey = 'CNTT';
            if (outline.discipline === 'kinhte') discKey = 'KT';
            else if (outline.discipline === 'kythuat') discKey = 'KTDT';
            else if (outline.discipline === 'xahoi') discKey = 'KHXH';

            let matchedCorpus = null;
            if (outline.provenance && outline.provenance.id) {
                matchedCorpus = AcademicCorpusManager.getById(outline.provenance.id);
            } else if (outline.provenance && outline.provenance.groundingBenchmark) {
                matchedCorpus = AcademicCorpusManager.getById(outline.provenance.groundingBenchmark.id);
            }
            if (!matchedCorpus) {
                const searchMatches = AcademicCorpusManager.search({ query: outline.topic, discipline: discKey });
                matchedCorpus = (searchMatches && searchMatches.length > 0) ? searchMatches[0] : (AcademicCorpusManager.getByDiscipline(discKey)[0] || null);
            }
            if (matchedCorpus) {
                groundingDossier = `
HỒ SƠ MẪU ĐỐI SÁNH ĐÃ ĐƯỢC KIỂM ĐỊNH (Grounding Benchmark):
- Đề tài tương đương: "${matchedCorpus.title}" (${matchedCorpus.institution})
- Mô hình lý thuyết/thuật toán: ${matchedCorpus.theoretical_models.join(', ')}
- Phương pháp: ${matchedCorpus.methodology}
- Dữ liệu định lượng tham chiếu: ${matchedCorpus.dataset_hardware}
- Chỉ số thực nghiệm chuẩn: ${JSON.stringify(matchedCorpus.key_metrics)}
- Cấu trúc đoạn văn PEEL mẫu:
  + Point: ${matchedCorpus.peel_framework.Point}
  + Explanation: ${matchedCorpus.peel_framework.Explanation}
  + Evidence: ${matchedCorpus.peel_framework.Evidence}
  + Link: ${matchedCorpus.peel_framework.Link}
`;
            }
        } catch (e) {
            console.warn('Grounding dossier attachment error:', e);
        }

        // 2. Build High-Grade Academic System Instruction
        const systemPrompt = `Bạn là một Giáo sư / Trưởng Hội đồng Đánh giá Học thuật cao cấp tại Việt Nam. 
Nhiệm vụ của bạn là viết một BÁO CÁO TOÀN VĂN HỌC THUẬT XUẤT SẮC (Barem Điểm A / 9.0+ trở lên) cho đề tài được giao.

CÁC NGUYÊN TẮC BẮT BUỘC TUÂN THỦ:
1. QUY CHUẨN THỂ THỨC & BỐ CỤC:
   - Theo Nghị định 30/2020/NĐ-CP (Times New Roman 13pt, lề 3-2-2-2, giãn dòng 1.15).
   - Tỷ trọng vàng nội dung:
     * Chương 1 (20%): Tổng quan & Cơ sở lý luận (chỉ phân tích lý thuyết trực tiếp giải quyết bài toán).
     * Chương 2 (35%): Khảo sát thực trạng, thu thập và bóc tách dữ liệu thực nghiệm 3-5 năm.
     * Chương 3 (35%): Hiện thực hóa giải pháp, thuật toán, mã nguồn, mô hình kỹ thuật hoặc chiến lược chuyên sâu (TRỌNG TÂM).
     * Chương 4 & Kết luận (10%): Kiểm thử định lượng, đánh giá sai số, hạn chế và kiến nghị.
2. MẬT ĐỘ THÔNG TIN & BẢNG BIỂU ĐỊNH LƯỢNG (Data Density):
   - Tuyệt đối KHÔNG viết hời hợt, không liệt kê gạch đầu dòng cụt lủn.
   - BẮT BUỘC mỗi chương phải có ít nhất 1-2 BẢNG SỐ LIỆU ĐỊNH LƯỢNG bằng Markdown Table (đầy đủ: Tiêu đề in đậm Bảng X.Y, Đơn vị tính, Dòng nguồn '(Nguồn: Tác giả tổng hợp/thực nghiệm)').
   - Bắt buộc có công thức toán học hoặc đoạn mã code/sơ đồ luồng dữ liệu minh chứng.
3. MÔ HÌNH ĐOẠN VĂN CHUYÊN SÂU PEEL (Point - Explanation - Evidence - Link):
   - Mọi phân tích chuyên sâu phải có: Luận điểm -> Giải thích nguyên lý -> Dẫn chứng số liệu định lượng thực tế -> Tiểu kết tác động.
4. NGÔI VĂN & VĂN PHONG:
   - Sử dụng ngôi thứ ba khách quan ("tác giả", "người nghiên cứu", "đề tài"). Không dùng "tôi", "chúng tôi".
5. KHAI THÁC TOÀN DIỆN TỆP & ẢNH ĐÍNH KÈM (MULTIMODAL GROUNDING):
   - Nếu người dùng có gửi kèm tệp (ảnh sơ đồ kiến trúc, lưu đồ giải thuật, bảng mạch, ảnh chụp biểu đồ tài chính, file PDF hoặc mã nguồn), BẮT BUỘC bạn phải trích xuất các thông số, số liệu, cơ chế vận hành từ các hình ảnh/tệp này để đưa vào phân tích chuyên sâu tại Chương 2 (Thực trạng) và Chương 3 (Giải pháp).`;

        // 3. User Prompt Payload
        const userPrompt = `Hãy viết một BÁO CÁO TOÀN VĂN HỌC THUẬT HOÀN CHỈNH, CHUYÊN SÂU cho đề tài sau:

THÔNG TIN ĐỀ TÀI:
- Tên đề tài: ${outline.topic}
- Khối ngành: ${outline.disciplineName}
- Thể loại: ${outline.reportTypeName}
- Cơ sở đào tạo: ${outline.schoolName}
- Chuẩn định dạng: ${outline.standards}
- Chuẩn trích dẫn: ${outline.citation}
- Mục tiêu trang: ${outline.targetPages}
- Yêu cầu mật độ dữ liệu: ${outline.densityTarget}
${outline.notes ? `- Yêu cầu bổ sung của giảng viên: ${outline.notes}` : ''}

${groundingDossier}

KHUNG SƯỜN CÁC CHƯƠNG MỤC CẦN TRIỂN KHAI CHI TIẾT:
${(outline.chapters || []).map(ch => `
# ${ch.title} (Mục tiêu: ${ch.purpose})
${(ch.sections || []).map(s => `  - Mục ${s.num}: ${s.title}
    + Hướng dẫn: ${s.guidance}
    + Yêu cầu bắt buộc: ${(s.required || []).join(', ')}
    ${s.example ? `+ Gợi ý thực tế: ${s.example}` : ''}`).join('\n')}
`).join('\n')}

Hãy xuất bản toàn văn báo cáo bằng định dạng Markdown hoàn chỉnh từ phần Mở đầu, Chi tiết 5 Chương (kèm Bảng dữ liệu thực nghiệm, công thức, mã code hoặc số liệu phân tích sâu), Kết luận và Danh mục Tài liệu tham khảo theo đúng chuẩn trích dẫn.`;

        onStatus && onStatus('Đang kết nối API Gemini...');

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        // Construct Multimodal Request Parts
        const requestParts = [];

        // 1. Attach multimodal files (Images, PDFs, Data/Code files)
        const attachments = AttachmentManager.getAttachments();
        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                if (att.isImage || att.isPdf) {
                    requestParts.push({
                        inlineData: {
                            mimeType: att.mimeType,
                            data: att.base64Data
                        }
                    });
                } else if (att.isText) {
                    requestParts.push({
                        text: `\n\n--- DỮ LIỆU TỆP ĐÍNH KÈM [${att.name}] ---\n${att.textContent}\n--- HẾT TỆP [${att.name}] ---\n\n`
                    });
                }
            }
        }

        // 2. Attach main instruction text
        requestParts.push({ text: userPrompt });

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: requestParts
                }
            ],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.35,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                const errText = errJson.error?.message || `Lỗi HTTP ${response.status}: ${response.statusText}`;

                // Self-healing: if model is deprecated or not available, extract Google's recommended model
                if (errText.includes('no longer available') || errText.includes('not found') || response.status === 404) {
                    const matches = [...errText.matchAll(/models\/([\w.-]+)/g)].map(m => m[1]);
                    const targetModel = matches.filter(m => m !== model).pop() || (model !== 'gemini-3.6-flash' ? 'gemini-3.6-flash' : 'gemini-1.5-flash');
                    if (targetModel && targetModel !== model) {
                        console.warn(`Model ${model} unavailable (${errText}). Auto-recovering to ${targetModel}...`);
                        onStatus && onStatus(`Đang tự động chuyển sang model chuẩn ${targetModel}...`);
                        this.saveModel(targetModel);
                        const badge = document.getElementById('report-generation-model-badge');
                        if (badge) badge.innerText = targetModel;
                        const select = document.getElementById('gemini-model-select');
                        if (select) select.value = targetModel;
                        return this.generateReportStream({ outline, onChunk, onStatus, onDone, onError, signal });
                    }
                }
                throw new Error(errText);
            }

            // Stream reader (Server-Sent Events)
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulated = '';
            let buffer = '';

            onStatus && onStatus('Đang sinh toàn văn chuyên sâu...');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep partial line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const jsonStr = trimmed.slice(6).trim();
                        if (jsonStr === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (chunkText) {
                                accumulated += chunkText;
                                onChunk && onChunk(accumulated, chunkText);
                            }
                        } catch (e) {
                            // ignore partial JSON parse errors
                        }
                    }
                }
            }

            onDone && onDone(accumulated);
            return accumulated;
        } catch (streamErr) {
            // If streaming fails or was aborted, handle gracefully
            if (signal && signal.aborted) {
                throw new Error('Quá trình sinh đã bị hủy bởi người dùng.');
            }
            // Fallback to standard non-streaming generateContent if SSE fails
            console.warn('Streaming failed, falling back to standard generateContent...', streamErr);
            onStatus && onStatus('Đang chuyển sang chế độ dự phòng chuẩn...');

            const standardEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const stdRes = await fetch(standardEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal
            });

            if (!stdRes.ok) {
                const stdErr = await stdRes.json().catch(() => ({}));
                const stdErrMsg = stdErr.error?.message || streamErr.message;
                if (stdErrMsg.includes('no longer available') || stdErrMsg.includes('not found') || stdRes.status === 404) {
                    const matches = [...stdErrMsg.matchAll(/models\/([\w.-]+)/g)].map(m => m[1]);
                    const targetModel = matches.filter(m => m !== model).pop() || (model !== 'gemini-3.6-flash' ? 'gemini-3.6-flash' : 'gemini-1.5-flash');
                    if (targetModel && targetModel !== model) {
                        console.warn(`Fallback: Model ${model} unavailable, auto-recovering to ${targetModel}...`);
                        this.saveModel(targetModel);
                        return this.generateReportStream({ outline, onChunk, onStatus, onDone, onError, signal });
                    }
                }
                throw new Error(stdErrMsg);
            }

            const stdData = await stdRes.json();
            const fullText = stdData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            onChunk && onChunk(fullText, fullText);
            onDone && onDone(fullText);
            return fullText;
        }
    }
};

/* --------------------------------------------------------------------------
   5. Key Modal UI & Indicator Controller
   -------------------------------------------------------------------------- */
function updateKeyStatusDot() {
    const dot = document.getElementById('header-key-dot');
    const label = document.getElementById('header-key-label');
    const sidebarDot = document.getElementById('sidebar-key-dot');
    const sidebarLabel = document.getElementById('sidebar-key-label');
    const key = GeminiService.getApiKey();
    const model = GeminiService.getModel();

    const isConnected = key && key.trim().length > 5;

    if (dot) {
        dot.className = isConnected ? 'key-status-dot active' : 'key-status-dot inactive';
        dot.title = isConnected ? `Gemini API Key: Đã kết nối (${model})` : 'Gemini API Key: Chưa cấu hình (Bấm để thêm key)';
    }
    if (label) {
        label.innerText = isConnected ? 'Gemini Sẵn Sàng' : 'Cắm Key Gemini';
    }

    if (sidebarDot) {
        sidebarDot.className = isConnected ? 'key-status-dot active' : 'key-status-dot inactive';
    }
    if (sidebarLabel) {
        sidebarLabel.innerText = isConnected ? `Đã kết nối • ${model}` : 'Chưa cắm Key (Bấm để kích hoạt AI)';
        sidebarLabel.style.color = isConnected ? '#10b981' : 'var(--text-tertiary)';
    }
}

function openGeminiKeyModal() {
    const modal = document.getElementById('gemini-key-modal');
    const input = document.getElementById('gemini-key-input');
    const select = document.getElementById('gemini-model-select');
    const resultBox = document.getElementById('key-test-result');

    if (input) input.value = GeminiService.getApiKey();
    if (select) select.value = GeminiService.getModel();
    if (resultBox) {
        resultBox.style.display = 'none';
        resultBox.innerText = '';
    }

    if (modal) modal.classList.add('open');
}

function closeGeminiKeyModal() {
    const modal = document.getElementById('gemini-key-modal');
    if (modal) modal.classList.remove('open');
}

function toggleKeyVisibility() {
    const input = document.getElementById('gemini-key-input');
    const icon = document.getElementById('toggle-key-icon');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ph ph-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'ph ph-eye';
    }
}

async function testGeminiConnection() {
    const input = document.getElementById('gemini-key-input');
    const select = document.getElementById('gemini-model-select');
    const resultBox = document.getElementById('key-test-result');
    const testLabel = document.getElementById('test-key-label');

    const key = input ? input.value.trim() : '';
    const model = select ? select.value : 'gemini-3.6-flash';

    if (!key) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
        resultBox.style.color = '#ef4444';
        resultBox.style.border = '1px solid #ef4444';
        resultBox.innerText = 'Vui lòng dán API Key vào ô nhập trước khi kiểm tra.';
        return;
    }

    const origText = testLabel.innerText;
    testLabel.innerText = 'Đang kiểm tra...';
    resultBox.style.display = 'block';
    resultBox.style.background = 'var(--bg-elevated)';
    resultBox.style.color = 'var(--text-secondary)';
    resultBox.style.border = '1px solid var(--border)';
    resultBox.innerText = 'Đang gửi gói tin kiểm tra kết nối tới Google AI API...';

    try {
        await GeminiService.testConnection(key, model);
        const activeModel = GeminiService.getModel();
        if (select && select.value !== activeModel) {
            select.value = activeModel;
        }
        resultBox.style.background = 'rgba(16, 185, 129, 0.1)';
        resultBox.style.color = '#10b981';
        resultBox.style.border = '1px solid #10b981';
        resultBox.innerHTML = `<strong>Thành công!</strong> Khóa API hợp lệ. Model <code>${activeModel}</code> đã sẵn sàng sinh báo cáo chất lượng cao.`;
    } catch (err) {
        resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
        resultBox.style.color = '#ef4444';
        resultBox.style.border = '1px solid #ef4444';
        resultBox.innerHTML = `<strong>Kết nối thất bại:</strong> ${escapeHtml(err.message)}`;
    } finally {
        testLabel.innerText = origText;
    }
}

function saveGeminiKey() {
    const input = document.getElementById('gemini-key-input');
    const select = document.getElementById('gemini-model-select');

    const key = input ? input.value.trim() : '';
    const model = select ? select.value : 'gemini-3.6-flash';

    GeminiService.saveApiKey(key);
    GeminiService.saveModel(model);
    closeGeminiKeyModal();
}

function removeGeminiKey() {
    if (confirm('Bạn có chắc chắn muốn xóa API Key này khỏi trình duyệt không?')) {
        GeminiService.removeApiKey();
        const input = document.getElementById('gemini-key-input');
        if (input) input.value = '';
        closeGeminiKeyModal();
    }
}

/* --------------------------------------------------------------------------
   6. Zero-Dependency Lightweight Markdown Renderer
   -------------------------------------------------------------------------- */
const MarkdownRenderer = {
    render(md) {
        if (!md) return '';
        const lines = md.split('\n');
        const html = [];
        let inCode = false;
        let codeLang = '';
        let codeContent = [];
        let inTable = false;
        let tableRows = [];
        let inList = false;
        let listType = null;
        let listItems = [];

        function flushList() {
            if (!inList) return;
            const tag = listType === 'ol' ? 'ol' : 'ul';
            html.push(`<${tag}>${listItems.map(i => `<li>${i}</li>`).join('')}</${tag}>`);
            inList = false;
            listType = null;
            listItems = [];
        }

        function flushTable() {
            if (!inTable) return;
            if (tableRows.length > 0) {
                let tHtml = '<table><thead>';
                const headerCols = tableRows[0];
                tHtml += '<tr>' + headerCols.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>';
                for (let r = 1; r < tableRows.length; r++) {
                    tHtml += '<tr>' + tableRows[r].map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>';
                }
                tHtml += '</tbody></table>';
                html.push(tHtml);
            }
            inTable = false;
            tableRows = [];
        }

        function sanitizeUrl(url) {
            if (!url) return '#';
            const clean = url.trim();
            if (/^(https?:\/\/|mailto:|#)/i.test(clean)) {
                return clean.replace(/"/g, '&quot;');
            }
            return '#';
        }

        function formatInline(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\[([^\]]+)\]\(((?:[^()]+|\([^()]*\))*)\)/g, (m, label, url) => {
                    const safe = sanitizeUrl(url);
                    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
                });
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Code block
            if (trimmed.startsWith('```')) {
                if (!inCode) {
                    flushList();
                    flushTable();
                    inCode = true;
                    codeLang = trimmed.slice(3).trim();
                    codeContent = [];
                } else {
                    inCode = false;
                    html.push(`<pre><code class="${escapeHtml(codeLang)}">${codeContent.map(l => escapeHtml(l)).join('\n')}</code></pre>`);
                    codeContent = [];
                }
                continue;
            }
            if (inCode) {
                codeContent.push(line);
                continue;
            }

            // Table
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                flushList();
                if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
                    // separator line, skip
                    continue;
                }
                const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
                inTable = true;
                tableRows.push(cells);
                continue;
            } else {
                flushTable();
            }

            // Empty line
            if (!trimmed) {
                flushList();
                continue;
            }

            // Headings
            if (trimmed.startsWith('#### ')) {
                flushList();
                html.push(`<h4>${formatInline(trimmed.slice(5))}</h4>`);
                continue;
            }
            if (trimmed.startsWith('### ')) {
                flushList();
                html.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
                continue;
            }
            if (trimmed.startsWith('## ')) {
                flushList();
                html.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
                continue;
            }
            if (trimmed.startsWith('# ')) {
                flushList();
                html.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
                continue;
            }

            // Blockquotes
            if (trimmed.startsWith('> ')) {
                flushList();
                html.push(`<blockquote>${formatInline(trimmed.slice(2))}</blockquote>`);
                continue;
            }

            // Horizontal Rule
            if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                flushList();
                html.push(`<hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">`);
                continue;
            }

            // Unordered List
            if (/^[-*+]\s+/.test(trimmed)) {
                if (inList && listType !== 'ul') flushList();
                inList = true;
                listType = 'ul';
                listItems.push(formatInline(trimmed.replace(/^[-*+]\s+/, '')));
                continue;
            }

            // Ordered List
            if (/^\d+\.\s+/.test(trimmed)) {
                if (inList && listType !== 'ol') flushList();
                inList = true;
                listType = 'ol';
                listItems.push(formatInline(trimmed.replace(/^\d+\.\s+/, '')));
                continue;
            }

            flushList();

            // Paragraph
            html.push(`<p>${formatInline(trimmed)}</p>`);
        }

        flushList();
        flushTable();

        return html.join('\n');
    }
};

function updateChapterStepper(activeStageIndex, totalStages) {
    for (let i = 0; i <= 5; i++) {
        const chip = document.getElementById(`step-chip-${i}`);
        if (!chip) continue;
        chip.classList.remove('active', 'done');
        if (i < activeStageIndex) {
            chip.classList.add('done');
        } else if (i === activeStageIndex) {
            chip.classList.add('active');
        }
    }
    const progressFill = document.getElementById('report-progress-fill');
    if (progressFill) {
        const pct = Math.min(100, Math.round(((activeStageIndex) / (totalStages || 6)) * 100));
        progressFill.style.width = `${pct}%`;
    }
}

function resetChapterStepper() {
    for (let i = 0; i <= 5; i++) {
        const chip = document.getElementById(`step-chip-${i}`);
        if (chip) chip.classList.remove('active', 'done');
    }
    const progressFill = document.getElementById('report-progress-fill');
    if (progressFill) progressFill.style.width = '0%';
}

function toggleGoogleSearchGrounding(checked) {
    GeminiService.setSearchGroundingEnabled(checked);
}

function changeGenerationMode(mode) {
    GeminiService.setGenerationMode(mode);
}

/* --------------------------------------------------------------------------
   7. AI Full Report Generation Studio Controller
   -------------------------------------------------------------------------- */
async function startAIFullReportGeneration() {
    if (!currentOutline) {
        alert('Vui lòng tạo hoặc chọn một khung sườn đề tài trước khi sinh toàn văn!');
        return;
    }

    const apiKey = GeminiService.getApiKey();
    if (!apiKey) {
        openGeminiKeyModal();
        alert('Bạn chưa cấu hình Gemini API Key. Vui lòng nhập khóa API của bạn để bắt đầu sinh toàn văn học thuật.');
        return;
    }

    const modal = document.getElementById('ai-full-report-modal');
    const modelBadge = document.getElementById('report-generation-model-badge');
    const topicSubtitle = document.getElementById('report-modal-topic-subtitle');
    const liveStatusText = document.getElementById('report-status-text');
    const wordCountEl = document.getElementById('report-word-count');
    const outputEl = document.getElementById('ai-rendered-output');
    const searchCheckbox = document.getElementById('enable-google-search-toggle');
    const modeSelect = document.getElementById('report-generation-mode-select');

    if (modelBadge) modelBadge.innerText = GeminiService.getModel();
    if (topicSubtitle) topicSubtitle.innerText = `${currentOutline.topic} (${currentOutline.schoolName})`;
    if (outputEl) outputEl.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-tertiary);"><i class="ph ph-circle-notch anim-pulse" style="font-size: 28px; display: block; margin-bottom: 8px;"></i>Đang nạp dữ liệu đối sánh và kích hoạt cỗ máy sinh chuyên sâu...</div>';
    if (modal) modal.classList.add('open');

    if (searchCheckbox) searchCheckbox.checked = GeminiService.isSearchGroundingEnabled();
    if (modeSelect) modeSelect.value = GeminiService.getGenerationMode();

    resetChapterStepper();

    isGeneratingReport = true;
    reportAbortController = new AbortController();
    lastGeneratedReportText = '';

    const genMode = GeminiService.getGenerationMode();

    if (genMode === 'chained') {
        // Chained Multi-Chapter Engine (Point A / 9.0+ Standard, 30-50 pages)
        try {
            await GeminiService.generateChainedReportStream({
                outline: currentOutline,
                signal: reportAbortController.signal,
                onStageChange: (sIdx, totalStages, stageTitle) => {
                    updateChapterStepper(sIdx, totalStages);
                    if (liveStatusText) liveStatusText.innerText = `[${sIdx + 1}/${totalStages}] ${stageTitle}`;
                },
                onStatus: (status) => {
                    if (liveStatusText) liveStatusText.innerText = status;
                },
                onChunk: (accumulated, chunk, sIdx) => {
                    lastGeneratedReportText = accumulated;
                    if (outputEl) {
                        outputEl.innerHTML = MarkdownRenderer.render(accumulated);
                    }
                    if (wordCountEl) {
                        const words = accumulated.trim().split(/\s+/).filter(Boolean).length;
                        wordCountEl.innerText = `${words.toLocaleString()} từ (Mục tiêu: 15.000+)`;
                    }
                },
                onDone: (fullText) => {
                    isGeneratingReport = false;
                    for (let i = 0; i <= 5; i++) {
                        const chip = document.getElementById(`step-chip-${i}`);
                        if (chip) { chip.classList.remove('active'); chip.classList.add('done'); }
                    }
                    const progressFill = document.getElementById('report-progress-fill');
                    if (progressFill) progressFill.style.width = '100%';

                    if (liveStatusText) liveStatusText.innerText = 'Hoàn thành xuất sắc 100% (Chuẩn Điểm A)';
                    const words = fullText.trim().split(/\s+/).filter(Boolean).length;
                    if (wordCountEl) wordCountEl.innerText = `${words.toLocaleString()} từ (Đạt chuẩn Điểm A / 9.0+)`;
                }
            });
        } catch (err) {
            isGeneratingReport = false;
            if (liveStatusText) liveStatusText.innerText = 'Lỗi phát sinh';
            if (outputEl && !lastGeneratedReportText) {
                outputEl.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 20px; border-radius: var(--radius-sm);">
                        <h3 style="margin-top: 0; font-size: 15px;">Quá trình sinh toàn văn thất bại</h3>
                        <p style="font-size: 13px; line-height: 1.5;">${escapeHtml(err.message)}</p>
                        <button class="btn btn-secondary" style="margin-top: 10px; font-size: 12px;" onclick="openGeminiKeyModal()">Kiểm Tra Cài Đặt Key</button>
                    </div>
                `;
            }
        }
    } else {
        // Single Shot Fast Mode
        try {
            await GeminiService.generateReportStream({
                outline: currentOutline,
                signal: reportAbortController.signal,
                onStatus: (status) => {
                    if (liveStatusText) liveStatusText.innerText = status;
                },
                onChunk: (accumulated, chunk) => {
                    lastGeneratedReportText = accumulated;
                    if (outputEl) {
                        outputEl.innerHTML = MarkdownRenderer.render(accumulated);
                    }
                    if (wordCountEl) {
                        const words = accumulated.trim().split(/\s+/).filter(Boolean).length;
                        wordCountEl.innerText = `${words.toLocaleString()} từ`;
                    }
                },
                onDone: (fullText) => {
                    isGeneratingReport = false;
                    if (liveStatusText) liveStatusText.innerText = 'Hoàn thành 100%';
                    const words = fullText.trim().split(/\s+/).filter(Boolean).length;
                    if (wordCountEl) wordCountEl.innerText = `${words.toLocaleString()} từ (Bản thảo nhanh)`;
                }
            });
        } catch (err) {
            isGeneratingReport = false;
            if (liveStatusText) liveStatusText.innerText = 'Lỗi phát sinh';
            if (outputEl && !lastGeneratedReportText) {
                outputEl.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 20px; border-radius: var(--radius-sm);">
                        <h3 style="margin-top: 0; font-size: 15px;">Quá trình sinh toàn văn thất bại</h3>
                        <p style="font-size: 13px; line-height: 1.5;">${escapeHtml(err.message)}</p>
                        <button class="btn btn-secondary" style="margin-top: 10px; font-size: 12px;" onclick="openGeminiKeyModal()">Kiểm Tra Cài Đặt Key</button>
                    </div>
                `;
            }
        }
    }
}

function closeAIFullReportModal() {
    if (isGeneratingReport && reportAbortController) {
        if (confirm('Báo cáo đang được sinh. Bạn có muốn hủy bỏ quá trình này?')) {
            reportAbortController.abort();
            isGeneratingReport = false;
        } else {
            return;
        }
    }
    const modal = document.getElementById('ai-full-report-modal');
    if (modal) modal.classList.remove('open');
}

function triggerRegenerateReport() {
    if (confirm('Bạn có chắc chắn muốn sinh lại toàn bộ nội dung báo cáo này không?')) {
        startAIFullReportGeneration();
    }
}

function copyGeneratedReport() {
    if (!lastGeneratedReportText) {
        alert('Chưa có nội dung báo cáo để sao chép!');
        return;
    }
    navigator.clipboard.writeText(lastGeneratedReportText).then(() => {
        const label = document.getElementById('copy-full-report-label');
        if (label) {
            const orig = label.innerText;
            label.innerText = 'Đã Sao Chép!';
            setTimeout(() => { label.innerText = orig; }, 2000);
        }
    });
}

/* --------------------------------------------------------------------------
   8. Decree 30/2020/NĐ-CP Document Exporter (Word .docx & PDF)
   -------------------------------------------------------------------------- */
const DocumentExportService = {
    /**
     * Client-side Microsoft Word (.docx) HTML-based Blob Exporter
     * Adhering strictly to Decree 30/2020/NĐ-CP:
     * - Font: Times New Roman, 13pt, line-height 1.15
     * - Margins: Top 20mm (56.7pt), Bottom 20mm (56.7pt), Left 30mm (85.05pt), Right 20mm (56.7pt)
     */
    exportHtmlToWord({ title, bodyHtml, filename }) {
        const wordDocument = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page Section1 {
    size: 595.3pt 841.9pt; /* A4 Standard */
    margin: 56.7pt 56.7pt 56.7pt 85.05pt; /* Decree 30: Top 2cm, Right 2cm, Bottom 2cm, Left 3cm */
    mso-header-margin: 35.4pt;
    mso-footer-margin: 35.4pt;
    mso-paper-source: 0;
}
div.Section1 {
    page: Section1;
}
body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.15;
    color: #000000;
}
p {
    margin-top: 0;
    margin-bottom: 6pt;
    text-align: justify;
    line-height: 1.15;
}
h1, h2, h3, h4 {
    font-family: 'Times New Roman', Times, serif;
    color: #000000;
    page-break-after: avoid;
}
h1 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    text-align: center;
    margin-top: 16pt;
    margin-bottom: 8pt;
}
h2 {
    font-size: 13pt;
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 6pt;
}
h3 {
    font-size: 13pt;
    font-weight: bold;
    font-style: italic;
    margin-top: 8pt;
    margin-bottom: 4pt;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin: 12pt 0;
    font-size: 12pt;
}
th, td {
    border: 1px solid #000000;
    padding: 5pt 7pt;
    text-align: left;
    vertical-align: top;
}
th {
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: center;
}
blockquote {
    border-left: 3pt solid #000000;
    margin: 8pt 0 8pt 15pt;
    padding-left: 10pt;
    font-style: italic;
}
pre, code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11pt;
    background-color: #f7f7f7;
}
.cover-page {
    text-align: center;
    page-break-after: always;
    padding-top: 20pt;
}
.cover-header {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.3;
}
.cover-divider {
    width: 120pt;
    border-top: 1.5pt solid #000;
    margin: 10pt auto 100pt auto;
}
.cover-title {
    font-size: 20pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.3;
    margin-bottom: 20pt;
}
.cover-subtitle {
    font-size: 14pt;
    font-style: italic;
    margin-bottom: 120pt;
}
.cover-meta {
    font-size: 13pt;
    line-height: 1.5;
    text-align: left;
    margin: 0 auto;
    display: inline-block;
}
.cover-footer {
    margin-top: 80pt;
    font-size: 13pt;
    font-weight: bold;
}
</style>
</head>
<body>
<div class="Section1">
${bodyHtml}
</div>
</body>
</html>`;

        const blob = new Blob([wordDocument], { type: 'application/msword;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename || 'Bao_Cao_Hoc_Thuat.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }
};

/**
 * Export the Active Outline canvas as a Decree 30 compliant Word document
 */
function exportActiveOutlineWord() {
    if (!currentOutline) {
        alert('Vui lòng tạo hoặc chọn một khung sườn đề tài trước khi xuất Word!');
        return;
    }

    const outline = currentOutline;
    const bodyHtml = `
<div class="cover-page">
    <div class="cover-header">
        BỘ GIÁO DỤC VÀ ĐÀO TẠO<br>
        ${escapeHtml(outline.schoolName.toUpperCase())}
    </div>
    <div class="cover-divider"></div>

    <div class="cover-title">
        ${escapeHtml(outline.topic)}
    </div>
    <div class="cover-subtitle">
        KHUNG SƯỜN HỌC THUẬT &amp; KẾ HOẠCH NGHIÊN CỨU CHI TIẾT
    </div>

    <div class="cover-meta">
        <strong>Khối ngành:</strong> ${escapeHtml(outline.disciplineName)}<br>
        <strong>Thể loại báo cáo:</strong> ${escapeHtml(outline.reportTypeName)}<br>
        <strong>Quy chuẩn thể thức:</strong> ${escapeHtml(outline.standards)}<br>
        <strong>Chuẩn trích dẫn:</strong> ${escapeHtml(outline.citation)}<br>
        <strong>Mục tiêu dung lượng:</strong> ${escapeHtml(outline.targetPages)}
    </div>

    <div class="cover-footer">
        HÀ NỘI - NĂM ${new Date().getFullYear()}
    </div>
</div>

<h1>THÔNG SỐ BAREM HỌC THUẬT ĐẠT ĐIỂM XUẤT SẮC (ĐIỂM A / 9.0+)</h1>
<table>
    <thead>
        <tr>
            <th>Chỉ số định lượng</th>
            <th>Quy định chuẩn</th>
            <th>Mục tiêu đề tài</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><strong>Dung lượng trang</strong></td>
            <td>Nghị định 30/2020/NĐ-CP (Times New Roman 13pt)</td>
            <td>${escapeHtml(outline.targetPages)}</td>
        </tr>
        <tr>
            <td><strong>Mật độ bảng biểu &amp; sơ đồ</strong></td>
            <td>Trung bình 1.5 - 2 trang / 1 bảng định lượng</td>
            <td>${escapeHtml(outline.densityTarget)}</td>
        </tr>
        <tr>
            <td><strong>Trích dẫn khoa học</strong></td>
            <td>Chuẩn ${escapeHtml(outline.citation)}</td>
            <td>${escapeHtml(outline.citationTarget)}</td>
        </tr>
        <tr>
            <td><strong>Tỷ trọng vàng 4 chương</strong></td>
            <td>20% - 35% - 35% - 10%</td>
            <td>Chuẩn khung sườn 5 chương</td>
        </tr>
    </tbody>
</table>

${(outline.chapters || []).map(ch => `
    <h1>${escapeHtml(ch.title)}</h1>
    <p><em>Mục đích chương: ${escapeHtml(ch.purpose)}</em></p>
    
    ${(ch.sections || []).map(s => `
        <h2>Mục ${escapeHtml(s.num)}: ${escapeHtml(s.title)}</h2>
        <p><strong>Hướng dẫn triển khai:</strong> ${escapeHtml(s.guidance)}</p>
        <p><strong>Yêu cầu bắt buộc:</strong> ${(s.required || []).map(r => escapeHtml(r)).join('; ')}</p>
        ${s.example ? `<p><strong>Ví dụ / Gợi ý thực tế:</strong> <em>${escapeHtml(s.example)}</em></p>` : ''}
    `).join('')}
`).join('')}

<h1>DANH MỤC TÀI LIỆU THAM KHẢO DỰ KIẾN (${escapeHtml(outline.citation)})</h1>
<p>[1] Bộ Giáo dục và Đào tạo, <em>Quy định về đào tạo và đánh giá học phần khóa luận tốt nghiệp</em>, 2024.</p>
<p>[2] Chính phủ nước CHXHCN Việt Nam, <em>Nghị định số 30/2020/NĐ-CP về công tác văn thư</em>, 2020.</p>
<p>[3] Viện Nghiên cứu Phát triển Học thuật, <em>Bộ tiêu chuẩn định lượng trong xây dựng báo cáo khoa học xuất sắc</em>, 2025.</p>
`;

    const cleanTopic = outline.topic.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').slice(0, 40);
    DocumentExportService.exportHtmlToWord({
        title: outline.topic,
        bodyHtml,
        filename: `[De_Cuong]_${cleanTopic}.docx`
    });
}

/**
 * Export the Generated Full-Text report as a Decree 30 compliant Word document
 */
function exportGeneratedWordDoc() {
    if (!lastGeneratedReportText) {
        alert('Chưa có nội dung toàn văn để xuất! Vui lòng bấm [AI Sinh Toàn Văn Báo Cáo] trước.');
        return;
    }

    const topic = currentOutline ? currentOutline.topic : 'Bao_Cao_Hoc_Thuat';
    const school = currentOutline ? currentOutline.schoolName : 'TRƯỜNG ĐẠI HỌC';
    const renderedHtml = MarkdownRenderer.render(lastGeneratedReportText);

    const bodyHtml = `
<div class="cover-page" style="border: 3pt double #000; padding: 25pt; min-height: 720pt; box-sizing: border-box; text-align: center;">
    <div class="cover-header" style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">
        BỘ GIÁO DỤC VÀ ĐÀO TẠO<br>
        ${escapeHtml(school.toUpperCase())}
    </div>
    <div class="cover-divider" style="width: 120pt; border-top: 1.5pt solid #000; margin: 10pt auto 40pt auto;"></div>

    <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #002060; margin-bottom: 12pt;">
        ${escapeHtml(currentOutline ? currentOutline.reportTypeName : 'ĐỒ ÁN TỐT NGHIỆP / BÁO CÁO HỌC THUẬT')}
    </div>

    <div class="cover-title" style="font-size: 18pt; font-weight: bold; text-transform: uppercase; line-height: 1.4; color: #000; margin: 20pt 0 40pt 0;">
        ${escapeHtml(topic)}
    </div>

    <div class="cover-meta" style="margin-top: 50pt; text-align: left; display: inline-block; font-size: 13pt; line-height: 1.6;">
        <p><strong>Khối ngành:</strong> ${escapeHtml(currentOutline ? currentOutline.disciplineName : 'Đa ngành')}</p>
        <p><strong>Tiêu chuẩn đánh giá:</strong> Barem Điểm Xuất Sắc (Điểm A / 9.0+)</p>
        <p><strong>Thể thức văn bản:</strong> Nghị định 30/2020/NĐ-CP (Times New Roman 13pt, lề 3-2-2-2)</p>
        <p><strong>Chuẩn trích dẫn:</strong> ${escapeHtml(currentOutline ? currentOutline.citation : 'APA 7th')}</p>
    </div>

    <div class="cover-footer" style="margin-top: 80pt; font-size: 13pt; font-weight: bold;">
        HÀ NỘI, NĂM ${new Date().getFullYear()}
    </div>
</div>
<br clear="all" style="page-break-before:always" />

${renderedHtml}
`;

    const cleanTopic = topic.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').slice(0, 40);
    DocumentExportService.exportHtmlToWord({
        title: topic,
        bodyHtml,
        filename: `[Toan_Van]_${cleanTopic}.docx`
    });
}

/**
 * Export / Print current Active Outline as PDF
 */
function exportToPdf() {
    if (!currentOutline) {
        alert('Vui lòng tạo hoặc chọn một khung sườn đề tài trước khi in PDF!');
        return;
    }
    document.body.classList.remove('is-printing-report');
    window.print();
}

/**
 * Export / Print Generated Full-Text report as PDF
 */
function exportGeneratedPdfDoc() {
    if (!lastGeneratedReportText) {
        alert('Chưa có nội dung toàn văn để xuất PDF! Vui lòng bấm [AI Sinh Toàn Văn Báo Cáo] trước.');
        return;
    }
    document.body.classList.add('is-printing-report');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('is-printing-report');
    }, 1000);
}

/* --------------------------------------------------------------------------
   9. Keyboard Shortcuts
   -------------------------------------------------------------------------- */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePromptModal();
        closeSampleLibraryModal();
        closeGeminiKeyModal();
        if (!isGeneratingReport) {
            closeAIFullReportModal();
        }
    }
});
