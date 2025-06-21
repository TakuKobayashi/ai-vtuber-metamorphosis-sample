/**
 * XRPL NFT マーケットプレイス
 * メインJavaScriptファイル - 完全版
 */

// アプリケーション状態管理
var AppState = {
    currentUser: null,
    authToken: localStorage.getItem('wallet_token'),
    currentTab: 'marketplace',
    isLoading: false,
    nfts: [],
    stats: {},
    config: {
        apiBaseUrl: '/api',
        autoRefreshInterval: 30000,
        notificationTimeout: 3000
    }
};

// DOM要素の参照
var DOMElements = {
    connectWalletBtn: null,
    connectedWallet: null,
    walletDisplayName: null,
    profileModal: null,
    profileAddress: null,
    loadingIndicator: null,
    tabButtons: null,
    tabContents: null
};

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 XRPL NFT マーケットプレイス初期化開始');
    initializeDOMElements();
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
    startPeriodicUpdates();
});

/**
 * DOM要素の初期化
 */
function initializeDOMElements() {
    DOMElements.connectWalletBtn = document.getElementById('connect-wallet-btn');
    DOMElements.connectedWallet = document.getElementById('connected-wallet');
    DOMElements.walletDisplayName = document.getElementById('wallet-display-name');
    DOMElements.profileModal = document.getElementById('profile-modal');
    DOMElements.profileAddress = document.getElementById('profile-address');
    DOMElements.loadingIndicator = document.getElementById('loading');
    DOMElements.tabButtons = document.querySelectorAll('.tab-button');
    DOMElements.tabContents = document.querySelectorAll('.tab-content');

    console.log('✅ DOM要素の初期化完了');
}

/**
 * アプリケーションの初期化
 */
function initializeApp() {
    console.log('📊 統計情報とマーケットプレイスデータを取得中...');
    fetchMarketplaceStats();

    if (AppState.currentTab === 'marketplace') {
        fetchMarketplaceNFTs();
    }

    console.log('✅ アプリケーション初期化完了');
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // ウォレット接続
    if (DOMElements.connectWalletBtn) {
        DOMElements.connectWalletBtn.addEventListener('click', connectWallet);
    }

    // プロフィール関連
    setupProfileListeners();

    // タブ切り替え
    setupTabListeners();

    // リフレッシュボタン
    setupRefreshListeners();

    // NFT発行フォーム
    setupMintFormListener();

    // モーダル関連
    setupModalListeners();

    // キーボードショートカット
    setupKeyboardShortcuts();

    // ページ離脱前の確認
    setupBeforeUnloadHandler();

    console.log('✅ イベントリスナーの設定完了');
}

/**
 * プロフィール関連リスナーの設定
 */
function setupProfileListeners() {
    var walletProfileBtn = document.getElementById('wallet-profile-btn');
    if (walletProfileBtn) {
        walletProfileBtn.addEventListener('click', function() {
            DOMElements.profileModal.classList.add('active');
        });
    }

    var closeProfileBtn = document.getElementById('close-profile');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', function() {
            DOMElements.profileModal.classList.remove('active');
        });
    }

    var copyAddressBtn = document.getElementById('copy-address');
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', copyAddress);
    }

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

/**
 * タブリスナーの設定
 */
function setupTabListeners() {
    for (var i = 0; i < DOMElements.tabButtons.length; i++) {
        DOMElements.tabButtons[i].addEventListener('click', function(e) {
            var tabName = e.target.getAttribute('data-tab');
            if (!tabName) {
                tabName = e.target.parentElement.getAttribute('data-tab');
            }
            if (tabName) {
                switchTab(tabName);
            }
        });
    }
}

/**
 * リフレッシュボタンリスナーの設定
 */
function setupRefreshListeners() {
    var refreshMarketplace = document.getElementById('refresh-marketplace');
    if (refreshMarketplace) {
        refreshMarketplace.addEventListener('click', function() {
            fetchMarketplaceNFTs();
            fetchMarketplaceStats();
        });
    }

    var refreshMyNfts = document.getElementById('refresh-my-nfts');
    if (refreshMyNfts) {
        refreshMyNfts.addEventListener('click', fetchMyNFTs);
    }
}

