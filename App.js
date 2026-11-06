import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthScreen, SetupScreen } from './src/components/AuthScreen';
import { ChatSafetyPanel } from './src/components/ChatSafetyPanel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMMUNITY_BOARDS, DEFAULT_FAVORITE_BOARDS, COMMUNITY_ALL_TERMS,
  FavoriteBoardSection, CommunityScopeSelector, CompactCommunityPost, HomeCommunitySection, boardTitle,
} from './src/components/ExchangeCommunitySections';
import { COLORS } from './src/theme';
import { searchUniversities } from './src/lib/universitySearch';
import { supabase, isCloudConfigured, friendlyError, loadAccount, loadPeople, loadPosts, createPost, createComment, reportPost as cloudReportPost, saveProfile as cloudSaveProfile, saveExchange as cloudSaveExchange, saveInterest as cloudSaveInterest, completeOnboarding as cloudCompleteOnboarding, isUniversityEmail, requestUniversityCode, confirmUniversityCode, loadListings, createListing as cloudCreateListing, setListingStatus as cloudSetListingStatus, startChat as cloudStartChat, loadChats, loadMessages as cloudLoadMessages, sendMessage as cloudSendMessage, loadOpenChatRooms, createOpenChatRoom, joinOpenChatRoom, leaveOpenChatRoom, loadOpenChatMessages, sendOpenChatMessage, reportOpenChatMessage, blockOpenChatUser, loadBlockedOpenChatUsers, unblockOpenChatUser, saveCheck, loadCheckin, saveCheckin, getCheckinSummary, distanceKm } from './src/lib/cloud';


const YEARS = Array.from({ length: 25 }, (_, index) => 2026 + index);
const TERMS = ['1학기', '2학기', '여름계절학기', '겨울계절학기'];
const WHEEL_ITEM_HEIGHT = 44;

const SAMPLE_USERS = [
  {
    id: 'u1', nickname: '민지', universityId: 'https://ror.org/035b05819', universityName: 'University of Copenhagen',
    city: 'Copenhagen', country: 'Denmark', semester: '2027년 1학기', homeUniversity: '연세대학교', showHomeUniversity: false,
    discoverable: true,
    intro: '여행이랑 카페 좋아해요! 주말에 같이 돌아다닐 친구를 찾고 있어요.',
    interests: ['여행', '카페', '사진'], style: ['계획형', '주말여행 자주', '천천히 구경'], distanceKm: 0,
  },
  {
    id: 'u2', nickname: '서윤', universityId: 'https://ror.org/035b05819', universityName: 'University of Copenhagen',
    city: 'Copenhagen', country: 'Denmark', semester: '2027년 1학기', homeUniversity: '고려대학교', showHomeUniversity: true,
    intro: '코펜하겐 같이 돌아다닐 친구 구해요. 맛집이랑 산책 좋아해요.',
    interests: ['맛집', '산책', '여행메이트'], style: ['즉흥형', '카페 좋아함', '사진 많이 찍음'], distanceKm: 0,
  },
  {
    id: 'u3', nickname: '현우', universityId: 'https://ror.org/05f0yaq80', universityName: 'Copenhagen Business School',
    city: 'Frederiksberg', country: 'Denmark', semester: '2027년 1학기', homeUniversity: '한양대학교', showHomeUniversity: false,
    intro: '축구랑 여행 좋아해요. 주말에 근교 여행 같이 가요.',
    interests: ['축구', '여행', '러닝'], style: ['활동적', '주말여행 자주'], distanceKm: 2,
  },
  {
    id: 'u4', nickname: '하린', universityId: 'itu-cph', universityName: 'IT University of Copenhagen',
    city: 'Copenhagen', country: 'Denmark', semester: '2027년 1학기', homeUniversity: '국민대학교', showHomeUniversity: true,
    intro: '전시랑 맛집 다니는 거 좋아해요. 평일 저녁에도 자주 나가요.',
    interests: ['전시', '맛집', '카페'], style: ['즉흥형', '도시여행', '저녁약속 좋아함'], distanceKm: 5,
  },
  {
    id: 'u5', nickname: '도윤', universityId: 'dtu', universityName: 'Technical University of Denmark',
    city: 'Kongens Lyngby', country: 'Denmark', semester: '2027년 1학기', homeUniversity: '서울대학교', showHomeUniversity: false,
    intro: '자전거 타고 근교 돌아다니는 걸 좋아해요.',
    interests: ['자전거', '여행', '자연'], style: ['활동적', '아침형', '근교여행'], distanceKm: 13,
  },
  {
    id: 'u6', nickname: '수아', universityId: 'aarhus', universityName: 'Aarhus University',
    city: 'Aarhus', country: 'Denmark', semester: '2027년 1학기', homeUniversity: '이화여자대학교', showHomeUniversity: false,
    intro: '덴마크 여기저기 여행 같이 할 친구 찾아요.',
    interests: ['여행', '공연', '맛집'], style: ['계획형', '기차여행', '주말여행 자주'], distanceKm: 188,
  },
];

const INITIAL_POSTS = [
  {
    id: 'p1', category: '질문', title: 'CPR 신청 다들 언제 했어요?', body: '도착하고 바로 해야 하는지, 숙소 계약서 나오고 해야 하는지 궁금해요.',
    meta: '코펜하겐 · 2027년 1학기', time: '8분 전', likes: 7,
    comments: ['저는 입국하고 일주일 뒤에 했어요.', '숙소 서류 준비되면 바로 하는 게 편했어요.'],
  },
  {
    id: 'p2', category: '여행메이트', title: '2월 말 스톡홀름 주말 여행 갈 사람?', body: '금요일 저녁 출발해서 일요일 밤 돌아오는 일정 생각 중이에요. 2~3명 정도 같이 가면 좋을 것 같아요.',
    meta: '덴마크 · 2027년 1학기', time: '21분 전', likes: 12,
    comments: ['저 관심 있어요!', '예산 어느 정도 생각하세요?'],
  },
  {
    id: 'p3', category: '생활', title: '코펜하겐에서 자전거 중고로 어디서 구해요?', body: '교환 한 학기만 탈 거라 너무 비싼 건 부담돼요. 추천 루트 있나요?',
    meta: '코펜하겐', time: '1시간 전', likes: 9, comments: ['페이스북 마켓도 많이 봐요.'],
  },
  {
    id: 'p4', category: '수업', title: 'UCPH 수강신청 변경 기간 질문', body: '첫 주 수업 들어보고 바꾸는 것도 가능한가요?',
    meta: 'University of Copenhagen', time: '2시간 전', likes: 4, comments: [],
  },
];

const MARKET_CATEGORIES = ['전자기기', '생활용품', '가구', '교재', '의류', '이동수단', '기타'];
const LISTING_STATUS = { selling: '판매중', reserved: '예약중', sold: '판매완료' };
const INTEREST_REGIONS = ['유럽', '북미', '아시아', '오세아니아', '남미', '아프리카'];
const COURSE_STATUS = { planned: '수강 예정', ongoing: '수강 중', done: '수강 완료' };

const SAMPLE_LISTINGS = [
  { id: 'l1', sellerId: 'u2', sellerNickname: '서윤', title: '이케아 책상 스탠드', description: '귀국 전에 정리해요. 코펜하겐 시내에서 직거래 가능해요.', priceText: '80 DKK', category: '가구', country: 'Denmark', countryCode: 'DK', city: 'Copenhagen', status: 'selling', time: '10분 전' },
  { id: 'l2', sellerId: 'u3', sellerNickname: '현우', title: '중고 자전거 (자물쇠 포함)', description: '한 학기 탔고 상태 좋아요. 시승 가능해요.', priceText: '600 DKK', category: '이동수단', country: 'Denmark', countryCode: 'DK', city: 'Frederiksberg', status: 'selling', time: '1시간 전' },
  { id: 'l3', sellerId: 'u6', sellerNickname: '수아', title: '전기포트 · 멀티탭 세트', description: '기숙사에서 쓰던 물건이에요.', priceText: '무료나눔', category: '생활용품', country: 'Denmark', countryCode: 'DK', city: 'Aarhus', status: 'reserved', time: '어제' },
];

const SAMPLE_ROOMS = [
  { id: 'r1', title: '코펜하겐 교환학생 모여라', description: '생활 정보랑 번개 약속을 나눠요.', country: 'Denmark', countryCode: 'DK', city: 'Copenhagen', memberCount: 42, isMember: false },
  { id: 'r2', title: '유럽 주말여행 메이트', description: '이번 주말 어디 갈지 같이 정해요.', country: '', countryCode: '', city: '', memberCount: 118, isMember: false },
  { id: 'r3', title: '덴마크 CPR·비자 질문방', description: '서류 준비하면서 막히는 것 물어봐요.', country: 'Denmark', countryCode: 'DK', city: '', memberCount: 27, isMember: false },
];

const SAMPLE_ROOM_MESSAGES = {
  r1: [
    { id: 'm1', senderId: 'u2', senderNickname: '서윤', body: '이번 주 금요일에 뉘하운에서 저녁 드실 분 있나요?' },
    { id: 'm2', senderId: 'u3', senderNickname: '현우', body: '저요! 몇 시쯤 생각하세요?' },
  ],
};

const INITIAL_CHECKLIST = [
  { id: 'c1', group: '출국 전', title: '여권 유효기간 확인', done: true },
  { id: 'c2', group: '출국 전', title: '비자/거주허가 서류 준비', done: false },
  { id: 'c3', group: '출국 전', title: '항공권 예약', done: false },
  { id: 'c4', group: '주거', title: '기숙사 또는 집 계약 확인', done: false },
  { id: 'c5', group: '학교', title: '수강신청 일정 확인', done: false },
  { id: 'c6', group: '생활', title: '현지 유심/eSIM 준비', done: false },
];

const CHECKIN_RESPONSES = [
  { answer: '1월 18일', count: 4 },
  { answer: '1월 20일', count: 7 },
  { answer: '1월 22일', count: 5 },
  { answer: '1월 25일 이후', count: 8 },
];

const CHECKIN_MESSAGES = [
  '저는 1월 20일 도착해요. 공항에서 시내 같이 갈 분?',
  '1월 22일 저녁 도착인데 같은 날인 분 있나요?',
  '저는 18일! 기숙사 입실 전날이라 하루 호텔 잡았어요.',
];

