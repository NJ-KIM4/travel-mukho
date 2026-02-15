// 지도 & GPS 관리 모듈
const MapManager = (() => {
  let map = null;             // Leaflet 지도 인스턴스
  let markers = [];           // 모든 마커
  let routeLine = null;       // 경로 라인
  let myLocationMarker = null; // 내 위치 마커
  let myLocationCircle = null; // 내 위치 정확도 원
  let watchId = null;          // GPS 감시 ID
  let isTracking = false;      // GPS 추적 중 여부
  let isFollowing = true;      // 내 위치 따라가기 모드
  let activeFilter = 'all';    // 현재 필터

  // 지도 초기화
  function init() {
    // 묵호/동해 중심으로 지도 생성
    map = L.map('map', {
      center: [37.54, 129.11],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // OpenStreetMap 타일 (다크 테마)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // 줌 컨트롤 (우측 상단)
    L.control.zoom({ position: 'topright' }).addTo(map);

    // 마커 추가
    addAllMarkers();

    // 경로 라인 그리기
    drawRoute();

    // 지도 이동 시 따라가기 모드 해제
    map.on('dragstart', () => {
      isFollowing = false;
    });
  }

  // 커스텀 마커 아이콘 생성
  function createIcon(emoji, type) {
    return L.divIcon({
      html: `<div class="custom-marker marker-${type}">${emoji}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  // 팝업 HTML 생성
  function createPopup(item) {
    const navUrl = `https://map.naver.com/v5/search/${encodeURIComponent(item.name)}`;
    let html = `<div class="popup-content">`;
    html += `<h3>${item.icon || ''} ${item.name}</h3>`;
    html += `<p>${item.description || ''}</p>`;

    if (item.hours) html += `<p>🕐 ${item.hours}</p>`;
    if (item.fee) html += `<p>💰 ${item.fee}</p>`;
    if (item.menu) html += `<p>🍽️ ${item.menu}</p>`;
    if (item.price) html += `<p>💵 ${item.price}</p>`;

    html += `<a class="popup-btn" href="${navUrl}" target="_blank">📍 네이버 지도</a>`;
    html += `</div>`;
    return html;
  }

  // 모든 마커 추가
  function addAllMarkers() {
    // 집 마커
    const home = TRAVEL_DATA.home;
    const homeMarker = L.marker([home.lat, home.lng], {
      icon: createIcon('🏠', 'home')
    }).bindPopup(`<div class="popup-content"><h3>🏠 ${home.name}</h3><p>${home.address}</p></div>`);
    homeMarker._category = 'home';
    markers.push(homeMarker);
    homeMarker.addTo(map);

    // 역 마커
    Object.values(TRAVEL_DATA.stations).forEach((station) => {
      const m = L.marker([station.lat, station.lng], {
        icon: createIcon('🚉', 'station')
      }).bindPopup(`<div class="popup-content"><h3>🚉 ${station.name}</h3></div>`);
      m._category = 'station';
      markers.push(m);
      m.addTo(map);
    });

    // 관광지 마커
    TRAVEL_DATA.spots.forEach((spot) => {
      const m = L.marker([spot.lat, spot.lng], {
        icon: createIcon(spot.icon, 'sightseeing')
      }).bindPopup(createPopup(spot));
      m._category = 'sightseeing';
      m._spotId = spot.id;
      markers.push(m);
      m.addTo(map);
    });

    // 맛집 마커
    TRAVEL_DATA.restaurants.forEach((rest) => {
      const m = L.marker([rest.lat, rest.lng], {
        icon: createIcon(rest.icon, 'food')
      }).bindPopup(createPopup(rest));
      m._category = 'food';
      m._spotId = rest.id;
      markers.push(m);
      m.addTo(map);
    });

    // 카페 마커
    TRAVEL_DATA.cafes.forEach((cafe) => {
      const m = L.marker([cafe.lat, cafe.lng], {
        icon: createIcon(cafe.icon, 'cafe')
      }).bindPopup(createPopup(cafe));
      m._category = 'cafe';
      m._spotId = cafe.id;
      markers.push(m);
      m.addTo(map);
    });
  }

  // 일정 기반 경로 라인 그리기
  function drawRoute() {
    // Day1 경로 좌표
    const day1Coords = TRAVEL_DATA.itinerary[0].events
      .filter((e) => e.lat && e.lng)
      .map((e) => [e.lat, e.lng]);

    // Day2 경로 좌표
    const day2Coords = TRAVEL_DATA.itinerary[1].events
      .filter((e) => e.lat && e.lng)
      .map((e) => [e.lat, e.lng]);

    // Day1 경로 (파란색)
    if (day1Coords.length > 1) {
      L.polyline(day1Coords, {
        color: '#0ea5e9',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8'
      }).addTo(map);
    }

    // Day2 경로 (초록색)
    if (day2Coords.length > 1) {
      L.polyline(day2Coords, {
        color: '#22c55e',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8'
      }).addTo(map);
    }
  }

  // 필터 적용
  function setFilter(category) {
    activeFilter = category;
    markers.forEach((m) => {
      if (category === 'all' || m._category === category) {
        m.addTo(map);
      } else {
        map.removeLayer(m);
      }
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

    // GPS 감시 시작
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

    // UI 업데이트
    updateGPSUI();
  }

  function stopGPS() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    isTracking = false;
    isFollowing = false;

    // 마커 제거
    if (myLocationMarker) {
      map.removeLayer(myLocationMarker);
      myLocationMarker = null;
    }
    if (myLocationCircle) {
      map.removeLayer(myLocationCircle);
      myLocationCircle = null;
    }

    updateGPSUI();
  }

  // 내 위치 업데이트
  function updateMyLocation(coords) {
    const { latitude: lat, longitude: lng, accuracy } = coords;

    // 내 위치 마커
    if (!myLocationMarker) {
      myLocationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: `<div class="my-location-ring"></div><div class="my-location-marker"></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        }),
        zIndexOffset: 1000
      }).addTo(map);
    } else {
      myLocationMarker.setLatLng([lat, lng]);
    }

    // 정확도 원
    if (!myLocationCircle) {
      myLocationCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#0ea5e9',
        fillColor: '#0ea5e9',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(map);
    } else {
      myLocationCircle.setLatLng([lat, lng]);
      myLocationCircle.setRadius(accuracy);
    }

    // 따라가기 모드면 지도 이동
    if (isFollowing) {
      map.setView([lat, lng], map.getZoom());
    }

    // 헤더 GPS 상태 업데이트
    updateGPSUI();

    // 앱에 위치 전달
    if (typeof App !== 'undefined') {
      App.updateLocation(lat, lng);
    }
  }

  // GPS UI 업데이트
  function updateGPSUI() {
    const gpsBtn = document.getElementById('gps-btn');
    const gpsDot = document.getElementById('gps-dot');
    const gpsText = document.getElementById('gps-text');

    if (gpsBtn) {
      gpsBtn.classList.toggle('gps-active', isTracking);
    }
    if (gpsDot) {
      gpsDot.style.background = isTracking ? '#0ea5e9' : '#64748b';
    }
    if (gpsText) {
      gpsText.textContent = isTracking ? 'GPS 추적 중' : 'GPS 꺼짐';
    }
  }

  // 내 위치로 이동
  function goToMyLocation() {
    if (myLocationMarker) {
      isFollowing = true;
      const latlng = myLocationMarker.getLatLng();
      map.setView(latlng, 15, { animate: true });
    } else if (!isTracking) {
      startGPS();
    }
  }

  // 특정 좌표로 이동
  function flyTo(lat, lng, zoom) {
    if (map) {
      map.flyTo([lat, lng], zoom || 15, { duration: 1 });
    }
  }

  // 모든 마커가 보이게 줌
  function fitAll() {
    const allCoords = markers
      .filter((m) => m.getLatLng)
      .map((m) => m.getLatLng());

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
    }
  }

  // 묵호/동해 중심으로 이동
  function goToMukho() {
    map.flyTo([37.54, 129.11], 13, { duration: 1 });
  }

  // 특정 스팟의 팝업 열기
  function openSpotPopup(spotId) {
    const marker = markers.find((m) => m._spotId === spotId);
    if (marker) {
      map.flyTo(marker.getLatLng(), 16, { duration: 0.5 });
      setTimeout(() => marker.openPopup(), 600);
    }
  }

  return {
    init,
    toggleGPS,
    goToMyLocation,
    flyTo,
    fitAll,
    goToMukho,
    setFilter,
    openSpotPopup,
    isTracking: () => isTracking
  };
})();