/**
 * NFT発行フォームリスナーの設定
 */
function setupMintFormListener() {
    var mintForm = document.getElementById('mint-form');
    if (mintForm) {
        mintForm.addEventListener('submit', mintNFT);
    }
}

/**
 * モーダルリスナーの設定
 */
function setupModalListeners() {
    if (DOMElements.profileModal) {
        // モーダル外クリックで閉じる
        DOMElements.profileModal.addEventListener('click', function(e) {
            if (e.target === DOMElements.profileModal) {
                DOMElements.profileModal.classList.remove('active');
            }
        });
    }
}

/**
 * キーボードショートカットの設定
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escキーでモーダルを閉じる
        if (e.key === 'Escape') {
            if (DOMElements.profileModal) {
                DOMElements.profileModal.classList.remove('active');
            }
        }

        // Ctrl/Cmd + 数字キーでタブ切り替え
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
            e.preventDefault();
            var tabs = ['marketplace', 'my-nfts', 'mint'];
            var tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                switchTab(tabs[tabIndex]);
            }
        }

        // Ctrl/Cmd + R でリフレッシュ
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshCurrentTab();
        }
    });
}

/**
 * ページ離脱前の確認設定
 */
function setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', function(e) {
        if (AppState.isLoading) {
            e.preventDefault();
            e.returnValue = '処理中です。ページを離れてもよろしいですか？';
        }
    });
}

/**
 * 認証状態のチェック
 */
function checkAuthStatus() {
    if (AppState.authToken) {
        console.log('🔐 認証トークンが見つかりました');
        // デモ用ユーザー情報
        AppState.currentUser = {
            wallet_address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
            username: 'DemoUser',
            display_name: 'Demo User'
        };
        updateWalletUI();
        showNotification('自動ログインしました', 'success');
    }
}

/**
 * ウォレット接続処理
 */