export default function App() {
  const [started, setStarted] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isCloudConfigured);
  const [cloudLoading, setCloudLoading] = useState(isCloudConfigured);
  const [people, setPeople] = useState([]);
  const [checkinSummary, setCheckinSummary] = useState([]);
  const [cloudNotice, setCloudNotice] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [screen, setScreen] = useState('home');
  const [exchangeInfo, setExchangeInfo] = useState(null);
  const [exchangeInterest, setExchangeInterest] = useState(null);
  const [verification, setVerification] = useState(null);
  const [listings, setListings] = useState(isCloudConfigured ? [] : SAMPLE_LISTINGS);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [verifyReturn, setVerifyReturn] = useState('my');
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [previewMessages, setPreviewMessages] = useState(isCloudConfigured ? {} : SAMPLE_ROOM_MESSAGES);
  const [rooms, setRooms] = useState(isCloudConfigured ? [] : SAMPLE_ROOMS);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [posts, setPosts] = useState(isCloudConfigured ? [] : INITIAL_POSTS);
  const [communityScope, setCommunityScope] = useState('all');
  const [communityBoard, setCommunityBoard] = useState('전체');
  const [communitySemester, setCommunitySemester] = useState(null);
  const [favoriteBoards, setFavoriteBoards] = useState(DEFAULT_FAVORITE_BOARDS);
  const [favoritesForAccount, setFavoritesForAccount] = useState(null);
  const [postReturnScreen, setPostReturnScreen] = useState('community');
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [checkinAnswer, setCheckinAnswer] = useState('');
  const [profile, setProfile] = useState({
    onboardingDone: false,
    nickname: isCloudConfigured ? '교환학생' : '보빈',
    homeUniversity: '국민대학교',
    showHomeUniversity: false,
    discoverable: false,
    intro: '여행, 카페, 맛집 좋아해요. 같이 돌아다닐 친구를 찾고 있어요.',
    interests: ['여행', '카페', '맛집'],
    style: ['계획형', '주말여행 자주'],
  });


  const activeCommunitySemester = communitySemester || exchangeInfo?.semester || COMMUNITY_ALL_TERMS;
  const favoriteStorageKey = 'gyohwanjeom:favorites:' + (session?.user?.id || 'preview');

  useEffect(() => {
    let active = true;
    setFavoritesForAccount(null);
    AsyncStorage.getItem(favoriteStorageKey).then((saved) => {
      if (!active) return;
      let boards = DEFAULT_FAVORITE_BOARDS;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) boards = parsed.filter((key) => COMMUNITY_BOARDS.some((item) => item.key === key));
        } catch (e) { console.warn('Could not read favorite boards', e); }
      }
      setFavoriteBoards(boards);
      setFavoritesForAccount(favoriteStorageKey);
    }).catch((e) => {
      console.warn('Favorite board settings could not be loaded', e);
      if (active) setFavoritesForAccount(favoriteStorageKey);
    });
    return () => { active = false; };
  }, [favoriteStorageKey]);

  useEffect(() => {
    if (favoritesForAccount !== favoriteStorageKey) return;
    AsyncStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteBoards))
      .catch((e) => console.warn('Favorite board settings could not be saved', e));
  }, [favoriteBoards, favoritesForAccount, favoriteStorageKey]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setCloudNotice(friendlyError(error));
      setSession(data?.session || null);
      setAuthReady(true);
    }).catch((e) => {
      if (active) { setCloudNotice(friendlyError(e)); setAuthReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setAuthReady(true); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) return;
    let active = true;
    setCloudLoading(true);
    Promise.all([loadAccount(session.user.id), loadPosts()]).then(([account, remotePosts]) => {
      if (!active) return;
      setProfile(account.profile || {
        onboardingDone: false, nickname: '교환학생', homeUniversity: '', showHomeUniversity: false,
        discoverable: false, intro: '', interests: [], style: [],
      });
      setExchangeInfo(account.exchangeInfo);
      setExchangeInterest(account.exchangeInterest);
      setVerification(account.verification);
      setChecklist(INITIAL_CHECKLIST.map((item) => ({ ...item, done: Boolean(account.checks[item.id]) })));
      setPosts(remotePosts);
      setCloudNotice('');
    }).catch((e) => {
      if (active) setCloudNotice(friendlyError(e));
    }).finally(() => { if (active) setCloudLoading(false); });
    return () => { active = false; };
  }, [session?.user?.id, reloadToken]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !exchangeInfo) { setPeople([]); return; }
    let active = true;
    loadPeople(exchangeInfo).then((users) => { if (active) setPeople(users); })
      .catch((e) => { if (active) Alert.alert('사람찾기 오류', friendlyError(e)); });
    return () => { active = false; };
  }, [session?.user?.id, exchangeInfo?.universityId, exchangeInfo?.semester, exchangeInfo?.countryCode, reloadToken]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !exchangeInfo) {
      if (supabase) { setCheckinAnswer(''); setCheckinSummary([]); }
      return;
    }
    let active = true;
    (async () => {
      try {
        const answer = await loadCheckin(exchangeInfo, session.user.id);
        const summary = answer ? await getCheckinSummary(exchangeInfo) : [];
        if (active) { setCheckinAnswer(answer); setCheckinSummary(summary); }
      } catch (e) { if (active) Alert.alert('체크인 오류', friendlyError(e)); }
    })();
    return () => { active = false; };
  }, [session?.user?.id, exchangeInfo?.universityId, exchangeInfo?.semester, exchangeInfo?.city]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) return;
    let active = true;
    setPostsLoading(true);
    loadPosts(exchangeInfo, communityScope, activeCommunitySemester)
      .then((items) => { if (active) setPosts(items); })
      .catch((e) => { if (active) Alert.alert('게시글 불러오기 실패', friendlyError(e)); })
      .finally(() => { if (active) setPostsLoading(false); });
    return () => { active = false; };
  }, [session?.user?.id, communityScope, activeCommunitySemester, exchangeInfo?.universityId, exchangeInfo?.city, exchangeInfo?.semester]);

  // Shared Supabase database: updates propagate between different devices without Expo tunnels.
  // Postgres Changes notifications carry no author identity; re-fetch only the visible feed.
  useEffect(() => {
    if (!supabase || !session?.user?.id) return;
    let active = true;
    let loading = false;
    let dirty = false;
    async function refreshFeed() {
      if (!active) return;
      if (loading) { dirty = true; return; }
      loading = true;
      try {
        do {
          dirty = false;
          const latest = await loadPosts(exchangeInfo, communityScope, activeCommunitySemester);
          if (active) setPosts(latest);
        } while (active && dirty);
      } catch (e) {
        if (active) console.warn('Could not refresh remote community:', friendlyError(e));
      } finally {
        loading = false;
      }
    }
    const subscription = supabase
      .channel('gyohwanjeom-community-' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, refreshFeed)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, refreshFeed)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refreshFeed();
      });
    return () => {
      active = false;
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id, communityScope, activeCommunitySemester, exchangeInfo?.universityId, exchangeInfo?.city, exchangeInfo?.semester]);

  useEffect(() => { refreshMarket(); }, [session?.user?.id, reloadToken]);

  const goHome = () => setScreen('home');
  const openCommunityBoard = (board = '전체') => {
    setCommunityBoard(board);
    setScreen('community');
  };
  const toggleFavoriteBoard = (board) => {
    if (!COMMUNITY_BOARDS.some((item) => item.key === board)) return;
    setFavoriteBoards((current) => current.includes(board)
      ? current.filter((item) => item !== board)
      : [...current, board]);
  };
  const openCommunityPost = (postId, from = 'community') => {
    setSelectedPostId(postId);
    setPostReturnScreen(from);
    setScreen('postDetail');
  };
  const isVerified = verification?.status === 'verified';
  const askVerify = (from) => { setVerifyReturn(from); setScreen('verify'); };
  const openMarket = () => { refreshMarket(); setScreen('market'); };
  const openRooms = () => { refreshRooms(); setScreen('openChat'); };

  async function refreshCommunity() {
    if (!supabase) return;
    try { setPosts(await loadPosts(exchangeInfo, communityScope, activeCommunitySemester)); } catch (e) { Alert.alert('새로고침 실패', friendlyError(e)); }
  }

  async function refreshPeople() {
    if (!supabase || !exchangeInfo) return;
    try { setPeople(await loadPeople(exchangeInfo)); } catch (e) { Alert.alert('새로고침 실패', friendlyError(e)); }
  }

  async function refreshCheckin() {
    if (!supabase || !checkinAnswer) return;
    try { setCheckinSummary(await getCheckinSummary(exchangeInfo)); } catch (e) { Alert.alert('새로고침 실패', friendlyError(e)); }
  }

  async function saveExchangeChoice(choice) {
    if (supabase) {
      if (choice.exchangeInfo) await cloudSaveExchange(session.user.id, choice.exchangeInfo);
      else await cloudSaveInterest(session.user.id, choice.exchangeInterest);
    }
    setExchangeInfo(choice.exchangeInfo || null);
    setExchangeInterest(choice.exchangeInterest || null);
  }

  async function submitExchange(choice) {
    await saveExchangeChoice(choice);
    goHome();
  }

  async function saveProfileInfo(info) {
    if (supabase) await cloudSaveProfile(session.user.id, info);
    setProfile((prev) => ({ ...prev, ...info }));
  }

  async function submitProfile(info) {
    try { await saveProfileInfo(info); }
    catch (e) { Alert.alert('저장 실패', friendlyError(e)); return; }
    Alert.alert('저장 완료', '프로필이 저장됐어요.');
  }

  async function finishOnboarding(choice) {
    await saveExchangeChoice(choice);
    if (supabase) await cloudCompleteOnboarding(session.user.id);
    setProfile((prev) => ({ ...prev, onboardingDone: true }));
    goHome();
  }

  async function sendUniversityCode(email) {
    if (supabase) await requestUniversityCode(email);
  }

  // Returns the server's result: verified, invalid, expired, too_many, no_code or taken.
  async function checkUniversityCode(email, code) {
    // Preview sends no mail, so it accepts one fixed code.
    const result = supabase ? await confirmUniversityCode(code) : code.trim() === '123456' ? 'verified' : 'invalid';
    if (result === 'verified') setVerification({ status: 'verified', email: email.trim().toLowerCase() });
    return result;
  }

  async function refreshMarket() {
    if (!supabase || !session?.user?.id) return;
    setMarketLoading(true);
    try { setListings(await loadListings()); setMarketError(''); }
    catch (e) { setMarketError(friendlyError(e)); }
    finally { setMarketLoading(false); }
  }

  async function submitListing(listing) {
    if (supabase) {
      await cloudCreateListing(listing);
      await refreshMarket();
    } else {
      const place = exchangeInfo || exchangeInterest || {};
      setListings((prev) => [{ ...listing, id: 'preview' + Date.now(), sellerId: 'me', sellerNickname: profile.nickname, country: place.country || '', countryCode: place.countryCode || '', city: place.city || '', status: 'selling', time: '방금' }, ...prev]);
    }
    setScreen('market');
  }

  async function changeListingStatus(listingId, status) {
    if (supabase) await cloudSetListingStatus(listingId, status);
    setListings((prev) => prev.map((item) => item.id === listingId ? { ...item, status } : item));
  }

  async function refreshChats() {
    if (supabase) setChats(await loadChats(session.user.id));
  }

  async function openListingChat(listing) {
    if (supabase) {
      const id = await cloudStartChat(listing.id);
      const latest = await loadChats(session.user.id);
      setChats(latest);
      setSelectedChat(latest.find((item) => item.id === id));
    } else {
      const chat = chats.find((item) => item.listingId === listing.id)
        || { id: 'chat-' + listing.id, listingId: listing.id, listingTitle: listing.title, otherNickname: listing.sellerNickname, role: '구매 문의' };
      if (!chats.includes(chat)) setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
    }
    setScreen('chat');
  }

  async function refreshRooms() {
    if (!supabase || !session?.user?.id) return;
    setRoomsLoading(true);
    try { setRooms(await loadOpenChatRooms()); setRoomsError(''); }
    catch (e) { setRoomsError(friendlyError(e)); }
    finally { setRoomsLoading(false); }
  }

  async function submitRoom(room) {
    if (supabase) {
      const id = await createOpenChatRoom(room);
      const latest = await loadOpenChatRooms();
      setRooms(latest);
      setSelectedRoom(latest.find((item) => item.id === id));
    } else {
      const place = exchangeInfo || exchangeInterest || {};
      const created = { ...room, id: 'room' + Date.now(), country: place.country || '', countryCode: place.countryCode || '', city: place.city || '', memberCount: 1, isMember: true };
      setRooms((prev) => [created, ...prev]);
      setSelectedRoom(created);
    }
    setScreen('openChatRoom');
  }

  async function enterRoom(room) {
    if (supabase) {
      await joinOpenChatRoom(room.id);
      await refreshRooms();
    } else {
      setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, isMember: true, memberCount: item.memberCount + 1 } : item));
    }
    setSelectedRoom({ ...room, isMember: true });
    setScreen('openChatRoom');
  }

  async function leaveRoom(room) {
    if (supabase) {
      await leaveOpenChatRoom(room.id);
      await refreshRooms();
    } else {
      setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, isMember: false, memberCount: item.memberCount - 1 } : item));
    }
    setScreen('openChat');
  }

  async function fetchRoomMessages(roomId) {
    return supabase ? loadOpenChatMessages(roomId) : previewMessages[roomId] || [];
  }

  async function postRoomMessage(roomId, body) {
    if (supabase) await sendOpenChatMessage(roomId, body);
    else setPreviewMessages((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), { id: String(Date.now()), senderId: 'me', senderNickname: profile.nickname, body }] }));
  }

  async function reportRoomMessage(message, reason) {
    if (!supabase) return;
    await reportOpenChatMessage(message.id, reason);
  }

  async function blockRoomUser(message) {
    if (!supabase || !session?.user?.id) return;
    await blockOpenChatUser(session.user.id, message.senderId, message.senderNickname);
  }

  async function loadRoomBlockList() {
    if (!supabase || !session?.user?.id) return [];
    return loadBlockedOpenChatUsers(session.user.id);
  }

  async function unblockRoomUser(user) {
    if (!supabase || !session?.user?.id) return;
    await unblockOpenChatUser(session.user.id, user.blockedId);
  }

  async function fetchMessages(conversationId) {
    return supabase ? cloudLoadMessages(conversationId) : previewMessages[conversationId] || [];
  }

  async function postMessage(conversationId, body) {
    if (supabase) await cloudSendMessage(conversationId, body);
    else setPreviewMessages((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), { id: String(Date.now()), senderId: 'me', body }] }));
  }

  async function submitPost(post) {
    if (supabase) {
      try {
        await createPost(post, exchangeInfo);
        setPosts(await loadPosts(exchangeInfo, communityScope, activeCommunitySemester));
      } catch (e) { Alert.alert('글 작성 실패', friendlyError(e)); return; }
    } else {
      setPosts((prev) => [{ ...post, id: 'preview' + Date.now(), likes: 0, comments: [], time: '방금' }, ...prev]);
    }
    setScreen('community');
  }

  async function submitComment(text) {
    if (supabase) {
      try { await createComment(selectedPostId, text); setPosts(await loadPosts(exchangeInfo, communityScope, activeCommunitySemester)); }
      catch (e) { Alert.alert('댓글 작성 실패', friendlyError(e)); throw e; }
    } else {
      setPosts((prev) => prev.map((item) =>
        item.id === selectedPostId ? { ...item, comments: [...item.comments, text] } : item));
    }
  }

  function confirmReport(postId) {
    if (!supabase) return;
    Alert.alert('게시글 신고', '신고 사유를 선택해 주세요.', [
      { text: '취소', style: 'cancel' },
      { text: '스팸·광고', onPress: () => submitReport(postId, 'spam') },
      { text: '괴롭힘·혐오', onPress: () => submitReport(postId, 'harassment') },
      { text: '개인정보 노출', onPress: () => submitReport(postId, 'privacy') },
      { text: '기타', onPress: () => submitReport(postId, 'other') },
    ]);
  }

  async function submitReport(postId, reason) {
    try {
      await cloudReportPost(session.user.id, postId, reason);
      Alert.alert('신고 접수', '신고가 저장됐어요. 운영 검토 체계는 정비 중입니다.');
    } catch (e) {
      const duplicate = e?.code === '23505';
      Alert.alert('신고 처리', duplicate ? '이미 신고한 게시글이에요.' : friendlyError(e));
    }
  }

  async function submitCheckin(text) {
    if (supabase) {
      try {
        await saveCheckin(exchangeInfo, session.user.id, text);
        setCheckinSummary(await getCheckinSummary(exchangeInfo));
      } catch (e) { Alert.alert('체크인 저장 실패', friendlyError(e)); return false; }
    }
    setCheckinAnswer(text);
    return true;
  }

  async function toggleCheck(id) {
    const item = checklist.find((i) => i.id === id);
    if (!item) return;
    const next = !item.done;
    if (supabase) {
      try { await saveCheck(session.user.id, id, next); }
      catch (e) { Alert.alert('저장 실패', friendlyError(e)); return; }
    }
    setChecklist((prev) => prev.map((i) => i.id === id ? { ...i, done: next } : i));
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('로그아웃 실패', friendlyError(error));
    else { setPosts([]); setPeople([]); setExchangeInfo(null); setExchangeInterest(null); setVerification(null); setListings([]); setChats([]); setSelectedChat(null); setScreen('home'); }
  }


  if (!started) {
    return (
      <SafeAreaView style={styles.introScreen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.introInner}>
          <View style={styles.introContent}>
            <Image source={require('./assets/logo.png')} style={styles.introLogo} resizeMode="contain" accessibilityLabel="선글라스를 쓴 지구본과 비행기 로고" />
            <Text style={styles.brand}>교환점<Text style={styles.brandDot}>.</Text></Text>
            <Text style={styles.tagline}>낯선 곳에서 추억을 교환하다.</Text>
            <Text style={styles.caption}>교환학생의 사람과 정보를 한곳에서 연결해요.</Text>
          </View>
          <TouchableOpacity style={styles.startButton} onPress={() => setStarted(true)}>
            <Text style={styles.startButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  if (!isCloudConfigured && !previewMode) return <SetupScreen onPreview={() => setPreviewMode(true)} />;
  if (isCloudConfigured && !authReady) {
    return <Screen><View style={styles.emptyState}><ActivityIndicator color={COLORS.accent} /><Text style={styles.emptyBody}>로그인 상태를 확인하는 중...</Text></View></Screen>;
  }
  if (isCloudConfigured && !session) return <AuthScreen />;
  if (isCloudConfigured && cloudLoading) {
    return <Screen><View style={styles.emptyState}><ActivityIndicator color={COLORS.accent} /><Text style={styles.emptyBody}>내 교환 정보를 불러오는 중...</Text></View></Screen>;
  }
  if (isCloudConfigured && cloudNotice) {
    return <Screen><View style={styles.emptyState}><Text style={styles.emptyTitle}>서버 설정을 확인해 주세요</Text><Text style={styles.emptyBody}>{cloudNotice}</Text><PrimaryButton label="다시 불러오기" onPress={() => { setCloudNotice(''); setReloadToken((v) => v + 1); }} /></View></Screen>;
  }

  if (profile.onboardingDone === false) {
    return <OnboardingFlow profile={profile} exchangeInfo={exchangeInfo} exchangeInterest={exchangeInterest} verification={verification} onSendCode={sendUniversityCode} onCheckCode={checkUniversityCode} onSaveProfile={saveProfileInfo} onFinish={finishOnboarding} />;
  }

  if (screen === 'register') {
    return <ExchangeRegistrationScreen initialValue={exchangeInfo} initialInterest={exchangeInterest} onCancel={goHome} onSave={submitExchange} />;
  }
  if (screen === 'verify') {
    return (
      <Screen><TopHeader title="대학 인증" onBack={() => setScreen(verifyReturn)} backLabel="‹ 뒤로" /><ScrollView contentContainerStyle={styles.formContent}>
        <VerificationForm verification={verification} preview={!isCloudConfigured} onSendCode={sendUniversityCode} onCheckCode={checkUniversityCode} onDone={() => setScreen(verifyReturn)} />
      </ScrollView></Screen>
    );
  }
  if (screen === 'openChat') {
    return <OpenChatListScreen rooms={rooms} loading={roomsLoading} error={roomsError} preview={!isCloudConfigured} place={exchangeInfo || exchangeInterest} onRefresh={isCloudConfigured ? refreshRooms : null} onBack={goHome} onCreate={() => setScreen('createOpenChat')} onOpen={(room) => { setSelectedRoom(room); setScreen(room.isMember ? 'openChatRoom' : 'openChatIntro'); }} />;
  }
  if (screen === 'createOpenChat') {
    if (!isVerified) return <VerifyGateScreen title="방 만들기" message="방 목록은 누구나 볼 수 있지만, 만들려면 대학 인증이 필요해요." onBack={() => setScreen('openChat')} onVerify={() => askVerify('createOpenChat')} />;
    return <CreateOpenChatScreen onCancel={() => setScreen('openChat')} onSubmit={submitRoom} />;
  }
  if (screen === 'openChatIntro' && selectedRoom) {
    return <OpenChatIntroScreen room={selectedRoom} verified={isVerified} onVerify={() => askVerify('openChatIntro')} onBack={() => setScreen('openChat')} onEnter={enterRoom} />;
  }
  if (screen === 'openChatRoom' && selectedRoom) {
    return <ChatScreen chat={{ id: selectedRoom.id, otherNickname: selectedRoom.title, listingTitle: roomPlace(selectedRoom) }} userId={session?.user?.id || 'me'} showSender backLabel="‹ 목록" onLoad={fetchRoomMessages} onSend={postRoomMessage} onBack={() => setScreen('openChat')} onLeave={() => leaveRoom(selectedRoom)} onReport={supabase ? reportRoomMessage : undefined} onBlock={supabase ? blockRoomUser : undefined} onLoadBlocked={supabase ? loadRoomBlockList : undefined} onUnblock={supabase ? unblockRoomUser : undefined} />;
  }
  if (screen === 'market') {
    return <MarketScreen listings={listings} loading={marketLoading} error={marketError} preview={!isCloudConfigured} place={exchangeInfo || exchangeInterest} onRefresh={isCloudConfigured ? refreshMarket : null} onBack={goHome} onWrite={() => setScreen('writeListing')} onChats={() => setScreen('chats')} onOpen={(id) => { setSelectedListingId(id); setScreen('listing'); }} />;
  }
  if (screen === 'writeListing') {
    if (!isVerified) return <VerifyGateScreen title="물건 올리기" message="물건은 누구나 구경할 수 있지만, 올리려면 대학 인증이 필요해요." onBack={() => setScreen('market')} onVerify={() => askVerify('writeListing')} />;
    return <WriteListingScreen onCancel={() => setScreen('market')} onSubmit={submitListing} />;
  }
  if (screen === 'listing') {
    const listing = listings.find((item) => item.id === selectedListingId);
    return <ListingDetailScreen listing={listing} isMine={listing?.sellerId === (session?.user?.id || 'me')} verification={verification} onBack={() => setScreen('market')} onChat={openListingChat} onVerify={() => askVerify('listing')} onChangeStatus={changeListingStatus} />;
  }
  if (screen === 'chats') {
    return <ChatListScreen chats={chats} onLoad={refreshChats} onBack={() => setScreen('market')} onOpen={(chat) => { setSelectedChat(chat); setScreen('chat'); }} />;
  }
  if (screen === 'chat' && selectedChat) {
    return <ChatScreen chat={selectedChat} userId={session?.user?.id || 'me'} onLoad={fetchMessages} onSend={postMessage} onBack={() => setScreen('chats')} />;
  }
  if (screen === 'find') {
    return <FindStudentsScreen exchangeInfo={exchangeInfo} onBack={goHome} onRegister={() => setScreen('register')} users={isCloudConfigured ? people : SAMPLE_USERS} preview={!isCloudConfigured} onRefresh={isCloudConfigured ? refreshPeople : null} onOpenProfile={(user) => { setSelectedUser(user); setScreen('profile'); }} />;
  }
  if (screen === 'profile' && selectedUser) {
    return <StudentProfileScreen user={selectedUser} verified={isVerified} onVerify={() => askVerify('profile')} onBack={() => setScreen('find')} />;
  }
  if (screen === 'community') {
    return <CommunityScreen posts={posts} scope={communityScope} onChangeScope={setCommunityScope} exchangeInfo={exchangeInfo} semester={activeCommunitySemester} onChangeSemester={setCommunitySemester} category={communityBoard} onChangeCategory={setCommunityBoard} favorites={favoriteBoards} onToggleFavorite={toggleFavoriteBoard} loading={postsLoading} onRefresh={isCloudConfigured ? refreshCommunity : null} onHome={goHome} onWrite={() => setScreen('writePost')} onOpen={(id) => openCommunityPost(id)} onMy={() => setScreen('my')} onFind={() => setScreen('find')} />;
  }
  if (screen === 'writePost') {
    if (!isVerified) return <VerifyGateScreen title="글쓰기" message="글은 누구나 읽을 수 있지만, 쓰려면 대학 인증이 필요해요." onBack={() => setScreen('community')} onVerify={() => askVerify('writePost')} />;
    return <WritePostScreen initialCategory={communityBoard} onCancel={() => setScreen('community')} onSubmit={submitPost} />;
  }
  if (screen === 'postDetail') {
    const post = posts.find((item) => item.id === selectedPostId);
    return <PostDetailScreen post={post} verified={isVerified} onVerify={() => askVerify('postDetail')} onBack={() => setScreen(postReturnScreen)} onAddComment={submitComment} onReport={isCloudConfigured && isVerified ? confirmReport : null} />;
  }
  if (screen === 'checkin') {
    return <CheckInScreen verified={isVerified} onVerify={() => askVerify('checkin')} exchangeInfo={exchangeInfo} answer={checkinAnswer} onAnswer={submitCheckin} responses={isCloudConfigured ? checkinSummary : CHECKIN_RESPONSES} preview={!isCloudConfigured} onRefresh={isCloudConfigured ? refreshCheckin : null} onBack={goHome} />;
  }
  if (screen === 'checklist') {
    return <ChecklistScreen verified={isVerified} onVerify={() => askVerify('checklist')} items={checklist} onBack={goHome} onToggle={toggleCheck} />;
  }
  if (screen === 'my') {
    return <MyScreen profile={profile} exchangeInfo={exchangeInfo} exchangeInterest={exchangeInterest} verification={verification} onVerify={() => askVerify('my')} onSave={submitProfile} onSignOut={isCloudConfigured ? signOut : null} onBack={goHome} onEditExchange={() => setScreen('register')} onFind={() => setScreen('find')} onCommunity={() => setScreen('community')} />;
  }

  return (
    <HomeScreen
      exchangeInfo={exchangeInfo}
      exchangeInterest={exchangeInterest}
      listings={listings}
      onMarket={openMarket}
      onOpenChat={openRooms}
      profile={profile}
      onRegister={() => setScreen('register')}
      onFind={() => setScreen('find')}
      onCommunity={() => openCommunityBoard('전체')}
      onFavoriteBoard={openCommunityBoard}
      onToggleFavorite={toggleFavoriteBoard}
      favorites={favoriteBoards}
      onOpenPost={(id) => openCommunityPost(id, 'home')}
      communitySemester={activeCommunitySemester}
      onCheckin={() => setScreen('checkin')}
      onChecklist={() => setScreen('checklist')}
      onMy={() => setScreen('my')}
      posts={posts}
      preview={!isCloudConfigured}
    />
  );
}

function ExchangeRegistrationScreen({ initialValue, initialInterest, onCancel, onSave, onboarding = false }) {
  const initialSemester = parseSemester(initialValue?.semester);
  const initialSchool = initialValue || (initialInterest?.universityId ? initialInterest : null);
  const [mode, setMode] = useState(initialInterest && !initialValue ? 'interest' : 'going');
  const [region, setRegion] = useState(initialInterest?.region || '');
  const [startText, setStartText] = useState(displayDate(initialValue?.startDate));
  const [endText, setEndText] = useState(displayDate(initialValue?.endDate));
  const [coursesText, setCoursesText] = useState((initialValue?.courses || []).join(', '));
  const [courseStatus, setCourseStatus] = useState(initialValue?.courseStatus || 'planned');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showRequired, setShowRequired] = useState(false);
  const formScrollRef = useRef(null);
  const [year, setYear] = useState(initialSemester.year);
  const [term, setTerm] = useState(initialSemester.term);
  const [schoolQuery, setSchoolQuery] = useState(initialSchool?.universityName || '');
  const [selectedUniversity, setSelectedUniversity] = useState(initialSchool?.universityId ? {
    id: initialSchool.universityId, name: initialSchool.universityName, country: initialSchool.country,
    countryCode: initialSchool.countryCode, city: initialSchool.city, latitude: initialSchool.latitude ?? null, longitude: initialSchool.longitude ?? null,
  } : null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const query = schoolQuery.trim();
    if (selectedUniversity && query === selectedUniversity.name) {
      setResults([]); setSearching(false); setSearchError(''); return;
    }
    if (query.length < 2) {
      setResults([]); setSearching(false); setSearchError(''); return;
    }
    let active = true;
    const controller = new AbortController();
    setSearching(true);
    setSearchError('');
    setResults([]);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUniversities(query, controller.signal);
        if (!active) return;
        setResults(found);
        setSearchError(found.length === 0 ? '검색 결과가 없어요. 다른 표기나 영문 이름으로 검색해 보세요.' : '');
      } catch (error) {
        if (!active || error?.name === 'AbortError') return;
        setResults([]);
        setSearchError('검색 연결에 실패했어요. 인터넷을 확인하고 다시 검색해 주세요.');
      } finally {
        if (active) setSearching(false);
      }
    }, 450);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [schoolQuery, selectedUniversity]);

  const semester = `${year}년 ${term}`;
  const canSave = mode === 'going' ? Boolean(selectedUniversity && year && term) : Boolean(selectedUniversity || region.trim());

  const missingRequired = showRequired && !canSave;

  async function save() {
    if (!canSave) {
      setShowRequired(true);
      formScrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSaveError('');
    let choice;
    if (mode === 'going') {
      const startDate = startText.trim() ? toIsoDate(startText) : null;
      const endDate = endText.trim() ? toIsoDate(endText) : null;
      if ((startText.trim() && !startDate) || (endText.trim() && !endDate)) { setSaveError('날짜는 2027.01.20 형식으로 입력해 주세요.'); return; }
      if (startDate && endDate && endDate < startDate) { setSaveError('종료일이 시작일보다 빠를 수 없어요.'); return; }
      choice = { exchangeInfo: { universityId: selectedUniversity.id, universityName: selectedUniversity.name, country: selectedUniversity.country, countryCode: selectedUniversity.countryCode, city: selectedUniversity.city, latitude: selectedUniversity.latitude, longitude: selectedUniversity.longitude, semester, startDate, endDate, courses: splitTags(coursesText), courseStatus } };
    } else {
      choice = { exchangeInterest: { region: region.trim(), universityId: selectedUniversity?.id || '', universityName: selectedUniversity?.name || '', country: selectedUniversity?.country || '', countryCode: selectedUniversity?.countryCode || '', city: selectedUniversity?.city || '' } };
    }
    setSaving(true);
    try { await onSave(choice); }
    catch (e) { setSaveError(friendlyError(e)); setSaving(false); }
  }

  return (
    <Screen>
      <ScrollView ref={formScrollRef} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        {onboarding
          ? <StepHeader step={3} onBack={onCancel} title="파견 정보 등록" body="어느 나라, 어느 대학으로 가는지 알려 주세요. 아직 정해지지 않았다면 관심 지역이나 대학을 골라 주세요." />
          : <TopHeader title="파견 정보 등록" onBack={onCancel} backLabel="취소" />}
        <View style={[styles.filterRowWrap, { marginBottom: 14 }]}>
          <ChoiceChip label="파견 예정 · 파견 중" active={mode === 'going'} onPress={() => setMode('going')} />
          <ChoiceChip label="아직 미정" active={mode === 'interest'} onPress={() => setMode('interest')} />
        </View>
        {mode === 'interest' && <Field label="관심 지역">
          <View style={[styles.filterRowWrap, { marginTop: 0, marginBottom: 10 }]}>{INTEREST_REGIONS.map((item) => <ChoiceChip key={item} label={item} active={region === item} onPress={() => setRegion(item)} />)}</View>
          <TextInput style={[styles.input, missingRequired && styles.inputRequired]} value={region} onChangeText={setRegion} placeholder="직접 입력 (예: 덴마크, 코펜하겐)" placeholderTextColor="#A1A7A2" />
          {missingRequired && <Text style={[styles.inlineError, { marginBottom: 14 }]}>필수 입력이에요. 관심 지역을 선택하거나 입력해 주세요.</Text>}
        </Field>}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{mode === 'going' ? '파견 대학 (나라는 대학에서 자동으로 채워져요)' : '관심 대학 (선택)'}</Text>
          <TextInput style={[styles.input, missingRequired && mode === 'going' && styles.inputRequired]} value={schoolQuery} onChangeText={(text) => { setSchoolQuery(text); if (!selectedUniversity || text !== selectedUniversity.name) setSelectedUniversity(null); }} placeholder="예: 코펜하겐대학교 / University of Copenhagen" placeholderTextColor="#A1A7A2" autoCapitalize="none" autoCorrect={false} />
          {missingRequired && mode === 'going' && <Text style={styles.inlineError}>필수 입력이에요. 파견 대학을 검색해서 선택해 주세요.</Text>}
          {searching && <View style={styles.searchStatusRow}><ActivityIndicator size="small" color={COLORS.accent} /><Text style={styles.searchStatusText}>전 세계 대학 검색 중...</Text></View>}
          {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}
          {results.length > 0 && <View style={styles.searchResultsBox}>{results.map((item) => (
            <TouchableOpacity key={item.id} style={styles.searchResultItem} onPress={() => { setSelectedUniversity(item); setSchoolQuery(item.name); setResults([]); }}>
              <Text style={styles.searchResultName}>{item.koreanLabel || item.name}</Text>
              {!!item.koreanLabel && item.koreanLabel !== item.name && <Text style={styles.searchResultLocation}>{item.name}</Text>}
              <Text style={styles.searchResultLocation}>{[item.city, item.country].filter(Boolean).join(', ')}</Text>
            </TouchableOpacity>
          ))}</View>}
          {selectedUniversity && <View style={styles.selectedSchoolCard}>
            <Text style={styles.selectedSchoolLabel}>선택된 대학</Text>
            <Text style={styles.selectedSchoolName}>{selectedUniversity.name}</Text>
            <Text style={styles.selectedSchoolLocation}>{[selectedUniversity.city, selectedUniversity.country].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.selectedSchoolId}>ROR ID · {selectedUniversity.id}</Text>
          </View>}
        </View>
        {mode === 'going' && <><View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>파견 학기</Text>
          <Text style={styles.helperText}>연도와 학기를 각각 위아래로 돌려 선택하세요.</Text>
          <View style={styles.wheelRow}>
            <WheelPicker items={YEARS} value={year} onChange={setYear} formatItem={(item) => `${item}년`} />
            <WheelPicker items={TERMS} value={term} onChange={setTerm} formatItem={(item) => item} />
          </View>
          <Text style={styles.semesterPreview}>선택: {semester}</Text>
        </View>
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}><Field label="시작일 (선택)"><TextInput style={styles.input} value={startText} onChangeText={setStartText} placeholder="2027.01.20" placeholderTextColor="#A1A7A2" /></Field></View>
          <View style={{ flex: 1 }}><Field label="종료일 (선택)"><TextInput style={styles.input} value={endText} onChangeText={setEndText} placeholder="2027.06.30" placeholderTextColor="#A1A7A2" /></Field></View>
        </View>
        <Field label="수강 과목 (쉼표로 구분, 선택)"><TextInput style={styles.textAreaSmall} multiline value={coursesText} onChangeText={setCoursesText} placeholder="예: Danish Culture, Marketing" placeholderTextColor="#A1A7A2" /></Field>
        <View style={[styles.filterRowWrap, { marginTop: 12 }]}>
          {Object.entries(COURSE_STATUS).map(([key, label]) => <ChoiceChip key={key} label={label} active={courseStatus === key} onPress={() => setCourseStatus(key)} />)}
        </View></>}
        {!!saveError && <Text style={styles.inlineError}>{saveError}</Text>}
        <PrimaryButton disabled={saving} dimmed={!canSave} label={saving ? '저장하는 중...' : onboarding ? '완료하고 시작하기' : '저장하기'} onPress={save} />
      </ScrollView>
    </Screen>
  );
}

