// 여행 데이터 - 묵호/동해 1박 2일 여행
const TRAVEL_DATA = {
  // 여행 기본 정보
  trip: {
    name: "묵호·동해 힐링 여행",
    dates: "2026.02.16(월) ~ 02.17(화)",
    duration: "1박 2일",
    travelers: 1,
    theme: ["맛집", "관광", "자연", "힐링", "카페", "문화"]
  },

  // 집 주소
  home: {
    name: "집",
    address: "경기도 광주시 초월읍 산이리 433",
    lat: 37.3800,
    lng: 127.2700
  },

  // 기차표 정보
  tickets: [
    {
      id: "t1",
      type: "KTX-이음",
      from: "덕소",
      to: "묵호",
      fromLat: 37.5918,
      fromLng: 127.1628,
      toLat: 37.5536,
      toLng: 129.1133,
      date: "2026-02-16",
      dateLabel: "2/16(월)",
      time: "09:51",
      arrivalTime: "12:00",
      seat: "5호차 9A",
      label: "가는 편"
    },
    {
      id: "t2",
      type: "KTX-이음",
      from: "묵호",
      to: "양평",
      fromLat: 37.5536,
      fromLng: 129.1133,
      toLat: 37.4912,
      toLng: 127.4876,
      date: "2026-02-17",
      dateLabel: "2/17(화)",
      time: "14:10",
      arrivalTime: "16:30",
      seat: "2호차 17D",
      label: "오는 편"
    }
  ],

  // 역 정보
  stations: {
    deokso: { name: "덕소역", lat: 37.5918, lng: 127.1628 },
    mukho: { name: "묵호역", lat: 37.5536, lng: 129.1133 },
    yangpyeong: { name: "양평역", lat: 37.4912, lng: 127.4876 }
  },

  // 관광 스팟
  spots: [
    {
      id: "s1",
      name: "묵호등대",
      category: "관광",
      icon: "🏠",
      description: "동해 바다가 한눈에 내려다보이는 전망 명소. 논골담길과 연결되어 산책하기 좋다.",
      address: "강원도 동해시 묵호진동 1-2",
      lat: 37.5567,
      lng: 129.1178,
      fee: "무료",
      hours: "상시 개방",
      tips: "일몰 시간에 방문하면 환상적인 뷰"
    },
    {
      id: "s2",
      name: "논골담길",
      category: "문화",
      icon: "🎨",
      description: "알록달록한 벽화와 조형물이 있는 해안 마을 골목길. 묵호등대에서 이어지는 산책 코스.",
      address: "강원도 동해시 묵호진동",
      lat: 37.5558,
      lng: 129.1170,
      fee: "무료",
      hours: "상시",
      tips: "사진 찍기 좋은 포토존이 많아요"
    },
    {
      id: "s3",
      name: "추암 촛대바위",
      category: "자연",
      icon: "🪨",
      description: "동해안의 대표 절경. 기암괴석과 촛대 모양 바위가 인상적. 일출 명소로도 유명.",
      address: "강원도 동해시 촛대바위길 28",
      lat: 37.4793,
      lng: 129.1528,
      fee: "무료",
      hours: "상시 개방",
      tips: "일출 명소! 새벽에 방문도 추천"
    },
    {
      id: "s4",
      name: "추암해변",
      category: "자연",
      icon: "🏖️",
      description: "촛대바위 바로 옆 해변. 겨울 바다의 파도 소리가 힐링.",
      address: "강원도 동해시 추암동",
      lat: 37.4780,
      lng: 129.1510,
      fee: "무료",
      hours: "상시",
      tips: "겨울 바다 산책에 딱"
    },
    {
      id: "s5",
      name: "무릉계곡",
      category: "자연",
      icon: "🏔️",
      description: "두타산과 청옥산 사이의 아름다운 계곡. 무릉반석, 용추폭포 등 볼거리 가득.",
      address: "강원도 동해시 삼화동 산267",
      lat: 37.4747,
      lng: 129.0025,
      fee: "어른 2,000원",
      hours: "09:00~18:00",
      tips: "겨울엔 결빙된 계곡이 장관. 편한 신발 필수"
    },
    {
      id: "s6",
      name: "천곡천연동굴",
      category: "관광",
      icon: "🕳️",
      description: "국내 유일 도심 속 천연 석회암 동굴. 종유석과 석순, 황금박쥐 서식지로 유명.",
      address: "강원도 동해시 동굴로 50",
      lat: 37.5175,
      lng: 129.1106,
      fee: "어른 4,000원",
      hours: "09:00~18:00 (월요일 휴무)",
      tips: "동굴 내부 온도 약 13도, 겉옷 챙기세요. 화요일 방문 가능!"
    },
    {
      id: "s7",
      name: "망상해변",
      category: "자연",
      icon: "🌊",
      description: "동해시 대표 해변. 넓고 깨끗한 모래사장과 투명한 바다.",
      address: "강원도 동해시 망상동",
      lat: 37.5861,
      lng: 129.1214,
      fee: "무료",
      hours: "상시",
      tips: "겨울 바다 산책 추천"
    },
    {
      id: "s8",
      name: "도째비골 해랑전망대",
      category: "관광",
      icon: "🌅",
      description: "동해 바다와 묵호항이 한눈에 보이는 전망대. 일몰과 야경 명소.",
      address: "강원도 동해시 묵호진동",
      lat: 37.5575,
      lng: 129.1185,
      fee: "무료",
      hours: "상시 개방",
      tips: "일몰·야경이 특히 아름다워요"
    }
  ],

  // 맛집
  restaurants: [
    {
      id: "r1",
      name: "묵호항 종합수산시장",
      category: "맛집",
      icon: "🐟",
      description: "신선한 회와 해산물을 저렴하게 즐길 수 있는 전통 수산시장.",
      address: "강원도 동해시 묵호진동 11-3",
      lat: 37.5547,
      lng: 129.1167,
      menu: "모듬회, 물회, 해산물",
      price: "모듬회 3~5만원대",
      hours: "06:00~21:00",
      tips: "2층에서 회를 떠서 1층에서 매운탕 끓여먹기 가능"
    },
    {
      id: "r2",
      name: "동해 중앙시장",
      category: "맛집",
      icon: "🥘",
      description: "동해시 대표 전통시장. 다양한 먹거리와 로컬 음식 체험 가능.",
      address: "강원도 동해시 중앙로 77",
      lat: 37.5245,
      lng: 129.1140,
      menu: "닭강정, 감자전, 시장 먹거리",
      price: "5천~1만원",
      hours: "08:00~20:00",
      tips: "닭강정이 유명!"
    },
    {
      id: "r3",
      name: "묵호항 해물칼국수",
      category: "맛집",
      icon: "🍜",
      description: "묵호항에서 오래된 칼국수 맛집. 해물이 가득한 시원한 국물.",
      address: "강원도 동해시 묵호진동",
      lat: 37.5550,
      lng: 129.1160,
      menu: "해물칼국수, 수제비",
      price: "8,000~10,000원",
      hours: "10:00~20:00",
      tips: "점심시간 웨이팅 있을 수 있어요"
    },
    {
      id: "r4",
      name: "동해 곰치국",
      category: "맛집",
      icon: "🍲",
      description: "동해 향토 음식 곰치국(물곰탕). 얼큰하고 시원한 국물이 일품.",
      address: "강원도 동해시 천곡동",
      lat: 37.5230,
      lng: 129.0920,
      menu: "곰치국, 생선구이 정식",
      price: "10,000~15,000원",
      hours: "07:00~20:00",
      tips: "아침 해장으로도 인기"
    }
  ],

  // 카페
  cafes: [
    {
      id: "c1",
      name: "묵꼬양 치유카페",
      category: "카페",
      icon: "☕",
      description: "'한국의 산토리니'로 불리는 힐링 카페. 묵호 별빛마을 언덕 위 동해 바다 오션뷰.",
      address: "강원도 동해시 묵호진동 별빛마을",
      lat: 37.5572,
      lng: 129.1182,
      menu: "커피, 차, 디저트",
      hours: "10:00~21:00",
      tips: "한국의 산토리니 분위기! 인스타 핫플"
    },
    {
      id: "c2",
      name: "카페코스타",
      category: "카페",
      icon: "🧋",
      description: "묵호 해안로에 위치한 모던 인테리어 오션뷰 카페. 커피와 디저트 퀄리티 높음.",
      address: "강원도 동해시 해안로 79",
      lat: 37.5560,
      lng: 129.1175,
      menu: "아메리카노, 라떼, 수제 디저트",
      hours: "10:00~21:00",
      tips: "논골담길 산책 후 쉬어가기 좋아요"
    },
    {
      id: "c3",
      name: "내게와묵호",
      category: "카페",
      icon: "🌅",
      description: "루프탑에서 논골담길과 동해 바다를 함께 감상할 수 있는 카페.",
      address: "강원도 동해시 해맞이길 286",
      lat: 37.5565,
      lng: 129.1180,
      menu: "커피, 차, 케이크",
      hours: "10:00~20:00",
      tips: "루프탑 뷰가 최고! 날씨 좋은 날 추천"
    }
  ],

  // 일정표
  itinerary: [
    // ===== Day 1 =====
    {
      day: 1,
      date: "2026-02-16",
      dateLabel: "2/16(월)",
      title: "출발 & 묵호 탐험",
      events: [
        {
          time: "08:30",
          endTime: "09:30",
          title: "집 → 덕소역 이동",
          type: "move",
          icon: "🚗",
          description: "초월읍에서 덕소역까지 이동 (자차/택시 약 40분)",
          spotId: null,
          lat: 37.5918,
          lng: 127.1628
        },
        {
          time: "09:51",
          endTime: "12:00",
          title: "🚅 KTX-이음 탑승 (덕소→묵호)",
          type: "transport",
          icon: "🚅",
          description: "5호차 9A석 | 약 2시간 소요\n차창 밖 강원도 산악 풍경 감상",
          spotId: null,
          lat: null,
          lng: null
        },
        {
          time: "12:00",
          endTime: "12:15",
          title: "묵호역 도착",
          type: "arrival",
          icon: "📍",
          description: "묵호역에서 하차. 짐 보관 또는 숙소 체크인.",
          spotId: null,
          lat: 37.5536,
          lng: 129.1133
        },
        {
          time: "12:20",
          endTime: "13:30",
          title: "🐟 점심: 묵호항 수산시장",
          type: "food",
          icon: "🐟",
          description: "신선한 모듬회와 매운탕으로 점심!\n2층에서 회 구매 → 1층에서 매운탕",
          spotId: "r1",
          lat: 37.5547,
          lng: 129.1167
        },
        {
          time: "13:40",
          endTime: "15:00",
          title: "🏠 묵호등대 & 논골담길 산책",
          type: "sightseeing",
          icon: "🏠",
          description: "묵호등대에서 동해 바다 조망 → 논골담길 벽화 골목 산책\n사진 찍기 좋은 포토존 다수",
          spotId: "s1",
          lat: 37.5567,
          lng: 129.1178
        },
        {
          time: "15:10",
          endTime: "16:00",
          title: "☕ 카페코스타에서 휴식",
          type: "cafe",
          icon: "☕",
          description: "묵호 해안로 모던 오션뷰 카페에서 커피 타임",
          spotId: "c2",
          lat: 37.5560,
          lng: 129.1175
        },
        {
          time: "16:15",
          endTime: "17:30",
          title: "🪨 추암 촛대바위 & 해변",
          type: "sightseeing",
          icon: "🪨",
          description: "동해안 대표 절경 촛대바위 감상\n해변 산책하며 겨울 바다 힐링\n일몰 시간대라 분위기 최고",
          spotId: "s3",
          lat: 37.4793,
          lng: 129.1528
        },
        {
          time: "17:40",
          endTime: "18:30",
          title: "🌅 묵꼬양 치유카페에서 일몰 감상",
          type: "cafe",
          icon: "🌅",
          description: "'한국의 산토리니' 묵꼬양 치유카페에서\n동해 바다 일몰 보며 따뜻한 차 한잔",
          spotId: "c1",
          lat: 37.4790,
          lng: 129.1520
        },
        {
          time: "19:00",
          endTime: "20:00",
          title: "🍲 저녁: 곰치국 (물곰탕)",
          type: "food",
          icon: "🍲",
          description: "동해 향토 음식 곰치국으로 따뜻한 저녁 식사\n얼큰하고 시원한 국물이 일품",
          spotId: "r4",
          lat: 37.5230,
          lng: 129.0920
        },
        {
          time: "20:30",
          endTime: null,
          title: "🏨 숙소 체크인 & 휴식",
          type: "rest",
          icon: "🏨",
          description: "숙소에서 편안한 밤 보내기\n내일 일정 확인하고 푹 쉬세요",
          spotId: null,
          lat: 37.5536,
          lng: 129.1133
        }
      ]
    },
    // ===== Day 2 =====
    {
      day: 2,
      date: "2026-02-17",
      dateLabel: "2/17(화)",
      title: "자연 힐링 & 귀가",
      events: [
        {
          time: "07:30",
          endTime: "08:30",
          title: "🌅 추암 일출 감상 (선택)",
          type: "sightseeing",
          icon: "🌅",
          description: "일찍 일어난다면 추암 촛대바위 일출 감상!\n일출 시간 약 07:15 (2월 기준)",
          spotId: "s3",
          lat: 37.4793,
          lng: 129.1528
        },
        {
          time: "08:30",
          endTime: "09:30",
          title: "🍲 아침: 곰치국 해장",
          type: "food",
          icon: "🍲",
          description: "동해 곰치국으로 든든한 아침 해장\n또는 숙소 조식",
          spotId: "r4",
          lat: 37.5230,
          lng: 129.0920
        },
        {
          time: "09:45",
          endTime: "11:30",
          title: "🏔️ 무릉계곡 산책",
          type: "sightseeing",
          icon: "🏔️",
          description: "두타산 무릉계곡 트레킹\n무릉반석, 삼화사 둘러보기\n겨울 결빙 계곡 풍경 감상",
          spotId: "s5",
          lat: 37.4747,
          lng: 129.0025
        },
        {
          time: "11:40",
          endTime: "12:30",
          title: "🥘 점심: 동해 중앙시장",
          type: "food",
          icon: "🥘",
          description: "동해 중앙시장에서 닭강정, 감자전 등 시장 먹거리 체험",
          spotId: "r2",
          lat: 37.5245,
          lng: 129.1140
        },
        {
          time: "12:40",
          endTime: "13:20",
          title: "🕳️ 천곡천연동굴 (선택)",
          type: "sightseeing",
          icon: "🕳️",
          description: "시간 여유 있으면 천연 석회암 동굴 관람\n종유석과 석순이 신비로운 분위기\n※ 월요일 휴무 → 화요일 방문 가능!",
          spotId: "s6",
          lat: 37.5242,
          lng: 129.0892
        },
        {
          time: "13:30",
          endTime: "13:50",
          title: "묵호역으로 이동",
          type: "move",
          icon: "🚗",
          description: "묵호역으로 이동 (택시 약 15분)",
          spotId: null,
          lat: 37.5536,
          lng: 129.1133
        },
        {
          time: "14:10",
          endTime: "16:30",
          title: "🚅 KTX-이음 탑승 (묵호→양평)",
          type: "transport",
          icon: "🚅",
          description: "2호차 17D석 | 약 2시간 20분 소요\n창밖 풍경 감상하며 여행 마무리",
          spotId: null,
          lat: null,
          lng: null
        },
        {
          time: "16:30",
          endTime: "17:30",
          title: "양평역 → 집",
          type: "move",
          icon: "🏠",
          description: "양평역에서 초월읍 집까지 이동\n수고하셨습니다! 좋은 여행이었길 🎉",
          spotId: null,
          lat: 37.3800,
          lng: 127.2700
        }
      ]
    }
  ]
};