function connectWallet() {
    console.log('🔗 ウォレット接続を開始...');
    setLoading(true);

    // デモ用の接続シミュレーション
    setTimeout(function() {
        try {
            AppState.currentUser = {
                wallet_address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
                username: 'DemoUser',
                display_name: 'Demo User'
            };

            AppState.authToken = 'demo_token_' + Date.now();
            localStorage.setItem('wallet_token', AppState.authToken);

            updateWalletUI();
            showNotification('ウォレットが正常に接続されました！', 'success');
            console.log('✅ ウォレット接続完了');

        } catch (error) {
            console.error('❌ ウォレット接続エラー:', error);
            showNotification('ウォレット接続に失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    }, 2000);
}

/**
 * ウォレットUIの更新
 */
function updateWalletUI() {
    if (AppState.currentUser && DOMElements.connectWalletBtn && DOMElements.connectedWallet) {
        DOMElements.connectWalletBtn.style.display = 'none';
        DOMElements.connectedWallet.classList.remove('hidden');

        if (DOMElements.walletDisplayName) {
            DOMElements.walletDisplayName.textContent = AppState.currentUser.display_name ||
                (AppState.currentUser.wallet_address.slice(0, 6) + '...' + AppState.currentUser.wallet_address.slice(-4));
        }

        if (DOMElements.profileAddress) {
            DOMElements.profileAddress.textContent = AppState.currentUser.wallet_address;
        }

        updateTabVisibility();
    } else if (DOMElements.connectWalletBtn && DOMElements.connectedWallet) {
        DOMElements.connectWalletBtn.style.display = 'flex';
        DOMElements.connectedWallet.classList.add('hidden');
        updateTabVisibility();
    }
}

/**
 * タブの表示/非表示を更新
 */
function updateTabVisibility() {
    var elements = {
        myNftsRefresh: document.getElementById('refresh-my-nfts'),
        mintFormContainer: document.getElementById('mint-form-container'),
        mintLoginPrompt: document.getElementById('mint-login-prompt'),
        loginPrompt: document.getElementById('login-prompt')
    };

    if (AppState.currentUser) {
        if (elements.myNftsRefresh) elements.myNftsRefresh.disabled = false;
        if (elements.mintFormContainer) elements.mintFormContainer.style.display = 'block';
        if (elements.mintLoginPrompt) elements.mintLoginPrompt.style.display = 'none';
        if (elements.loginPrompt) elements.loginPrompt.style.display = 'none';
    } else {
        if (elements.myNftsRefresh) elements.myNftsRefresh.disabled = true;
        if (elements.mintFormContainer) elements.mintFormContainer.style.display = 'none';
        if (elements.mintLoginPrompt) elements.mintLoginPrompt.style.display = 'block';
        if (elements.loginPrompt) elements.loginPrompt.style.display = 'block';
    }
}

/**
 * アドレスをクリップボードにコピー
 */
function copyAddress() {
    if (AppState.currentUser && navigator.clipboard) {
        navigator.clipboard.writeText(AppState.currentUser.wallet_address).then(function() {
            showNotification('アドレスがクリップボードにコピーされました', 'success');
        }).catch(function(err) {
            console.error('コピーに失敗しました:', err);
            showNotification('コピーに失敗しました', 'error');
        });
    }
}

/**
 * ログアウト処理
 */
function logout() {
    console.log('🚪 ログアウト処理を開始...');
    AppState.currentUser = null;
    AppState.authToken = null;
    localStorage.removeItem('wallet_token');

    if (DOMElements.profileModal) {
        DOMElements.profileModal.classList.remove('active');
    }

    updateWalletUI();
    showNotification('ログアウトしました', 'info');

    // マーケットプレイスタブに戻る
    if (AppState.currentTab !== 'marketplace') {
        switchTab('marketplace');
    }

    console.log('✅ ログアウト完了');
}

/**
 * タブ切り替え処理
 */
function switchTab(tabName) {
    console.log('📑 タブ切り替え:', tabName);

    // すべてのタブコンテンツを非表示
    for (var i = 0; i < DOMElements.tabContents.length; i++) {
        DOMElements.tabContents[i].classList.add('hidden');
    }

    // すべてのタブボタンを非アクティブに
    for (var j = 0; j < DOMElements.tabButtons.length; j++) {
        DOMElements.tabButtons[j].classList.remove('tab-active');
        DOMElements.tabButtons[j].classList.add('tab-inactive');
    }

    // 選択されたタブを表示
    var selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    // 選択されたタブボタンをアクティブに
    var activeButton = document.querySelector('[data-tab="' + tabName + '"]');
    if (activeButton) {
        activeButton.classList.remove('tab-inactive');
        activeButton.classList.add('tab-active');
    }

    AppState.currentTab = tabName;

    // タブに応じてデータを読み込み
    loadTabData(tabName);
}

/**
 * タブデータの読み込み
 */
function loadTabData(tabName) {
    switch (tabName) {
        case 'marketplace':
            fetchMarketplaceNFTs();
            break;
        case 'my-nfts':
            if (AppState.currentUser) {
                fetchMyNFTs();
            }
            break;
        case 'mint':
            // NFT発行タブでは特別な読み込み処理なし
            break;
        default:
            console.warn('不明なタブ:', tabName);
    }
}

/**
 * 現在のタブをリフレッシュ
 */
function refreshCurrentTab() {
    console.log('🔄 現在のタブをリフレッシュ:', AppState.currentTab);
    loadTabData(AppState.currentTab);
    fetchMarketplaceStats();
}

/**
 * マーケットプレイス統計情報を取得
 */
function fetchMarketplaceStats() {
    try {
        // デモ用の統計データ
        AppState.stats = {
            total_nfts: 1247,
            total_offers: 89,
            active_sell_offers: 56,
            active_buy_offers: 33,
            total_volume: 125000000
        };

        var elements = {
            'stat-total-nfts': AppState.stats.total_nfts.toLocaleString(),
            'stat-total-offers': AppState.stats.total_offers.toLocaleString(),
            'stat-sell-offers': AppState.stats.active_sell_offers.toLocaleString(),
            'stat-buy-offers': AppState.stats.active_buy_offers.toLocaleString(),
            'stat-volume': (AppState.stats.total_volume / 1000000).toLocaleString()
        };

        for (var id in elements) {
            var element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        }

        console.log('📊 統計情報を更新しました');

    } catch (error) {
        console.error('❌ 統計情報の取得に失敗:', error);
    }
}

/**
 * マーケットプレイスのNFT一覧を取得
 */
function fetchMarketplaceNFTs() {
    console.log('🏪 マーケットプレイスNFTを取得中...');
    setLoading(true);

    // デモ用のNFTデータ
    var mockNFTs = [
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE201',
            metadata: {
                name: 'Digital Art #001',
                description: 'Beautiful digital artwork created by AI',
                image: 'https://picsum.photos/400/400?random=1',
                attributes: [
                    { trait_type: 'Color', value: 'Blue' },
                    { trait_type: 'Rarity', value: 'Rare' },
                    { trait_type: 'Style', value: 'Abstract' }
                ]
            },
            lowest_price: 5000000,
            owner_address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
            created_at: '2025-01-15T10:00:00Z'
        },
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
            metadata: {
                name: 'Crypto Kitty #142',
                description: 'Adorable digital cat with unique traits',
                image: 'https://picsum.photos/400/400?random=2',
                attributes: [
                    { trait_type: 'Eyes', value: 'Green' },
                    { trait_type: 'Fur', value: 'Striped' },
                    { trait_type: 'Background', value: 'Galaxy' }
                ]
            },
            lowest_price: 12000000,
            owner_address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
            created_at: '2025-01-14T15:30:00Z'
        },
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE203',
            metadata: {
                name: 'Music Note #777',
                description: 'Unique musical composition stored as NFT',
                image: 'https://picsum.photos/400/400?random=3',
                attributes: [
                    { trait_type: 'Genre', value: 'Electronic' },
                    { trait_type: 'Tempo', value: '120 BPM' },
                    { trait_type: 'Key', value: 'C Major' }
                ]
            },
            lowest_price: 8500000,
            owner_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
            created_at: '2025-01-13T09:15:00Z'
        },
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE204',
            metadata: {
                name: 'Pixel Avatar #456',
                description: '8-bit style pixel art avatar',
                image: 'https://picsum.photos/400/400?random=4',
                attributes: [
                    { trait_type: 'Style', value: '8-bit' },
                    { trait_type: 'Background', value: 'Neon' },
                    { trait_type: 'Accessory', value: 'Sunglasses' }
                ]
            },
            lowest_price: 3500000,
            owner_address: 'rLHzPsX6oXkzU2qL4dpWbVkLdxQQ4uNFQ',
            created_at: '2025-01-12T14:20:00Z'
        }
    ];

    setTimeout(function() {
        AppState.nfts = mockNFTs;
        renderNFTs(mockNFTs, 'nft-grid');
        setLoading(false);
        console.log('✅ マーケットプレイスNFT取得完了:', mockNFTs.length + '件');
    }, 1000);
}

