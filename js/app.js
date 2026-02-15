// 메인 앱 로직
const App = (() => {
  let currentTab = 'itinerary';
  let currentDay = 1;
  let currentLocation = null;
  let searchTimer = null; // 검색 디바운스 타이머

  // PIN 해시값 (SHA-256 of 6자리 PIN)
  const PIN_HASH = 'fe3363542485a2beec53f5cb0a83a3f92ed1405ab3a5058d0438277101e8bf69';
  let pinInput = '';

  // SHA-256 해시 생성 (Web Crypto API)
  async function hashPIN(pin) {
    const data = new TextEncoder().encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // PIN 숫자 입력
  function onPinInput(num) {
    if (pinInput.length >= 6) return;
    pinInput += num;
    updateDots();
    if (pinInput.length === 6) verifyPIN();
  }

  // PIN 삭제 (백스페이스)
  function onPinDelete() {
    if (pinInput.length === 0) return;
    pinInput = pinInput.slice(0, -1);
    updateDots();
  }

  // PIN 인디케이터 업데이트
  function updateDots() {
    const dots = document.querySelectorAll('#pin-dots span');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < pinInput.length);
    });
  }

  // PIN 검증
  async function verifyPIN() {
    const hash = await hashPIN(pinInput);
    if (hash === PIN_HASH) {
      localStorage.setItem('mukho_auth', 'true');
      unlockApp();
    } else {
      // 에러 표시 + 흔들기 애니메이션
      const errorEl = document.getElementById('pin-error');
      const dotsEl = document.getElementById('pin-dots');
      errorEl.textContent = '비밀번호가 틀렸습니다';
      dotsEl.classList.add('shake');
      setTimeout(() => {
        dotsEl.classList.remove('shake');
        pinInput = '';
        updateDots();
      }, 500);
      setTimeout(() => { errorEl.textContent = ''; }, 2000);
    }
  }

  // 잠금 해제 - 잠금화면 숨기고 앱 초기화
  function unlockApp() {
    const lockScreen = document.getElementById('lock-screen');
    lockScreen.classList.add('hidden');
    initApp();
  }

  // 앱 초기화 (인증 후 실행)
  function initApp() {
    // 탭 이벤트
    document.querySelectorAll('.tab-item').forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Day 선택 이벤트
    document.querySelectorAll('.day-btn').forEach((btn) => {
      btn.addEventListener('click', () => selectDay(Number(btn.dataset.day)));
    });

    // 지도 필터 이벤트
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        MapManager.setFilter(chip.dataset.filter);
      });
    });

    // 모달 닫기
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });

    // 장소 검색 이벤트
    initSearch();

    // 현재 날짜 기반 Day 자동 선택
    autoSelectDay();

    // 일정 렌더링
    renderItinerary();

    // 정보 탭 렌더링
    renderInfoTab();

    // 서비스 워커 등록
    registerSW();
  }

  // 진입점: 인증 상태 확인 후 분기
  function init() {
    // 테마는 잠금화면에서도 적용
    loadTheme();

    if (localStorage.getItem('mukho_auth') === 'true') {
      // 이미 인증됨 → 잠금화면 숨기고 앱 시작
      document.getElementById('lock-screen').classList.add('hidden');
      initApp();
    }
    // 미인증 → 잠금화면 표시 상태 유지, PIN 입력 대기
  }

  // 저장된 테마 불러오기
  function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    }
    // 저장값 없거나 'light'면 기본(라이트) 유지
    updateThemeIcon();
  }

  // 테마 토글
  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
  }

  // 테마 아이콘 업데이트
  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isDark = document.documentElement.dataset.theme === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.title = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';
  }

  // 장소 검색 초기화
  function initSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    const resultsEl = document.getElementById('search-results');
    if (!input || !clearBtn || !resultsEl) return;

    // 입력 이벤트 (300ms 디바운스)
    input.addEventListener('input', () => {
      const keyword = input.value.trim();
      clearBtn.classList.toggle('hidden', keyword.length === 0);

      clearTimeout(searchTimer);
      if (keyword.length === 0) {
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
        return;
      }

      searchTimer = setTimeout(() => {
        MapManager.searchPlaces(keyword, (results) => {
          renderSearchResults(results);
        });
      }, 300);
    });

    // X 버튼: 전부 초기화
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
      MapManager.clearSearchMarker();
    });

    // 검색창 포커스 시 기존 결과 다시 표시
    input.addEventListener('focus', () => {
      if (resultsEl.innerHTML && input.value.trim()) {
        resultsEl.classList.remove('hidden');
      }
    });
  }

  // 검색 결과 렌더링
  function renderSearchResults(results) {
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="search-no-result">검색 결과가 없습니다</div>';
      resultsEl.classList.remove('hidden');
      return;
    }

    let html = '';
    results.forEach((place, i) => {
      const address = place.road_address_name || place.address_name || '';
      html += `
        <div class="search-result-item" data-index="${i}">
          <div class="search-result-name">${place.place_name}</div>
          <div class="search-result-address">${address}</div>
          ${place.category_group_name ? `<div class="search-result-category">${place.category_group_name}</div>` : ''}
        </div>`;
    });

    resultsEl.innerHTML = html;
    resultsEl.classList.remove('hidden');

    // 결과 클릭 이벤트
    resultsEl.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        const place = results[idx];
        if (place) {
          MapManager.showSearchMarker(place);
          resultsEl.classList.add('hidden');
          // 장소명으로 입력 필드 업데이트
          document.getElementById('search-input').value = place.place_name;
        }
      });
    });
  }

  // 서비스 워커 등록
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // 로컬 파일 열기 시 실패 가능 - 무시
      });
    }
  }

  // 현재 날짜 기준 Day 자동 선택
  function autoSelectDay() {
    const today = new Date().toISOString().split('T')[0];
    const day2Date = TRAVEL_DATA.itinerary[1].date;
    if (today === day2Date) {
      currentDay = 2;
    } else {
      currentDay = 1;
    }
    document.querySelectorAll('.day-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.day) === currentDay);
    });
  }

  // 탭 전환
  function switchTab(tabName) {
    currentTab = tabName;

    // 탭 버튼 활성화
    document.querySelectorAll('.tab-item').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });

    // 탭 컨텐츠 표시
    document.querySelectorAll('.tab-content').forEach((c) => {
      c.classList.toggle('active', c.id === `tab-${tabName}`);
    });

    // 지도 탭: 첫 진입 시 초기화 (init 내부에서 relayout 처리)
    if (tabName === 'map') {
      setTimeout(() => MapManager.init(), 50);
    }
  }

  // Day 선택
  function selectDay(day) {
    currentDay = day;
    document.querySelectorAll('.day-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.day) === day);
    });
    renderItinerary();
  }

  // 일정 렌더링
  function renderItinerary() {
    const container = document.getElementById('timeline');
    const dayData = TRAVEL_DATA.itinerary[currentDay - 1];

    if (!dayData) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let html = '';
    let prevLat = null, prevLng = null, prevName = null;
    dayData.events.forEach((event, index) => {
      // 현재/과거/미래 상태 계산
      const [hours, mins] = event.time.split(':').map(Number);
      const eventMinutes = hours * 60 + mins;

      let endMinutes = Infinity;
      if (event.endTime) {
        const [eh, em] = event.endTime.split(':').map(Number);
        endMinutes = eh * 60 + em;
      }

      let stateClass = '';
      if (todayStr === dayData.date) {
        if (currentMinutes >= eventMinutes && currentMinutes < endMinutes) {
          stateClass = 'current';
        } else if (currentMinutes >= endMinutes) {
          stateClass = 'past';
        }
      }

      // 타입에 따른 뱃지
      const typeLabels = {
        food: '맛집',
        sightseeing: '관광',
        cafe: '카페',
        move: '이동',
        transport: '교통',
        rest: '숙소',
        arrival: '도착'
      };

      html += `
        <div class="event-card type-${event.type} ${stateClass}"
             data-index="${index}"
             ${event.lat ? `data-lat="${event.lat}" data-lng="${event.lng}"` : ''}
             ${event.spotId ? `data-spot-id="${event.spotId}"` : ''}
             onclick="App.onEventClick(this)">
          <div class="event-time">
            ${event.time}${event.endTime ? ` ~ ${event.endTime}` : ''}
            <span class="badge badge-${event.type}">${typeLabels[event.type] || event.type}</span>
            ${stateClass === 'current' ? '<span class="badge badge-arrival">진행 중</span>' : ''}
          </div>
          <div class="event-title">${event.title}</div>
          <div class="event-desc">${event.description}</div>
          ${event.lat ? `
          <div class="event-meta">
            <span onclick="event.stopPropagation(); App.openNavigation(${event.lat}, ${event.lng}, '${event.title.replace(/'/g, "\\'")}'${prevLat ? `, ${prevLat}, ${prevLng}, '${prevName.replace(/'/g, "\\'")}'` : ''})">🧭 길찾기</span>
            <span onclick="event.stopPropagation(); App.viewOnMap(${event.spotId ? `'${event.spotId}'` : 'null'}, ${event.lat}, ${event.lng})">📍 지도에서 보기</span>
            ${event.spotId ? `<span onclick="event.stopPropagation(); App.showSpotModal('${event.spotId}')">ℹ️ 상세정보</span>` : ''}
          </div>` : ''}
        </div>`;

      // 이전 장소 좌표 갱신
      if (event.lat && event.lng) {
        prevLat = event.lat;
        prevLng = event.lng;
        prevName = event.title;
      }
    });

    container.innerHTML = html;

    // 현재 진행 중인 이벤트로 스크롤
    setTimeout(() => {
      const currentCard = container.querySelector('.event-card.current');
      if (currentCard) {
        currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }

  // 이벤트 카드 클릭
  function onEventClick(el) {
    const spotId = el.dataset.spotId;
    if (spotId) {
      showSpotModal(spotId);
    }
  }

  // 지도에서 보기 (일정 카드에서 직접 호출)
  function viewOnMap(spotId, lat, lng) {
    switchTab('map');
    // relayout 완료 대기 (50ms에 시작 → 300ms이면 충분)
    setTimeout(() => {
      if (spotId) {
        MapManager.openSpotPopup(spotId);
      } else {
        MapManager.flyTo(Number(lat), Number(lng), 4);
      }
    }, 300);
  }

  // 정보 탭 렌더링
  function renderInfoTab() {
    const container = document.getElementById('info-content');

    // 승차권 정보
    let html = `
      <div class="info-section">
        <div class="info-section-title">🚅 승차권</div>
        ${TRAVEL_DATA.tickets.map((t) => `
          <div class="ticket-card">
            <div class="ticket-label">${t.label} · ${t.type}</div>
            <div class="ticket-route">
              ${t.from} <span class="arrow">→</span> ${t.to}
            </div>
            <div class="ticket-details">
              <div class="ticket-detail">
                <label>날짜</label>
                <span>${t.dateLabel}</span>
              </div>
              <div class="ticket-detail">
                <label>시간</label>
                <span>${t.time}</span>
              </div>
              <div class="ticket-detail">
                <label>좌석</label>
                <span>${t.seat}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;

    // 관광지
    html += `
      <div class="info-section">
        <div class="info-section-title">📍 관광지</div>
        ${TRAVEL_DATA.spots.map((s) => createSpotCard(s, 'sightseeing')).join('')}
      </div>`;

    // 맛집
    html += `
      <div class="info-section">
        <div class="info-section-title">🍽️ 맛집</div>
        ${TRAVEL_DATA.restaurants.map((r) => createSpotCard(r, 'food')).join('')}
      </div>`;

    // 카페
    html += `
      <div class="info-section">
        <div class="info-section-title">☕ 카페</div>
        ${TRAVEL_DATA.cafes.map((c) => createSpotCard(c, 'cafe')).join('')}
      </div>`;

    container.innerHTML = html;
  }

  // 스팟 카드 HTML 생성
  function createSpotCard(item, type) {
    const tags = [];
    if (item.hours) tags.push(`🕐 ${item.hours}`);
    if (item.fee) tags.push(`💰 ${item.fee}`);
    if (item.price) tags.push(`💵 ${item.price}`);
    if (item.menu) tags.push(`🍽️ ${item.menu}`);

    return `
      <div class="spot-card" onclick="App.showSpotModal('${item.id}')">
        <div class="spot-card-header">
          <div class="spot-icon ${type}">${item.icon}</div>
          <div>
            <div class="spot-name">${item.name}</div>
            <div class="spot-category">${item.category}</div>
          </div>
        </div>
        <div class="spot-desc">${item.description}</div>
        <div class="spot-tags">
          ${tags.map((t) => `<span class="spot-tag">${t}</span>`).join('')}
          <button class="navi-btn" onclick="event.stopPropagation(); App.openNavigationForSpot('${item.id}', ${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')">🧭 길찾기</button>
        </div>
      </div>`;
  }

  // 스팟 상세 모달
  function showSpotModal(spotId) {
    const allItems = [...TRAVEL_DATA.spots, ...TRAVEL_DATA.restaurants, ...TRAVEL_DATA.cafes];
    const item = allItems.find((i) => i.id === spotId);
    if (!item) return;

    const modal = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet');

    let html = `
      <div class="modal-handle"></div>
      <div class="modal-title">${item.icon} ${item.name}</div>
      <div class="modal-subtitle">${item.category} · ${item.address || ''}</div>

      <div class="modal-info-row">
        <span class="modal-info-label">📝 설명</span>
        <span class="modal-info-value">${item.description}</span>
      </div>`;

    if (item.hours) {
      html += `
      <div class="modal-info-row">
        <span class="modal-info-label">🕐 시간</span>
        <span class="modal-info-value">${item.hours}</span>
      </div>`;
    }
    if (item.fee) {
      html += `
      <div class="modal-info-row">
        <span class="modal-info-label">💰 요금</span>
        <span class="modal-info-value">${item.fee}</span>
      </div>`;
    }
    if (item.menu) {
      html += `
      <div class="modal-info-row">
        <span class="modal-info-label">🍽️ 메뉴</span>
        <span class="modal-info-value">${item.menu}</span>
      </div>`;
    }
    if (item.price) {
      html += `
      <div class="modal-info-row">
        <span class="modal-info-label">💵 가격</span>
        <span class="modal-info-value">${item.price}</span>
      </div>`;
    }
    if (item.tips) {
      html += `
      <div class="modal-info-row">
        <span class="modal-info-label">💡 팁</span>
        <span class="modal-info-value">${item.tips}</span>
      </div>`;
    }

    html += `
      <div class="modal-actions">
        <button class="modal-action-btn primary" onclick="App.openNavigationForSpot('${item.id}', ${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')">
          🧭 길찾기
        </button>
        <button class="modal-action-btn secondary" onclick="App.navigateToSpot('${item.id}')">
          📍 지도에서 보기
        </button>
      </div>`;

    sheet.innerHTML = html;
    modal.classList.add('show');
  }

  // 모달 닫기
  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
  }

  // 지도에서 스팟 보기
  function navigateToSpot(spotId) {
    closeModal();
    switchTab('map');
    setTimeout(() => MapManager.openSpotPopup(spotId), 300);
  }

  // GPS 토글 (지도 버튼)
  function toggleGPS() {
    MapManager.toggleGPS();
  }

  // 내 위치로 이동
  function goToMyLocation() {
    MapManager.goToMyLocation();
  }

  // 위치 업데이트 (MapManager에서 호출)
  function updateLocation(lat, lng) {
    currentLocation = { lat, lng };
  }

  // 외부 지도 앱으로 길찾기 (출발지 → 목적지)
  // fromLat/fromLng/fromName이 있으면 고정 출발지, 없으면 GPS 또는 목적지만 폴백
  function openNavigation(destLat, destLng, destName, fromLat, fromLng, fromName) {
    if (fromLat && fromLng) {
      // 고정 출발지 → 목적지
      window.open(`https://map.kakao.com/link/from/${encodeURIComponent(fromName)},${fromLat},${fromLng}/to/${encodeURIComponent(destName)},${destLat},${destLng}`, '_blank');
      return;
    }
    if (currentLocation) {
      const { lat: sLat, lng: sLng } = currentLocation;
      window.open(`https://map.kakao.com/link/from/현재위치,${sLat},${sLng}/to/${encodeURIComponent(destName)},${destLat},${destLng}`, '_blank');
      return;
    }
    // GPS도 없으면 목적지만
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(destName)},${destLat},${destLng}`, '_blank');
  }

  // 일정에서 특정 스팟의 이전 장소 찾기
  function findPrevLocation(spotId) {
    for (const day of TRAVEL_DATA.itinerary) {
      for (let i = 0; i < day.events.length; i++) {
        if (day.events[i].spotId === spotId) {
          // 이전 이벤트 중 좌표가 있는 것 찾기
          for (let j = i - 1; j >= 0; j--) {
            if (day.events[j].lat && day.events[j].lng) {
              return { lat: day.events[j].lat, lng: day.events[j].lng, name: day.events[j].title };
            }
          }
        }
      }
    }
    return null;
  }

  // 스팟 기반 길찾기 (모달/스팟카드/지도팝업용)
  function openNavigationForSpot(spotId, destLat, destLng, destName) {
    const prev = findPrevLocation(spotId);
    if (prev) {
      openNavigation(destLat, destLng, destName, prev.lat, prev.lng, prev.name);
    } else {
      openNavigation(destLat, destLng, destName);
    }
  }

  // 전체 경로 보기
  function showFullRoute() {
    switchTab('map');
    setTimeout(() => MapManager.goToMukho(), 200);
  }

  return {
    init,
    switchTab,
    onEventClick,
    viewOnMap,
    showSpotModal,
    closeModal,
    navigateToSpot,
    toggleGPS,
    toggleTheme,
    goToMyLocation,
    updateLocation,
    showFullRoute,
    openNavigation,
    openNavigationForSpot,
    onPinInput,
    onPinDelete
  };
})();

// DOM 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', App.init);
