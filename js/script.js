// 共通JavaScript関数

document.addEventListener('DOMContentLoaded', function() {
    // ハンバーガーメニューの初期化
    initHamburgerMenu();
    
    // 現在のページに基づいてナビゲーションをアクティブに設定
    setActiveNavigation();
});

// ハンバーガーメニューの初期化
function initHamburgerMenu() {
    const hamburger = document.querySelector('.p-hamburger');
    const mainMenu = document.querySelector('.c-mainmenu');

    if (!hamburger || !mainMenu) return;

    // ハンバーガーメニューのクリック処理
    hamburger.addEventListener('click', function(e) {
        e.preventDefault();
        
        const isOpen = mainMenu.classList.contains('is-open');
        
        if (isOpen) {
            mainMenu.classList.remove('is-open');
        } else {
            mainMenu.classList.add('is-open');
        }
    });

    // メニュー外クリックで閉じる
    document.addEventListener('click', function(e) {
        if (!mainMenu.contains(e.target) && !hamburger.contains(e.target)) {
            if (mainMenu.classList.contains('is-open')) {
                mainMenu.classList.remove('is-open');
            }
        }
    });

    // ESCキーでメニューを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mainMenu.classList.contains('is-open')) {
            mainMenu.classList.remove('is-open');
        }
    });
}

// 現在のページに基づいてナビゲーションをアクティブに設定
function setActiveNavigation() {
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('.c-mainmenu__link');
    
    menuLinks.forEach(link => {
        link.classList.remove('active');
        
        const href = link.getAttribute('href');
        
        // ルートページ（index.html）の場合
        if ((currentPath === '/' || currentPath.endsWith('/index.html')) && 
            (href === './' || href === 'index.html' || href === '/')) {
            link.classList.add('active');
        }
        // その他のページの場合
        else if (href && currentPath.includes(href.replace('.html', '').replace('./', ''))) {
            link.classList.add('active');
        }
    });
}

// ページ固有の機能を初期化するためのヘルパー関数
function initPage(pageName) {
    switch(pageName) {
        case 'progress':
            initProgressPage();
            break;
        case 'link':
            initLinkPage();
            break;
        default:
            break;
    }
}

// プログレスページ専用の初期化
function initProgressPage() {
    // GitHubリポジトリから記事を読み込む
    initMarkdownLoader();
    
    // カテゴリフィルタリング機能の初期化
    initCategoryFiltering();
    
    // モーダル機能の初期化
    initModal();
}

// リンクページ専用の初期化
function initLinkPage() {
    // 外部リンクの処理
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // アナリティクス追跡などを行う場合はここに追加
            console.log('External link clicked:', this.href);
        });
    });
}

// GitHub設定
const GITHUB_CONFIG = {
    // 設定値を環境に応じて変更してください
    owner: 'yourusername',          // GitHubのユーザー名
    repo: 'your-repository',        // リポジトリ名
    branch: 'main',                 // ブランチ名（mainまたはmaster）
    postsPath: '_progress_posts'    // 記事が格納されているパス
};

// 記事データを格納する変数
let allPosts = [];
let currentCategory = 'all';

// Markdownローダーの初期化
function initMarkdownLoader() {
    loadMarkdownPosts();
}

