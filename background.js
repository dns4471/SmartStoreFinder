// Background Service Worker for Smart Store Finder
// 확장프로그램의 백그라운드 서비스 및 메시지 라우팅 처리

// 서비스 워커 설치 시 실행
chrome.runtime.onInstalled.addListener((details) => {
    console.log('스마트 스토어 파인더 확장프로그램 설치됨');
    
    if (details.reason === 'install') {
        // 첫 설치 시 환영 메시지
        console.log('스마트 스토어 파인더에 오신 것을 환영합니다!');
        
        // 기본 설정 초기화
        chrome.storage.local.set({
            recentSearches: [],
            savedInputs: {
                brand: '',
                keyword: '',
                exactMatch: false
            }
        });
    } else if (details.reason === 'update') {
        console.log('스마트 스토어 파인더가 업데이트되었습니다.');
    }
});

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('백그라운드에서 메시지 수신:', message);
    
    switch (message.action) {
        case 'searchCompleted':
            handleSearchCompleted(sender.tab);
            break;
            
        case 'searchFailed':
            handleSearchFailed(sender.tab, message.error);
            break;
            
        case 'getTabInfo':
            getTabInfo(sendResponse);
            return true; // 비동기 응답
            
        case 'openNewTab':
            openNewTab(message.url, sendResponse);
            return true; // 비동기 응답
            
        default:
            console.warn('알 수 없는 액션:', message.action);
    }
});

// 검색 완료 처리
function handleSearchCompleted(tab) {
    console.log('검색 완료 - 탭 ID:', tab?.id);
    
    // 선택적: 성공 알림 배지 표시
    if (tab?.id) {
        chrome.action.setBadgeText({
            text: '✓',
            tabId: tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
            color: '#4ade80',
            tabId: tab.id
        });
        
        // 3초 후 배지 제거
        setTimeout(() => {
            chrome.action.setBadgeText({
                text: '',
                tabId: tab.id
            });
        }, 3000);
    }
}

// 검색 실패 처리
function handleSearchFailed(tab, error) {
    console.error('검색 실패 - 탭 ID:', tab?.id, '에러:', error);
    
    // 선택적: 실패 알림 배지 표시
    if (tab?.id) {
        chrome.action.setBadgeText({
            text: '!',
            tabId: tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
            color: '#ef4444',
            tabId: tab.id
        });
        
        // 5초 후 배지 제거
        setTimeout(() => {
            chrome.action.setBadgeText({
                text: '',
                tabId: tab.id
            });
        }, 5000);
    }
}

// 탭 정보 조회
async function getTabInfo(sendResponse) {
    try {
        const [activeTab] = await chrome.tabs.query({ 
            active: true, 
            currentWindow: true 
        });
        
        const tabInfo = {
            id: activeTab.id,
            url: activeTab.url,
            title: activeTab.title,
            isNaverPage: isNaverPage(activeTab.url)
        };
        
        sendResponse({ success: true, tabInfo });
    } catch (error) {
        console.error('탭 정보 조회 실패:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 새 탭 열기
async function openNewTab(url, sendResponse) {
    try {
        const newTab = await chrome.tabs.create({
            url: url,
            active: true
        });
        
        sendResponse({ success: true, tabId: newTab.id });
    } catch (error) {
        console.error('새 탭 열기 실패:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 네이버 페이지 여부 확인
function isNaverPage(url) {
    if (!url) return false;
    
    return url.includes('.naver.com');
}

// 탭 업데이트 이벤트 리스너
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 페이지 로딩 완료 시
    if (changeInfo.status === 'complete' && tab.url) {
        // 네이버 페이지인 경우 배지 제거
        if (isNaverPage(tab.url)) {
            chrome.action.setBadgeText({
                text: '',
                tabId: tabId
            });
        }
    }
});

// 탭 활성화 이벤트 리스너
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        
        // 활성 탭이 네이버 페이지가 아닌 경우 배지 제거
        if (!isNaverPage(tab.url)) {
            chrome.action.setBadgeText({
                text: '',
                tabId: activeInfo.tabId
            });
        }
    } catch (error) {
        // 탭 정보를 가져올 수 없는 경우 (예: 탭이 닫힌 경우)
        console.warn('활성 탭 정보 조회 실패:', error);
    }
});

// 저장소 변경 감지 (디버깅용)
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('저장소 변경:', namespace, changes);
});

// 확장프로그램 아이콘 클릭 처리 (팝업이 없는 경우 대비)
chrome.action.onClicked.addListener(async (tab) => {
    console.log('확장프로그램 아이콘 클릭 - 탭 ID:', tab.id);
    
    // 팝업이 정의되어 있으므로 일반적으로 실행되지 않지만,
    // 특정 페이지에서 팝업이 비활성화된 경우를 대비
    try {
        // 현재 탭이 스마트스토어 페이지인 경우 직접 검색 실행 가능
        if (isSmartStorePage(tab.url)) {
            console.log('스마트스토어 페이지에서 직접 실행 가능');
        } else {
            // 네이버 쇼핑으로 이동
            await chrome.tabs.update(tab.id, {
                url: 'https://search.shopping.naver.com/search/all'
            });
        }
    } catch (error) {
        console.error('아이콘 클릭 처리 실패:', error);
    }
});

// 컨텍스트 메뉴 생성 (선택 사항)
chrome.runtime.onInstalled.addListener(() => {
    try {
        chrome.contextMenus.create({
            id: 'searchInSmartStore',
            title: '스마트스토어에서 "%s" 검색',
            contexts: ['selection']
        });
    } catch (error) {
        console.log('컨텍스트 메뉴 생성 실패:', error);
    }
});

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'searchInSmartStore' && info.selectionText) {
        try {
            const selectedText = info.selectionText.trim();
            const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(selectedText)}`;
            
            await chrome.tabs.create({
                url: searchUrl,
                active: true
            });
            
            console.log('컨텍스트 메뉴에서 검색 실행:', selectedText);
        } catch (error) {
            console.error('컨텍스트 메뉴 검색 실패:', error);
        }
    }
});

// 알람 생성 (선택 사항 - 주기적 작업용)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupStorage') {
        cleanupOldSearches();
    }
});

// 오래된 검색 기록 정리
async function cleanupOldSearches() {
    try {
        const result = await chrome.storage.local.get('recentSearches');
        let recentSearches = result.recentSearches || [];
        
        // 30일 이전 검색 기록 제거
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        recentSearches = recentSearches.filter(item => 
            item.timestamp > thirtyDaysAgo
        );
        
        await chrome.storage.local.set({ recentSearches });
        console.log('오래된 검색 기록 정리 완료');
    } catch (error) {
        console.error('검색 기록 정리 실패:', error);
    }
}

// 주기적 정리 알람 설정 (24시간마다)
chrome.alarms.create('cleanupStorage', { 
    delayInMinutes: 1440, // 24시간
    periodInMinutes: 1440 
});

console.log('스마트 스토어 파인더 백그라운드 서비스 초기화 완료');
