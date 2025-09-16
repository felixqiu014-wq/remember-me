// 备忘录数据存储
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentEditingId = null;
let isListView = false;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    renderNotes();
    
    // 绑定表单提交事件
    document.getElementById('noteForm').addEventListener('submit', handleNoteSubmit);
    
    // 绑定搜索事件
    document.getElementById('searchInput').addEventListener('input', searchNotes);
    
    // 点击模态框外部关闭
window.addEventListener('click', function(event) {
    const modal = document.getElementById('noteModal');
    if (event.target === modal) {
        closeModal();
    }
});
});

// 渲染所有备忘录
function renderNotes() {
    const container = document.getElementById('notesContainer');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 
                             note.content.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || note.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    // 按创建时间降序排序
    filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>暂无备忘录</h3>
                <p>点击"新建备忘录"开始记录你的想法</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredNotes.map(note => createNoteHTML(note)).join('');
}

// 创建单个备忘录HTML
function createNoteHTML(note) {
    const createdDate = new Date(note.createdAt).toLocaleDateString('zh-CN');
    const categoryText = getCategoryText(note.category);
    const categoryClass = note.category;
    
    return `
        <div class="note-card ${isListView ? 'list-view' : ''}" style="background-color: ${note.color}">
            <div class="note-content">
                <div class="note-header">
                    <h3 class="note-title">${escapeHtml(note.title)}</h3>
                    <span class="note-category ${categoryClass}">${categoryText}</span>
                </div>
                <p class="note-text">${escapeHtml(note.content)}</p>
                <div class="note-meta">
                    <span>创建于 ${createdDate}</span>
                    <div class="note-actions">
                        <button onclick="editNote('${note.id}')" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteNote('${note.id}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button onclick="copyNote('${note.id}')" title="复制">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 获取分类文本
function getCategoryText(category) {
    const categories = {
        work: '工作',
        personal: '个人',
        study: '学习',
        other: '其他'
    };
    return categories[category] || '其他';
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示添加备忘录模态框
function showAddModal() {
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = '新建备忘录';
    document.getElementById('noteForm').reset();
    const modal = document.getElementById('noteModal');
    modal.style.display = 'block';
    // 强制回流以确保动画正常工作
    modal.offsetHeight;
    modal.classList.add('show');
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
}

// 编辑备忘录
function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    currentEditingId = id;
    document.getElementById('modalTitle').textContent = '编辑备忘录';
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    document.getElementById('noteCategory').value = note.category;
    
    // 设置颜色选择
    const colorRadio = document.querySelector(`input[name="color"][value="${note.color}"]`);
    if (colorRadio) {
        colorRadio.checked = true;
    }
    
    const modal = document.getElementById('noteModal');
    modal.style.display = 'block';
    // 强制回流以确保动画正常工作
    modal.offsetHeight;
    modal.classList.add('show');
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
}

// 删除备忘录
function deleteNote(id) {
    if (confirm('确定要删除这个备忘录吗？')) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();
        renderNotes();
        showToast('备忘录已删除', 'error');
    }
}

// 复制备忘录内容
function copyNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    const textToCopy = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('内容已复制到剪贴板', 'success');
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('内容已复制到剪贴板', 'success');
        });
}

// 处理表单提交
function handleNoteSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const category = document.getElementById('noteCategory').value;
    const color = document.querySelector('input[name="color"]:checked').value;
    
    if (!title || !content) {
        showToast('请填写标题和内容', 'warning');
        return;
    }
    
    if (currentEditingId) {
        // 编辑现有备忘录
        const noteIndex = notes.findIndex(n => n.id === currentEditingId);
        if (noteIndex !== -1) {
            notes[noteIndex] = {
                ...notes[noteIndex],
                title,
                content,
                category,
                color,
                updatedAt: new Date().toISOString()
            };
            showToast('备忘录已更新', 'success');
        }
    } else {
        // 新建备忘录
        const newNote = {
            id: generateId(),
            title,
            content,
            category,
            color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        notes.unshift(newNote);
        showToast('备忘录已创建', 'success');
    }
    
    saveNotes();
    closeModal();
    renderNotes();
}

// 搜索备忘录
function searchNotes() {
    renderNotes();
}

// 按分类筛选
function filterNotes() {
    renderNotes();
}

// 切换视图模式
function toggleView() {
    isListView = !isListView;
    const container = document.getElementById('notesContainer');
    const button = event.target;
    
    if (isListView) {
        container.classList.add('list-view');
        button.innerHTML = '<i class="fas fa-th"></i> 网格视图';
    } else {
        container.classList.remove('list-view');
        button.innerHTML = '<i class="fas fa-th-large"></i> 切换视图';
    }
    
    renderNotes();
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('noteModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 等待动画完成后再隐藏
    setTimeout(() => {
        modal.style.display = 'none';
        currentEditingId = null;
    }, 400);
}

// 保存数据到本地存储
function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建提示元素
    const toast = document.createElement('div');
    
    // 设置不同类型的样式
    let bgColor = '#4361ee'; // 默认信息类型
    
    if (type === 'success') {
        bgColor = '#10b981';
    } else if (type === 'error') {
        bgColor = '#ef4444';
    } else if (type === 'warning') {
        bgColor = '#f59e0b';
    }
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // 添加图标
    let iconClass = 'fa-info-circle';
    if (type === 'success') {
        iconClass = 'fa-check-circle';
    } else if (type === 'error') {
        iconClass = 'fa-exclamation-circle';
    } else if (type === 'warning') {
        iconClass = 'fa-exclamation-triangle';
    }
    
    toast.innerHTML = `<i class="fas ${iconClass}"></i>${message}`;
    
    // 添加动画样式
    let style = document.getElementById('toast-animations');
    if (!style) {
        style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100px) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) translateY(0);
                }
            }
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px) translateY(-10px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 400);
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N 新建备忘录
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddModal();
    }
    
    // ESC 关闭模态框
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl/Cmd + F 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// 防止表单重复提交
let isSubmitting = false;
document.getElementById('noteForm').addEventListener('submit', function(e) {
    if (isSubmitting) {
        e.preventDefault();
        return;
    }
    isSubmitting = true;
    
    setTimeout(() => {
        isSubmitting = false;
    }, 1000);
});

// 页面卸载前保存数据
window.addEventListener('beforeunload', function() {
    saveNotes();
});

// 导出数据功能
function exportNotes() {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `备忘录备份_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出', 'success');
}

// 导入数据功能
function importNotes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedNotes = JSON.parse(e.target.result);
                if (Array.isArray(importedNotes)) {
            if (confirm(`确定要导入 ${importedNotes.length} 个备忘录吗？这将覆盖现有数据。`)) {
                notes = importedNotes;
                saveNotes();
                renderNotes();
                showToast('数据导入成功', 'success');
            }
        } else {
            showToast('文件格式不正确', 'error');
        }
            } catch (error) {
                showToast('文件解析失败', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 添加导出和导入按钮到控制区域
document.addEventListener('DOMContentLoaded', function() {
    const controls = document.querySelector('.controls');
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.innerHTML = '<i class="fas fa-download"></i> 导出';
    exportBtn.onclick = exportNotes;
    
    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.innerHTML = '<i class="fas fa-upload"></i> 导入';
    importBtn.onclick = importNotes;
    
    controls.appendChild(exportBtn);
    controls.appendChild(importBtn);
});