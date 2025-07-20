// Content Script for Smart Store Finder
// 네이버 스마트스토어 및 쇼핑 페이지에서 자동 검색 기능 제공

// 전역 상태
let isExecuting = false;
let currentSearchData = null;

// 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

function initialize() {
    console.log('스마트 스토어 파인더 Content Script 로드됨');
    setupMessageListener();
}

// 메시지 리스너 설정
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('메시지 수신:', message);
        
        if (message.action === 'ping') {
            sendResponse({ status: 'ready' });
            return true;
        }
        
        if (message.action === 'executeSearch') {
            executeSearch(message.data)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error('검색 실행 오류:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // 비동기 응답을 위해 true 반환
        }
    });
}

// 검색 실행 메인 함수
async function executeSearch(searchData) {
    if (isExecuting) {
        throw new Error('이미 검색이 진행 중입니다.');
    }
    
    try {
        isExecuting = true;
        currentSearchData = searchData;
        
        console.log('검색 실행 시작:', searchData);
        
        // 현재 페이지 타입 확인
        const pageType = detectPageType();
        console.log('페이지 타입:', pageType);
        
        // 페이지 타입에 따른 검색 실행
        switch (pageType) {
            case 'shopping':
                await executeShoppingSearch(searchData);
                break;
            case 'smartstore':
                await executeSmartStoreSearch(searchData);
                break;
            case 'other':
                // 네이버 쇼핑으로 이동 후 검색
                window.location.href = buildShoppingUrl(searchData);
                break;
            default:
                throw new Error('지원하지 않는 페이지입니다.');
        }
        
        // 백그라운드에 완료 알림
        chrome.runtime.sendMessage({ action: 'searchCompleted' });
        
    } catch (error) {
        console.error('검색 실행 실패:', error);
        chrome.runtime.sendMessage({ action: 'searchFailed', error: error.message });
        throw error;
    } finally {
        isExecuting = false;
    }
}

// 페이지 타입 감지
function detectPageType() {
    const url = window.location.href;
    
    if (url.includes('search.shopping.naver.com')) {
        return 'shopping';
    } else if (url.includes('smartstore.naver.com')) {
        return 'smartstore';
    } else {
        return 'other';
    }
}

// 네이버 쇼핑 페이지에서 검색 실행
async function executeShoppingSearch(searchData) {
    const { brand, keyword, exactMatch } = searchData;
    
    // 검색어 조합
    const searchQuery = exactMatch ? `"${brand}" ${keyword}` : `${brand} ${keyword}`;
    
    // 검색창 찾기 (여러 셀렉터 시도)
    const searchInputSelectors = [
        'input[name="query"]',
        'input[id="query"]',
        'input.search_input',
        '.search_input input',
        '#header input[type="text"]',
        'input[placeholder*="검색"]'
    ];
    
    let searchInput = null;
    for (const selector of searchInputSelectors) {
        searchInput = document.querySelector(selector);
        if (searchInput) break;
    }
    
    if (!searchInput) {
        throw new Error('검색창을 찾을 수 없습니다.');
    }
    
    // 검색어 입력
    searchInput.focus();
    searchInput.value = '';
    
    // 이벤트 시뮬레이션
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    
    // 타이핑 시뮬레이션
    await typeText(searchInput, searchQuery);
    
    searchInput.dispatchEvent(inputEvent);
    searchInput.dispatchEvent(changeEvent);
    
    // 검색 버튼 찾기 및 클릭
    await clickSearchButton();
    
    console.log('네이버 쇼핑 검색 완료:', searchQuery);
}

// 스마트스토어 페이지에서 검색 실행
async function executeSmartStoreSearch(searchData) {
    const { brand, keyword, exactMatch } = searchData;
    
    // 스마트스토어 내 검색인지, 전체 쇼핑 검색인지 판단
    const isStoreSearch = window.location.href.includes('/store/');
    
    if (isStoreSearch) {
        // 스토어 내 검색
        await executeStoreInternalSearch(searchData);
    } else {
        // 전체 쇼핑 검색으로 이동
        const shoppingUrl = buildShoppingUrl(searchData);
        window.location.href = shoppingUrl;
    }
}

