/**
 * XRPL NFT マーケットプレイス
 * メインJavaScriptファイル
 */

// アプリケーション状態管理
var AppState = {
    currentUser: null,
    authToken: localStorage.getItem('wallet_token'),
    currentTab: 'marketplace',
    isLoading: false,
    nfts: [],
    stats: {}
};

// DOM要素の参照
var DOMElements = {
    connectWalletBtn: null,
    connectedWallet: null,
    walletDisplayName: null,
    profileModal: null,
    profileAddress: null,
    loadingIndicator: null
};

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
    initializeDOMElements();
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
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
}

/**
 * アプリケーションの初期化
 */
function initializeApp() {
    console.log('XRPL NFT マーケットプレイス開始');
    fetchMarketplaceStats();
    
    if (AppState.currentTab === 'marketplace') {
        fetchMarketplaceNFTs();
    }
}

/**
 * マーケットプレイスのNFT一覧を取得
 */
function fetchMarketplaceNFTs() {
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
                    { trait_type: 'Rarity', value: 'Rare' }
                ]
            },
            lowest_price: 5000000,
            owner_address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'
        },
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
            metadata: {
                name: 'Crypto Kitty #142',
                description: 'Adorable digital cat with unique traits',
                image: 'https://picsum.photos/400/400?random=2',
                attributes: [
                    { trait_type: 'Eyes', value: 'Green' },
                    { trait_type: 'Fur', value: 'Striped' }
                ]
            },
            lowest_price: 12000000,
            owner_address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH'
        },
        {
            nft_token_id: '000B013A95F14B0044F78A264E41713C64B5F89242540EE203',
            metadata: {
                name: 'Music Note #777',
                description: 'Unique musical composition stored as NFT',
                image: 'https://picsum.photos/400/400?random=3',
                attributes: [
                    { trait_type: 'Genre', value: 'Electronic' },
                    { trait_type: 'Tempo', value: '120 BPM' }
                ]
            },
            lowest_price: 8500000,
            owner_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
        }
    ];
    
    setTimeout(function() {
        AppState.nfts = mockNFTs;
        renderNFTs(mockNFTs, 'nft-grid');
        setLoading(false);
    }, 1000);
}

/**
 * ユーザーのNFT一覧を取得
 */
function fetchMyNFTs() {
    if (!AppState.currentUser) return;
    
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
            owner_address: AppState.currentUser.wallet_address
        }
    ];
    
    setTimeout(function() {
        renderNFTs(myNFTs, 'my-nft-grid', true);
        setLoading(false);
    }, 800);
}

/**
 * NFTカードをレンダリング
 */
function renderNFTs(nfts, containerId, isMyNFT) {
    isMyNFT = isMyNFT || false;
    var container = document.getElementById(containerId);
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (nfts.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">NFTが見つかりませんでした</div>';
        return;
    }
    
    for (var i = 0; i < nfts.length; i++) {
        var nftCard = createNFTCard(nfts[i], isMyNFT);
        container.appendChild(nftCard);
    }
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
                            attr.trait_type + ': ' + attr.value + '</span>';
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
        actionButtonHTML = '<button onclick="createSellOffer(\'' + nft.nft_token_id + '\')" ' +
                          'class="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm mb-2">' +
                          '売却オファー作成</button>';
    }
    
    card.innerHTML = 
        '<div class="aspect-square bg-gray-100 overflow-hidden">' +
            '<img src="' + nft.metadata.image + '" alt="' + (nft.metadata.name || 'NFT') + '" ' +
                 'class="w-full h-full object-cover" ' +
                 'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
            '<div class="w-full h-full flex items-center justify-center text-gray-400" style="display: none;">' +
                '<svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">' +
                    '<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>' +
                '</svg>' +
            '</div>' +
        '</div>' +
        '<div class="p-4">' +
            '<h3 class="font-semibold text-lg text-gray-800 mb-2">' + (nft.metadata.name || 'Unnamed NFT') + '</h3>' +
            '<p class="text-sm text-gray-600 mb-3">' + (nft.metadata.description || 'No description available') + '</p>' +
            priceHTML +
            (attributesHTML ? '<div class="mb-3">' + attributesHTML + '</div>' : '') +
            '<div class="space-y-2">' +
                actionButtonHTML +
                '<button onclick="viewNFTDetails(\'' + nft.nft_token_id + '\')" ' +
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
    
    var uri = document.getElementById('mint-uri').value;
    var transferFee = parseFloat(document.getElementById('mint-transfer-fee').value) * 1000 || 0;
    var transferable = document.getElementById('mint-transferable').checked;
    var burnable = document.getElementById('mint-burnable').checked;
    
    setLoading(true);
    
    // デモ用の発行シミュレーション
    setTimeout(function() {
        showNotification('NFTが正常に発行されました！', 'success');
        
        // フォームをリセット
        var form = document.getElementById('mint-form');
        if (form) {
            form.reset();
            document.getElementById('mint-transferable').checked = true;
            document.getElementById('mint-burnable').checked = false;
        }
        
        setLoading(false);
        
        // マイNFTタブが表示されている場合は更新
        if (AppState.currentTab === 'my-nfts') {
            fetchMyNFTs();
        }
    }, 2000);
}

