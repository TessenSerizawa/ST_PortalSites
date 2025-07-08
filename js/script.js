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
    // Blogger API関連の初期化
    initBloggerAPI();
    
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

// Blogger API関連の機能
let allPosts = [];
let currentCategory = 'all';

// Google API設定
const API_CONFIG = {
    API_KEY: 'YOUR_API_KEY_HERE', // 実際のAPIキーに置き換えてください
    BLOG_ID: '40298-pg71', // BloggerのブログIDに置き換えてください
    CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
    DISCOVERY_DOC: 'https://blogger.googleapis.com/$discovery/rest?version=v3',
    SCOPES: 'https://www.googleapis.com/auth/blogger.readonly'
};

let gapi, GoogleAuth;

// Google API初期化
function initBloggerAPI() {
    if (typeof gapi === 'undefined') {
        console.log('Google API not loaded, using RSS fallback');
        loadBlogPostsFromRSS();
        return;
    }
    
    gapi.load('client:auth2', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: API_CONFIG.API_KEY,
            clientId: API_CONFIG.CLIENT_ID,
            discoveryDocs: [API_CONFIG.DISCOVERY_DOC],
            scope: API_CONFIG.SCOPES
        });

        GoogleAuth = gapi.auth2.getAuthInstance();
        console.log('Google API初期化完了');
        
        // 記事の読み込み開始
        loadBlogPosts();
    } catch (error) {
        console.error('Google API初期化エラー:', error);
        loadBlogPostsFromRSS();
    }
}

// Blogger APIを使用して記事を取得
async function loadBlogPosts() {
    const loadingState = document.getElementById('loading-state');
    const entryList = document.getElementById('entry-list');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');

    if (!loadingState || !entryList) return;

    // 状態をリセット
    showLoadingState();

    try {
        // APIキーが設定されていない場合はRSSフォールバックを使用
        if (API_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            console.log('APIキーが設定されていないため、RSSフィードを使用します');
            await loadBlogPostsFromRSS();
            return;
        }

        // Google APIが初期化されていない場合は初期化
        if (!gapi || !gapi.client || !gapi.client.blogger) {
            throw new Error('Google APIが初期化されていません');
        }

        // 認証が必要な場合は認証を実行
        if (!GoogleAuth.isSignedIn.get()) {
            await GoogleAuth.signIn();
        }

        // Blogger APIから記事を取得
        const response = await gapi.client.blogger.posts.list({
            blogId: API_CONFIG.BLOG_ID,
            maxResults: 20,
            orderBy: 'published',
            status: 'live'
        });

        const posts = response.result.items || [];
        
        allPosts = posts.map(post => {
            // カテゴリを判定（ラベルまたはタイトル・内容から）
            let category = determineCategory(post);

            // HTMLタグを除去して概要を作成
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = post.content;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            
            return {
                title: post.title,
                link: post.url,
                description: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''),
                fullContent: post.content,
                pubDate: new Date(post.published),
                category: category,
                labels: post.labels || []
            };
        });

        // 記事を日付順でソート（新しい順）
        allPosts.sort((a, b) => b.pubDate - a.pubDate);

        // 記事を表示
        displayPosts(allPosts);
        
    } catch (error) {
        console.error('Blogger API エラー:', error);
        
        // APIエラーの場合はRSSフォールバックを試行
        console.log('RSSフィードにフォールバックします');
        await loadBlogPostsFromRSS();
    }
}

// RSSフィードから記事を取得（フォールバック用）
async function loadBlogPostsFromRSS() {
    try {
        // CORS制限を回避するため、RSSプロキシサービスを使用
        const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=';
        const rssUrl = 'https://40298-pg71.blogspot.com/feeds/posts/default';
        const response = await fetch(proxyUrl + encodeURIComponent(rssUrl));
        
        if (!response.ok) {
            throw new Error('記事の取得に失敗しました');
        }

        const data = await response.json();
        
        if (data.status !== 'ok') {
            throw new Error('RSSフィードの解析に失敗しました');
        }

        allPosts = data.items.map(item => {
            // カテゴリを判定（タイトルや内容から推測）
            let category = 'information'; // デフォルト
            const title = item.title.toLowerCase();
            const content = item.description.toLowerCase();
            
            if (title.includes('更新') || title.includes('アップデート') || title.includes('追加') || 
                content.includes('更新') || content.includes('アップデート')) {
                category = 'update';
            }

            return {
                title: item.title,
                link: item.link,
                description: item.description.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                fullContent: item.description,
                pubDate: new Date(item.pubDate),
                category: category
            };
        });

        // 記事を日付順でソート
        allPosts.sort((a, b) => b.pubDate - a.pubDate);

        // 記事を表示
        displayPosts(allPosts);
        
    } catch (error) {
        console.error('RSSフィード読み込みエラー:', error);
        showErrorState();
    }
}

// カテゴリを判定する関数
function determineCategory(post) {
    let category = 'information'; // デフォルト
    
    // ラベルからカテゴリを判定
    if (post.labels) {
        if (post.labels.includes('更新情報') || post.labels.includes('update')) {
            category = 'update';
        } else if (post.labels.includes('おしらせ') || post.labels.includes('information')) {
            category = 'information';
        }
    } else {
        // ラベルがない場合はタイトルから判定
        const title = post.title.toLowerCase();
        if (title.includes('更新') || title.includes('アップデート') || title.includes('追加')) {
            category = 'update';
        }
    }
    
    return category;
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
    if (post.fullContent) {
        modalContent.innerHTML = post.fullContent;
    } else {
        modalContent.innerHTML = `<p>${post.description}</p>`;
    }
    
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
window.loadBlogPosts = loadBlogPosts;