// 스토어 내부 검색 실행
async function executeStoreInternalSearch(searchData) {
    const { brand, keyword } = searchData;
    const searchQuery = `${keyword}`;
    
    // 스토어 내 검색창 찾기
    const storeSearchSelectors = [
        '.store_search input',
        '.search_area input',
        'input[placeholder*="스토어"]',
        'input[placeholder*="상품"]'
    ];
    
    let searchInput = null;
    for (const selector of storeSearchSelectors) {
        searchInput = document.querySelector(selector);
        if (searchInput) break;
    }
    
    if (!searchInput) {
        // 스토어 검색창이 없으면 전체 쇼핑 검색으로
        const shoppingUrl = buildShoppingUrl(searchData);
        window.location.href = shoppingUrl;
        return;
    }
    
    // 검색 실행
    searchInput.focus();
    searchInput.value = '';
    await typeText(searchInput, searchQuery);
    
    // Enter 키 또는 검색 버튼 클릭
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    searchInput.dispatchEvent(enterEvent);
    
    console.log('스토어 내 검색 완료:', searchQuery);
}

// 타이핑 시뮬레이션
function typeText(element, text) {
    return new Promise((resolve) => {
        let index = 0;
        
        function typeCharacter() {
            if (index < text.length) {
                element.value += text[index];
                
                // 입력 이벤트 발생
                const inputEvent = new Event('input', { bubbles: true });
                element.dispatchEvent(inputEvent);
                
                index++;
                setTimeout(typeCharacter, 50); // 50ms 간격으로 타이핑
            } else {
                resolve();
            }
        }
        
        typeCharacter();
    });
}

// 검색 버튼 클릭
async function clickSearchButton() {
    const searchButtonSelectors = [
        'button[type="submit"]',
        '.search_btn',
        '.btn_search',
        'button.search',
        '.search_area button',
        'button:has(.ico_search)',
        '.search_input_wrap button'
    ];
    
    let searchButton = null;
    for (const selector of searchButtonSelectors) {
        searchButton = document.querySelector(selector);
        if (searchButton) break;
    }
    
    if (searchButton) {
        // 클릭 이벤트 시뮬레이션
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        searchButton.dispatchEvent(clickEvent);
        console.log('검색 버튼 클릭 완료');
    } else {
        // 버튼을 찾지 못하면 Enter 키 이벤트 발생
        const searchInput = document.querySelector('input[name="query"], input[id="query"]');
        if (searchInput) {
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            searchInput.dispatchEvent(enterEvent);
            console.log('Enter 키로 검색 실행');
        }
    }
    
    // 검색 결과 로딩 대기
    await waitForSearchResults();
}

// 검색 결과 로딩 대기
function waitForSearchResults() {
    return new Promise((resolve) => {
        // 2초 후 자동 완료 (페이지 로딩 시간 고려)
        setTimeout(resolve, 2000);
        
        // 또는 특정 요소가 나타날 때까지 대기
        const observer = new MutationObserver((mutations) => {
            const hasResults = document.querySelector('.search_list, .product_list, .goods_list');
            if (hasResults) {
                observer.disconnect();
                resolve();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// 네이버 쇼핑 URL 생성
function buildShoppingUrl(searchData) {
    const { brand, keyword, exactMatch } = searchData;
    const searchQuery = exactMatch ? `"${brand}" ${keyword}` : `${brand} ${keyword}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    return `https://search.shopping.naver.com/search/all?query=${encodedQuery}`;
}

// 페이지 이동 감지 및 재초기화
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('페이지 변경 감지:', lastUrl);
        
        // 새 페이지에서 다시 초기화
        setTimeout(initialize, 1000);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    observer.disconnect();
    isExecuting = false;
});

console.log('스마트 스토어 파인더 Content Script 초기화 완료');
