// 간단한 Background Service Worker for Testing
console.log('스마트 스토어 파인더 백그라운드 시작');

// 기본 설치 이벤트만 처리
chrome.runtime.onInstalled.addListener((details) => {
    console.log('확장프로그램 설치됨');
    
    if (details.reason === 'install') {
        chrome.storage.local.set({
            recentSearches: [],
            savedInputs: {
                brand: '',
                keyword: '',
                exactMatch: false
            }
        });
    }
});

// 메시지 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('메시지 수신:', message);
    
    if (message.action === 'searchCompleted') {
        console.log('검색 완료');
    } else if (message.action === 'searchFailed') {
        console.log('검색 실패:', message.error);
    }
});

console.log('백그라운드 스크립트 로드 완료');