function WheelPicker({ items, value, onChange, formatItem }) {
  const scrollRef = useRef(null);
  const currentIndex = Math.max(0, items.findIndex((item) => item === value));
  useEffect(() => { requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: currentIndex * WHEEL_ITEM_HEIGHT, animated: false })); }, []);
  const handleEnd = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(offset / WHEEL_ITEM_HEIGHT)));
    onChange(items[index]);
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
  };
  return (
    <View style={styles.wheelContainer}>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView ref={scrollRef} style={styles.wheel} contentContainerStyle={styles.wheelContent} showsVerticalScrollIndicator={false} snapToInterval={WHEEL_ITEM_HEIGHT} decelerationRate="fast" onMomentumScrollEnd={handleEnd} onScrollEndDrag={handleEnd}>
        {items.map((item) => <View key={String(item)} style={styles.wheelItem}><Text style={[styles.wheelText, item === value && styles.wheelTextSelected]}>{formatItem(item)}</Text></View>)}
      </ScrollView>
    </View>
  );
}

function FindStudentsScreen({ exchangeInfo, users, preview, onRefresh, onBack, onRegister, onOpenProfile }) {
  const [filter, setFilter] = useState('same');
  if (!exchangeInfo) return <Screen><TopHeader title="교환학생 찾기" onBack={onBack} /><View style={styles.emptyState}><Text style={styles.emptyTitle}>먼저 파견 정보를 등록해 주세요</Text><Text style={styles.emptyBody}>대학과 학기를 등록하면 같은 파견지의 사람부터 주변 교환학생까지 찾을 수 있어요.</Text><PrimaryButton label="파견 정보 등록하기" onPress={onRegister} /></View></Screen>;

  const members = users.filter((user) =>
    user.semester === exchangeInfo.semester &&
    (user.countryCode ? user.countryCode === exchangeInfo.countryCode : user.country === exchangeInfo.country));
  const enriched = members.map((user) => ({
    ...user,
    distanceKm: preview && exchangeInfo.city === 'Copenhagen'
      ? user.distanceKm
      : distanceKm(exchangeInfo.latitude, exchangeInfo.longitude, user.latitude, user.longitude),
  }));
  const groups = {
    same: enriched.filter((user) => user.universityId === exchangeInfo.universityId),
    city: enriched.filter((user) => user.city?.trim().toLowerCase() === exchangeInfo.city?.trim().toLowerCase()),
    nearby: enriched.filter((user) => user.distanceKm != null && user.distanceKm <= 30),
    country: enriched,
  };
  const visibleUsers = groups[filter];
  const tabs = [
    ['same', '같은 대학 ' + groups.same.length],
    ['city', '같은 도시 ' + groups.city.length],
    ['nearby', '내 주변 ' + groups.nearby.length],
    ['country', '같은 국가 ' + groups.country.length],
  ];

  return (
    <Screen>
      <TopHeader title="교환학생 찾기" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.findContent} showsVerticalScrollIndicator={false}>
        <View style={styles.matchSummary}><Text style={styles.matchSummaryTitle}>{exchangeInfo.universityName}</Text><Text style={styles.matchSummaryMeta}>{exchangeInfo.city} · {exchangeInfo.semester}</Text></View>
        {preview && <Text style={styles.prototypeNote}>미리보기: 아래 프로필은 실제 가입자가 아닌 예시예요.</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {tabs.map(([key, label]) => <TouchableOpacity key={key} style={[styles.filterChip, filter === key && styles.filterChipActive]} onPress={() => setFilter(key)}>
            <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>{label}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        {groups.same.length < 3 && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>같은 학교 사람을 더 찾아볼까요?</Text><Text style={styles.noticeBody}>도시·근처 대학·같은 국가로 범위를 넓혀 보세요.</Text></View>}
        {filter === 'nearby' && exchangeInfo.latitude == null && !preview &&
          <View style={styles.noticeBox}><Text style={styles.noticeTitle}>거리 정보를 계산할 수 없어요</Text><Text style={styles.noticeBody}>파견 정보에서 대학을 다시 검색·선택하면 대학 좌표가 저장돼요. 휴대폰 위치는 사용하지 않아요.</Text></View>}
        <View style={styles.sectionRow}><Text style={styles.resultCount}>{visibleUsers.length}명 찾았어요</Text>{onRefresh && <TouchableOpacity onPress={onRefresh}><Text style={styles.moreText}>새로고침</Text></TouchableOpacity>}</View>
        {visibleUsers.map((user) => <StudentCard key={user.id} user={user} reason={getMatchReason(user, exchangeInfo)} onPress={() => onOpenProfile(user)} />)}
        {visibleUsers.length === 0 && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>아직 조건에 맞는 사람이 없어요</Text><Text style={styles.noticeBody}>다른 범위로 검색해 보세요. 실제 사용자가 가입하면 이 목록에 나타나요.</Text></View>}
        <Text style={styles.prototypeNote}>사람찾기는 사용자가 공개를 허용한 정보만 보여줘요. 익명 게시글 작성자는 공개되지 않습니다.</Text>
      </ScrollView>
    </Screen>
  );
}

function StudentCard({ user, reason, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.studentCard} onPress={onPress}>
      <View style={styles.studentInfo}>
        <View style={styles.inlineRow}><Text style={styles.studentName}>{user.nickname}</Text><Text style={styles.reasonBadge}>{reason}</Text></View>
        {user.showHomeUniversity && <Text style={styles.homeUniversity}>한국 대학 · {user.homeUniversity}</Text>}
        <Text style={styles.studentIntro}>{user.intro}</Text>
        <View style={styles.miniInterestWrap}>{user.interests.slice(0, 3).map((item) => <Text key={item} style={styles.miniInterest}>#{item}</Text>)}</View>
        <Text style={styles.studentMeta}>{user.universityName} · {user.city} · {user.semester}</Text>
      </View>
      <Text style={styles.studentArrow}>›</Text>
    </TouchableOpacity>
  );
}

function StudentProfileScreen({ user, verified, onVerify, onBack }) {
  return (
    <Screen>
      <TopHeader title="프로필" onBack={onBack} backLabel="‹ 찾기" />
      <ScrollView contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          <Text style={styles.profileName}>{user.nickname}</Text>
          <Text style={styles.profilePrivacy}>사람찾기용 공개 프로필</Text>
          <Text style={styles.profileIntro}>{user.intro}</Text>
        </View>
        <ProfileSection title="관심사"><TagList items={user.interests} filled /></ProfileSection>
        <ProfileSection title="여행 · 교환생활 스타일"><TagList items={user.style} /></ProfileSection>
        <ProfileSection title="교환 정보">
          <ProfileRow label="파견 대학" value={user.universityName} />
          <ProfileRow label="파견 지역" value={[user.city, user.country].filter(Boolean).join(', ')} />
          <ProfileRow label="파견 학기" value={user.semester} />
          {user.showHomeUniversity && <ProfileRow label="한국 대학" value={user.homeUniversity} />}
        </ProfileSection>
        <View style={styles.privacyNotice}><Text style={styles.privacyNoticeTitle}>커뮤니티에서는 공개 프로필이 표시되지 않아요</Text><Text style={styles.privacyNoticeBody}>일반 이용자에게는 게시글 작성자와 이 프로필의 연결 정보가 제공되지 않아요.</Text></View>
        {!verified && <VerifyNotice message="프로필은 누구나 볼 수 있지만, 친구추가와 메시지는 대학 인증 후에 할 수 있어요." onVerify={onVerify} />}
        {verified && <View style={styles.profileActionRow}>
          <TouchableOpacity style={styles.profileActionButton} onPress={() => Alert.alert("친구추가 준비 중", "실제 회원 간 친구 요청 기능은 다음 단계에서 연결할게요.")}><Text style={styles.profileActionText}>친구추가</Text></TouchableOpacity>
          <TouchableOpacity style={styles.profileMessageButton} onPress={() => Alert.alert("메시지 준비 중", "아직 채팅 서버가 연결되지 않았어요.")}><Text style={styles.profileMessageButtonText}>메시지</Text></TouchableOpacity>
        </View>}
      </ScrollView>
    </Screen>
  );
}

function CommunityScreen({
  posts, scope, onChangeScope, exchangeInfo, semester, onChangeSemester,
  loading, onRefresh, onHome, onWrite, onOpen, onMy, onFind,
  category, onChangeCategory, favorites, onToggleFavorite,
}) {
  const [sortBy, setSortBy] = useState('new');
  const visible = category === '전체' ? posts : posts.filter((post) => post.category === category);
  const ordered = sortBy === 'replies'
    ? [...visible].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0))
    : visible;

  return (
    <Screen>
      <View style={styles.communityHeader}>
        <View><Text style={styles.miniBrand}>교환점.</Text><Text style={styles.pageTitle}>게시판</Text></View>
        <TouchableOpacity accessibilityRole="button" style={styles.writeButton} onPress={onWrite}>
          <Text style={styles.writeButtonText}>＋ 글쓰기</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.communityContent} showsVerticalScrollIndicator={false}>
        <CommunityScopeSelector
          scope={scope} onScopeChange={onChangeScope}
          exchangeInfo={exchangeInfo} semester={semester} onSemesterChange={onChangeSemester}
        />
        <FavoriteBoardSection favorites={favorites} onToggle={onToggleFavorite} onOpen={onChangeCategory} />
        <View style={styles.boardBrowseHeader}>
          <Text style={styles.communityBrowseTitle}>게시판 둘러보기</Text>
          {onRefresh && <TouchableOpacity accessibilityRole="button" onPress={onRefresh}><Text style={styles.moreText}>↻ 새로고침</Text></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['전체', ...COMMUNITY_BOARDS.map((board) => board.key)].map((item) => (
            <TouchableOpacity key={item} accessibilityRole="button"
              accessibilityState={{ selected: category === item }}
              onPress={() => onChangeCategory(item)}
              style={[styles.filterChip, category === item && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, category === item && styles.filterChipTextActive]}>
                {item === '전체' ? '전체' : boardTitle(item)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.boardBrowseHeader}>
          <View>
            <Text style={styles.communityBrowseTitle}>{category === '전체' ? '전체 게시글' : boardTitle(category)}</Text>
            <Text style={styles.communityBrowseSub}>{ordered.length}개의 글 · {semester}</Text>
          </View>
          <View style={styles.communitySortActions}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setSortBy('new')}>
              <Text style={[styles.communitySortText, sortBy === 'new' && styles.communitySortTextActive]}>최신순</Text>
            </TouchableOpacity>
            <Text style={styles.communitySortText}> · </Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setSortBy('replies')}>
              <Text style={[styles.communitySortText, sortBy === 'replies' && styles.communitySortTextActive]}>댓글순</Text>
            </TouchableOpacity>
          </View>
        </View>
        {loading && <ActivityIndicator style={{ marginTop: 18 }} color={COLORS.accent} />}
        {!loading && ordered.length === 0 && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>이 조건에 맞는 게시글이 없어요</Text>
            <Text style={styles.noticeBody}>지역이나 학기를 넓혀 보거나 첫 질문을 작성해 보세요.</Text>
          </View>
        )}
        {ordered.length > 0 && (
          <View style={styles.communityFeedCard}>
            {ordered.map((post, i) => (
              <CompactCommunityPost key={post.id} post={post} last={i === ordered.length - 1} onOpen={onOpen} />
            ))}
          </View>
        )}
        <Text style={styles.prototypeNote}>익명 게시글에는 다른 사람의 프로필이 표시되지 않아요. 신고 기록은 운영 검토용으로 따로 저장돼요.</Text>
      </ScrollView>
      <BottomNav active="community" onHome={onHome} onFind={onFind} onCommunity={() => {}} onMy={onMy} />
    </Screen>
  );
}

