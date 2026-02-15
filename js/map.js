// 카카오맵 기반 지도 & GPS 관리 모듈
const MapManager = (() => {
  let map = null;              // 카카오 지도 인스턴스
  let markers = [];            // 모든 마커 { markerOverlay, popupHtml, category, spotId, position }
  let routeLines = [];         // 경로 라인
  let myLocationOverlay = null;// 내 위치 오버레이
  let watchId = null;          // GPS 감시 ID
  let isTracking = false;      // GPS 추적 중 여부
  let isFollowing = true;      // 내 위치 따라가기 모드
  let activeFilter = 'all';    // 현재 필터
  let sdkReady = false;        // SDK 로딩 완료 여부
  let mapReady = false;        // 지도 생성 완료 여부
  let places = null;           // Places API 인스턴스
  let popupOverlay = null;     // 공유 팝업 오버레이 (하나만 재사용)
  let searchMarkerOvl = null;  // 재사용 검색 마커 오버레이
  let searchPopupOvl = null;   // 재사용 검색 팝업 오버레이
  let searchActive = false;    // 검색 마커 표시 중 여부
  const markerImageCache = {}; // 카테고리별 마커 이미지 캐시
  let geocoder = null;         // Geocoder 인스턴스 (역지오코딩)
  let longPressCallback = null;// 롱프레스 콜백

  // 카테고리별 마커 색상
  const MARKER_COLORS = {
    food: '#f97316',
    sightseeing: '#0ea5e9',
    cafe: '#a855f7',
    station: '#0c4a6e',
    home: '#6366f1',
    transport: '#64748b'
  };

  const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=1445ee64e0222628060d216742e4284e&libraries=services&autoload=false';

  // SDK 동적 로드
  function loadSDK() {
    return new Promise((resolve, reject) => {
      // 이미 로드됨
      if (typeof kakao !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('SDK 스크립트 로드 실패'));
      document.head.appendChild(script);
    });
  }

  // 지도 초기화 (지도 탭 클릭 시 호출)
  function init() {
    const container = document.getElementById('map');

    // 이미 지도가 생성됨 → relayout만
    if (mapReady && map) {
      map.relayout();
      return;
    }

    // 로딩 메시지 표시
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;text-align:center;padding:20px;font-size:14px;">지도를 불러오는 중...</div>';

    // SDK 동적 로드 → kakao.maps.load() → 지도 생성
    loadSDK()
      .then(() => {
        return new Promise((resolve) => {
          kakao.maps.load(() => {
            sdkReady = true;
            resolve();
          });
        });
      })
      .then(() => {
        container.innerHTML = '';
        createMap(container);
      })
      .catch((err) => {
        console.error('카카오맵 로드 실패:', err);
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;text-align:center;padding:20px;font-size:14px;">지도를 불러올 수 없습니다.<br>페이지를 새로고침 해주세요.</div>';
      });
  }

  // 실제 지도 생성
  function createMap(container) {
    try {
      map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(37.54, 129.11),
        level: 9
      });

      // Places API + Geocoder 인스턴스 생성
      places = new kakao.maps.services.Places();
      geocoder = new kakao.maps.services.Geocoder();

      // 공유 팝업 오버레이 생성 (하나만 재사용)
      popupOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(0, 0),
        content: '<div></div>',
        yAnchor: 1.3,
        zIndex: 10
      });

      // 마커 추가
      addAllMarkers();

      // 경로 라인 그리기
      drawRoute();

      // 지도 드래그 시 따라가기 모드 해제
      kakao.maps.event.addListener(map, 'dragstart', () => {
        isFollowing = false;
      });

      mapReady = true;

      // 롱프레스 감지 설정
      setupLongPress();

      // relayout 한번 더 (안전 차원)
      setTimeout(() => map.relayout(), 100);
    } catch (e) {
      console.error('지도 생성 오류:', e);
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;text-align:center;padding:20px;font-size:14px;">지도 생성 중 오류가 발생했습니다.<br>' + e.message + '</div>';
    }
  }

  // 탭 전환 시 지도 레이아웃 갱신
  function relayout() {
    if (map) {
      map.relayout();
    }
  }

  // SVG 마커 이미지 생성 (카테고리별 색상 원형)
  function getMarkerImage(type) {
    if (markerImageCache[type]) return markerImageCache[type];
    const color = MARKER_COLORS[type] || '#64748b';
    const size = 24;
    const r = size / 2 - 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    markerImageCache[type] = new kakao.maps.MarkerImage(
      src,
      new kakao.maps.Size(size, size),
      { offset: new kakao.maps.Point(size / 2, size / 2) }
    );
    return markerImageCache[type];
  }

  // 팝업(인포윈도우) HTML 생성
  function createPopupContent(item) {
    let html = `<div class="kakao-popup">`;
    html += `<div class="kakao-popup-title">${item.icon || ''} ${item.name}</div>`;
    html += `<div class="kakao-popup-desc">${item.description || ''}</div>`;

    if (item.hours) html += `<div class="kakao-popup-info">🕐 ${item.hours}</div>`;
    if (item.fee) html += `<div class="kakao-popup-info">💰 ${item.fee}</div>`;
    if (item.menu) html += `<div class="kakao-popup-info">🍽️ ${item.menu}</div>`;
    if (item.price) html += `<div class="kakao-popup-info">💵 ${item.price}</div>`;
    if (item.tips) html += `<div class="kakao-popup-info">💡 ${item.tips}</div>`;

    html += `<div class="kakao-popup-actions">`;
    html += `<a class="kakao-popup-btn" href="#" onclick="event.preventDefault(); App.openNavigationForSpot('${item.id}', ${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')">🧭 길찾기</a>`;
    html += `<a class="kakao-popup-btn naver" href="https://map.naver.com/v5/search/${encodeURIComponent(item.name)}" target="_blank">📍 네이버</a>`;
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  // 마커 클릭 핸들러 (공유 팝업 재사용 + 검색창 반영)
  function onMarkerClick(index) {
    const m = markers[index];
    if (!m || !m.popupHtml) return;

    // 검색창에 장소 이름 반영
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    if (searchInput && m.name) {
      searchInput.value = m.name;
      if (clearBtn) clearBtn.classList.remove('hidden');
    }
    // 검색 결과 드롭다운 숨기기
    const resultsEl = document.getElementById('search-results');
    if (resultsEl) resultsEl.classList.add('hidden');

    // 검색 마커가 있으면 제거
    clearSearchMarker();

    // 팝업 닫기 버튼 + 컨텐츠
    const closeBtn = `<div class="kakao-popup-close" onclick="MapManager.closeAllPopups()">✕</div>`;
    const wrapHtml = `<div class="kakao-popup-wrap">${closeBtn}${m.popupHtml}</div>`;

    // 공유 오버레이 업데이트
    popupOverlay.setMap(null);
    popupOverlay.setPosition(m.position);
    popupOverlay.setContent(wrapHtml);
    popupOverlay.setMap(map);
  }

  // 마커 추가 (kakao.maps.Marker 기반 - 캔버스 렌더링, DOM 부하 없음)
  function addMarker(lat, lng, emoji, type, name, popupHtml, spotId) {
    const position = new kakao.maps.LatLng(lat, lng);
    const markerIndex = markers.length;

    const marker = new kakao.maps.Marker({
      position: position,
      map: map,
      image: getMarkerImage(type),
      title: name,
      clickable: true
    });

    // 네이티브 맵 이벤트로 클릭 처리 (DOM 이벤트 아님)
    kakao.maps.event.addListener(marker, 'click', () => {
      onMarkerClick(markerIndex);
    });

    const markerData = {
      marker,
      popupHtml: popupHtml || null,
      category: type,
      spotId: spotId || null,
      name: name,
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

    // 숙소 마커
    const acc = TRAVEL_DATA.accommodation;
    if (acc) {
      addMarker(acc.lat, acc.lng, '🏨', 'home', acc.name,
        `<div class="kakao-popup"><div class="kakao-popup-title">🏨 ${acc.name}</div><div class="kakao-popup-desc">${acc.room}<br>체크인 ${acc.checkIn} · 체크아웃 ${acc.checkOut}<br>📞 ${acc.safePhone}</div><div class="kakao-popup-actions"><a class="kakao-popup-btn" href="#" onclick="event.preventDefault(); App.openNavigation(${acc.lat}, ${acc.lng}, '${acc.name.replace(/'/g, "\\'")}')">🧭 길찾기</a><a class="kakao-popup-btn naver" href="https://map.naver.com/v5/search/${encodeURIComponent(acc.name)}" target="_blank">📍 네이버</a></div></div>`
      );
    }

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
        strokeStyle: 'solid'
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
        strokeStyle: 'solid'
      });
      line2.setMap(map);
      routeLines.push(line2);
    }
  }

  // 모든 팝업 닫기
  function closeAllPopups() {
    if (popupOverlay) popupOverlay.setMap(null);
  }

  // 필터 적용
  function setFilter(category) {
    if (!mapReady) return;
    activeFilter = category;
    markers.forEach((m) => {
      const show = (category === 'all' || m.category === category);
      m.marker.setMap(show ? map : null);
    });
    closeAllPopups();
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
    if (!mapReady || !map) return;
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

  // 특정 좌표로 이동 (즉시 이동, 애니메이션 없음)
  function flyTo(lat, lng, level) {
    if (map) {
      map.setCenter(new kakao.maps.LatLng(lat, lng));
      if (level) map.setLevel(level);
    }
  }

  // 모든 마커가 보이게 줌
  function fitAll() {
    if (!mapReady || markers.length === 0) return;
    const bounds = new kakao.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend(m.position));
    map.setBounds(bounds, 50);
  }

  // 묵호/동해 중심으로 이동 (즉시)
  function goToMukho() {
    if (!map) return;
    map.setCenter(new kakao.maps.LatLng(37.54, 129.11));
    map.setLevel(9);
  }

  // 특정 스팟의 팝업 열기 (즉시 이동)
  function openSpotPopup(spotId) {
    if (!mapReady) return;
    const idx = markers.findIndex((mk) => mk.spotId === spotId);
    if (idx !== -1) {
      const m = markers[idx];
      map.setCenter(m.position);
      map.setLevel(4);
      onMarkerClick(idx);
    }
  }

  // 장소 검색 (Places API)
  function searchPlaces(keyword, callback) {
    if (!places || !mapReady) {
      callback([]);
      return;
    }
    // 현재 지도 영역 기반 검색
    const bounds = map.getBounds();
    places.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        callback(data.slice(0, 5));
      } else {
        callback([]);
      }
    }, {
      bounds: bounds
    });
  }

  // 검색 결과 마커 + 팝업 표시 (오버레이 재사용 + 즉시 이동)
  function showSearchMarker(place) {
    closeAllPopups();

    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    const position = new kakao.maps.LatLng(lat, lng);

    // 검색 마커 오버레이 (최초 1회만 생성, 이후 재사용)
    if (!searchMarkerOvl) {
      searchMarkerOvl = new kakao.maps.CustomOverlay({
        position: position,
        content: `<div class="search-marker">📌</div>`,
        yAnchor: 1,
        zIndex: 50
      });
    } else {
      searchMarkerOvl.setPosition(position);
    }
    searchMarkerOvl.setMap(map);

    // 검색 팝업 오버레이 (최초 1회만 생성, 이후 컨텐츠+위치 교체)
    const address = place.road_address_name || place.address_name || '';
    const popupContent = `
      <div class="kakao-popup-wrap">
        <div class="kakao-popup-close" onclick="MapManager.clearSearchMarker()">✕</div>
        <div class="kakao-popup">
          <div class="kakao-popup-title">📌 ${place.place_name}</div>
          <div class="kakao-popup-desc">${address}</div>
          ${place.category_group_name ? `<div class="kakao-popup-info">📂 ${place.category_group_name}</div>` : ''}
          ${place.phone ? `<div class="kakao-popup-info">📞 ${place.phone}</div>` : ''}
          <div class="kakao-popup-actions">
            <a class="kakao-popup-btn" href="#" onclick="event.preventDefault(); App.openNavigation(${lat}, ${lng}, '${place.place_name.replace(/'/g, "\\'")}')">🧭 길찾기</a>
            <a class="kakao-popup-btn naver" href="https://map.naver.com/v5/search/${encodeURIComponent(place.place_name)}" target="_blank">📍 네이버</a>
          </div>
        </div>
      </div>`;

    if (!searchPopupOvl) {
      searchPopupOvl = new kakao.maps.CustomOverlay({
        position: position,
        content: popupContent,
        yAnchor: 1.8,
        zIndex: 100
      });
    } else {
      searchPopupOvl.setMap(null);
      searchPopupOvl.setPosition(position);
      searchPopupOvl.setContent(popupContent);
    }
    searchPopupOvl.setMap(map);

    searchActive = true;

    // 즉시 이동 (panTo 애니메이션 대신 setCenter로 렉 제거)
    map.setCenter(position);
    map.setLevel(3);
  }

  // 검색 마커 제거
  function clearSearchMarker() {
    if (searchMarkerOvl) searchMarkerOvl.setMap(null);
    if (searchPopupOvl) searchPopupOvl.setMap(null);
    searchActive = false;
  }

  // 롱프레스 감지 설정 (500ms 이상 터치 유지)
  function setupLongPress() {
    let timer = null;
    let startX = 0, startY = 0;
    const el = document.getElementById('map');

    // 브라우저 기본 컨텍스트 메뉴 방지
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { clearTimeout(timer); timer = null; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      timer = setTimeout(() => {
        timer = null;
        // 픽셀 좌표 → 지도 좌표 변환
        const rect = el.getBoundingClientRect();
        const proj = map.getProjection();
        const point = new kakao.maps.Point(startX - rect.left, startY - rect.top);
        const latlng = proj.coordsFromContainerPoint(point);
        handleLongPress(latlng.getLat(), latlng.getLng());
      }, 500);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (!timer) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
        clearTimeout(timer);
        timer = null;
      }
    }, { passive: true });

    el.addEventListener('touchend', () => { clearTimeout(timer); timer = null; });
    el.addEventListener('touchcancel', () => { clearTimeout(timer); timer = null; });
  }

  // 롱프레스 처리: 역지오코딩 → 콜백으로 전달
  function handleLongPress(lat, lng) {
    if (navigator.vibrate) navigator.vibrate(30);

    geocoder.coord2Address(lng, lat, (result, status) => {
      let keyword = '';
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const addr = result[0].address;
        keyword = addr.region_3depth_name || addr.region_2depth_name || '';
      }
      if (longPressCallback && keyword) {
        longPressCallback(lat, lng, keyword);
      }
    });
  }

  // 특정 위치 기준 주변 검색 (거리순 정렬)
  function searchNearby(lat, lng, keyword, callback) {
    if (!places || !mapReady) { callback([]); return; }
    places.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        callback(data.slice(0, 5));
      } else {
        callback([]);
      }
    }, {
      location: new kakao.maps.LatLng(lat, lng),
      radius: 1000,
      sort: kakao.maps.services.SortBy.DISTANCE
    });
  }

  // 롱프레스 콜백 등록 (app.js에서 사용)
  function setLongPressCallback(fn) {
    longPressCallback = fn;
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
    onMarkerClick,
    searchPlaces,
    searchNearby,
    showSearchMarker,
    clearSearchMarker,
    setLongPressCallback,
    isTracking: () => isTracking
  };
})();