/**
 * ユーザーのNFT一覧を取得
 */
function fetchMyNFTs() {
    if (!AppState.currentUser) {
        console.warn('⚠️ ユーザーが認証されていません');
        return;
    }

    console.log('👤 マイNFTを取得中...');
    setLoading(true);

    // デモ用：ユーザーが所有するNFT
    var myNFTs = [
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
            metadata: {
                name: 'My Crypto Kitty #142',
                description: 'My adorable digital cat',
                image: 'https://picsum.photos/400/400?random=2',
                attributes: [
                    { trait_type: 'Eyes', value: 'Green' },
                    { trait_type: 'Fur', value: 'Striped' }
                ]
            },
            owner_address: AppState.currentUser.wallet_address,
            created_at: '2025-01-14T15:30:00Z'
        },
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE205',
            metadata: {
                name: 'My Digital Painting',
                description: 'Personal digital artwork collection',
                image: 'https://picsum.photos/400/400?random=5',
                attributes: [
                    { trait_type: 'Medium', value: 'Digital' },
                    { trait_type: 'Year', value: '2025' }
                ]
            },
            owner_address: AppState.currentUser.wallet_address,
            created_at: '2025-01-10T09:45:00Z'
        }
    ];

    setTimeout(function() {
        renderNFTs(myNFTs, 'my-nft-grid', true);
        setLoading(false);
        console.log('✅ マイNFT取得完了:', myNFTs.length + '件');
    }, 800);
}