function WritePostScreen({ onCancel, onSubmit, initialCategory = '질문' }) {
  const [category, setCategory] = useState(COMMUNITY_BOARDS.some((item) => item.key === initialCategory) ? initialCategory : '질문');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <Screen><ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled"><TopHeader title="익명 글쓰기" onBack={onCancel} backLabel="취소" />
      <Text style={styles.fieldLabel}>카테고리</Text><View style={[styles.filterRow, { flexWrap: 'wrap' }]}>{['질문', '생활', '수업', '여행메이트'].map((item) => <TouchableOpacity key={item} style={[styles.filterChip, category === item && styles.filterChipActive]} onPress={() => setCategory(item)}><Text style={[styles.filterChipText, category === item && styles.filterChipTextActive]}>{item}</Text></TouchableOpacity>)}</View>
      <Text style={styles.fieldLabel}>제목</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="제목을 입력하세요" placeholderTextColor="#A1A7A2" />
      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>내용</Text><TextInput style={styles.textArea} value={body} onChangeText={setBody} placeholder="익명으로 자유롭게 물어보세요" placeholderTextColor="#A1A7A2" multiline textAlignVertical="top" />
      <View style={styles.privacyNotice}><Text style={styles.privacyNoticeTitle}>이 글은 사람찾기 프로필과 연결되지 않아요</Text><Text style={styles.privacyNoticeBody}>닉네임, 한국 대학, 파견 프로필은 게시글에 노출되지 않습니다.</Text></View>
      <PrimaryButton disabled={!title.trim() || !body.trim()} label="익명으로 올리기" onPress={() => onSubmit({ category, title: title.trim(), body: body.trim(), meta: '내 파견 커뮤니티' })} />
    </ScrollView></Screen>
  );
}

