// DOM 요소 참조
const searchForm = document.getElementById('searchForm');
const brandInput = document.getElementById('brandInput');
const keywordInput = document.getElementById('keywordInput');
const exactMatchCheckbox = document.getElementById('exactMatch');
const searchBtn = document.getElementById('searchBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const recentList = document.getElementById('recentList');

// 상태 관리
let isSearching = false;

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadRecentSearches();
    await loadSavedInputs();
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 폼 제출
    searchForm.addEventListener('submit', handleSearch);
    
    // 입력값 실시간 저장
    brandInput.addEventListener('input', saveInputs);
    keywordInput.addEventListener('input', saveInputs);
    exactMatchCheckbox.addEventListener('change', saveInputs);
    
    // 최근 검색 클릭 이벤트
    recentList.addEventListener('click', handleRecentClick);
}

// 검색 실행
async function handleSearch(e) {
    e.preventDefault();
    
    if (isSearching) return;
    
    const brand = brandInput.value.trim();
    const keyword = keywordInput.value.trim();
    
    if (!brand || !keyword) {
        showStatus('브랜드명과 키워드를 모두 입력해주세요.', 'error');
        return;
    }
    
    try {
        isSearching = true;
        updateSearchButton(true);
        showStatus('검색을 시작합니다...', 'info');
        
        // 최근 검색에 추가
        await addToRecentSearches(brand, keyword);
        
        // 현재 탭 확인 또는 새 탭 생성
        const tab = await getCurrentOrCreateTab();
        
        // Content script로 검색 실행 메시지 전송
        await chrome.tabs.sendMessage(tab.id, {
            action: 'executeSearch',
            data: {
                brand: brand,
                keyword: keyword,
                exactMatch: exactMatchCheckbox.checked
            }
        });
        
        showStatus('검색이 실행되었습니다!', 'success');
        
        // 잠시 후 팝업 닫기
        setTimeout(() => {
            window.close();
        }, 1000);
        
    } catch (error) {
        console.error('검색 실행 중 오류:', error);
        showStatus('검색 실행 중 오류가 발생했습니다.', 'error');
    } finally {
        isSearching = false;
        updateSearchButton(false);
    }
}

// 현재 탭 확인 또는 새 탭 생성
async function getCurrentOrCreateTab() {
    try {
        // 현재 활성 탭 확인
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 네이버 스마트스토어 페이지인지 확인
        const isSmartStore = currentTab.url && (
            currentTab.url.includes('smartstore.naver.com') ||
            currentTab.url.includes('search.shopping.naver.com')
        );
        
        if (isSmartStore) {
            return currentTab;
        } else {
            // 새 탭에서 네이버 쇼핑 페이지 열기
            const newTab = await chrome.tabs.create({
                url: 'https://search.shopping.naver.com/search/all',
                active: true
            });
            
            // Content script가 로드될 때까지 대기
            await waitForContentScript(newTab.id);
            return newTab;
        }
    } catch (error) {
        console.error('탭 처리 중 오류:', error);
        throw error;
    }
}

// Content script 로드 대기
function waitForContentScript(tabId, maxAttempts = 10) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkScript = () => {
            attempts++;
            
            chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    if (attempts < maxAttempts) {
                        setTimeout(checkScript, 500);
                    } else {
                        reject(new Error('Content script 로드 실패'));
                    }
                } else {
                    resolve();
                }
            });
        };
        
        checkScript();
    });
}

// 상태 메시지 표시
function showStatus(message, type = 'info') {
    statusText.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    
    // 성공/에러 메시지는 3초 후 자동 숨김
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }
}

// 검색 버튼 상태 업데이트
function updateSearchButton(loading) {
    searchBtn.disabled = loading;
    
    if (loading) {
        searchBtn.classList.add('loading');
        searchBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            검색 중...
        `;
    } else {
        searchBtn.classList.remove('loading');
        searchBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
            </svg>
            검색 시작
        `;
    }
}

// 입력값 저장
async function saveInputs() {
    const inputs = {
        brand: brandInput.value,
        keyword: keywordInput.value,
        exactMatch: exactMatchCheckbox.checked
    };
    
    await chrome.storage.local.set({ savedInputs: inputs });
}

// 저장된 입력값 로드
async function loadSavedInputs() {
    try {
        const result = await chrome.storage.local.get('savedInputs');
        if (result.savedInputs) {
            brandInput.value = result.savedInputs.brand || '';
            keywordInput.value = result.savedInputs.keyword || '';
            exactMatchCheckbox.checked = result.savedInputs.exactMatch || false;
        }
    } catch (error) {
        console.error('저장된 입력값 로드 실패:', error);
    }
}

// 최근 검색에 추가
async function addToRecentSearches(brand, keyword) {
    try {
        const result = await chrome.storage.local.get('recentSearches');
        let recentSearches = result.recentSearches || [];
        
        // 중복 제거
        recentSearches = recentSearches.filter(item => 
            !(item.brand === brand && item.keyword === keyword)
        );
        
        // 새 검색 추가 (맨 앞에)
        recentSearches.unshift({
            brand: brand,
            keyword: keyword,
            timestamp: Date.now()
        });
        
        // 최대 10개까지만 유지
        recentSearches = recentSearches.slice(0, 10);
        
        await chrome.storage.local.set({ recentSearches: recentSearches });
        await loadRecentSearches();
    } catch (error) {
        console.error('최근 검색 저장 실패:', error);
    }
}

// 최근 검색 로드
async function loadRecentSearches() {
    try {
        const result = await chrome.storage.local.get('recentSearches');
        const recentSearches = result.recentSearches || [];
        
        recentList.innerHTML = '';
        
        if (recentSearches.length === 0) {
            recentList.innerHTML = '<div class="empty-state">최근 검색 내역이 없습니다.</div>';
            return;
        }
        
        recentSearches.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'recent-item';
            itemElement.innerHTML = `
                <div class="recent-item-content">
                    <div class="recent-brand">${escapeHtml(item.brand)}</div>
                    <div class="recent-keyword">${escapeHtml(item.keyword)}</div>
                </div>
                <button class="recent-remove" data-index="${index}" title="삭제">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `;
            recentList.appendChild(itemElement);
        });
    } catch (error) {
        console.error('최근 검색 로드 실패:', error);
    }
}

// 최근 검색 클릭 처리
async function handleRecentClick(e) {
    if (e.target.closest('.recent-remove')) {
        // 삭제 버튼 클릭
        const index = parseInt(e.target.closest('.recent-remove').dataset.index);
        await removeRecentSearch(index);
    } else if (e.target.closest('.recent-item')) {
        // 검색 항목 클릭
        const item = e.target.closest('.recent-item');
        const brand = item.querySelector('.recent-brand').textContent;
        const keyword = item.querySelector('.recent-keyword').textContent;
        
        brandInput.value = brand;
        keywordInput.value = keyword;
        await saveInputs();
    }
}

// 최근 검색 삭제
async function removeRecentSearch(index) {
    try {
        const result = await chrome.storage.local.get('recentSearches');
        let recentSearches = result.recentSearches || [];
        
        recentSearches.splice(index, 1);
        
        await chrome.storage.local.set({ recentSearches: recentSearches });
        await loadRecentSearches();
    } catch (error) {
        console.error('최근 검색 삭제 실패:', error);
    }
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 백그라운드 스크립트로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'searchCompleted') {
        showStatus('검색이 완료되었습니다!', 'success');
    } else if (message.action === 'searchFailed') {
        showStatus('검색 실행에 실패했습니다.', 'error');
    }
});