/**
 * NFTカードをレンダリング
 */
function renderNFTs(nfts, containerId, isMyNFT) {
    isMyNFT = isMyNFT || false;
    var container = document.getElementById(containerId);

    if (!container) {
        console.error('❌ コンテナが見つかりません:', containerId);
        return;
    }

    container.innerHTML = '';

    if (nfts.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">NFTが見つかりませんでした</div>';
        return;
    }

    console.log('🎨 NFTカードをレンダリング中:', nfts.length + '件');

    for (var i = 0; i < nfts.length; i++) {
        var nftCard = createNFTCard(nfts[i], isMyNFT);
        container.appendChild(nftCard);
    }

    console.log('✅ NFTカードのレンダリング完了');
}

/**
 * NFTカードを作成
 */
function createNFTCard(nft, isMyNFT) {
    var card = document.createElement('div');
    card.className = 'nft-card border border-gray-200 rounded-lg overflow-hidden bg-white';

    // 属性のHTML生成
    var attributesHTML = '';
    if (nft.metadata.attributes) {
        for (var i = 0; i < Math.min(nft.metadata.attributes.length, 3); i++) {
            var attr = nft.metadata.attributes[i];
            attributesHTML += '<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">' +
                escapeHtml(attr.trait_type) + ': ' + escapeHtml(attr.value) + '</span>';
        }
    }

    // 価格のHTML生成
    var priceHTML = '';
    if (nft.lowest_price) {
        priceHTML = '<div class="mb-3">' +
            '<span class="text-lg font-bold text-green-600">' + (nft.lowest_price / 1000000).toFixed(2) + ' XRP</span>' +
            '<span class="text-sm text-gray-500 ml-2">最低価格</span>' +
            '</div>';
    }

    // アクションボタンのHTML生成
    var actionButtonHTML = '';
    if (isMyNFT) {
        actionButtonHTML = '<button onclick="createSellOffer(\'' + escapeHtml(nft.nft_token_id) + '\')" ' +
            'class="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm mb-2">' +
            '売却オファー作成</button>';
    }

    card.innerHTML =
        '<div class="aspect-square bg-gray-100 overflow-hidden">' +
        '<img src="' + escapeHtml(nft.metadata.image) + '" alt="' + escapeHtml(nft.metadata.name || 'NFT') + '" ' +
        'class="w-full h-full object-cover" ' +
        'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
        '<div class="w-full h-full flex items-center justify-center text-gray-400" style="display: none;">' +
        '<svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">' +
        '<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>' +
        '</svg>' +
        '</div>' +
        '</div>' +
        '<div class="p-4">' +
        '<h3 class="font-semibold text-lg text-gray-800 mb-2">' + escapeHtml(nft.metadata.name || 'Unnamed NFT') + '</h3>' +
        '<p class="text-sm text-gray-600 mb-3">' + escapeHtml(nft.metadata.description || 'No description available') + '</p>' +
        priceHTML +
        (attributesHTML ? '<div class="mb-3">' + attributesHTML + '</div>' : '') +
        '<div class="space-y-2">' +
        actionButtonHTML +
        '<button onclick="viewNFTDetails(\'' + escapeHtml(nft.nft_token_id) + '\')" ' +
        'class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm">' +
        '詳細を見る</button>' +
        '</div>' +
        '</div>';

    return card;
}

/**
 * NFT発行処理
 */