function PostDetailScreen({ post, verified, onVerify, onBack, onAddComment, onReport }) {
  const [comment, setComment] = useState('');
  if (!post) return <Screen><TopHeader title="게시글" onBack={onBack} /><View style={styles.emptyState}><Text>게시글을 찾을 수 없어요.</Text></View></Screen>;
  return (
    <Screen><TopHeader title="게시글" onBack={onBack} backLabel="‹ 커뮤니티" /><ScrollView contentContainerStyle={styles.postDetailContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.postCategory}>{post.category}</Text><Text style={styles.postDetailTitle}>{post.title}</Text><Text style={styles.postDetailMeta}>익명 · {post.meta} · {post.time}</Text><Text style={styles.postDetailBody}>{post.body}</Text>
      {onReport && <TouchableOpacity onPress={() => onReport(post.id)} style={{ alignSelf: "flex-end", paddingVertical: 12 }}><Text style={styles.moreText}>게시글 신고</Text></TouchableOpacity>}
      <Text style={styles.commentHeader}>댓글 {post.comments.length}</Text>
      {post.comments.map((item, index) => <View key={`${item}-${index}`} style={styles.commentCard}><Text style={styles.commentAuthor}>익명{index + 1}</Text><Text style={styles.commentText}>{item}</Text></View>)}
      {!verified && <View style={{ marginTop: 12 }}><VerifyNotice message="댓글은 대학 인증 후에 쓸 수 있어요." onVerify={onVerify} /></View>}
      {verified && <View style={styles.commentInputRow}><TextInput style={styles.commentInput} value={comment} onChangeText={setComment} placeholder="익명 댓글 입력" placeholderTextColor="#A1A7A2" /><TouchableOpacity style={styles.commentSend} onPress={async () => { if (!comment.trim()) return; try { await onAddComment(comment.trim()); setComment(''); } catch (_e) { /* caller displays error */ } }}><Text style={styles.commentSendText}>등록</Text></TouchableOpacity></View>}
    </ScrollView></Screen>
  );
}

function CheckInScreen({ verified, onVerify, exchangeInfo, answer, responses = [], preview = false, onRefresh, onAnswer, onBack }) {
  const [draft, setDraft] = useState(answer);
  const [sending, setSending] = useState(false);
  const revealed = Boolean(answer);
  const responseCount = responses.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const submit = async () => {
    if (!draft.trim() || !exchangeInfo || sending) return;
    setSending(true);
    try { await onAnswer(draft.trim()); } finally { setSending(false); }
  };
  return (
    <Screen><TopHeader title="체크인 방" onBack={onBack} /><ScrollView contentContainerStyle={styles.checkinContent}>
      <View style={styles.roomCard}><Text style={styles.cardEyebrowDark}>MY EXCHANGE ROOM</Text>
        <Text style={styles.roomTitle}>{exchangeInfo ? exchangeInfo.city + ' · ' + exchangeInfo.semester : '파견 정보를 등록하면 방이 만들어져요'}</Text>
        <Text style={styles.roomMeta}>{preview ? '가상 데이터 미리보기' : '현재 체크인 답변 ' + responseCount + '개'} · 익명 체크인</Text>
      </View>
      <Text style={styles.checkinLabel}>이번 체크인</Text>
      <Text style={styles.checkinQuestion}>✈️ 출국 예정일이 언제예요?</Text>
      <Text style={styles.checkinGuide}>답변은 다른 참여자에게 익명으로 공개돼요. 답해야 다른 답변도 볼 수 있어요.</Text>
      {!revealed && !verified && <VerifyNotice message="체크인 방은 누구나 둘러볼 수 있지만, 답변하고 다른 사람의 답을 보려면 대학 인증이 필요해요." onVerify={onVerify} />}
      {!revealed && verified && <>
        <TextInput style={styles.input} value={draft} maxLength={40} onChangeText={setDraft} placeholder="예: 1월 22일" placeholderTextColor="#A1A7A2" />
        <PrimaryButton disabled={!draft.trim() || !exchangeInfo || sending} label={sending ? '저장하는 중...' : '답변하고 다른 사람 답 보기'} onPress={submit} />
      </>}
      {revealed && <>
        <View style={styles.myAnswer}><Text style={styles.myAnswerLabel}>내 답변</Text><Text style={styles.myAnswerText}>{answer}</Text></View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>다른 사람들의 답변</Text>{onRefresh && <TouchableOpacity onPress={onRefresh}><Text style={styles.moreText}>새로고침</Text></TouchableOpacity>}</View>
        {responses.length === 0 && <Text style={styles.emptyBody}>아직 집계된 답변이 없어요.</Text>}
        {responses.map((item) => <View key={item.answer} style={styles.answerRow}>
          <Text style={styles.answerLabel}>{item.answer}</Text>
          <View style={styles.answerBarTrack}><View style={[styles.answerBarFill, { width: (responseCount ? Number(item.count) / responseCount * 100 : 0) + '%' }]} /></View>
          <Text style={styles.answerCount}>{item.count}명</Text>
        </View>)}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>익명 대화</Text>
        {preview ? CHECKIN_MESSAGES.map((message, index) => <View key={message} style={styles.roomMessage}><Text style={styles.commentAuthor}>예시 익명{index + 1}</Text><Text style={styles.commentText}>{message}</Text></View>)
          : <Text style={styles.emptyBody}>익명 단체 채팅은 아직 연결되지 않았어요. 다음 개발 단계에서 추가할게요.</Text>}
      </>}
    </ScrollView></Screen>
  );
}

