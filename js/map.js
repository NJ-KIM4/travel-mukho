// 카카오맵 기반 지도 & GPS 관리 모듈
const MapManager = (() => {
  let map = null;              // 카카오 지도 인스턴스
  let markers = [];            // 모든 마커 { marker, overlay, category, spotId }
  let routeLines = [];         // 경로 라인
  let myLocationMarker = null; // 내 위치 마커
  let myLocationOverlay = null;// 내 위치 오버레이
  let watchId = null;          // GPS 감시 ID
  let isTracking = false;      // GPS 추적 중 여부
  let isFollowing = true;      // 내 위치 따라가기 모드
  let activeFilter = 'all';    // 현재 필터

  let initialized = false; // 초기화 완료 여부

  // 지도 초기화
  function init() {
    if (initialized) {
      // 이미 초기화됨 → relayout만 호출
      if (map) {
        map.relayout();
        map.setCenter(new kakao.maps.LatLng(37.54, 129.11));
      }
      return;
    }

    const container = document.getElementById('map');

    // 묵호/동해 중심으로 지도 생성
    map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(37.54, 129.11),
      level: 9
    });

    // 줌 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.TOPRIGHT);

    // 지도 타입 컨트롤 (일반/위성)
    const mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

    // 마커 추가
    addAllMarkers();

    // 경로 라인 그리기
    drawRoute();

    // 지도 드래그 시 따라가기 모드 해제
    kakao.maps.event.addListener(map, 'dragstart', () => {
      isFollowing = false;
    });

    initialized = true;
  }

  // 탭 전환 시 지도 레이아웃 갱신
  function relayout() {
    if (map) {
      map.relayout();
    }
  }

  // 커스텀 마커 HTML 생성
  function createMarkerContent(emoji, type, name) {
    return `<div class="custom-marker marker-${type}" title="${name}">${emoji}</div>`;
  }

  // 팝업(인포윈도우) HTML 생성
  function createPopupContent(item) {
    const navUrl = `https://map.kakao.com/link/search/${encodeURIComponent(item.name)}`;
    let html = `<div class="kakao-popup">`;
    html += `<div class="kakao-popup-title">${item.icon || ''} ${item.name}</div>`;
    html += `<div class="kakao-popup-desc">${item.description || ''}</div>`;

    if (item.hours) html += `<div class="kakao-popup-info">🕐 ${item.hours}</div>`;
    if (item.fee) html += `<div class="kakao-popup-info">💰 ${item.fee}</div>`;
    if (item.menu) html += `<div class="kakao-popup-info">🍽️ ${item.menu}</div>`;
    if (item.price) html += `<div class="kakao-popup-info">💵 ${item.price}</div>`;
    if (item.tips) html += `<div class="kakao-popup-info">💡 ${item.tips}</div>`;

    html += `<div class="kakao-popup-actions">`;
    html += `<a class="kakao-popup-btn" href="${navUrl}" target="_blank">🗺️ 카카오맵</a>`;
    html += `<a class="kakao-popup-btn naver" href="https://map.naver.com/v5/search/${encodeURIComponent(item.name)}" target="_blank">📍 네이버</a>`;
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  // 마커 + 오버레이 추가 헬퍼
  function addMarker(lat, lng, emoji, type, name, popupHtml, spotId) {
    const position = new kakao.maps.LatLng(lat, lng);

    // 커스텀 오버레이로 마커 생성 (이모지 기반)
    const markerOverlay = new kakao.maps.CustomOverlay({
      position: position,
      content: createMarkerContent(emoji, type, name),
      yAnchor: 0.5,
      zIndex: 1
    });
    markerOverlay.setMap(map);

    // 팝업 오버레이 (클릭 시 표시)
    let popupOverlay = null;
    if (popupHtml) {
      const closeBtn = `<div class="kakao-popup-close" onclick="MapManager.closeAllPopups()">✕</div>`;
      popupOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: `<div class="kakao-popup-wrap">${closeBtn}${popupHtml}</div>`,
        yAnchor: 1.3,
        zIndex: 10
      });
    }

    // 마커 영역 클릭 감지용 투명 마커
    const clickMarker = new kakao.maps.Marker({
      position: position,
      map: map,
      opacity: 0
    });

    // 클릭 이벤트
    kakao.maps.event.addListener(clickMarker, 'click', () => {
      closeAllPopups();
      if (popupOverlay) popupOverlay.setMap(map);
    });

    const markerData = {
      markerOverlay,
      popupOverlay,
      clickMarker,
      category: type,
      spotId: spotId || null,
      position
    };
    markers.push(markerData);
    return markerData;
  }

  // 모든 마커 추가
  function addAllMarkers() {
    // 집 마커
    const home = TRAVEL_DATA.home;
    addMarker(home.lat, home.lng, '🏠', 'home', home.name,
      `<div class="kakao-popup"><div class="kakao-popup-title">🏠 ${home.name}</div><div class="kakao-popup-desc">${home.address}</div></div>`
    );

    // 역 마커
    Object.values(TRAVEL_DATA.stations).forEach((station) => {
      addMarker(station.lat, station.lng, '🚉', 'station', station.name,
        `<div class="kakao-popup"><div class="kakao-popup-title">🚉 ${station.name}</div></div>`
      );
    });

    // 관광지 마커
    TRAVEL_DATA.spots.forEach((spot) => {
      addMarker(spot.lat, spot.lng, spot.icon, 'sightseeing', spot.name,
        createPopupContent(spot), spot.id
      );
    });

    // 맛집 마커
    TRAVEL_DATA.restaurants.forEach((rest) => {
      addMarker(rest.lat, rest.lng, rest.icon, 'food', rest.name,
        createPopupContent(rest), rest.id
      );
    });

    // 카페 마커
    TRAVEL_DATA.cafes.forEach((cafe) => {
      addMarker(cafe.lat, cafe.lng, cafe.icon, 'cafe', cafe.name,
        createPopupContent(cafe), cafe.id
      );
    });
  }

  // 경로 라인 그리기
  function drawRoute() {
    // Day1 경로
    const day1Coords = TRAVEL_DATA.itinerary[0].events
      .filter((e) => e.lat && e.lng)
      .map((e) => new kakao.maps.LatLng(e.lat, e.lng));

    if (day1Coords.length > 1) {
      const line1 = new kakao.maps.Polyline({
        path: day1Coords,
        strokeWeight: 3,
        strokeColor: '#0ea5e9',
        strokeOpacity: 0.6,
        strokeStyle: 'shortdash'
      });
      line1.setMap(map);
      routeLines.push(line1);
    }

    // Day2 경로
    const day2Coords = TRAVEL_DATA.itinerary[1].events
      .filter((e) => e.lat && e.lng)
      .map((e) => new kakao.maps.LatLng(e.lat, e.lng));

    if (day2Coords.length > 1) {
      const line2 = new kakao.maps.Polyline({
        path: day2Coords,
        strokeWeight: 3,
        strokeColor: '#22c55e',
        strokeOpacity: 0.6,
        strokeStyle: 'shortdash'
      });
      line2.setMap(map);
      routeLines.push(line2);
    }
  }

  // 모든 팝업 닫기
  function closeAllPopups() {
    markers.forEach((m) => {
      if (m.popupOverlay) m.popupOverlay.setMap(null);
    });
  }

  // 필터 적용
  function setFilter(category) {
    activeFilter = category;
    markers.forEach((m) => {
      const show = (category === 'all' || m.category === category);
      m.markerOverlay.setMap(show ? map : null);
      m.clickMarker.setMap(show ? map : null);
      if (!show && m.popupOverlay) m.popupOverlay.setMap(null);
    });
  }

  // GPS 추적 시작/중지
  function toggleGPS() {
    if (isTracking) {
      stopGPS();
    } else {
      startGPS();
    }
    return isTracking;
  }

  function startGPS() {
    if (!navigator.geolocation) {
      alert('이 기기에서 GPS를 사용할 수 없습니다.');
      return;
    }

    isTracking = true;
    isFollowing = true;

    watchId = navigator.geolocation.watchPosition(
      (pos) => updateMyLocation(pos.coords),
      (err) => {
        console.warn('GPS 오류:', err.message);
        if (err.code === 1) {
          alert('위치 권한을 허용해주세요.\n설정 > 사이트 설정 > 위치');
          stopGPS();
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    updateGPSUI();
  }

  function stopGPS() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    isTracking = false;
    isFollowing = false;

    if (myLocationOverlay) {
      myLocationOverlay.setMap(null);
      myLocationOverlay = null;
    }

    updateGPSUI();
  }

  // 내 위치 업데이트
  function updateMyLocation(coords) {
    const { latitude: lat, longitude: lng } = coords;
    const position = new kakao.maps.LatLng(lat, lng);

    // 내 위치 커스텀 오버레이
    if (!myLocationOverlay) {
      myLocationOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: `<div class="my-location-wrap"><div class="my-location-ring"></div><div class="my-location-marker"></div></div>`,
        yAnchor: 0.5,
        zIndex: 100
      });
      myLocationOverlay.setMap(map);
    } else {
      myLocationOverlay.setPosition(position);
    }

    // 따라가기 모드
    if (isFollowing) {
      map.setCenter(position);
    }

    updateGPSUI();

    if (typeof App !== 'undefined') {
      App.updateLocation(lat, lng);
    }
  }

  // GPS UI 업데이트
  function updateGPSUI() {
    const gpsBtn = document.getElementById('gps-btn');
    const gpsDot = document.getElementById('gps-dot');
    const gpsText = document.getElementById('gps-text');

    if (gpsBtn) gpsBtn.classList.toggle('gps-active', isTracking);
    if (gpsDot) gpsDot.style.background = isTracking ? '#0ea5e9' : '#64748b';
    if (gpsText) gpsText.textContent = isTracking ? 'GPS 추적 중' : 'GPS 꺼짐';
  }

  // 내 위치로 이동
  function goToMyLocation() {
    if (myLocationOverlay) {
      isFollowing = true;
      map.setCenter(myLocationOverlay.getPosition());
      map.setLevel(3);
    } else if (!isTracking) {
      startGPS();
    }
  }

  // 특정 좌표로 이동
  function flyTo(lat, lng, level) {
    if (map) {
      map.panTo(new kakao.maps.LatLng(lat, lng));
      if (level) setTimeout(() => map.setLevel(level), 300);
    }
  }

  // 모든 마커가 보이게 줌
  function fitAll() {
    if (markers.length === 0) return;
    const bounds = new kakao.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend(m.position));
    map.setBounds(bounds, 50);
  }

  // 묵호/동해 중심으로 이동
  function goToMukho() {
    map.panTo(new kakao.maps.LatLng(37.54, 129.11));
    setTimeout(() => map.setLevel(9), 300);
  }

  // 특정 스팟의 팝업 열기
  function openSpotPopup(spotId) {
    const m = markers.find((mk) => mk.spotId === spotId);
    if (m) {
      closeAllPopups();
      map.panTo(m.position);
      setTimeout(() => {
        map.setLevel(4);
        if (m.popupOverlay) m.popupOverlay.setMap(map);
      }, 400);
    }
  }

  return {
    init,
    relayout,
    toggleGPS,
    goToMyLocation,
    flyTo,
    fitAll,
    goToMukho,
    setFilter,
    openSpotPopup,
    closeAllPopups,
    isTracking: () => isTracking
  };
})();
