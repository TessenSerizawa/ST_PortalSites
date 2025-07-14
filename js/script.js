// 共通JavaScript関数

document.addEventListener('DOMContentLoaded', function() {
    // ハンバーガーメニューの初期化
    initHamburgerMenu();
    
    // 現在のページに基づいてナビゲーションをアクティブに設定
    setActiveNavigation();
    
    // スクロールトップボタンの初期化
    initScrollToTop();
});

// ハンバーガーメニューの初期化
function initHamburgerMenu() {
    const hamburger = document.querySelector('.p-hamburger');
    const mainMenu = document.querySelector('.c-mainmenu');

    if (!hamburger || !mainMenu) return;

    hamburger.addEventListener('click', function(e) {
        e.preventDefault();
        
        const isOpen = mainMenu.classList.contains('is-open');
        
        if (isOpen) {
            mainMenu.classList.remove('is-open');
        } else {
            mainMenu.classList.add('is-open');
        }
    });

    document.addEventListener('click', function(e) {
        if (!mainMenu.contains(e.target) && !hamburger.contains(e.target)) {
            if (mainMenu.classList.contains('is-open')) {
                mainMenu.classList.remove('is-open');
            }
        }
    });

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
        
        if ((currentPath === '/' || currentPath.endsWith('/index.html')) && 
            (href === './' || href === 'index.html' || href === '/')) {
            link.classList.add('active');
        }
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
        case 'works':
            initWorksPageOnly();
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
    // 設定を確認してからMarkdownローダーを初期化
    if (validateConfig()) {
        initMarkdownLoader();
    } else {
        showConfigError();
    }
    
    // カテゴリフィルタリング機能の初期化
    initCategoryFiltering();
    
    // モーダル機能の初期化
    initModal();
}

// WORKSページ専用の初期化（script.js内で定義）
function initWorksPageOnly() {
    // WORKSページの場合は、ページ内のスクリプトで処理される
    console.log('WORKS page initialized from script.js');
}

// リンクページ専用の初期化
function initLinkPage() {
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            console.log('External link clicked:', this.href);
        });
    });
}

// GitHub設定（Beautiful Jekyllテーマを参考にした設定）
const GITHUB_CONFIG = {
    // 現在のリポジトリ情報を自動取得または手動設定
    owner: getCurrentRepoOwner() || 'TessenSerizawa',
    repo: getCurrentRepoName() || 'ST_PortalSites',
    branch: 'master',
    postsPath: '_progress_posts',
    useGitHubPages: true,
    baseUrl: getBaseUrl()
};

// 記事データを格納する変数
let allPosts = [];
let currentCategory = 'all';
let isLoading = false;

// 現在のリポジトリ情報を取得
function getCurrentRepoOwner() {
    const hostname = window.location.hostname;
    if (hostname.includes('github.io')) {
        return hostname.split('.')[0];
    }
    return null;
}

function getCurrentRepoName() {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(p => p);
    if (parts.length > 0 && !parts[0].endsWith('.html')) {
        return parts[0];
    }
    return null;
}

function getBaseUrl() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('github.io')) {
        const repoName = getCurrentRepoName();
        return repoName ? `https://${hostname}/${repoName}` : `https://${hostname}`;
    }
    return window.location.origin;
}

// 設定の検証
function validateConfig() {
    if (!GITHUB_CONFIG.owner || GITHUB_CONFIG.owner === 'YOUR_GITHUB_USERNAME') {
        console.error('GitHub設定が正しくありません: owner が設定されていません');
        return false;
    }
    return true;
}

// 設定エラーの表示
function showConfigError() {
    const errorState = document.getElementById('error-state');
    if (errorState) {
        errorState.innerHTML = `
            <h3>設定エラー</h3>
            <p style="margin-bottom: 20px;">
                GitHub設定が正しくありません。<br>
                script.js の GITHUB_CONFIG を以下のように設定してください：
            </p>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; font-size: 14px;">
owner: '${window.location.hostname.split('.')[0] || 'あなたのGitHubユーザー名'}',
repo: '${getCurrentRepoName() || 'あなたのリポジトリ名'}',
branch: 'main',
postsPath: '_progress_posts'
            </pre>
        `;
        errorState.style.display = 'block';
    }
}