// GitHubリポジトリからMarkdownファイルを取得
async function loadMarkdownPosts() {
    const loadingState = document.getElementById('loading-state');
    const entryList = document.getElementById('entry-list');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');

    if (!loadingState || !entryList) return;

    // 状態をリセット
    showLoadingState();

    try {
        // GitHub APIからファイルリストを取得
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.postsPath}?ref=${GITHUB_CONFIG.branch}`;
        
        console.log('Fetching posts from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const files = await response.json();
        
        // .mdファイルのみをフィルタリング
        const markdownFiles = files.filter(file => 
            file.type === 'file' && file.name.endsWith('.md')
        );

        if (markdownFiles.length === 0) {
            throw new Error('No markdown files found');
        }

        // 各Markdownファイルの内容を取得
        const posts = await Promise.all(
            markdownFiles.map(async (file) => {
                try {
                    const content = await fetchMarkdownContent(file.download_url);
                    return parseMarkdownFile(file.name, content);
                } catch (error) {
                    console.error(`Error loading ${file.name}:`, error);
                    return null;
                }
            })
        );

        // null値を除去
        allPosts = posts.filter(post => post !== null);

        // 記事を日付順でソート（新しい順）
        allPosts.sort((a, b) => b.pubDate - a.pubDate);

        // 記事を表示
        displayPosts(allPosts);
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showErrorState();
    }
}

// Markdownファイルの内容を取得
async function fetchMarkdownContent(downloadUrl) {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
    }
    return await response.text();
}

// Markdownファイルを解析
function parseMarkdownFile(filename, content) {
    try {
        // ファイル名から日付を抽出（年-月-日-記事の題.md）
        const filenameParts = filename.replace('.md', '').split('-');
        
        if (filenameParts.length < 4) {
            throw new Error(`Invalid filename format: ${filename}`);
        }

        const year = parseInt(filenameParts[0]);
        const month = parseInt(filenameParts[1]);
        const day = parseInt(filenameParts[2]);
        const titleFromFilename = filenameParts.slice(3).join('-');

        // 日付の妥当性チェック
        if (isNaN(year) || isNaN(month) || isNaN(day) || 
            month < 1 || month > 12 || day < 1 || day > 31) {
            throw new Error(`Invalid date in filename: ${filename}`);
        }

        const pubDate = new Date(year, month - 1, day);

        // Markdownの解析
        const lines = content.split('\n');
        let title = titleFromFilename;
        let category = 'information';
        let description = '';
        let bodyStartIndex = 0;

        // フロントマターの解析（任意）
        if (lines[0] === '---') {
            let frontMatterEnd = -1;
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                    frontMatterEnd = i;
                    break;
                }
            }

            if (frontMatterEnd > 0) {
                // フロントマターから情報を抽出
                const frontMatter = lines.slice(1, frontMatterEnd);
                frontMatter.forEach(line => {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length > 0) {
                        const value = valueParts.join(':').trim();
                        
                        switch (key.trim()) {
                            case 'title':
                                title = value.replace(/^["']|["']$/g, ''); // 引用符を除去
                                break;
                            case 'category':
                                category = value.replace(/^["']|["']$/g, '');
                                break;
                            case 'description':
                                description = value.replace(/^["']|["']$/g, '');
                                break;
                        }
                    }
                });
                bodyStartIndex = frontMatterEnd + 1;
            }
        }

        // 本文の取得
        const bodyLines = lines.slice(bodyStartIndex);
        const fullContent = bodyLines.join('\n');

        // タイトルが設定されていない場合は、最初の見出しを使用
        if (!title || title === titleFromFilename) {
            const firstHeading = bodyLines.find(line => line.startsWith('#'));
            if (firstHeading) {
                title = firstHeading.replace(/^#+\s*/, '');
            }
        }

        // 説明文が設定されていない場合は、本文から生成
        if (!description) {
            const textContent = fullContent
                .replace(/^#+\s+.*/gm, '') // 見出しを除去
                .replace(/!\[.*?\]\(.*?\)/g, '') // 画像を除去
                .replace(/\[.*?\]\(.*?\)/g, '') // リンクを除去
                .replace(/[*_`]/g, '') // マークダウン記号を除去
                .replace(/\n\s*\n/g, '\n') // 空行を除去
                .trim();
            
            description = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
        }

        // カテゴリを判定（フロントマターで指定されていない場合）
        if (category === 'information') {
            const lowerTitle = title.toLowerCase();
            const lowerContent = fullContent.toLowerCase();
            
            if (lowerTitle.includes('更新') || lowerTitle.includes('アップデート') || 
                lowerTitle.includes('update') || lowerContent.includes('更新しました') ||
                lowerContent.includes('アップデート')) {
                category = 'update';
            }
        }

        return {
            title: title,
            description: description,
            fullContent: convertMarkdownToHtml(fullContent),
            pubDate: pubDate,
            category: category,
            filename: filename
        };

    } catch (error) {
        console.error(`Error parsing ${filename}:`, error);
        return null;
    }
}