function ChecklistScreen({ verified, onVerify, items, onBack, onToggle }) {
  const done = items.filter((item) => item.done).length;
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <Screen><TopHeader title="준비 체크" onBack={onBack} /><ScrollView contentContainerStyle={styles.checklistContent}>
      {!verified && <VerifyNotice message="준비 목록은 누구나 볼 수 있지만, 체크해서 저장하려면 대학 인증이 필요해요." onVerify={onVerify} />}
      <View style={styles.progressCard}><Text style={styles.progressTitle}>출국 준비 {done}/{items.length}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(done / items.length) * 100}%` }]} /></View></View>
      {groups.map((group) => <View key={group}><Text style={styles.checkGroup}>{group}</Text>{items.filter((item) => item.group === group).map((item) => <TouchableOpacity key={item.id} disabled={!verified} style={styles.checkItem} onPress={() => onToggle(item.id)}><View style={[styles.checkBox, item.done && styles.checkBoxDone]}><Text style={styles.checkMark}>{item.done ? '✓' : ''}</Text></View><Text style={[styles.checkText, item.done && styles.checkTextDone]}>{item.title}</Text></TouchableOpacity>)}</View>)}
    </ScrollView></Screen>
  );
}

function MyScreen({ profile, exchangeInfo, exchangeInterest, verification, onVerify, onSave, onSignOut, onBack, onEditExchange, onFind, onCommunity }) {
  const [draft, setDraft] = useState({ ...profile, interestsText: profile.interests.join(', '), styleText: profile.style.join(', ') });
  const save = () => onSave({ nickname: draft.nickname.trim() || '익명 교환학생', homeUniversity: draft.homeUniversity.trim(), showHomeUniversity: draft.showHomeUniversity, discoverable: draft.discoverable !== false, intro: draft.intro.trim(), interests: splitTags(draft.interestsText), style: splitTags(draft.styleText) });
  return (
    <Screen><TopHeader title="마이" onBack={onBack} /><ScrollView contentContainerStyle={styles.myContent} keyboardShouldPersistTaps="handled">
      <View style={styles.mySection}><Text style={styles.profileSectionTitle}>사람찾기 공개 프로필</Text><Text style={styles.helperText}>이 정보는 사람찾기에서만 사용돼요. 익명 커뮤니티와 연결되지 않습니다.</Text>
        <Field label="닉네임"><TextInput style={styles.input} value={draft.nickname} onChangeText={(v) => setDraft({ ...draft, nickname: v })} /></Field>
        <Field label="한줄소개"><TextInput style={styles.textAreaSmall} multiline value={draft.intro} onChangeText={(v) => setDraft({ ...draft, intro: v })} /></Field>
        <Field label="관심사 (쉼표로 구분)"><TextInput style={styles.input} value={draft.interestsText} onChangeText={(v) => setDraft({ ...draft, interestsText: v })} /></Field>
        <Field label="여행/생활 스타일 (쉼표로 구분)"><TextInput style={styles.input} value={draft.styleText} onChangeText={(v) => setDraft({ ...draft, styleText: v })} /></Field>
      </View>
      <View style={styles.mySection}><Text style={styles.profileSectionTitle}>사람찾기 참여 설정</Text><Text style={styles.helperText}>기본은 비공개예요. 직접 켜야 다른 사람의 검색 결과에 나타나고, 대학 인증을 완료한 학생만 나타나요.</Text><TouchableOpacity style={styles.toggleRow} onPress={() => setDraft({ ...draft, discoverable: draft.discoverable === false })}><Text style={styles.toggleLabel}>다른 학생에게 내 프로필 공개</Text><View style={[styles.toggle, draft.discoverable !== false && styles.toggleOn]}><View style={[styles.toggleDot, draft.discoverable !== false && styles.toggleDotOn]} /></View></TouchableOpacity></View>
       <View style={styles.mySection}><Text style={styles.profileSectionTitle}>한국 대학 공개</Text><TextInput style={styles.input} value={draft.homeUniversity} onChangeText={(v) => setDraft({ ...draft, homeUniversity: v })} placeholder="한국 소속 대학" placeholderTextColor="#A1A7A2" />
        <TouchableOpacity style={styles.toggleRow} onPress={() => setDraft({ ...draft, showHomeUniversity: !draft.showHomeUniversity })}><Text style={styles.toggleLabel}>사람찾기에서 한국 대학 공개</Text><View style={[styles.toggle, draft.showHomeUniversity && styles.toggleOn]}><View style={[styles.toggleDot, draft.showHomeUniversity && styles.toggleDotOn]} /></View></TouchableOpacity>
      </View>
      <PrimaryButton label="프로필 저장" onPress={save} />
      <View style={styles.mySection}><Text style={styles.profileSectionTitle}>대학 인증</Text><Text style={styles.helperText}>{verificationCopy(verification).body}</Text><ProfileRow label="상태" value={verificationCopy(verification).label} />{verification?.status !== 'verified' && <SecondaryButton label="인증하러 가기" onPress={onVerify} />}</View>
      <View style={styles.mySection}><Text style={styles.profileSectionTitle}>내 파견 정보</Text>{exchangeInfo ? <><ProfileRow label="대학" value={exchangeInfo.universityName} /><ProfileRow label="학기" value={exchangeInfo.semester} /><SecondaryButton label="파견 정보 수정" onPress={onEditExchange} /></> : exchangeInterest ? <><ProfileRow label="관심" value={interestLabel(exchangeInterest)} /><SecondaryButton label="파견 정보 수정" onPress={onEditExchange} /></> : <SecondaryButton label="파견 정보 등록" onPress={onEditExchange} />}</View>
      <View style={styles.privacyNotice}><Text style={styles.privacyNoticeTitle}>프로필 사진 · SNS 없음</Text><Text style={styles.privacyNoticeBody}>교환점은 프로필 사진이나 SNS 계정을 수집하지 않아요.</Text></View>
      {onSignOut && <SecondaryButton label="로그아웃" onPress={onSignOut} />}
    </ScrollView><BottomNav active="my" onHome={onBack} onFind={onFind} onCommunity={onCommunity} onMy={() => {}} /></Screen>
  );
}

function HomeScreen({ exchangeInfo, exchangeInterest, listings, onMarket, onOpenChat, profile, posts, preview, onRegister, onFind, onCommunity, onFavoriteBoard, onToggleFavorite, favorites, onOpenPost, communitySemester, onCheckin, onChecklist, onMy }) {
  return (
    <Screen><ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.miniBrand}>교환점.</Text><Text style={styles.hello}>{profile.nickname}님, 안녕하세요 👋</Text></View></View>
      <MyExchangeCard exchangeInfo={exchangeInfo} exchangeInterest={exchangeInterest} onRegister={onRegister} />
      <Text style={styles.communityHomeTerm}>교환학생 게시판 · {communitySemester}</Text>
      <HomeCommunitySection
        favorites={favorites} onToggleFavorite={onToggleFavorite}
        onOpenBoard={onFavoriteBoard} posts={posts}
        onOpenPost={onOpenPost} onAllPosts={onCommunity} preview={preview}
      />
      <TouchableOpacity activeOpacity={0.85} style={styles.marketBlock} onPress={onMarket}>
        <View style={styles.sectionRow}><Text style={styles.marketBlockTitle}>중고거래</Text><Text style={styles.moreTextOnBlock}>전체보기 ›</Text></View>
        <Text style={styles.marketBlockBody}>그 나라에서 필요한 물건, 교환학생끼리 사고팔아요.</Text>
        {listings.slice(0, 2).map((item) => <View key={item.id} style={styles.marketPreviewRow}><Text numberOfLines={1} style={styles.marketPreviewTitle}>{item.title}</Text><Text style={styles.marketPreviewPrice}>{item.priceText}</Text></View>)}
        {listings.length === 0 && <Text style={styles.marketPreviewEmpty}>아직 올라온 물건이 없어요. 첫 물건을 올려 보세요.</Text>}
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>교환점에서 뭐 할까?</Text>
      <View style={styles.grid}>
        <QuickCard icon="✈️" title="교환학생 찾기" subtitle="학교 · 도시 · 주변 · 국가" onPress={onFind} />
        <QuickCard icon="💬" title="익명 커뮤니티" subtitle="질문하고 정보 나누기" onPress={onCommunity} />
        <QuickCard icon="◉" title="체크인 방" subtitle="답하고 같은 기수 현황 보기" onPress={onCheckin} />
        <QuickCard icon="✓" title="준비 체크" subtitle="비자 · 서류 · 출국 준비" onPress={onChecklist} />
        <QuickCard wide icon="#" title="오픈채팅" subtitle="나라 · 도시 · 관심사별 채팅방 둘러보기" onPress={onOpenChat} />
      </View>

    </ScrollView><BottomNav active="home" onHome={() => {}} onFind={onFind} onCommunity={onCommunity} onMy={onMy} /></Screen>
  );
}

function MyExchangeCard({ exchangeInfo, exchangeInterest, onRegister }) {
  if (exchangeInfo) {
    const period = exchangeInfo.startDate || exchangeInfo.endDate
      ? `${displayDate(exchangeInfo.startDate) || '미정'} ~ ${displayDate(exchangeInfo.endDate) || '미정'}`
      : exchangeInfo.semester;
    return (
      <View style={styles.destinationCard}>
        <Text style={styles.cardEyebrow}>MY EXCHANGE</Text>
        <Text style={styles.destinationTitle}>{exchangeInfo.universityName}</Text>
        <Text style={styles.destinationBody}>{[exchangeInfo.country, exchangeInfo.city].filter(Boolean).join(' · ')}</Text>
        <View style={{ marginTop: 14 }}>
          <ProfileRow label="학기" value={exchangeInfo.semester} />
          <ProfileRow label="기간" value={period} />
          <ProfileRow label={COURSE_STATUS[exchangeInfo.courseStatus] || '수강 과목'} value={exchangeInfo.courses?.length ? exchangeInfo.courses.join(', ') : '아직 입력하지 않았어요'} />
        </View>
        <TouchableOpacity style={styles.registerButton} onPress={onRegister}><Text style={styles.registerButtonText}>파견 정보 수정하기</Text></TouchableOpacity>
      </View>
    );
  }
  if (exchangeInterest) {
    return (
      <View style={styles.destinationCard}>
        <Text style={styles.cardEyebrow}>MY INTEREST</Text>
        <Text style={styles.destinationTitle}>{interestLabel(exchangeInterest)}</Text>
        <Text style={styles.destinationBody}>아직 파견이 정해지지 않았어요. 정해지면 파견 정보를 등록해 주세요.</Text>
        <TouchableOpacity style={styles.registerButton} onPress={onRegister}><Text style={styles.registerButtonText}>파견 정보 등록하기</Text></TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.destinationCard}>
      <Text style={styles.cardEyebrow}>MY EXCHANGE</Text>
      <Text style={styles.destinationTitle}>아직 파견 정보를 등록하지 않았어요</Text>
      <Text style={styles.destinationBody}>대학과 학기를 등록하면 같은 파견지의 사람과 정보를 바로 찾을 수 있어요.</Text>
      <TouchableOpacity style={styles.registerButton} onPress={onRegister}><Text style={styles.registerButtonText}>파견 정보 등록하기</Text></TouchableOpacity>
    </View>
  );
}

function OnboardingFlow({ profile, exchangeInfo, exchangeInterest, verification, onSendCode, onCheckCode, onSaveProfile, onFinish }) {
  const [step, setStep] = useState(1);
  const [reachedLastStep, setReachedLastStep] = useState(false);
  const [draft, setDraft] = useState({ ...profile, interestsText: profile.interests.join(', '), styleText: profile.style.join(', ') });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const preview = !isCloudConfigured;

  async function saveProfileStep() {
    if (!draft.nickname.trim()) { setError('닉네임을 입력해 주세요.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSaveProfile({ nickname: draft.nickname.trim(), homeUniversity: draft.homeUniversity.trim(), showHomeUniversity: draft.showHomeUniversity, discoverable: draft.discoverable, intro: draft.intro.trim(), interests: splitTags(draft.interestsText), style: splitTags(draft.styleText) });
      setReachedLastStep(true);
      setStep(3);
    } catch (e) { setError(friendlyError(e)); }
    finally { setSaving(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      {step === 1 && (
        <Screen><ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <StepHeader step={1} title="대학 정보 등록" body="재학 중인 대학의 학교 메일로 인증해 주세요. 지금 하지 않아도 둘러볼 수 있지만, 글쓰기·오픈채팅·중고거래 같은 기능을 쓰려면 인증이 필요해요." />
          <Field label="한국 소속 대학"><TextInput style={styles.input} value={draft.homeUniversity} onChangeText={(v) => setDraft({ ...draft, homeUniversity: v })} placeholder="예: 국민대학교" placeholderTextColor="#A1A7A2" /></Field>
          <VerificationForm verification={verification} preview={preview} onSendCode={onSendCode} onCheckCode={onCheckCode} onDone={() => setStep(2)} />
          <TouchableOpacity style={styles.skipButton} onPress={() => setStep(2)}><Text style={styles.skipButtonText}>{verification?.status === 'verified' ? '다음으로' : '나중에 하기'}</Text></TouchableOpacity>
        </ScrollView></Screen>
      )}
      {step === 2 && (
        <Screen><ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <StepHeader step={2} onBack={() => setStep(1)} title="내 프로필 작성" body="나중에 마이에서 언제든 수정할 수 있어요." />
          <View style={styles.mySection}>
            <Field label="닉네임"><TextInput style={styles.input} value={draft.nickname} onChangeText={(v) => setDraft({ ...draft, nickname: v })} /></Field>
            <Field label="한줄소개"><TextInput style={styles.textAreaSmall} multiline value={draft.intro} onChangeText={(v) => setDraft({ ...draft, intro: v })} placeholder="예: 여행이랑 카페 좋아해요." placeholderTextColor="#A1A7A2" /></Field>
            <Field label="관심사 (쉼표로 구분)"><TextInput style={styles.input} value={draft.interestsText} onChangeText={(v) => setDraft({ ...draft, interestsText: v })} placeholder="예: 여행, 카페, 맛집" placeholderTextColor="#A1A7A2" /></Field>
            <Field label="여행/생활 스타일 (쉼표로 구분)"><TextInput style={styles.input} value={draft.styleText} onChangeText={(v) => setDraft({ ...draft, styleText: v })} placeholder="예: 계획형, 주말여행 자주" placeholderTextColor="#A1A7A2" /></Field>
          </View>
          {!!error && <Text style={styles.inlineError}>{error}</Text>}
          <PrimaryButton disabled={saving} label={saving ? '저장하는 중...' : '다음으로'} onPress={saveProfileStep} />
        </ScrollView></Screen>
      )}
      {/* Stays mounted while going back so what was typed in step 3 is kept. */}
      {reachedLastStep && (
        <View style={{ flex: 1, display: step === 3 ? 'flex' : 'none' }}>
          <ExchangeRegistrationScreen onboarding initialValue={exchangeInfo} initialInterest={exchangeInterest} onCancel={() => setStep(2)} onSave={onFinish} />
        </View>
      )}
    </View>
  );
}

function StepHeader({ step, title, body, onBack }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepTopRow}>
        {onBack ? <TouchableOpacity onPress={onBack}><Text style={styles.stepBack}>‹ 이전</Text></TouchableOpacity> : <View />}
        <Text style={styles.stepCount}>{step} / 3단계</Text>
      </View>
      <View style={styles.stepTrack}><View style={[styles.stepFill, { width: `${(step / 3) * 100}%` }]} /></View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  );
}

function verificationCopy(verification) {
  if (verification?.status === 'verified') return { label: '인증 완료', body: '대학 인증이 완료됐어요. 모든 기능을 사용할 수 있어요.' };
  return { label: '미인증', body: '재학 중인 대학의 학교 메일로 인증하면 글쓰기·오픈채팅·중고거래 같은 기능을 쓸 수 있어요.' };
}

const CODE_RESULT_MESSAGES = {
  invalid: '인증 코드가 맞지 않아요. 다시 확인해 주세요.',
  expired: '인증 코드가 만료됐어요. 메일을 다시 받아 주세요.',
  too_many: '여러 번 틀렸어요. 메일을 다시 받아 주세요.',
  no_code: '먼저 인증 메일을 받아 주세요.',
  taken: '이미 다른 계정에서 인증한 메일이에요.',
};

function VerificationForm({ verification, preview, onSendCode, onCheckCode, onDone }) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const copy = verificationCopy(verification);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    if (!isUniversityEmail(email)) { setError('재학 중인 대학의 학교 메일을 입력해 주세요. (예: name@kookmin.ac.kr)'); return; }
    setError('');
    setBusy(true);
    try {
      await onSendCode(email);
      setSentTo(email.trim().toLowerCase());
      setCode('');
      setCooldown(60);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function confirm() {
    setError('');
    setBusy(true);
    try {
      const result = await onCheckCode(sentTo, code);
      if (result === 'verified') onDone?.();
      else setError(CODE_RESULT_MESSAGES[result] || '인증하지 못했어요. 다시 시도해 주세요.');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  return (
    <View style={[styles.mySection, { marginTop: 16 }]}>
      <Text style={styles.profileSectionTitle}>학교 메일 인증</Text>
      <Text style={styles.helperText}>{copy.body}</Text>
      {verification?.status === 'verified' ? <>
        <ProfileRow label="상태" value={copy.label} />
        {!!verification.email && <ProfileRow label="학교 메일" value={verification.email} />}
      </> : <>
        <Text style={styles.fieldLabel}>학교 메일</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@kookmin.ac.kr" placeholderTextColor="#A1A7A2" />
        <TouchableOpacity disabled={busy || cooldown > 0 || !email.trim()} style={[styles.secondaryButton, (busy || cooldown > 0 || !email.trim()) && styles.saveButtonDisabled]} onPress={send}><Text style={styles.secondaryButtonText}>{cooldown > 0 ? `다시 보내기 (${cooldown}초)` : sentTo ? '인증 메일 다시 보내기' : '인증 메일 보내기'}</Text></TouchableOpacity>
        {!!sentTo && <>
          <Text style={styles.selectedFile}>{sentTo}(으)로 6자리 코드를 보냈어요. 10분 안에 입력해 주세요.</Text>
          <TextInput style={[styles.input, { marginTop: 10 }]} value={code} maxLength={6} onChangeText={setCode} keyboardType="number-pad" placeholder="인증 코드 6자리" placeholderTextColor="#A1A7A2" />
          <TouchableOpacity disabled={busy || code.trim().length !== 6} style={[styles.formSubmit, (busy || code.trim().length !== 6) && styles.saveButtonDisabled]} onPress={confirm}><Text style={styles.formSubmitText}>{busy ? '확인하는 중...' : '인증하기'}</Text></TouchableOpacity>
        </>}
        {!!error && <Text style={styles.searchError}>{error}</Text>}
      </>}
      {preview && <Text style={styles.prototypeNote}>미리보기에서는 메일을 보내지 않아요. 인증 코드에 123456을 입력하세요.</Text>}
    </View>
  );
}

function MarketScreen({ listings, loading, error, preview, place, onRefresh, onBack, onWrite, onChats, onOpen }) {
  const countryCode = place?.countryCode || '';
  const [scope, setScope] = useState(countryCode ? 'country' : 'all');
  const [category, setCategory] = useState('전체');
  const visible = listings.filter((item) => (scope === 'all' || item.countryCode === countryCode) && (category === '전체' || item.category === category));
  return (
    <Screen><TopHeader title="중고거래" onBack={onBack} /><ScrollView contentContainerStyle={styles.communityContent} showsVerticalScrollIndicator={false}>
      {preview && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>가상 데이터 미리보기</Text><Text style={styles.noticeBody}>아래 물건은 화면 확인용 샘플이에요.</Text></View>}
      <View style={styles.marketActions}>
        <TouchableOpacity style={styles.writeButton} onPress={onWrite}><Text style={styles.writeButtonText}>물건 올리기</Text></TouchableOpacity>
        <TouchableOpacity style={styles.filterChip} onPress={onChats}><Text style={styles.filterChipText}>내 대화</Text></TouchableOpacity>
        {onRefresh && <TouchableOpacity style={styles.filterChip} onPress={onRefresh}><Text style={styles.filterChipText}>↻ 새로고침</Text></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {!!countryCode && <ChoiceChip label={place.country || '내 나라'} active={scope === 'country'} onPress={() => setScope('country')} />}
        <ChoiceChip label="전체 나라" active={scope === 'all'} onPress={() => setScope('all')} />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['전체', ...MARKET_CATEGORIES].map((item) => <ChoiceChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>
      {!!error && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>중고거래를 불러오지 못했어요</Text><Text style={styles.noticeBody}>{error}</Text></View>}
      {loading && <ActivityIndicator style={{ marginBottom: 16 }} color={COLORS.accent} />}
      {!error && !loading && visible.length === 0 && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>아직 올라온 물건이 없어요</Text><Text style={styles.noticeBody}>다른 나라를 보거나 첫 물건을 올려 보세요.</Text></View>}
      {visible.map((item) => <TouchableOpacity key={item.id} style={styles.communityPost} onPress={() => onOpen(item.id)}>
        <View style={styles.inlineRow}><Text style={styles.postCategory}>{item.category}</Text>{item.status !== 'selling' && <Text style={styles.reasonBadge}>{LISTING_STATUS[item.status]}</Text>}<Text style={styles.postTime}>{item.time}</Text></View>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.listingPrice}>{item.priceText}</Text>
        <Text style={styles.postMeta}>{[item.sellerNickname, item.city, item.country].filter(Boolean).join(' · ')}</Text>
      </TouchableOpacity>)}
    </ScrollView></Screen>
  );
}

function WriteListingScreen({ onCancel, onSubmit }) {
  const [title, setTitle] = useState('');
  const [priceText, setPriceText] = useState('');
  const [category, setCategory] = useState(MARKET_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canSave = title.trim() && priceText.trim() && !saving;

  async function submit() {
    setError('');
    setSaving(true);
    try { await onSubmit({ title: title.trim(), priceText: priceText.trim(), category, description: description.trim() }); }
    catch (e) { setError(friendlyError(e)); setSaving(false); }
  }

  return (
    <Screen><TopHeader title="물건 올리기" onBack={onCancel} backLabel="취소" /><ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
      <Field label="물건 이름"><TextInput style={styles.input} value={title} maxLength={80} onChangeText={setTitle} placeholder="예: 이케아 책상 스탠드" placeholderTextColor="#A1A7A2" /></Field>
      <Field label="가격"><TextInput style={styles.input} value={priceText} maxLength={30} onChangeText={setPriceText} placeholder="예: 80 DKK, 20유로, 무료나눔" placeholderTextColor="#A1A7A2" /></Field>
      <Field label="카테고리"><View style={styles.filterRowWrap}>{MARKET_CATEGORIES.map((item) => <ChoiceChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</View></Field>
      <Field label="설명"><TextInput style={styles.textArea} multiline maxLength={2000} value={description} onChangeText={setDescription} placeholder="상태, 거래 장소, 가능한 시간을 적어 주세요." placeholderTextColor="#A1A7A2" /></Field>
      <Text style={styles.helperText}>나라와 도시는 내 파견 정보에서 자동으로 표시돼요.</Text>
      {!!error && <Text style={styles.inlineError}>{error}</Text>}
      <PrimaryButton disabled={!canSave} label={saving ? '올리는 중...' : '올리기'} onPress={submit} />
    </ScrollView></Screen>
  );
}

function ListingDetailScreen({ listing, isMine, verification, onBack, onChat, onVerify, onChangeStatus }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!listing) return <Screen><TopHeader title="중고거래" onBack={onBack} backLabel="‹ 목록" /><View style={styles.emptyState}><Text style={styles.emptyTitle}>물건을 찾을 수 없어요</Text></View></Screen>;

  async function run(action) {
    setError('');
    setBusy(true);
    try { await action(); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  const verified = verification?.status === 'verified';
  return (
    <Screen><TopHeader title="중고거래" onBack={onBack} backLabel="‹ 목록" /><ScrollView contentContainerStyle={styles.postDetailContent}>
      <View style={styles.mySection}>
        <View style={styles.inlineRow}><Text style={styles.postCategory}>{listing.category}</Text><Text style={styles.reasonBadge}>{LISTING_STATUS[listing.status]}</Text><Text style={styles.postTime}>{listing.time}</Text></View>
        <Text style={styles.listingDetailTitle}>{listing.title}</Text>
        <Text style={styles.listingDetailPrice}>{listing.priceText}</Text>
        <Text style={styles.postMeta}>{[listing.sellerNickname, listing.city, listing.country].filter(Boolean).join(' · ')}</Text>
        {!!listing.description && <Text style={styles.listingDescription}>{listing.description}</Text>}
      </View>
      {isMine ? (
        <View style={styles.mySection}>
          <Text style={styles.profileSectionTitle}>판매 상태 바꾸기</Text>
          <View style={styles.filterRowWrap}>{Object.entries(LISTING_STATUS).map(([key, label]) => <ChoiceChip key={key} label={label} active={listing.status === key} onPress={() => run(() => onChangeStatus(listing.id, key))} />)}</View>
        </View>
      ) : verified ? (
        <PrimaryButton disabled={busy || listing.status === 'sold'} label={listing.status === 'sold' ? '판매 완료된 물건이에요' : busy ? '대화 여는 중...' : '판매자와 대화하기'} onPress={() => run(() => onChat(listing))} />
      ) : (
        <View style={styles.mySection}>
          <Text style={styles.profileSectionTitle}>대학 인증 후 대화할 수 있어요</Text>
          <Text style={styles.helperText}>{verificationCopy(verification).body}</Text>
          <TouchableOpacity style={styles.formSubmit} onPress={onVerify}><Text style={styles.formSubmitText}>대학 인증하러 가기</Text></TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={styles.inlineError}>{error}</Text>}
    </ScrollView></Screen>
  );
}

function ChatListScreen({ chats, onLoad, onBack, onOpen }) {
  const [error, setError] = useState('');
  useEffect(() => { onLoad().catch((e) => setError(friendlyError(e))); }, []);
  return (
    <Screen><TopHeader title="내 대화" onBack={onBack} backLabel="‹ 목록" /><ScrollView contentContainerStyle={styles.postDetailContent}>
      {!!error && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>대화를 불러오지 못했어요</Text><Text style={styles.noticeBody}>{error}</Text></View>}
      {!error && chats.length === 0 && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>아직 대화가 없어요</Text><Text style={styles.noticeBody}>마음에 드는 물건에서 판매자에게 말을 걸어 보세요.</Text></View>}
      {chats.map((chat) => <TouchableOpacity key={chat.id} style={styles.communityPost} onPress={() => onOpen(chat)}>
        <Text style={styles.postCategory}>{chat.role}</Text>
        <Text style={styles.postTitle}>{chat.listingTitle}</Text>
        <Text style={styles.postMeta}>{chat.otherNickname}</Text>
      </TouchableOpacity>)}
    </ScrollView></Screen>
  );
}

function ChatScreen({ chat, userId, onLoad, onSend, onBack, onLeave, onReport, onBlock, onLoadBlocked, onUnblock, showSender = false, backLabel = '‹ 대화' }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [moderationTarget, setModerationTarget] = useState(null);
  const [showBlockList, setShowBlockList] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [moderationNotice, setModerationNotice] = useState('');
  const scrollRef = useRef(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  async function refresh() {
    try { setMessages(await onLoadRef.current(chat.id)); setError(''); }
    catch (e) { setError(friendlyError(e)); }
  }

  useEffect(() => {
    setModerationTarget(null);
    setShowBlockList(false);
    setModerationNotice('');
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [chat.id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try { await onSend(chat.id, body); setText(''); await refresh(); }
    catch (e) { setError(friendlyError(e)); }
    finally { setSending(false); }
  }

  async function openBlockedUsers() {
    setModerationTarget(null);
    setShowBlockList(true);
    try {
      setBlockedUsers(await onLoadBlocked());
    } catch (e) {
      setShowBlockList(false);
      setError(friendlyError(e));
    }
  }

  async function reportMessage(message, reason) {
    await onReport(message, reason);
    setModerationNotice('신고가 접수됐어요.');
  }

  async function blockMessage(message) {
    await onBlock(message);
    await refresh();
    setModerationNotice('사용자를 차단했어요. 차단 목록에서 해제할 수 있어요.');
  }

  async function unblockMessage(user) {
    await onUnblock(user);
    setBlockedUsers(await onLoadBlocked());
    await refresh();
    setModerationNotice('차단을 해제했어요.');
  }

  return (
    <Screen><TopHeader title={chat.otherNickname} onBack={onBack} backLabel={backLabel} />
      {!!chat.listingTitle && <Text style={styles.chatListing} numberOfLines={1}>{chat.listingTitle}</Text>}
      {onLeave && <TouchableOpacity style={styles.chatLeave} onPress={() => onLeave().catch((e) => setError(friendlyError(e)))}><Text style={styles.chatLeaveText}>방 나가기</Text></TouchableOpacity>}
      {onLoadBlocked && <TouchableOpacity style={styles.chatLeave} onPress={openBlockedUsers}><Text style={styles.chatLeaveText}>차단 목록 관리</Text></TouchableOpacity>}
      {!!moderationNotice && <Text style={[styles.chatLeaveText, { marginHorizontal: 20, marginVertical: 6 }]}>{moderationNotice}</Text>}}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chatContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && <Text style={styles.emptyBody}>첫 메시지를 보내 보세요.</Text>}
        {messages.map((message) => <View key={message.id} style={[styles.chatBubble, message.senderId === userId && styles.chatBubbleMine]}>{showSender && message.senderId !== userId && <Text style={styles.chatSender}>{message.senderNickname}</Text>}<Text style={[styles.chatText, message.senderId === userId && styles.chatTextMine]}>{message.body}</Text>{showSender && onReport && message.senderId !== userId && <TouchableOpacity accessibilityRole="button" accessibilityLabel="이 메시지 신고 또는 사용자 차단" style={styles.chatSafetyAction} onPress={() => { setModerationNotice(''); setShowBlockList(false); setModerationTarget(message); }}><Text style={styles.chatSafetyActionText}>신고 · 차단</Text></TouchableOpacity>}</View>)}
      </ScrollView>
      {!!error && <Text style={[styles.inlineError, { marginHorizontal: 20 }]}>{error}</Text>}
      <View style={styles.chatInputRow}>
        <TextInput style={styles.commentInput} value={text} maxLength={1000} onChangeText={setText} placeholder="메시지 입력" placeholderTextColor="#A1A7A2" onSubmitEditing={send} />
        <TouchableOpacity disabled={sending || !text.trim()} style={[styles.commentSend, (sending || !text.trim()) && styles.saveButtonDisabled]} onPress={send}><Text style={styles.commentSendText}>전송</Text></TouchableOpacity>
      </View>
      {onReport && <ChatSafetyPanel
        mode={showBlockList ? 'blocks' : moderationTarget ? 'message' : null}
        message={moderationTarget}
        blockedUsers={blockedUsers}
        onClose={() => { setShowBlockList(false); setModerationTarget(null); }}
        onReport={reportMessage}
        onBlock={blockMessage}
        onUnblock={unblockMessage}
      />}
    </Screen>
  );
}

function roomPlace(room) {
  return [room.city, room.country].filter(Boolean).join(' · ') || '지역 무관';
}

function OpenChatListScreen({ rooms, loading, error, preview, place, onRefresh, onBack, onCreate, onOpen }) {
  const countryCode = place?.countryCode || '';
  const [scope, setScope] = useState(countryCode ? 'country' : 'all');
  const visible = rooms.filter((room) => scope === 'all' || room.countryCode === countryCode);
  return (
    <Screen><TopHeader title="오픈채팅" onBack={onBack} /><ScrollView contentContainerStyle={styles.communityContent} showsVerticalScrollIndicator={false}>
      {preview && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>가상 데이터 미리보기</Text><Text style={styles.noticeBody}>아래 방은 화면 확인용 샘플이에요.</Text></View>}
      <View style={styles.marketActions}>
        <TouchableOpacity style={styles.writeButton} onPress={onCreate}><Text style={styles.writeButtonText}>방 만들기</Text></TouchableOpacity>
        {onRefresh && <TouchableOpacity style={styles.filterChip} onPress={onRefresh}><Text style={styles.filterChipText}>↻ 새로고침</Text></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {!!countryCode && <ChoiceChip label={place.country || '내 나라'} active={scope === 'country'} onPress={() => setScope('country')} />}
        <ChoiceChip label="전체 나라" active={scope === 'all'} onPress={() => setScope('all')} />
      </ScrollView>
      {!!error && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>방 목록을 불러오지 못했어요</Text><Text style={styles.noticeBody}>{error}</Text></View>}
      {loading && <ActivityIndicator style={{ marginBottom: 16 }} color={COLORS.accent} />}
      {!error && !loading && visible.length === 0 && <View style={styles.noticeBox}><Text style={styles.noticeTitle}>아직 만들어진 방이 없어요</Text><Text style={styles.noticeBody}>다른 나라를 보거나 첫 방을 만들어 보세요.</Text></View>}
      {visible.map((room) => <TouchableOpacity key={room.id} style={styles.communityPost} onPress={() => onOpen(room)}>
        <View style={styles.inlineRow}><Text style={styles.postCategory}>{roomPlace(room)}</Text>{room.isMember && <Text style={styles.reasonBadge}>입장 중</Text>}</View>
        <Text style={styles.postTitle}>{room.title}</Text>
        {!!room.description && <Text numberOfLines={2} style={styles.postBody}>{room.description}</Text>}
        <Text style={styles.postMeta}>{room.memberCount}명 참여 중</Text>
      </TouchableOpacity>)}
    </ScrollView></Screen>
  );
}

function OpenChatIntroScreen({ room, verified, onVerify, onBack, onEnter }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function enter() {
    setError('');
    setBusy(true);
    try { await onEnter(room); }
    catch (e) { setError(friendlyError(e)); setBusy(false); }
  }

  return (
    <Screen><TopHeader title="오픈채팅" onBack={onBack} backLabel="‹ 목록" /><ScrollView contentContainerStyle={styles.postDetailContent}>
      <View style={styles.mySection}>
        <Text style={styles.postCategory}>{roomPlace(room)}</Text>
        <Text style={styles.listingDetailTitle}>{room.title}</Text>
        {!!room.description && <Text style={styles.listingDescription}>{room.description}</Text>}
        <Text style={styles.postMeta}>{room.memberCount}명 참여 중</Text>
      </View>
      {verified
        ? <PrimaryButton disabled={busy} label={busy ? '입장하는 중...' : '입장하기'} onPress={enter} />
        : <VerifyNotice message="방 목록은 누구나 볼 수 있지만, 입장해서 대화하려면 대학 인증이 필요해요." onVerify={onVerify} />}
      {!!error && <Text style={styles.inlineError}>{error}</Text>}
      {verified && <Text style={styles.prototypeNote}>이 방에서는 내 닉네임이 다른 참여자에게 표시돼요.</Text>}
    </ScrollView></Screen>
  );
}

function CreateOpenChatScreen({ onCancel, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setSaving(true);
    try { await onSubmit({ title: title.trim(), description: description.trim() }); }
    catch (e) { setError(friendlyError(e)); setSaving(false); }
  }

  return (
    <Screen><TopHeader title="방 만들기" onBack={onCancel} backLabel="취소" /><ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
      <Field label="방 이름"><TextInput style={styles.input} value={title} maxLength={40} onChangeText={setTitle} placeholder="예: 코펜하겐 교환학생 모여라" placeholderTextColor="#A1A7A2" /></Field>
      <Field label="소개 (선택)"><TextInput style={styles.textAreaSmall} multiline maxLength={200} value={description} onChangeText={setDescription} placeholder="어떤 이야기를 나누는 방인가요?" placeholderTextColor="#A1A7A2" /></Field>
      <Text style={[styles.helperText, { marginTop: 10 }]}>나라와 도시는 내 파견 정보에서 자동으로 표시돼요.</Text>
      {!!error && <Text style={styles.inlineError}>{error}</Text>}
      <PrimaryButton disabled={title.trim().length < 2 || saving} label={saving ? '만드는 중...' : '만들고 입장하기'} onPress={submit} />
    </ScrollView></Screen>
  );
}

function VerifyNotice({ message, onVerify }) {
  return (
    <View style={styles.mySection}>
      <Text style={styles.profileSectionTitle}>대학 인증이 필요해요</Text>
      <Text style={styles.helperText}>{message}</Text>
      <TouchableOpacity style={styles.formSubmit} onPress={onVerify}><Text style={styles.formSubmitText}>대학 인증하러 가기</Text></TouchableOpacity>
    </View>
  );
}

function VerifyGateScreen({ title, message, onBack, onVerify }) {
  return (
    <Screen><TopHeader title={title} onBack={onBack} backLabel="‹ 목록" /><ScrollView contentContainerStyle={styles.formContent}>
      <VerifyNotice message={message} onVerify={onVerify} />
    </ScrollView></Screen>
  );
}

function ChoiceChip({ label, active, onPress }) { return <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></TouchableOpacity>; }

function Screen({ children }) { return <SafeAreaView style={styles.screen}><StatusBar barStyle="light-content" />{children}</SafeAreaView>; }
function TopHeader({ title, onBack, backLabel = '‹ 홈' }) { return <View style={styles.findHeader}><TouchableOpacity onPress={onBack}><Text style={styles.cancelText}>{backLabel}</Text></TouchableOpacity><Text style={styles.formTitle}>{title}</Text><View style={{ width: 48 }} /></View>; }
function PrimaryButton({ label, onPress, disabled = false, dimmed = false }) { return <TouchableOpacity disabled={disabled} style={[styles.saveButton, (disabled || dimmed) && styles.saveButtonDisabled]} onPress={onPress}><Text style={styles.saveButtonText}>{label}</Text></TouchableOpacity>; }
function SecondaryButton({ label, onPress }) { return <TouchableOpacity style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryButtonText}>{label}</Text></TouchableOpacity>; }
function Field({ label, children }) { return <View style={{ marginTop: 14 }}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>; }
function ProfileSection({ title, children }) { return <View style={styles.profileSection}><Text style={styles.profileSectionTitle}>{title}</Text>{children}</View>; }
function TagList({ items, filled = false }) { return <View style={styles.interestWrap}>{items.map((item) => <View key={item} style={filled ? styles.interestChip : styles.styleChip}><Text style={filled ? styles.interestChipText : styles.styleChipText}>{item}</Text></View>)}</View>; }
function ProfileRow({ label, value }) { return <View style={styles.profileRow}><Text style={styles.profileRowLabel}>{label}</Text><Text style={styles.profileRowValue}>{value}</Text></View>; }
function QuickCard({ icon, title, subtitle, onPress, wide = false }) { return <TouchableOpacity activeOpacity={0.82} style={[styles.quickCard, wide && styles.quickCardWide]} onPress={onPress}><View style={styles.quickIconWrap}><Text style={styles.quickIcon}>{icon}</Text></View><Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text></TouchableOpacity>; }
function BottomNav({ active, onHome, onFind, onCommunity, onMy }) { return <View style={styles.bottomNav}><NavItem label="홈" icon="⌂" active={active === 'home'} onPress={onHome} /><NavItem label="찾기" icon="⌕" active={active === 'find'} onPress={onFind} /><NavItem label="커뮤니티" icon="◫" active={active === 'community'} onPress={onCommunity} /><NavItem label="마이" icon="○" active={active === 'my'} onPress={onMy} /></View>; }
function NavItem({ label, icon, active, onPress }) { return <TouchableOpacity style={styles.navItem} onPress={onPress}><Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text></TouchableOpacity>; }

function interestLabel(interest) {
  return [interest.region, interest.universityName].filter(Boolean).join(' · ');
}

function displayDate(iso) {
  return iso ? iso.replace(/-/g, '.') : '';
}

function toIsoDate(text) {
  const match = text.trim().match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function parseSemester(value) { const match = typeof value === 'string' ? value.match(/^(\d{4})년\s(.+)$/) : null; const parsedYear = Number(match?.[1]); const parsedTerm = match?.[2]; return { year: YEARS.includes(parsedYear) ? parsedYear : 2027, term: TERMS.includes(parsedTerm) ? parsedTerm : '1학기' }; }
function getMatchReason(user, exchangeInfo) { if (user.universityId === exchangeInfo.universityId) return '같은 대학'; if (user.city?.toLowerCase() === exchangeInfo.city?.toLowerCase()) return '같은 도시'; if (user.distanceKm != null && user.distanceKm <= 30) return '약 ' + Math.round(user.distanceKm) + 'km'; return '같은 국가'; }
function splitTags(value) { return value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8); }

const styles = StyleSheet.create({
  introScreen: { flex: 1, backgroundColor: COLORS.background },
  introInner: { flex: 1, paddingHorizontal: 28, paddingBottom: 40 },
  introLogo: { width: 300, height: 215, marginBottom: 8 },
  brandDot: { color: COLORS.accent },
  introContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 46, fontWeight: '800', color: COLORS.text, letterSpacing: -1.5, marginTop: 6 },
  tagline: { marginTop: 16, fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  caption: { marginTop: 10, fontSize: 14, lineHeight: 21, color: COLORS.subtext, textAlign: 'center' },
  startButton: { height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 18 },
  startButtonText: { color: COLORS.onAccent, fontSize: 17, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 112 },
  header: { marginBottom: 22 },
  miniBrand: { fontSize: 15, fontWeight: '800', color: COLORS.accent, marginBottom: 5 },
  hello: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
  destinationCard: { padding: 22, marginBottom: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 24 },
  cardEyebrow: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  cardEyebrowDark: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
  destinationTitle: { color: COLORS.text, fontSize: 21, fontWeight: '800', lineHeight: 29 },
  destinationBody: { color: COLORS.subtext, marginTop: 10, fontSize: 14, lineHeight: 21 },
  registerButton: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
  registerButtonText: { color: COLORS.onAccent, fontSize: 13, fontWeight: '800' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14, marginBottom: 30 },
  quickCard: { width: '48.5%', minHeight: 142, padding: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 20 },
  quickIconWrap: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  quickIcon: { fontSize: 18 },
  quickTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  quickSubtitle: { color: COLORS.subtext, fontSize: 12, lineHeight: 17 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  moreText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  postCard: { padding: 17, marginBottom: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  postBadge: { alignSelf: 'flex-start', color: COLORS.accent, backgroundColor: COLORS.accentSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, fontSize: 11, fontWeight: '800', marginBottom: 10 },
  postTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  postMeta: { marginTop: 7, color: COLORS.subtext, fontSize: 11 },
  bottomNav: { position: 'absolute', left: 14, right: 14, bottom: 10, height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 24 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { color: COLORS.muted, fontSize: 19, fontWeight: '700' },
  navLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  navActive: { color: COLORS.accent },
  formContent: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40 },
  findHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  cancelText: { fontSize: 15, color: COLORS.accent, fontWeight: '700' },
  fieldWrap: { marginBottom: 22 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  helperText: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  input: { height: 52, backgroundColor: COLORS.input, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, paddingHorizontal: 15, fontSize: 15, color: COLORS.text },
  textArea: { minHeight: 170, backgroundColor: COLORS.input, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 15, fontSize: 15, color: COLORS.text },
  textAreaSmall: { minHeight: 88, backgroundColor: COLORS.input, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 15, fontSize: 15, color: COLORS.text },
  searchStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  searchStatusText: { color: COLORS.subtext, fontSize: 12 },
  searchError: { color: COLORS.error, fontSize: 12, marginTop: 8 },
  searchResultsBox: { marginTop: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, overflow: 'hidden' },
  searchResultItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  searchResultName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  searchResultLocation: { marginTop: 4, color: COLORS.subtext, fontSize: 12 },
  selectedSchoolCard: { marginTop: 10, padding: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14 },
  selectedSchoolLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  selectedSchoolName: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  selectedSchoolLocation: { color: COLORS.subtext, fontSize: 12, marginTop: 5 },
  selectedSchoolId: { color: COLORS.subtext, fontSize: 10, marginTop: 7 },
  wheelRow: { flexDirection: 'row', gap: 12 },
  wheelContainer: { flex: 1, height: WHEEL_ITEM_HEIGHT * 3, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, backgroundColor: COLORS.surface, overflow: 'hidden' },
  wheel: { flex: 1 },
  wheelContent: { paddingVertical: WHEEL_ITEM_HEIGHT },
  wheelHighlight: { position: 'absolute', left: 6, right: 6, top: WHEEL_ITEM_HEIGHT, height: WHEEL_ITEM_HEIGHT, borderRadius: 10, backgroundColor: COLORS.accentSoft },
  wheelItem: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  wheelTextSelected: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  semesterPreview: { marginTop: 10, textAlign: 'center', color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  saveButton: { marginTop: 16, marginBottom: 12, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 16 },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: COLORS.onAccent, fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 14, height: 48, borderRadius: 14, borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  secondaryButtonText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  findContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 40 },
  matchSummary: { padding: 16, marginBottom: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  matchSummaryTitle: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  matchSummaryMeta: { color: COLORS.subtext, fontSize: 12, marginTop: 6 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.onAccent },
  noticeBox: { padding: 13, marginBottom: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 15 },
  noticeTitle: { color: COLORS.warning, fontSize: 13, fontWeight: '800' },
  noticeBody: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 4 },
  resultCount: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  studentInfo: { flex: 1 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  studentName: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  reasonBadge: { backgroundColor: COLORS.accentSoft, color: COLORS.accent, fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  homeUniversity: { color: COLORS.accent, fontSize: 11, fontWeight: '700', marginTop: 6 },
  studentIntro: { color: COLORS.text, fontSize: 12, marginTop: 7, lineHeight: 18 },
  miniInterestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
  miniInterest: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  studentMeta: { color: COLORS.subtext, fontSize: 10, marginTop: 7 },
  studentArrow: { color: COLORS.subtext, fontSize: 24, marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  emptyBody: { color: COLORS.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 },
  prototypeNote: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 10, textAlign: 'center' },
  profileContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 40 },
  profileHero: { alignItems: 'center', paddingVertical: 14, marginBottom: 12 },
  profileName: { color: COLORS.text, fontSize: 27, fontWeight: '800' },
  profilePrivacy: { marginTop: 5, color: COLORS.subtext, fontSize: 12 },
  profileIntro: { marginTop: 12, color: COLORS.text, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  profileSection: { padding: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  profileSectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  profileRowLabel: { color: COLORS.subtext, fontSize: 12, width: 70 },
  profileRowValue: { color: COLORS.text, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  interestChipText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  styleChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  styleChipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  privacyNotice: { padding: 14, marginTop: 14, marginBottom: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16 },
  privacyNoticeTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  privacyNoticeBody: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 6 },
  profileActionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  profileActionButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 15 },
  profileActionButtonDone: { backgroundColor: COLORS.accentSoft },
  profileActionText: { color: COLORS.accent, fontSize: 15, fontWeight: '800' },
  profileMessageButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 15 },
  profileMessageButtonText: { color: COLORS.onAccent, fontSize: 15, fontWeight: '800' },
  communityHomeTerm: { color: COLORS.accent, fontSize: 12, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  boardBrowseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 14, gap: 10 },
  communityBrowseTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  communityBrowseSub: { color: COLORS.subtext, fontSize: 11, marginTop: 4 },
  communitySortActions: { flexDirection: 'row', alignItems: 'center' },
  communitySortText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  communitySortTextActive: { color: COLORS.accent },
  communityFeedCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 14, marginBottom: 18, overflow: 'hidden' },
  communityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  pageTitle: { color: COLORS.text, fontSize: 25, fontWeight: '800' },
  writeButton: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  writeButtonText: { color: COLORS.onAccent, fontSize: 12, fontWeight: '800' },
  communityContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 110 },
  anonymousBanner: { padding: 15, marginBottom: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  anonymousTitle: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  anonymousBody: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 },
  communityPost: { padding: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 17 },
  postCategory: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },
  postTime: { color: COLORS.subtext, fontSize: 10 },
  postBody: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginTop: 7 },
  postDetailContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 40 },
  postDetailTitle: { color: COLORS.text, fontSize: 23, fontWeight: '800', lineHeight: 31, marginTop: 8 },
  postDetailMeta: { color: COLORS.subtext, fontSize: 11, marginTop: 8 },
  postDetailBody: { color: COLORS.text, fontSize: 15, lineHeight: 24, marginTop: 24, marginBottom: 30 },
  commentHeader: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  commentCard: { padding: 13, marginBottom: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14 },
  commentAuthor: { color: COLORS.accent, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  commentText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },
  commentInputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, height: 48, borderRadius: 14, backgroundColor: COLORS.input, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 13, color: COLORS.text },
  commentSend: { width: 64, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { color: COLORS.onAccent, fontSize: 12, fontWeight: '800' },
  checkinContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 40 },
  roomCard: { padding: 16, marginBottom: 26, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  roomTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  roomMeta: { color: COLORS.subtext, fontSize: 11, marginTop: 6 },
  checkinLabel: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  checkinQuestion: { color: COLORS.text, fontSize: 24, fontWeight: '800', lineHeight: 33, marginTop: 8 },
  checkinGuide: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 18 },
  myAnswer: { padding: 14, marginBottom: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 15 },
  myAnswerLabel: { color: COLORS.subtext, fontSize: 10, fontWeight: '700' },
  myAnswerText: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 5 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 },
  answerLabel: { width: 78, color: COLORS.text, fontSize: 11, fontWeight: '700' },
  answerBarTrack: { flex: 1, height: 9, backgroundColor: COLORS.line, borderRadius: 999, overflow: 'hidden' },
  answerBarFill: { height: 9, backgroundColor: COLORS.accent, borderRadius: 999 },
  answerCount: { width: 30, textAlign: 'right', color: COLORS.subtext, fontSize: 10 },
  roomMessage: { padding: 13, marginTop: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14 },
  checklistContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 40 },
  progressCard: { padding: 18, marginBottom: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 19 },
  progressTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  progressTrack: { height: 9, backgroundColor: COLORS.line, borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: 9, backgroundColor: COLORS.accent, borderRadius: 999 },
  checkGroup: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14 },
  checkBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  checkBoxDone: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkMark: { color: COLORS.onAccent, fontWeight: '800' },
  checkText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  checkTextDone: { color: COLORS.subtext, textDecorationLine: 'line-through' },
  myContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 115 },
  mySection: { padding: 16, marginBottom: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  toggleLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 12 },
  toggle: { width: 46, height: 27, borderRadius: 999, backgroundColor: COLORS.muted, padding: 3 },
  toggleOn: { backgroundColor: COLORS.accent },
  toggleDot: { width: 21, height: 21, borderRadius: 11, backgroundColor: COLORS.onAccent },
  toggleDotOn: { marginLeft: 19 },
  inputRequired: { borderColor: COLORS.errorBorder, borderWidth: 2 },
  quickCardWide: { width: '100%', minHeight: 0 },
  chatSender: { color: COLORS.accent, fontSize: 11, fontWeight: '800', marginBottom: 3 },
  chatLeave: { alignSelf: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  chatSafetyAction: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 4, paddingRight: 10 },
  chatSafetyActionText: { color: COLORS.subtext, fontSize: 11, textDecorationLine: 'underline' },
  chatLeaveText: { color: COLORS.muted, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  stepHeader: { marginBottom: 8 },
  stepTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  stepBack: { color: COLORS.accent, fontSize: 15, fontWeight: '800' },
  stepCount: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  stepTrack: { height: 6, backgroundColor: COLORS.line, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  stepFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 999 },
  stepTitle: { color: COLORS.text, fontSize: 25, fontWeight: '800', marginTop: 18 },
  stepBody: { color: COLORS.subtext, fontSize: 14, lineHeight: 21, marginTop: 8 },
  skipButton: { alignItems: 'center', padding: 16, marginBottom: 12 },
  skipButtonText: { color: COLORS.accent, fontSize: 15, fontWeight: '800', textDecorationLine: 'underline' },
  selectedFile: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: 12 },
  formSubmit: { marginTop: 14, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent },
  formSubmitText: { color: COLORS.onAccent, fontSize: 15, fontWeight: '800' },
  inlineError: { color: COLORS.error, backgroundColor: COLORS.errorSurface, borderRadius: 12, padding: 11, fontSize: 13, lineHeight: 19, marginTop: 12 },
  filterRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  marketBlock: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 24, padding: 22, marginBottom: 28 },
  marketBlockTitle: { color: COLORS.text, fontSize: 21, fontWeight: '800' },
  moreTextOnBlock: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  marketBlockBody: { color: COLORS.subtext, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  marketPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 4 },
  marketPreviewTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1 },
  marketPreviewPrice: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  marketPreviewEmpty: { color: COLORS.subtext, fontSize: 12, marginTop: 8 },
  marketActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  listingPrice: { color: COLORS.accent, fontSize: 15, fontWeight: '800', marginTop: 6 },
  listingDetailTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', lineHeight: 30, marginTop: 10 },
  listingDetailPrice: { color: COLORS.accent, fontSize: 20, fontWeight: '800', marginTop: 8 },
  listingDescription: { color: COLORS.text, fontSize: 14, lineHeight: 22, marginTop: 16 },
  chatListing: { color: COLORS.subtext, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20, marginBottom: 8 },
  chatContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  chatBubble: { alignSelf: 'flex-start', maxWidth: '80%', backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  chatBubbleMine: { alignSelf: 'flex-end', backgroundColor: COLORS.accent },
  chatText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  chatTextMine: { color: COLORS.onAccent },
  chatInputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
});