// Markdownローダーの初期化
function initMarkdownLoader() {
    console.log('GitHub設定:', GITHUB_CONFIG);
    loadMarkdownPosts();
}

// GitHubリポジトリからMarkdownファイルを取得
async function loadMarkdownPosts() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingState = document.getElementById('loading-state');
    const entryList = document.getElementById('entry-list');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');

    if (!loadingState || !entryList) return;

    showLoadingState();

    try {
        console.log('記事を読み込み中...');
        
        // 複数の方法でファイルを取得
        let posts = [];
        
        // 方法1: GitHub APIでファイルリストを取得
        try {
            posts = await loadFromGitHubAPI();
            console.log('GitHub APIから記事を取得しました:', posts.length, '件');
        } catch (apiError) {
            console.warn('GitHub API取得に失敗:', apiError);
            
            // 方法2: 既知のファイルをダイレクトに取得
            try {
                posts = await loadKnownFiles();
                console.log('既知のファイルから記事を取得しました:', posts.length, '件');
            } catch (directError) {
                console.warn('ダイレクト取得に失敗:', directError);
                
                // 方法3: サンプルデータを使用
                posts = getSamplePosts();
                console.log('サンプルデータを使用します:', posts.length, '件');
            }
        }

        if (posts.length === 0) {
            throw new Error('記事が見つかりませんでした');
        }

        // 記事をソート
        allPosts = posts.sort((a, b) => b.pubDate - a.pubDate);
        
        // 記事を表示
        displayPosts(allPosts);
        
    } catch (error) {
        console.error('記事の読み込みに失敗:', error);
        showDetailedError(error);
    } finally {
        isLoading = false;
    }
}

// GitHub APIから記事を取得
async function loadFromGitHubAPI() {
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.postsPath}?ref=${GITHUB_CONFIG.branch}`;
    
    console.log('GitHub API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`_progress_posts フォルダが見つかりません (404)`);
        } else if (response.status === 403) {
            throw new Error(`GitHub API の制限に達しました (403)`);
        } else {
            throw new Error(`GitHub API エラー: ${response.status} ${response.statusText}`);
        }
    }

    const files = await response.json();
    
    if (!Array.isArray(files)) {
        throw new Error('ファイルリストの取得に失敗しました');
    }

    const markdownFiles = files.filter(file => 
        file.type === 'file' && file.name.endsWith('.md')
    );

    if (markdownFiles.length === 0) {
        throw new Error('Markdownファイルが見つかりません');
    }

    const posts = await Promise.all(
        markdownFiles.map(async (file) => {
            try {
                const content = await fetchFileContent(file.download_url);
                return parseMarkdownFile(file.name, content);
            } catch (error) {
                console.error(`Error loading ${file.name}:`, error);
                return null;
            }
        })
    );

    return posts.filter(post => post !== null);
}

// 既知のファイルをダイレクトに取得
async function loadKnownFiles() {
    const knownFiles = [
        '2025-07-08-tesuya.md',
        // 他に既知のファイルがあれば追加
    ];

    const posts = await Promise.all(
        knownFiles.map(async (filename) => {
            try {
                const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.postsPath}/${filename}`;
                const content = await fetchFileContent(rawUrl);
                return parseMarkdownFile(filename, content);
            } catch (error) {
                console.error(`Error loading ${filename}:`, error);
                return null;
            }
        })
    );

    return posts.filter(post => post !== null);
}