function mintNFT(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
        showNotification('ウォレットに接続してください', 'error');
        return;
    }

    console.log('✨ NFT発行を開始...');

    var uri = document.getElementById('mint-uri').value;
    var transferFee = parseFloat(document.getElementById('mint-transfer-fee').value) * 1000 || 0;
    var transferable = document.getElementById('mint-transferable').checked;
    var burnable = document.getElementById('mint-burnable').checked;

    // 入力値検証
    if (uri && !isValidUrl(uri)) {
        showNotification('有効なURLを入力してください', 'error');
        return;
    }

    if (transferFee < 0 || transferFee > 50000) {
        showNotification('転送手数料は0-50%の範囲で入力してください', 'error');
        return;
    }

    setLoading(true);

    // デモ用の発行シミュレーション
    setTimeout(function() {
        try {
            showNotification('NFTが正常に発行されました！', 'success');

            // フォームをリセット
            var form = document.getElementById('mint-form');
            if (form) {
                form.reset();
                document.getElementById('mint-transferable').checked = true;
                document.getElementById('mint-burnable').checked = false;
            }

            console.log('✅ NFT発行完了');

            // マイNFTタブが表示されている場合は更新
            if (AppState.currentTab === 'my-nfts') {
                fetchMyNFTs();
            }

        } catch (error) {
            console.error('❌ NFT発行エラー:', error);
            showNotification('NFT発行に失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    }, 2000);
}

/**
 * 売却オファー作成
 */
function createSellOffer(nftTokenId) {
    if (!AppState.currentUser) {
        showNotification('ウォレットに接続してください', 'error');
        return;
    }

    var price = prompt('売却価格を入力してください（XRP）:');
    if (price && parseFloat(price) > 0) {
        console.log('💰 売却オファーを作成中:', nftTokenId, price + ' XRP');
        setLoading(true);

        setTimeout(function() {
            setLoading(false);
            showNotification(price + ' XRPで売却オファーを作成しました', 'success');
            console.log('✅ 売却オファー作成完了');
        }, 1500);
    } else if (price !== null) {
        showNotification('有効な価格を入力してください', 'error');
    }
}

/**
 * NFT詳細表示
 */
function viewNFTDetails(nftTokenId) {
    console.log('🔍 NFT詳細を表示:', nftTokenId);
    showNotification('NFT詳細: ' + nftTokenId.slice(0, 8) + '...', 'info');

    // 実際の実装では詳細モーダルを表示
    // showNFTDetailModal(nftTokenId);
}

/**
 * ローディング状態の設定
 */
function setLoading(loading) {
    AppState.isLoading = loading;

    if (DOMElements.loadingIndicator) {
        if (loading) {
            DOMElements.loadingIndicator.classList.remove('hidden');
        } else {
            DOMElements.loadingIndicator.classList.add('hidden');
        }
    }

    console.log(loading ? '⏳ ローディング開始' : '✅ ローディング終了');
}

/**
 * 通知表示
 */
function showNotification(message, type) {
    type = type || 'info';

    console.log('📢 通知:', type.toUpperCase(), '-', message);

    var notification = document.createElement('div');
    var bgColor = 'bg-blue-500';

    if (type === 'success') bgColor = 'bg-green-500';
    else if (type === 'error') bgColor = 'bg-red-500';
    else if (type === 'warning') bgColor = 'bg-yellow-500';

    notification.className = 'fixed top-4 right-4 ' + bgColor + ' text-white px-6 py-3 rounded-lg shadow-lg z-50 notification-enter max-w-sm';
    notification.innerHTML = '<div class="flex items-center space-x-2"><span>' + escapeHtml(message) + '</span></div>';

    document.body.appendChild(notification);

    // アニメーション開始
    setTimeout(function() {
        notification.classList.remove('notification-enter');
        notification.classList.add('notification-show');
    }, 10);

    // 自動削除
    setTimeout(function() {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-exit');

        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, AppState.config.notificationTimeout);
}

/**
 * 定期的な更新処理を開始
 */
function startPeriodicUpdates() {
    // 統計情報の定期更新
    setInterval(function() {
        if (!document.hidden) {
            fetchMarketplaceStats();
        }
    }, AppState.config.autoRefreshInterval);

    // ページ可視性変更時の処理
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('👁️ ページがアクティブになりました - データを更新中...');
            fetchMarketplaceStats();
            refreshCurrentTab();
        } else {
            console.log('💤 ページが非アクティブになりました');
        }
    });

    console.log('🔄 定期更新を開始しました (間隔: ' + (AppState.config.autoRefreshInterval / 1000) + '秒)');
}

/**
 * ユーティリティ関数: HTMLエスケープ
 */
function escapeHtml(text) {
    if (typeof text !== 'string') {
        return text;
    }

    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) {
        return map[m];
    });
}

