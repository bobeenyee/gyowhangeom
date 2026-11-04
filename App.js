import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { searchUniversities } from './src/lib/universitySearch';
import { supabase, isCloudConfigured, friendlyError, loadAccount, loadPeople, loadPosts, createPost, createComment, saveProfile as cloudSaveProfile, saveExchange as cloudSaveExchange, saveCheck, loadCheckin, saveCheckin, getCheckinSummary, distanceKm } from './src/lib/cloud';

const COLORS = {
  background: '#F7F5EE',
  surface: '#FFFDF8',
  green: '#486A55',
  greenDark: '#314B3B',
  greenSoft: '#E5ECE5',
  text: '#28312B',
  subtext: '#7A837D',
  line: '#E8E4DA',
  white: '#FFFFFF',
  warning: '#9A6B3A',
};

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
  const [selectedUser, setSelectedUser] = useState(null);
  const [posts, setPosts] = useState(isCloudConfigured ? [] : INITIAL_POSTS);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [checkinAnswer, setCheckinAnswer] = useState('');
  const [profile, setProfile] = useState({
    nickname: isCloudConfigured ? '교환학생' : '보빈',
    homeUniversity: '국민대학교',
    showHomeUniversity: false,
    discoverable: false,
    intro: '여행, 카페, 맛집 좋아해요. 같이 돌아다닐 친구를 찾고 있어요.',
    interests: ['여행', '카페', '맛집'],
    style: ['계획형', '주말여행 자주'],
  });


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
        nickname: '교환학생', homeUniversity: '', showHomeUniversity: false,
        discoverable: false, intro: '', interests: [], style: [],
      });
      setExchangeInfo(account.exchangeInfo);
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

  const goHome = () => setScreen('home');

  async function refreshCommunity() {
    if (!supabase) return;
    try { setPosts(await loadPosts()); } catch (e) { Alert.alert('새로고침 실패', friendlyError(e)); }
  }

  async function refreshPeople() {
    if (!supabase || !exchangeInfo) return;
    try { setPeople(await loadPeople(exchangeInfo)); } catch (e) { Alert.alert('새로고침 실패', friendlyError(e)); }
  }

  async function refreshCheckin() {
    if (!supabase || !checkinAnswer) return;
    try { setCheckinSummary(await getCheckinSummary(exchangeInfo)); } catch (e) { Alert.alert('새로고침 실패', friendlyError(e)); }
  }

  async function submitExchange(info) {
    if (supabase) {
      try { await cloudSaveExchange(session.user.id, info); }
      catch (e) { Alert.alert('저장 실패', friendlyError(e)); return; }
    }
    setExchangeInfo(info);
    goHome();
  }

  async function submitProfile(info) {
    if (supabase) {
      try { await cloudSaveProfile(session.user.id, info); }
      catch (e) { Alert.alert('저장 실패', friendlyError(e)); return; }
    }
    setProfile(info);
    Alert.alert('저장 완료', '프로필이 저장됐어요.');
  }

  async function submitPost(post) {
    if (supabase) {
      try {
        await createPost(post, exchangeInfo);
        setPosts(await loadPosts());
      } catch (e) { Alert.alert('글 작성 실패', friendlyError(e)); return; }
    } else {
      setPosts((prev) => [{ ...post, id: 'preview' + Date.now(), likes: 0, comments: [], time: '방금' }, ...prev]);
    }
    setScreen('community');
  }

  async function submitComment(text) {
    if (supabase) {
      try { await createComment(selectedPostId, text); setPosts(await loadPosts()); }
      catch (e) { Alert.alert('댓글 작성 실패', friendlyError(e)); throw e; }
    } else {
      setPosts((prev) => prev.map((item) =>
        item.id === selectedPostId ? { ...item, comments: [...item.comments, text] } : item));
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
    else { setPosts([]); setPeople([]); setExchangeInfo(null); setScreen('home'); }
  }


  if (!started) {
    return (
      <SafeAreaView style={styles.introScreen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.introContent}>
          <Text style={styles.brand}>교환점</Text>
          <Text style={styles.tagline}>낯선 곳에서 추억을 교환하다.</Text>
          <Text style={styles.caption}>교환학생의 사람과 정보를 한곳에서 연결해요.</Text>
        </View>
        <TouchableOpacity style={styles.startButton} onPress={() => setStarted(true)}>
          <Text style={styles.startButtonText}>시작하기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }


  if (!isCloudConfigured && !previewMode) return <SetupScreen onPreview={() => setPreviewMode(true)} />;
  if (isCloudConfigured && !authReady) {
    return <Screen><View style={styles.emptyState}><ActivityIndicator color={COLORS.green} /><Text style={styles.emptyBody}>로그인 상태를 확인하는 중...</Text></View></Screen>;
  }
  if (isCloudConfigured && !session) return <AuthScreen />;
  if (isCloudConfigured && cloudLoading) {
    return <Screen><View style={styles.emptyState}><ActivityIndicator color={COLORS.green} /><Text style={styles.emptyBody}>내 교환 정보를 불러오는 중...</Text></View></Screen>;
  }
  if (isCloudConfigured && cloudNotice) {
    return <Screen><View style={styles.emptyState}><Text style={styles.emptyTitle}>서버 설정을 확인해 주세요</Text><Text style={styles.emptyBody}>{cloudNotice}</Text><PrimaryButton label="다시 불러오기" onPress={() => { setCloudNotice(''); setReloadToken((v) => v + 1); }} /></View></Screen>;
  }

  if (screen === 'register') {
    return <ExchangeRegistrationScreen initialValue={exchangeInfo} onCancel={goHome} onSave={submitExchange} />;
  }
  if (screen === 'find') {
    return <FindStudentsScreen exchangeInfo={exchangeInfo} onBack={goHome} onRegister={() => setScreen('register')} users={isCloudConfigured ? people : SAMPLE_USERS} preview={!isCloudConfigured} onRefresh={isCloudConfigured ? refreshPeople : null} onOpenProfile={(user) => { setSelectedUser(user); setScreen('profile'); }} />;
  }
  if (screen === 'profile' && selectedUser) {
    return <StudentProfileScreen user={selectedUser} onBack={() => setScreen('find')} />;
  }
  if (screen === 'community') {
    return <CommunityScreen posts={posts} onRefresh={isCloudConfigured ? refreshCommunity : null} onHome={goHome} onWrite={() => setScreen('writePost')} onOpen={(id) => { setSelectedPostId(id); setScreen('postDetail'); }} onMy={() => setScreen('my')} onFind={() => setScreen('find')} />;
  }
  if (screen === 'writePost') {
    return <WritePostScreen onCancel={() => setScreen('community')} onSubmit={submitPost} />;
  }
  if (screen === 'postDetail') {
    const post = posts.find((item) => item.id === selectedPostId);
    return <PostDetailScreen post={post} onBack={() => setScreen('community')} onAddComment={submitComment} />;
  }
  if (screen === 'checkin') {
    return <CheckInScreen exchangeInfo={exchangeInfo} answer={checkinAnswer} onAnswer={submitCheckin} responses={isCloudConfigured ? checkinSummary : CHECKIN_RESPONSES} preview={!isCloudConfigured} onRefresh={isCloudConfigured ? refreshCheckin : null} onBack={goHome} />;
  }
  if (screen === 'checklist') {
    return <ChecklistScreen items={checklist} onBack={goHome} onToggle={toggleCheck} />;
  }
  if (screen === 'my') {
    return <MyScreen profile={profile} exchangeInfo={exchangeInfo} onSave={submitProfile} onSignOut={isCloudConfigured ? signOut : null} onBack={goHome} onEditExchange={() => setScreen('register')} onFind={() => setScreen('find')} onCommunity={() => setScreen('community')} />;
  }

  return (
    <HomeScreen
      exchangeInfo={exchangeInfo}
      profile={profile}
      onRegister={() => setScreen('register')}
      onFind={() => setScreen('find')}
      onCommunity={() => setScreen('community')}
      onCheckin={() => setScreen('checkin')}
      onChecklist={() => setScreen('checklist')}
      onMy={() => setScreen('my')}
      posts={posts}
      preview={!isCloudConfigured}
    />
  );
}

function ExchangeRegistrationScreen({ initialValue, onCancel, onSave }) {
  const initialSemester = parseSemester(initialValue?.semester);
  const [year, setYear] = useState(initialSemester.year);
  const [term, setTerm] = useState(initialSemester.term);
  const [schoolQuery, setSchoolQuery] = useState(initialValue?.universityName || '');
  const [selectedUniversity, setSelectedUniversity] = useState(initialValue?.universityId ? {
    id: initialValue.universityId, name: initialValue.universityName, country: initialValue.country,
    countryCode: initialValue.countryCode, city: initialValue.city, latitude: initialValue.latitude ?? null, longitude: initialValue.longitude ?? null,
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
  const canSave = Boolean(selectedUniversity && year && term);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <TopHeader title="파견 정보 등록" onBack={onCancel} backLabel="취소" />
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>파견 대학</Text>
          <TextInput style={styles.input} value={schoolQuery} onChangeText={(text) => { setSchoolQuery(text); if (!selectedUniversity || text !== selectedUniversity.name) setSelectedUniversity(null); }} placeholder="예: 코펜하겐대학교 / University of Copenhagen" placeholderTextColor="#A1A7A2" autoCapitalize="none" autoCorrect={false} />
          {searching && <View style={styles.searchStatusRow}><ActivityIndicator size="small" color={COLORS.green} /><Text style={styles.searchStatusText}>전 세계 대학 검색 중...</Text></View>}
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
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>파견 학기</Text>
          <Text style={styles.helperText}>연도와 학기를 각각 위아래로 돌려 선택하세요.</Text>
          <View style={styles.wheelRow}>
            <WheelPicker items={YEARS} value={year} onChange={setYear} formatItem={(item) => `${item}년`} />
            <WheelPicker items={TERMS} value={term} onChange={setTerm} formatItem={(item) => item} />
          </View>
          <Text style={styles.semesterPreview}>선택: {semester}</Text>
        </View>
        <PrimaryButton disabled={!canSave} label="저장하기" onPress={() => onSave({ universityId: selectedUniversity.id, universityName: selectedUniversity.name, country: selectedUniversity.country, countryCode: selectedUniversity.countryCode, city: selectedUniversity.city, latitude: selectedUniversity.latitude, longitude: selectedUniversity.longitude, semester })} />
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

function StudentProfileScreen({ user, onBack }) {
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
        <View style={styles.profileActionRow}>
          <TouchableOpacity style={styles.profileActionButton} onPress={() => Alert.alert("친구추가 준비 중", "실제 회원 간 친구 요청 기능은 다음 단계에서 연결할게요.")}><Text style={styles.profileActionText}>친구추가</Text></TouchableOpacity>
          <TouchableOpacity style={styles.profileMessageButton} onPress={() => Alert.alert("메시지 준비 중", "아직 채팅 서버가 연결되지 않았어요.")}><Text style={styles.profileMessageButtonText}>메시지</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

function CommunityScreen({ posts, onRefresh, onHome, onWrite, onOpen, onMy, onFind }) {
  const [category, setCategory] = useState('전체');
  const categories = ['전체', '질문', '생활', '수업', '여행메이트'];
  const visible = category === '전체' ? posts : posts.filter((post) => post.category === category);
  return (
    <Screen>
      <View style={styles.communityHeader}><View><Text style={styles.miniBrand}>교환점</Text><Text style={styles.pageTitle}>익명 커뮤니티</Text></View><TouchableOpacity style={styles.writeButton} onPress={onWrite}><Text style={styles.writeButtonText}>글쓰기</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.communityContent} showsVerticalScrollIndicator={false}>{onRefresh && <TouchableOpacity onPress={onRefresh}><Text style={[styles.moreText, { marginBottom: 12 }]}>↻ 새 게시글 불러오기</Text></TouchableOpacity>}
        <View style={styles.anonymousBanner}><Text style={styles.anonymousTitle}>닉네임 없이 질문하고 답해요</Text><Text style={styles.anonymousBody}>게시글에는 사람찾기 프로필을 표시하지 않아요. 서비스 운영상 작성자 확인 기록은 별도로 관리돼요.</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{categories.map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.filterChip, category === item && styles.filterChipActive]}><Text style={[styles.filterChipText, category === item && styles.filterChipTextActive]}>{item}</Text></TouchableOpacity>)}</ScrollView>
        {visible.map((post) => <TouchableOpacity key={post.id} style={styles.communityPost} onPress={() => onOpen(post.id)}>
          <View style={styles.inlineRow}><Text style={styles.postCategory}>{post.category}</Text><Text style={styles.postTime}>{post.time}</Text></View>
          <Text style={styles.postTitle}>{post.title}</Text><Text numberOfLines={2} style={styles.postBody}>{post.body}</Text>
          <Text style={styles.postMeta}>익명 · {post.meta} · 공감 {post.likes} · 댓글 {post.comments.length}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <BottomNav active="community" onHome={onHome} onFind={onFind} onCommunity={() => {}} onMy={onMy} />
    </Screen>
  );
}

function WritePostScreen({ onCancel, onSubmit }) {
  const [category, setCategory] = useState('질문');
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

function PostDetailScreen({ post, onBack, onAddComment }) {
  const [comment, setComment] = useState('');
  if (!post) return <Screen><TopHeader title="게시글" onBack={onBack} /><View style={styles.emptyState}><Text>게시글을 찾을 수 없어요.</Text></View></Screen>;
  return (
    <Screen><TopHeader title="게시글" onBack={onBack} backLabel="‹ 커뮤니티" /><ScrollView contentContainerStyle={styles.postDetailContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.postCategory}>{post.category}</Text><Text style={styles.postDetailTitle}>{post.title}</Text><Text style={styles.postDetailMeta}>익명 · {post.meta} · {post.time}</Text><Text style={styles.postDetailBody}>{post.body}</Text>
      <Text style={styles.commentHeader}>댓글 {post.comments.length}</Text>
      {post.comments.map((item, index) => <View key={`${item}-${index}`} style={styles.commentCard}><Text style={styles.commentAuthor}>익명{index + 1}</Text><Text style={styles.commentText}>{item}</Text></View>)}
      <View style={styles.commentInputRow}><TextInput style={styles.commentInput} value={comment} onChangeText={setComment} placeholder="익명 댓글 입력" placeholderTextColor="#A1A7A2" /><TouchableOpacity style={styles.commentSend} onPress={async () => { if (!comment.trim()) return; try { await onAddComment(comment.trim()); setComment(''); } catch (_e) { /* caller displays error */ } }}><Text style={styles.commentSendText}>등록</Text></TouchableOpacity></View>
    </ScrollView></Screen>
  );
}

function CheckInScreen({ exchangeInfo, answer, responses = [], preview = false, onRefresh, onAnswer, onBack }) {
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
      {!revealed ? <>
        <TextInput style={styles.input} value={draft} maxLength={40} onChangeText={setDraft} placeholder="예: 1월 22일" placeholderTextColor="#A1A7A2" />
        <PrimaryButton disabled={!draft.trim() || !exchangeInfo || sending} label={sending ? '저장하는 중...' : '답변하고 다른 사람 답 보기'} onPress={submit} />
      </> : <>
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

function ChecklistScreen({ items, onBack, onToggle }) {
  const done = items.filter((item) => item.done).length;
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <Screen><TopHeader title="준비 체크" onBack={onBack} /><ScrollView contentContainerStyle={styles.checklistContent}>
      <View style={styles.progressCard}><Text style={styles.progressTitle}>출국 준비 {done}/{items.length}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(done / items.length) * 100}%` }]} /></View></View>
      {groups.map((group) => <View key={group}><Text style={styles.checkGroup}>{group}</Text>{items.filter((item) => item.group === group).map((item) => <TouchableOpacity key={item.id} style={styles.checkItem} onPress={() => onToggle(item.id)}><View style={[styles.checkBox, item.done && styles.checkBoxDone]}><Text style={styles.checkMark}>{item.done ? '✓' : ''}</Text></View><Text style={[styles.checkText, item.done && styles.checkTextDone]}>{item.title}</Text></TouchableOpacity>)}</View>)}
    </ScrollView></Screen>
  );
}

function MyScreen({ profile, exchangeInfo, onSave, onSignOut, onBack, onEditExchange, onFind, onCommunity }) {
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
      <View style={styles.mySection}><Text style={styles.profileSectionTitle}>사람찾기 참여 설정</Text><Text style={styles.helperText}>기본은 비공개예요. 직접 켜야 다른 사람의 검색 결과에 나타나요.</Text><TouchableOpacity style={styles.toggleRow} onPress={() => setDraft({ ...draft, discoverable: draft.discoverable === false })}><Text style={styles.toggleLabel}>다른 학생에게 내 프로필 공개</Text><View style={[styles.toggle, draft.discoverable !== false && styles.toggleOn]}><View style={[styles.toggleDot, draft.discoverable !== false && styles.toggleDotOn]} /></View></TouchableOpacity></View>
       <View style={styles.mySection}><Text style={styles.profileSectionTitle}>한국 대학 공개</Text><TextInput style={styles.input} value={draft.homeUniversity} onChangeText={(v) => setDraft({ ...draft, homeUniversity: v })} placeholder="한국 소속 대학" placeholderTextColor="#A1A7A2" />
        <TouchableOpacity style={styles.toggleRow} onPress={() => setDraft({ ...draft, showHomeUniversity: !draft.showHomeUniversity })}><Text style={styles.toggleLabel}>사람찾기에서 한국 대학 공개</Text><View style={[styles.toggle, draft.showHomeUniversity && styles.toggleOn]}><View style={[styles.toggleDot, draft.showHomeUniversity && styles.toggleDotOn]} /></View></TouchableOpacity>
      </View>
      <PrimaryButton label="프로필 저장" onPress={save} />
      <View style={styles.mySection}><Text style={styles.profileSectionTitle}>내 파견 정보</Text>{exchangeInfo ? <><ProfileRow label="대학" value={exchangeInfo.universityName} /><ProfileRow label="학기" value={exchangeInfo.semester} /><SecondaryButton label="파견 정보 수정" onPress={onEditExchange} /></> : <SecondaryButton label="파견 정보 등록" onPress={onEditExchange} />}</View>
      <View style={styles.privacyNotice}><Text style={styles.privacyNoticeTitle}>프로필 사진 · SNS 없음</Text><Text style={styles.privacyNoticeBody}>교환점은 프로필 사진이나 SNS 계정을 수집하지 않아요.</Text></View>
      {onSignOut && <SecondaryButton label="로그아웃" onPress={onSignOut} />}
    </ScrollView><BottomNav active="my" onHome={onBack} onFind={onFind} onCommunity={onCommunity} onMy={() => {}} /></Screen>
  );
}

function HomeScreen({ exchangeInfo, profile, posts, preview, onRegister, onFind, onCommunity, onCheckin, onChecklist, onMy }) {
  return (
    <Screen><ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.miniBrand}>교환점</Text><Text style={styles.hello}>{profile.nickname}님, 안녕하세요 👋</Text></View></View>
      <View style={styles.destinationCard}><Text style={styles.cardEyebrow}>MY EXCHANGE</Text>{exchangeInfo ? <><Text style={styles.destinationTitle}>{exchangeInfo.city ? `${exchangeInfo.city} · ` : ''}{exchangeInfo.universityName}</Text><Text style={styles.destinationBody}>{exchangeInfo.country} · {exchangeInfo.semester}</Text><TouchableOpacity style={styles.registerButton} onPress={onRegister}><Text style={styles.registerButtonText}>파견 정보 수정하기</Text></TouchableOpacity></> : <><Text style={styles.destinationTitle}>아직 파견 정보를 등록하지 않았어요</Text><Text style={styles.destinationBody}>대학과 학기를 등록하면 같은 파견지의 사람과 정보를 바로 찾을 수 있어요.</Text><TouchableOpacity style={styles.registerButton} onPress={onRegister}><Text style={styles.registerButtonText}>파견 정보 등록하기</Text></TouchableOpacity></>}</View>
      <Text style={styles.sectionTitle}>교환점에서 뭐 할까?</Text>
      <View style={styles.grid}>
        <QuickCard icon="✈️" title="교환학생 찾기" subtitle="학교 · 도시 · 주변 · 국가" onPress={onFind} />
        <QuickCard icon="💬" title="익명 커뮤니티" subtitle="질문하고 정보 나누기" onPress={onCommunity} />
        <QuickCard icon="◉" title="체크인 방" subtitle="답하고 같은 기수 현황 보기" onPress={onCheckin} />
        <QuickCard icon="✓" title="준비 체크" subtitle="비자 · 서류 · 출국 준비" onPress={onChecklist} />
      </View>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>지금 많이 찾는 이야기</Text><TouchableOpacity onPress={onCommunity}><Text style={styles.moreText}>전체보기</Text></TouchableOpacity></View>
      <TouchableOpacity style={styles.postCard} onPress={onCommunity}><Text style={styles.postBadge}>{preview ? "미리보기 · " : ""}익명 커뮤니티</Text><Text style={styles.postTitle}>{posts?.[0]?.title || "아직 게시글이 없어요. 첫 질문을 작성해 보세요."}</Text><Text style={styles.postMeta}>{posts?.[0]?.meta || "커뮤니티에 글을 남겨봐요"}</Text></TouchableOpacity>
    </ScrollView><BottomNav active="home" onHome={() => {}} onFind={onFind} onCommunity={onCommunity} onMy={onMy} /></Screen>
  );
}

function Screen({ children }) { return <SafeAreaView style={styles.screen}><StatusBar barStyle="dark-content" />{children}</SafeAreaView>; }
function TopHeader({ title, onBack, backLabel = '‹ 홈' }) { return <View style={styles.findHeader}><TouchableOpacity onPress={onBack}><Text style={styles.cancelText}>{backLabel}</Text></TouchableOpacity><Text style={styles.formTitle}>{title}</Text><View style={{ width: 48 }} /></View>; }
function PrimaryButton({ label, onPress, disabled = false }) { return <TouchableOpacity disabled={disabled} style={[styles.saveButton, disabled && styles.saveButtonDisabled]} onPress={onPress}><Text style={styles.saveButtonText}>{label}</Text></TouchableOpacity>; }
function SecondaryButton({ label, onPress }) { return <TouchableOpacity style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryButtonText}>{label}</Text></TouchableOpacity>; }
function Field({ label, children }) { return <View style={{ marginTop: 14 }}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>; }
function ProfileSection({ title, children }) { return <View style={styles.profileSection}><Text style={styles.profileSectionTitle}>{title}</Text>{children}</View>; }
function TagList({ items, filled = false }) { return <View style={styles.interestWrap}>{items.map((item) => <View key={item} style={filled ? styles.interestChip : styles.styleChip}><Text style={filled ? styles.interestChipText : styles.styleChipText}>{item}</Text></View>)}</View>; }
function ProfileRow({ label, value }) { return <View style={styles.profileRow}><Text style={styles.profileRowLabel}>{label}</Text><Text style={styles.profileRowValue}>{value}</Text></View>; }
function QuickCard({ icon, title, subtitle, onPress }) { return <TouchableOpacity activeOpacity={0.82} style={styles.quickCard} onPress={onPress}><View style={styles.quickIconWrap}><Text style={styles.quickIcon}>{icon}</Text></View><Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickSubtitle}>{subtitle}</Text></TouchableOpacity>; }
function BottomNav({ active, onHome, onFind, onCommunity, onMy }) { return <View style={styles.bottomNav}><NavItem label="홈" icon="⌂" active={active === 'home'} onPress={onHome} /><NavItem label="찾기" icon="⌕" active={active === 'find'} onPress={onFind} /><NavItem label="커뮤니티" icon="◫" active={active === 'community'} onPress={onCommunity} /><NavItem label="마이" icon="○" active={active === 'my'} onPress={onMy} /></View>; }
function NavItem({ label, icon, active, onPress }) { return <TouchableOpacity style={styles.navItem} onPress={onPress}><Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text></TouchableOpacity>; }

function parseSemester(value) { const match = typeof value === 'string' ? value.match(/^(\d{4})년\s(.+)$/) : null; const parsedYear = Number(match?.[1]); const parsedTerm = match?.[2]; return { year: YEARS.includes(parsedYear) ? parsedYear : 2027, term: TERMS.includes(parsedTerm) ? parsedTerm : '1학기' }; }
function getMatchReason(user, exchangeInfo) { if (user.universityId === exchangeInfo.universityId) return '같은 대학'; if (user.city?.toLowerCase() === exchangeInfo.city?.toLowerCase()) return '같은 도시'; if (user.distanceKm != null && user.distanceKm <= 30) return '약 ' + Math.round(user.distanceKm) + 'km'; return '같은 국가'; }
function splitTags(value) { return value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8); }

const styles = StyleSheet.create({
  introScreen: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28, paddingBottom: 26 },
  introContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 44, fontWeight: '800', color: COLORS.green, letterSpacing: -1.5 },
  tagline: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#3E4A42', textAlign: 'center' },
  caption: { marginTop: 10, fontSize: 14, lineHeight: 21, color: COLORS.subtext, textAlign: 'center' },
  startButton: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  startButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 112 },
  header: { marginBottom: 22 },
  miniBrand: { fontSize: 15, fontWeight: '800', color: COLORS.green, marginBottom: 5 },
  hello: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
  destinationCard: { backgroundColor: COLORS.green, borderRadius: 24, padding: 22, marginBottom: 28 },
  cardEyebrow: { color: '#DCE8DE', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  cardEyebrowDark: { color: COLORS.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
  destinationTitle: { color: COLORS.white, fontSize: 21, fontWeight: '800', lineHeight: 29 },
  destinationBody: { color: '#E2EBE4', marginTop: 10, fontSize: 14, lineHeight: 21 },
  registerButton: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
  registerButtonText: { color: COLORS.greenDark, fontSize: 13, fontWeight: '800' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14, marginBottom: 30 },
  quickCard: { width: '48.5%', minHeight: 142, backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line },
  quickIconWrap: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  quickIcon: { fontSize: 18 },
  quickTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  quickSubtitle: { color: COLORS.subtext, fontSize: 12, lineHeight: 17 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  moreText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  postCard: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 17, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  postBadge: { alignSelf: 'flex-start', color: COLORS.green, backgroundColor: COLORS.greenSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, fontSize: 11, fontWeight: '800', marginBottom: 10 },
  postTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  postMeta: { marginTop: 7, color: COLORS.subtext, fontSize: 11 },
  bottomNav: { position: 'absolute', left: 14, right: 14, bottom: 10, height: 72, borderRadius: 24, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: COLORS.line },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { color: '#9AA19C', fontSize: 19, fontWeight: '700' },
  navLabel: { color: '#9AA19C', fontSize: 11, fontWeight: '700' },
  navActive: { color: COLORS.green },
  formContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  findHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  cancelText: { fontSize: 15, color: COLORS.green, fontWeight: '700' },
  fieldWrap: { marginBottom: 22 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  helperText: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  input: { height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, paddingHorizontal: 15, fontSize: 15, color: COLORS.text },
  textArea: { minHeight: 170, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 15, fontSize: 15, color: COLORS.text },
  textAreaSmall: { minHeight: 88, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 15, fontSize: 15, color: COLORS.text },
  searchStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  searchStatusText: { color: COLORS.subtext, fontSize: 12 },
  searchError: { color: '#A34A4A', fontSize: 12, marginTop: 8 },
  searchResultsBox: { marginTop: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, overflow: 'hidden' },
  searchResultItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  searchResultName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  searchResultLocation: { marginTop: 4, color: COLORS.subtext, fontSize: 12 },
  selectedSchoolCard: { marginTop: 10, padding: 14, borderRadius: 14, backgroundColor: COLORS.greenSoft },
  selectedSchoolLabel: { color: COLORS.green, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  selectedSchoolName: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  selectedSchoolLocation: { color: COLORS.subtext, fontSize: 12, marginTop: 5 },
  selectedSchoolId: { color: COLORS.subtext, fontSize: 10, marginTop: 7 },
  wheelRow: { flexDirection: 'row', gap: 12 },
  wheelContainer: { flex: 1, height: WHEEL_ITEM_HEIGHT * 3, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, backgroundColor: COLORS.surface, overflow: 'hidden' },
  wheel: { flex: 1 },
  wheelContent: { paddingVertical: WHEEL_ITEM_HEIGHT },
  wheelHighlight: { position: 'absolute', left: 6, right: 6, top: WHEEL_ITEM_HEIGHT, height: WHEEL_ITEM_HEIGHT, borderRadius: 10, backgroundColor: COLORS.greenSoft },
  wheelItem: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { color: '#9AA19C', fontSize: 14, fontWeight: '600' },
  wheelTextSelected: { color: COLORS.greenDark, fontSize: 16, fontWeight: '800' },
  semesterPreview: { marginTop: 10, textAlign: 'center', color: COLORS.greenDark, fontSize: 13, fontWeight: '800' },
  saveButton: { marginTop: 16, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 14, height: 48, borderRadius: 14, borderWidth: 1, borderColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.green, fontSize: 14, fontWeight: '800' },
  findContent: { paddingHorizontal: 20, paddingBottom: 40 },
  matchSummary: { backgroundColor: COLORS.greenSoft, borderRadius: 18, padding: 16, marginBottom: 14 },
  matchSummaryTitle: { color: COLORS.greenDark, fontSize: 16, fontWeight: '800' },
  matchSummaryMeta: { color: COLORS.subtext, fontSize: 12, marginTop: 6 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterChipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.white },
  noticeBox: { backgroundColor: '#F2EBDD', borderRadius: 15, padding: 13, marginBottom: 16 },
  noticeTitle: { color: COLORS.warning, fontSize: 13, fontWeight: '800' },
  noticeBody: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 4 },
  resultCount: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  studentInfo: { flex: 1 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  studentName: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  reasonBadge: { backgroundColor: COLORS.greenSoft, color: COLORS.greenDark, fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  homeUniversity: { color: COLORS.green, fontSize: 11, fontWeight: '700', marginTop: 6 },
  studentIntro: { color: COLORS.text, fontSize: 12, marginTop: 7, lineHeight: 18 },
  miniInterestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
  miniInterest: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  studentMeta: { color: COLORS.subtext, fontSize: 10, marginTop: 7 },
  studentArrow: { color: COLORS.subtext, fontSize: 24, marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  emptyBody: { color: COLORS.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 },
  prototypeNote: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 10, textAlign: 'center' },
  profileContent: { paddingHorizontal: 20, paddingBottom: 40 },
  profileHero: { alignItems: 'center', paddingVertical: 14, marginBottom: 12 },
  profileName: { color: COLORS.text, fontSize: 27, fontWeight: '800' },
  profilePrivacy: { marginTop: 5, color: COLORS.subtext, fontSize: 12 },
  profileIntro: { marginTop: 12, color: COLORS.text, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  profileSection: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line },
  profileSectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  profileRowLabel: { color: COLORS.subtext, fontSize: 12, width: 70 },
  profileRowValue: { color: COLORS.text, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: { backgroundColor: COLORS.greenSoft, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  interestChipText: { color: COLORS.greenDark, fontSize: 12, fontWeight: '700' },
  styleChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  styleChipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  privacyNotice: { backgroundColor: COLORS.greenSoft, borderRadius: 16, padding: 14, marginTop: 14, marginBottom: 12 },
  privacyNoticeTitle: { color: COLORS.greenDark, fontSize: 13, fontWeight: '800' },
  privacyNoticeBody: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 6 },
  profileActionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  profileActionButton: { flex: 1, height: 52, borderRadius: 15, borderWidth: 1, borderColor: COLORS.green, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  profileActionButtonDone: { backgroundColor: COLORS.greenSoft },
  profileActionText: { color: COLORS.green, fontSize: 15, fontWeight: '800' },
  profileMessageButton: { flex: 1, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  profileMessageButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  communityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  pageTitle: { color: COLORS.text, fontSize: 25, fontWeight: '800' },
  writeButton: { backgroundColor: COLORS.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  writeButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  communityContent: { paddingHorizontal: 20, paddingBottom: 110 },
  anonymousBanner: { backgroundColor: COLORS.greenSoft, borderRadius: 18, padding: 15, marginBottom: 16 },
  anonymousTitle: { color: COLORS.greenDark, fontSize: 14, fontWeight: '800' },
  anonymousBody: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 },
  communityPost: { backgroundColor: COLORS.surface, borderRadius: 17, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  postCategory: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  postTime: { color: COLORS.subtext, fontSize: 10 },
  postBody: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginTop: 7 },
  postDetailContent: { paddingHorizontal: 20, paddingBottom: 40 },
  postDetailTitle: { color: COLORS.text, fontSize: 23, fontWeight: '800', lineHeight: 31, marginTop: 8 },
  postDetailMeta: { color: COLORS.subtext, fontSize: 11, marginTop: 8 },
  postDetailBody: { color: COLORS.text, fontSize: 15, lineHeight: 24, marginTop: 24, marginBottom: 30 },
  commentHeader: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  commentCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: COLORS.line },
  commentAuthor: { color: COLORS.green, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  commentText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },
  commentInputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, height: 48, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 13, color: COLORS.text },
  commentSend: { width: 64, borderRadius: 14, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  checkinContent: { paddingHorizontal: 20, paddingBottom: 40 },
  roomCard: { backgroundColor: COLORS.greenSoft, borderRadius: 18, padding: 16, marginBottom: 26 },
  roomTitle: { color: COLORS.greenDark, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  roomMeta: { color: COLORS.subtext, fontSize: 11, marginTop: 6 },
  checkinLabel: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  checkinQuestion: { color: COLORS.text, fontSize: 24, fontWeight: '800', lineHeight: 33, marginTop: 8 },
  checkinGuide: { color: COLORS.subtext, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 18 },
  myAnswer: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginBottom: 22 },
  myAnswerLabel: { color: COLORS.subtext, fontSize: 10, fontWeight: '700' },
  myAnswerText: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 5 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 },
  answerLabel: { width: 78, color: COLORS.text, fontSize: 11, fontWeight: '700' },
  answerBarTrack: { flex: 1, height: 9, backgroundColor: COLORS.line, borderRadius: 999, overflow: 'hidden' },
  answerBarFill: { height: 9, backgroundColor: COLORS.green, borderRadius: 999 },
  answerCount: { width: 30, textAlign: 'right', color: COLORS.subtext, fontSize: 10 },
  roomMessage: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 13, marginTop: 8, borderWidth: 1, borderColor: COLORS.line },
  checklistContent: { paddingHorizontal: 20, paddingBottom: 40 },
  progressCard: { backgroundColor: COLORS.green, borderRadius: 19, padding: 18, marginBottom: 22 },
  progressTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  progressTrack: { height: 9, backgroundColor: '#6E8977', borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: 9, backgroundColor: COLORS.white, borderRadius: 999 },
  checkGroup: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.line },
  checkBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  checkBoxDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  checkMark: { color: COLORS.white, fontWeight: '800' },
  checkText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  checkTextDone: { color: COLORS.subtext, textDecorationLine: 'line-through' },
  myContent: { paddingHorizontal: 20, paddingBottom: 115 },
  mySection: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.line },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  toggleLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 12 },
  toggle: { width: 46, height: 27, borderRadius: 999, backgroundColor: '#D8DAD6', padding: 3 },
  toggleOn: { backgroundColor: COLORS.green },
  toggleDot: { width: 21, height: 21, borderRadius: 11, backgroundColor: COLORS.white },
  toggleDotOn: { marginLeft: 19 },
});