// サンプルデータを取得
function getSamplePosts() {
    return [
        {
            title: 'サンプル記事: 新機能をリリースしました',
            description: '今回のアップデートでは、ダークモード対応、レスポンシブデザインの改善、検索機能の追加を行いました。',
            fullContent: `
                <h1>新機能をリリースしました</h1>
                <p>今回のアップデートでは、以下の機能が追加されました：</p>
                <ul>
                    <li><strong>ダークモード対応</strong></li>
                    <li><strong>レスポンシブデザインの改善</strong></li>
                    <li><strong>検索機能の追加</strong></li>
                </ul>
                <h2>技術的な詳細</h2>
                <p>使用技術：</p>
                <ul>
                    <li>HTML5</li>
                    <li>CSS3</li>
                    <li>JavaScript ES6+</li>
                </ul>
                <p><em>※ これはサンプルデータです。実際の記事を表示するには、GitHub設定を確認してください。</em></p>
            `,
            pubDate: new Date(2025, 6, 8), // 2025年7月8日
            category: 'update',
            filename: 'sample-post.md'
        },
        {
            title: 'サンプル記事: ポートフォリオサイトを公開しました',
            description: '新しいポートフォリオサイトを公開いたしました。作品の展示やプロジェクトの進捗を共有していきます。',
            fullContent: `
                <h1>ポートフォリオサイトを公開しました</h1>
                <p>新しいポートフォリオサイトを公開いたしました。</p>
                <p>このサイトでは以下のことを行っていきます：</p>
                <ul>
                    <li>作品の展示</li>
                    <li>プロジェクトの進捗共有</li>
                    <li>技術的な学習記録</li>
                </ul>
                <p>今後ともよろしくお願いいたします。</p>
                <p><em>※ これはサンプルデータです。実際の記事を表示するには、GitHub設定を確認してください。</em></p>
            `,
            pubDate: new Date(2025, 6, 1), // 2025年7月1日
            category: 'information',
            filename: 'sample-announcement.md'
        }
    ];
}

// ファイル内容を取得（タイムアウト対応）
async function fetchFileContent(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/plain,text/markdown,*/*'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('リクエストがタイムアウトしました');
        }
        throw error;
    }
}

// Beautiful Jekyllスタイルのフロントマター解析
function parseMarkdownFile(filename, content) {
    try {
        console.log(`Parsing file: ${filename}`);
        
        // ファイル名から日付を抽出
        const filenameParts = filename.replace('.md', '').split('-');
        
        let year, month, day, titleFromFilename;
        
        if (filenameParts.length >= 4) {
            year = parseInt(filenameParts[0]);
            month = parseInt(filenameParts[1]);
            day = parseInt(filenameParts[2]);
            titleFromFilename = filenameParts.slice(3).join('-');
        } else {
            // ファイル名に日付がない場合は現在の日付を使用
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
            day = now.getDate();
            titleFromFilename = filename.replace('.md', '');
        }

        // デフォルト値
        let title = titleFromFilename;
        let category = 'information';
        let description = '';
        let tags = [];
        let author = '';
        let pubDate = new Date(year, month - 1, day);

        // フロントマターの解析
        const lines = content.split('\n');
        let frontMatterEnd = -1;
        let bodyStartIndex = 0;

        if (lines[0] === '---') {
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                    frontMatterEnd = i;
                    break;
                }
            }

            if (frontMatterEnd > 0) {
                const frontMatter = lines.slice(1, frontMatterEnd);
                
                frontMatter.forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex === -1) return;
                    
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    
                    if (!key || !value) return;
                    
                    const cleanValue = value.replace(/^["']|["']$/g, '');
                    
                    switch (key) {
                        case 'title':
                            title = cleanValue;
                            break;
                        case 'category':
                        case 'categories':
                            category = cleanValue;
                            break;
                        case 'description':
                        case 'excerpt':
                            description = cleanValue;
                            break;
                        case 'tags':
                            tags = cleanValue.split(',').map(tag => tag.trim());
                            break;
                        case 'author':
                            author = cleanValue;
                            break;
                        case 'date':
                            try {
                                pubDate = new Date(cleanValue);
                                if (isNaN(pubDate.getTime())) {
                                    pubDate = new Date(year, month - 1, day);
                                }
                            } catch (e) {
                                pubDate = new Date(year, month - 1, day);
                            }
                            break;
                    }
                });
                
                bodyStartIndex = frontMatterEnd + 1;
            }
        }

        // 本文を取得
        const bodyLines = lines.slice(bodyStartIndex);
        const fullContent = bodyLines.join('\n');

        // タイトルが設定されていない場合は、最初の見出しを使用
        if (!title || title === titleFromFilename) {
            const firstHeading = bodyLines.find(line => line.startsWith('#'));
            if (firstHeading) {
                title = firstHeading.replace(/^#+\s*/, '').trim();
            }
        }

        // 説明文が設定されていない場合は、本文から生成
        if (!description) {
            const textContent = fullContent
                .replace(/^#+\s+.*/gm, '')
                .replace(/!\[.*?\]\(.*?\)/g, '')
                .replace(/\[.*?\]\(.*?\)/g, '')
                .replace(/[*_`]/g, '')
                .replace(/\n\s*\n/g, '\n')
                .trim();
            
            description = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
        }

        // カテゴリの自動判定
        if (category === 'information') {
            const lowerTitle = title.toLowerCase();
            const lowerContent = fullContent.toLowerCase();
            
            if (lowerTitle.includes('更新') || lowerTitle.includes('アップデート') || 
                lowerTitle.includes('update') || lowerContent.includes('更新しました') ||
                lowerContent.includes('アップデート') || lowerTitle.includes('リリース') ||
                lowerTitle.includes('release')) {
                category = 'update';
            }
        }

        const post = {
            title: title,
            description: description,
            fullContent: convertMarkdownToHtml(fullContent),
            pubDate: pubDate,
            category: category,
            tags: tags,
            author: author,
            filename: filename
        };

        console.log(`Successfully parsed: ${filename}`, post);
        return post;

    } catch (error) {
        console.error(`Error parsing ${filename}:`, error);
        return null;
    }
}

// 改善されたMarkdown to HTML変換
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
    
    // 画像（GitHub Pages対応）
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, src) {
        const imageSrc = convertImagePath(src);
        return `<img src="${imageSrc}" alt="${alt}" loading="lazy" style="max-width: 100%; height: auto; margin: 10px 0;">`;
    });
    
    // コードブロック
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
        const language = lang ? ` class="language-${lang}"` : '';
        return `<pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 15px 0;"><code${language}>${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // インラインコード
    html = html.replace(/`([^`]+)`/g, '<code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
    
    // 水平線
    html = html.replace(/^---$/gm, '<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">');
    
    // リスト
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // 改行をpタグに変換
    const paragraphs = html.split('\n\n');
    html = paragraphs.map(p => {
        p = p.trim();
        if (p && !p.startsWith('<') && !p.startsWith('---')) {
            return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
        }
        return p;
    }).join('\n');
    
    return html;
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 画像パスを適切なURLに変換
function convertImagePath(imagePath) {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    if (imagePath.startsWith('assets/') || imagePath.startsWith('./assets/') || imagePath.startsWith('../assets/')) {
        let normalizedPath = imagePath.replace(/^\.\//, '').replace(/^\.\.\//, '');
        const baseUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}`;
        return `${baseUrl}/${normalizedPath}`;
    }
    
    if (!imagePath.startsWith('/')) {
        const baseUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}`;
        return `${baseUrl}/${imagePath}`;
    }
    
    return `${GITHUB_CONFIG.baseUrl}${imagePath}`;
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
                <h1 class="c-entry-list__title">${escapeHtml(post.title)}</h1>
                <div class="c-entry-list__body">${escapeHtml(post.description)}</div>
            </div>
        `;

        article.addEventListener('click', () => {
            showModal(post);
        });

        entryList.appendChild(article);
    });
}