/**
 * 売却オファー作成
 */
function createSellOffer(nftTokenId) {
    var price = prompt('売却価格を入力してください（XRP）:');
    if (price && parseFloat(price) > 0) {
        setLoading(true);
        
        setTimeout(function() {
            setLoading(false);
            showNotification(price + ' XRPで売却オファーを作成しました', 'success');
        }, 1500);
    }
}

/**
 * NFT詳細表示
 */
function viewNFTDetails(nftTokenId) {
    showNotification('NFT詳細: ' + nftTokenId, 'info');
}

/**
 * ローディング状態の設定
 */
function setLoading(loading) {
    AppState.isLoading = loading;
    
    if (loading) {
        DOMElements.loadingIndicator.classList.remove('hidden');
    } else {
        DOMElements.loadingIndicator.classList.add('hidden');
    }
}

/**
 * 通知表示
 */
function showNotification(message, type) {
    type = type || 'info';
    
    var notification = document.createElement('div');
    var bgColor = 'bg-blue-500';
    
    if (type === 'success') bgColor = 'bg-green-500';
    else if (type === 'error') bgColor = 'bg-red-500';
    else if (type === 'warning') bgColor = 'bg-yellow-500';
    
    notification.className = 'fixed top-4 right-4 ' + bgColor + ' text-white px-6 py-3 rounded-lg shadow-lg z-50 notification-enter';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // アニメーション開始
    setTimeout(function() {
        notification.classList.remove('notification-enter');
        notification.classList.add('notification-show');
    }, 10);
    
    // 3秒後に自動削除
    setTimeout(function() {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-exit');
        
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * ページ離脱前の確認
 */
window.addEventListener('beforeunload', function(e) {
    if (AppState.isLoading) {
        e.preventDefault();
        e.returnValue = '処理中です。ページを離れてもよろしいですか？';
    }
});

/**
 * ページ可視性変更時の処理
 */
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // ページがアクティブになったら最新データを取得
        fetchMarketplaceStats();
        if (AppState.currentTab === 'marketplace') {
            fetchMarketplaceNFTs();
        } else if (AppState.currentTab === 'my-nfts' && AppState.currentUser) {
            fetchMyNFTs();
        }
    }
});

/**
 * 定期的な統計情報の更新
 */
setInterval(fetchMarketplaceStats, 30000); // 30秒ごと

// デバッグ用のグローバル変数
window.AppState = AppState;
window.DOMElements = DOMElements;

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // ウォレット接続
    DOMElements.connectWalletBtn.addEventListener('click', connectWallet);
    
    // プロフィール関連
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
}

/**
 * タブリスナーの設定
 */
function setupTabListeners() {
    var tabButtons = document.querySelectorAll('.tab-button');
    for (var i = 0; i < tabButtons.length; i++) {
        tabButtons[i].addEventListener('click', function(e) {
            var tabName = e.target.getAttribute('data-tab');
            if (!tabName) {
                tabName = e.target.parentElement.getAttribute('data-tab');
            }
            switchTab(tabName);
        });
    }
}

/**
 * リフレッシュボタンリスナーの設定
 */