// 簡単なMarkdown to HTML変換
function convertMarkdownToHtml(markdown) {
    let html = markdown;
    
    // 見出し
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // 太字
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // 斜体
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // リンク
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 画像
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    
    // コードブロック
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // インラインコード
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 改行をpタグに変換
    const paragraphs = html.split('\n\n');
    html = paragraphs.map(p => {
        p = p.trim();
        if (p && !p.startsWith('<')) {
            return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
        }
        return p;
    }).join('\n');
    
    return html;
}

// 記事を表示する関数
function displayPosts(posts) {
    const entryList = document.getElementById('entry-list');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');

    if (!entryList) return;

    hideLoadingState();

    if (posts.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();
    entryList.innerHTML = '';

    posts.forEach((post, index) => {
        const categoryClass = post.category === 'update' ? 'update' : 'information';
        const categoryLabel = post.category === 'update' ? '更新情報' : 'おしらせ';
        
        const article = document.createElement('article');
        article.className = 'c-entry-list__item';
        article.setAttribute('data-category', post.category);
        article.setAttribute('data-post-index', index);

        article.innerHTML = `
            <div class="c-entry-list__link">
                <span class="c-entry-list__meta">
                    <span class="c-entry__date">${formatDate(post.pubDate)}</span>
                    <span class="c-entry__category">
                        <span class="c-entry-category__item c-entry-category__item--${categoryClass}">${categoryLabel}</span>
                    </span>
                </span>
                <h1 class="c-entry-list__title">${post.title}</h1>
                <div class="c-entry-list__body">${post.description}</div>
            </div>
        `;

        // クリックイベントを追加
        article.addEventListener('click', () => {
            showModal(post);
        });

        entryList.appendChild(article);
    });
}

// 状態管理関数
function showLoadingState() {
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    
    if (loadingState) loadingState.style.display = 'block';
    if (errorState) errorState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
}

function hideLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'none';
}

function showErrorState() {
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
}

function showEmptyState() {
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

function hideEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'none';
}

// 日付フォーマット関数
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// カテゴリフィルタリング機能の初期化
function initCategoryFiltering() {
    const categoryLinks = document.querySelectorAll('.c-tabmenu__link');

    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // アクティブ状態の切り替え
            categoryLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            filterPosts(category);
        });
    });
}

// 投稿をフィルタリングする関数
function filterPosts(category) {
    currentCategory = category;
    let filteredPosts = allPosts;
    
    if (category !== 'all') {
        filteredPosts = allPosts.filter(post => post.category === category);
    }
    
    displayPosts(filteredPosts);
}

// モーダル機能の初期化
function initModal() {
    const modal = document.getElementById('article-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    if (!modal || !modalCloseBtn) return;

    // モーダルを閉じる処理
    modalCloseBtn.addEventListener('click', closeModal);
    
    // モーダル背景クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}

// モーダルを表示する関数
function showModal(post) {
    const modal = document.getElementById('article-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalCategory = document.getElementById('modal-category');
    const modalContent = document.getElementById('modal-content');

    if (!modal || !modalTitle || !modalDate || !modalCategory || !modalContent) return;

    modalTitle.textContent = post.title;
    modalDate.textContent = formatDate(post.pubDate);
    
    // カテゴリを設定
    const categoryClass = post.category === 'update' ? 'update' : 'information';
    const categoryLabel = post.category === 'update' ? '更新情報' : 'おしらせ';
    modalCategory.className = `modal-category modal-category--${categoryClass}`;
    modalCategory.textContent = categoryLabel;
    
    // コンテンツを設定（HTMLをそのまま表示）
    modalContent.innerHTML = post.fullContent;
    
    // モーダルを表示
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // 背景のスクロールを無効化
}

// モーダルを閉じる関数
function closeModal() {
    const modal = document.getElementById('article-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // 背景のスクロールを有効化
    }
}

// グローバル関数として定義（エラー時の再試行ボタン用）
window.loadMarkdownPosts = loadMarkdownPosts;
