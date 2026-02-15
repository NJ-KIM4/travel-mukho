// 메인 앱 로직
const App = (() => {
  let currentTab = 'itinerary';
  let currentDay = 1;
  let currentLocation = null;

  // 앱 초기화
  function init() {
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

    // 현재 날짜 기반 Day 자동 선택
    autoSelectDay();

    // 일정 렌더링
    renderItinerary();

    // 정보 탭 렌더링
    renderInfoTab();

    // 지도 초기화 (탭 전환 시 지연 로딩)
    setTimeout(() => MapManager.init(), 100);

    // 서비스 워커 등록
    registerSW();
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

    // 지도 탭일 때 리사이즈 트리거
    if (tabName === 'map') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
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
            <span>📍 지도에서 보기</span>
            ${event.spotId ? '<span>ℹ️ 상세정보</span>' : ''}
          </div>` : ''}
        </div>`;
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
    const lat = el.dataset.lat;
    const lng = el.dataset.lng;
    const spotId = el.dataset.spotId;

    if (spotId) {
      // 상세 정보 모달 표시
      showSpotModal(spotId);
    } else if (lat && lng) {
      // 지도로 이동
      switchTab('map');
      setTimeout(() => MapManager.flyTo(Number(lat), Number(lng), 16), 200);
    }
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
    const navUrl = `https://map.naver.com/v5/search/${encodeURIComponent(item.name)}`;
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
          <a class="navi-btn" href="${navUrl}" target="_blank" onclick="event.stopPropagation()">📍 길찾기</a>
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

    const navUrl = `https://map.naver.com/v5/search/${encodeURIComponent(item.name)}`;

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
        <button class="modal-action-btn primary" onclick="App.navigateToSpot('${item.id}')">
          📍 지도에서 보기
        </button>
        <a class="modal-action-btn secondary" href="${navUrl}" target="_blank" style="text-decoration:none;">
          🗺️ 네이버 지도
        </a>
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

  // 전체 경로 보기
  function showFullRoute() {
    switchTab('map');
    setTimeout(() => MapManager.goToMukho(), 200);
  }

  return {
    init,
    switchTab,
    onEventClick,
    showSpotModal,
    closeModal,
    navigateToSpot,
    toggleGPS,
    goToMyLocation,
    updateLocation,
    showFullRoute
  };
})();

// DOM 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', App.init);