function setupRefreshListeners() {
    var refreshMarketplace = document.getElementById('refresh-marketplace');
    if (refreshMarketplace) {
        refreshMarketplace.addEventListener('click', fetchMarketplaceNFTs);
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
    // モーダル外クリックで閉じる
    DOMElements.profileModal.addEventListener('click', function(e) {
        if (e.target === DOMElements.profileModal) {
            DOMElements.profileModal.classList.remove('active');
        }
    });
}

/**
 * キーボードショートカットの設定
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escキーでモーダルを閉じる
        if (e.key === 'Escape') {
            DOMElements.profileModal.classList.remove('active');
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
    });
}

/**
 * 認証状態のチェック
 */
function checkAuthStatus() {
    if (AppState.authToken) {
        // デモ用ユーザー情報
        AppState.currentUser = {
            wallet_address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
            username: 'DemoUser',
            display_name: 'Demo User'
        };
        updateWalletUI();
    }
}

/**
 * ウォレット接続処理
 */
function connectWallet() {
    setLoading(true);
    
    // デモ用の接続シミュレーション
    setTimeout(function() {
        AppState.currentUser = {
            wallet_address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
            username: 'DemoUser',
            display_name: 'Demo User'
        };
        
        AppState.authToken = 'demo_token_' + Date.now();
        localStorage.setItem('wallet_token', AppState.authToken);
        
        updateWalletUI();
        showNotification('ウォレットが正常に接続されました！', 'success');
        setLoading(false);
    }, 2000);
}

/**
 * ウォレットUIの更新
 */
function updateWalletUI() {
    if (AppState.currentUser) {
        DOMElements.connectWalletBtn.style.display = 'none';
        DOMElements.connectedWallet.classList.remove('hidden');
        DOMElements.walletDisplayName.textContent = AppState.currentUser.display_name || 
            (AppState.currentUser.wallet_address.slice(0, 6) + '...' + AppState.currentUser.wallet_address.slice(-4));
        DOMElements.profileAddress.textContent = AppState.currentUser.wallet_address;
        
        updateTabVisibility();
    } else {
        DOMElements.connectWalletBtn.style.display = 'flex';
        DOMElements.connectedWallet.classList.add('hidden');
        updateTabVisibility();
    }
}

/**
 * タブの表示/非表示を更新
 */
function updateTabVisibility() {
    var myNftsRefresh = document.getElementById('refresh-my-nfts');
    var mintFormContainer = document.getElementById('mint-form-container');
    var mintLoginPrompt = document.getElementById('mint-login-prompt');
    var loginPrompt = document.getElementById('login-prompt');
    
    if (AppState.currentUser) {
        if (myNftsRefresh) myNftsRefresh.disabled = false;
        if (mintFormContainer) mintFormContainer.style.display = 'block';
        if (mintLoginPrompt) mintLoginPrompt.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        if (myNftsRefresh) myNftsRefresh.disabled = true;
        if (mintFormContainer) mintFormContainer.style.display = 'none';
        if (mintLoginPrompt) mintLoginPrompt.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

/**
 * アドレスをクリップボードにコピー
 */
function copyAddress() {
    if (AppState.currentUser) {
        navigator.clipboard.writeText(AppState.currentUser.wallet_address);
        showNotification('アドレスがクリップボードにコピーされました', 'success');
    }
}

/**
 * ログアウト処理
 */
function logout() {
    AppState.currentUser = null;
    AppState.authToken = null;
    localStorage.removeItem('wallet_token');
    DOMElements.profileModal.classList.remove('active');
    updateWalletUI();
    showNotification('ログアウトしました', 'info');
    
    // マーケットプレイスタブに戻る
    if (AppState.currentTab !== 'marketplace') {
        switchTab('marketplace');
    }
}

/**
 * タブ切り替え処理
 */
function switchTab(tabName) {
    // すべてのタブコンテンツを非表示
    var tabContents = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.add('hidden');
    }
    
    // すべてのタブボタンを非アクティブに
    var tabButtons = document.querySelectorAll('.tab-button');
    for (var j = 0; j < tabButtons.length; j++) {
        tabButtons[j].classList.remove('tab-active');
        tabButtons[j].classList.add('tab-inactive');
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
    if (tabName === 'marketplace') {
        fetchMarketplaceNFTs();
    } else if (tabName === 'my-nfts' && AppState.currentUser) {
        fetchMyNFTs();
    }
}

/**
 * マーケットプレイス統計情報を取得
 */
function fetchMarketplaceStats() {
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