// 詳細エラーの表示
function showDetailedError(error) {
    const errorState = document.getElementById('error-state');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    if (errorState) {
        errorState.innerHTML = `
            <h3>記事の読み込みに失敗しました</h3>
            <p style="margin-bottom: 15px;"><strong>エラー:</strong> ${error.message}</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                <p><strong>考えられる原因:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>_progress_posts フォルダが存在しない</li>
                    <li>Markdownファイルが存在しない</li>
                    <li>GitHub設定が正しくない</li>
                    <li>GitHub APIのレート制限</li>
                    <li>ネットワーク接続の問題</li>
                </ul>
                <p><strong>現在の設定:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Owner: ${GITHUB_CONFIG.owner}</li>
                    <li>Repository: ${GITHUB_CONFIG.repo}</li>
                    <li>Branch: ${GITHUB_CONFIG.branch}</li>
                    <li>Posts Path: ${GITHUB_CONFIG.postsPath}</li>
                </ul>
            </div>
            <button onclick="loadMarkdownPosts()" style="margin-right: 10px;">再試行</button>
            <button onclick="location.reload()">ページをリロード</button>
        `;
        errorState.style.display = 'block';
    }
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
    
    // コンテンツを設定
    modalContent.innerHTML = post.fullContent;
    
    // モーダルを表示
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// モーダルを閉じる関数
function closeModal() {
    const modal = document.getElementById('article-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// グローバル関数として定義
window.loadMarkdownPosts = loadMarkdownPosts;