/**
 * ユーティリティ関数: URL検証
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * ユーティリティ関数: XRP形式の変換
 */
function formatXRP(drops) {
    return (parseInt(drops) / 1000000).toFixed(6) + ' XRP';
}

/**
 * ユーティリティ関数: アドレス短縮表示
 */
function formatAddress(address) {
    if (!address || address.length < 10) {
        return address;
    }
    return address.slice(0, 6) + '...' + address.slice(-4);
}

/**
 * ユーティリティ関数: 日付フォーマット
 */
function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * ユーティリティ関数: 数値フォーマット
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

/**
 * 検索機能
 */
function searchNFTs(query) {
    console.log('🔍 NFT検索:', query);

    if (!query || query.trim().length < 2) {
        showNotification('2文字以上で検索してください', 'warning');
        return;
    }

    setLoading(true);

    // デモ用の検索結果
    setTimeout(function() {
        var searchResults = AppState.nfts.filter(function(nft) {
            return nft.metadata.name.toLowerCase().includes(query.toLowerCase()) ||
                nft.metadata.description.toLowerCase().includes(query.toLowerCase());
        });

        renderNFTs(searchResults, 'nft-grid');
        setLoading(false);

        showNotification(searchResults.length + '件の検索結果', 'info');
        console.log('✅ 検索完了:', searchResults.length + '件');
    }, 800);
}

/**
 * フィルタ機能
 */
function filterNFTs(filters) {
    console.log('🔧 NFTフィルタ:', filters);
    setLoading(true);

    setTimeout(function() {
        var filteredNFTs = AppState.nfts.filter(function(nft) {
            var matchesPrice = true;
            var matchesCategory = true;

            // 価格フィルタ
            if (filters.minPrice && nft.lowest_price < filters.minPrice * 1000000) {
                matchesPrice = false;
            }
            if (filters.maxPrice && nft.lowest_price > filters.maxPrice * 1000000) {
                matchesPrice = false;
            }

            // カテゴリフィルタ
            if (filters.category && nft.metadata.attributes) {
                matchesCategory = nft.metadata.attributes.some(function(attr) {
                    return attr.trait_type.toLowerCase() === filters.category.toLowerCase();
                });
            }

            return matchesPrice && matchesCategory;
        });

        renderNFTs(filteredNFTs, 'nft-grid');
        setLoading(false);

        showNotification(filteredNFTs.length + '件にフィルタしました', 'info');
        console.log('✅ フィルタ完了:', filteredNFTs.length + '件');
    }, 600);
}

/**
 * ソート機能
 */
function sortNFTs(sortBy, order) {
    console.log('📊 NFTソート:', sortBy, order);

    var sortedNFTs = AppState.nfts.slice().sort(function(a, b) {
        var valueA, valueB;

        switch (sortBy) {
            case 'price':
                valueA = a.lowest_price || 0;
                valueB = b.lowest_price || 0;
                break;
            case 'name':
                valueA = a.metadata.name.toLowerCase();
                valueB = b.metadata.name.toLowerCase();
                break;
            case 'date':
                valueA = new Date(a.created_at);
                valueB = new Date(b.created_at);
                break;
            default:
                return 0;
        }

        if (order === 'desc') {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        } else {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }
    });

    renderNFTs(sortedNFTs, 'nft-grid');
    showNotification('ソート完了', 'info');
}

/**
 * エラーハンドリング
 */
function handleError(error, context) {
    console.error('❌ エラーが発生しました (' + context + '):', error);

    var errorMessage = 'エラーが発生しました';
    if (error.message) {
        errorMessage += ': ' + error.message;
    }

    showNotification(errorMessage, 'error');
    setLoading(false);
}

/**
 * ネットワーク状態の監視
 */
function setupNetworkMonitoring() {
    window.addEventListener('online', function() {
        console.log('🌐 ネットワーク接続が復旧しました');
        showNotification('ネットワーク接続が復旧しました', 'success');
        refreshCurrentTab();
    });

    window.addEventListener('offline', function() {
        console.log('📡 ネットワーク接続が失われました');
        showNotification('ネットワーク接続が失われました', 'warning');
    });
}

/**
 * ローカルストレージ管理
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('ローカルストレージ保存エラー:', e);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('ローカルストレージ読み込みエラー:', e);
        return null;
    }
}

/**
 * パフォーマンス監視
 */
function measurePerformance(name, fn) {
    var startTime = performance.now();

    try {
        var result = fn();
        var endTime = performance.now();
        console.log('⏱️ ' + name + ' 実行時間:', (endTime - startTime).toFixed(2) + 'ms');
        return result;
    } catch (error) {
        var endTime = performance.now();
        console.error('❌ ' + name + ' エラー (実行時間: ' + (endTime - startTime).toFixed(2) + 'ms):', error);
        throw error;
    }
}

/**
 * デバッグ用のヘルパー関数
 */
function debugInfo() {
    console.group('🐛 デバッグ情報');
    console.log('現在の状態:', AppState);
    console.log('DOM要素:', DOMElements);
    console.log('ブラウザ情報:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled
    });
    console.log('画面サイズ:', {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
    });
    console.groupEnd();
}

/**
 * 初期化完了後の設定
 */
function finalizeInitialization() {
    setupNetworkMonitoring();

    // グローバルエラーハンドラ
    window.addEventListener('error', function(e) {
        handleError(e.error, 'Global Error');
    });

    // 未処理のPromiseエラー
    window.addEventListener('unhandledrejection', function(e) {
        handleError(e.reason, 'Unhandled Promise Rejection');
        e.preventDefault();
    });

    // デバッグモード
    if (localStorage.getItem('debug_mode') === 'true') {
        window.debugInfo = debugInfo;
        window.AppState = AppState;
        window.DOMElements = DOMElements;
        console.log('🐛 デバッグモードが有効です。debugInfo()でデバッグ情報を表示できます。');
    }

    console.log('🎉 XRPL NFT マーケットプレイスの初期化が完了しました！');
}

// 初期化完了後に追加設定を実行
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(finalizeInitialization, 100);
});

// Service Worker登録（PWA対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('✅ Service Worker登録成功:', registration);
            })
            .catch(function(registrationError) {
                console.log('❌ Service Worker登録失敗:', registrationError);
            });
    });
}

// バージョン情報
var APP_VERSION = '1.0.0';
var BUILD_DATE = '2025-01-21';

console.log('📱 XRPL NFT マーケットプレイス v' + APP_VERSION + ' (' + BUILD_DATE + ')');
console.log('🔗 GitHub: https://github.com/your-repo/xrpl-nft-marketplace');
console.log('📖 ドキュメント: https://docs.your-site.com');

// アプリケーション準備完了の通知
window.XRPL_NFT_APP = {
    version: APP_VERSION,
    state: AppState,
    elements: DOMElements,
    utils: {
        formatXRP: formatXRP,
        formatAddress: formatAddress,
        formatDate: formatDate,
        formatNumber: formatNumber,
        escapeHtml: escapeHtml,
        isValidUrl: isValidUrl
    },
    actions: {
        connectWallet: connectWallet,
        logout: logout,
        switchTab: switchTab,
        searchNFTs: searchNFTs,
        filterNFTs: filterNFTs,
        sortNFTs: sortNFTs,
        refreshCurrentTab: refreshCurrentTab
    }
};

console.log('🚀 アプリケーションAPIが window.XRPL_NFT_APP で利用可能です');

