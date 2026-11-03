import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
};

const YEARS = Array.from({ length: 25 }, (_, index) => 2026 + index);
const TERMS = ['1학기', '2학기', '여름계절학기', '겨울계절학기'];
const WHEEL_ITEM_HEIGHT = 44;

const SAMPLE_USERS = [
  {
    id: 'u1',
    name: '민지',
    universityId: 'https://ror.org/035b05819',
    universityName: 'University of Copenhagen',
    city: 'Copenhagen',
    country: 'Denmark',
    semester: '2027년 1학기',
    homeUniversity: '연세대학교',
    intro: '여행이랑 카페 좋아해요!',
  },
  {
    id: 'u2',
    name: '서윤',
    universityId: 'https://ror.org/035b05819',
    universityName: 'University of Copenhagen',
    city: 'Copenhagen',
    country: 'Denmark',
    semester: '2027년 1학기',
    homeUniversity: '고려대학교',
    intro: '코펜하겐 같이 돌아다닐 친구 구해요.',
  },
  {
    id: 'u3',
    name: '지우',
    universityId: 'https://ror.org/035b05819',
    universityName: 'University of Copenhagen',
    city: 'Copenhagen',
    country: 'Denmark',
    semester: '2027년 2학기',
    homeUniversity: '성균관대학교',
    intro: '맛집 탐방 좋아합니다.',
  },
  {
    id: 'u4',
    name: '현우',
    universityId: 'https://ror.org/05f0yaq80',
    universityName: 'Copenhagen Business School',
    city: 'Frederiksberg',
    country: 'Denmark',
    semester: '2027년 1학기',
    homeUniversity: '한양대학교',
    intro: '축구랑 여행 좋아해요.',
  },
];

export default function App() {
  const [started, setStarted] = useState(false);
  const [screen, setScreen] = useState('home');
  const [exchangeInfo, setExchangeInfo] = useState(null);

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

  if (screen === 'register') {
    return (
      <ExchangeRegistrationScreen
        initialValue={exchangeInfo}
        onCancel={() => setScreen('home')}
        onSave={(info) => {
          setExchangeInfo(info);
          setScreen('home');
        }}
      />
    );
  }

  if (screen === 'find') {
    return (
      <FindStudentsScreen
        exchangeInfo={exchangeInfo}
        onBack={() => setScreen('home')}
        onRegister={() => setScreen('register')}
      />
    );
  }

  return (
    <HomeScreen
      exchangeInfo={exchangeInfo}
      onRegister={() => setScreen('register')}
      onFind={() => setScreen('find')}
    />
  );
}

function ExchangeRegistrationScreen({ initialValue, onCancel, onSave }) {
  const initialSemester = parseSemester(initialValue?.semester);
  const [year, setYear] = useState(initialSemester.year);
  const [term, setTerm] = useState(initialSemester.term);
  const [schoolQuery, setSchoolQuery] = useState(initialValue?.universityName || '');
  const [selectedUniversity, setSelectedUniversity] = useState(
    initialValue?.universityId
      ? {
          id: initialValue.universityId,
          name: initialValue.universityName,
          country: initialValue.country,
          countryCode: initialValue.countryCode,
          city: initialValue.city,
        }
      : null
  );
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const query = schoolQuery.trim();

    if (selectedUniversity && query === selectedUniversity.name) {
      setResults([]);
      setSearching(false);
      return;
    }

    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError('');
        const url = `https://api.ror.org/v2/organizations?query=${encodeURIComponent(
          query
        )}&filter=types:education`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('search failed');
        const data = await response.json();
        const normalized = (data.items || []).slice(0, 8).map(normalizeRorOrganization);
        setResults(normalized);
      } catch (error) {
        setResults([]);
        setSearchError('대학 검색에 실패했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [schoolQuery, selectedUniversity]);

  const semester = `${year}년 ${term}`;
  const canSave = Boolean(selectedUniversity && year && term);

  const chooseUniversity = (university) => {
    setSelectedUniversity(university);
    setSchoolQuery(university.name);
    setResults([]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.formTitle}>파견 정보 등록</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>파견 대학</Text>
          <TextInput
            style={styles.input}
            value={schoolQuery}
            onChangeText={(text) => {
              setSchoolQuery(text);
              if (!selectedUniversity || text !== selectedUniversity.name) {
                setSelectedUniversity(null);
              }
            }}
            placeholder="대학 이름 또는 약자를 검색하세요"
            placeholderTextColor="#A1A7A2"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searching && (
            <View style={styles.searchStatusRow}>
              <ActivityIndicator size="small" color={COLORS.green} />
              <Text style={styles.searchStatusText}>전 세계 대학 검색 중...</Text>
            </View>
          )}

          {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}

          {results.length > 0 && (
            <View style={styles.searchResultsBox}>
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  style={styles.searchResultItem}
                  onPress={() => chooseUniversity(item)}
                >
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultLocation}>
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedUniversity && (
            <View style={styles.selectedSchoolCard}>
              <Text style={styles.selectedSchoolLabel}>선택된 대학</Text>
              <Text style={styles.selectedSchoolName}>{selectedUniversity.name}</Text>
              <Text style={styles.selectedSchoolLocation}>
                {[selectedUniversity.city, selectedUniversity.country].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.selectedSchoolId}>ROR ID · {selectedUniversity.id}</Text>
            </View>
          )}
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

        <TouchableOpacity
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={() =>
            onSave({
              universityId: selectedUniversity.id,
              universityName: selectedUniversity.name,
              country: selectedUniversity.country,
              countryCode: selectedUniversity.countryCode,
              city: selectedUniversity.city,
              semester,
            })
          }
        >
          <Text style={styles.saveButtonText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function WheelPicker({ items, value, onChange, formatItem }) {
  const scrollRef = useRef(null);
  const currentIndex = Math.max(0, items.findIndex((item) => item === value));

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: currentIndex * WHEEL_ITEM_HEIGHT, animated: false });
    });
  }, []);

  const handleEnd = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(offset / WHEEL_ITEM_HEIGHT)));
    onChange(items[index]);
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.wheelContainer}>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView
        ref={scrollRef}
        style={styles.wheel}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
      >
        {items.map((item) => {
          const selected = item === value;
          return (
            <View key={String(item)} style={styles.wheelItem}>
              <Text style={[styles.wheelText, selected && styles.wheelTextSelected]}>
                {formatItem(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FindStudentsScreen({ exchangeInfo, onBack, onRegister }) {
  const [filter, setFilter] = useState('same');

  if (!exchangeInfo) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.findHeader}>
          <TouchableOpacity onPress={onBack}><Text style={styles.cancelText}>‹ 홈</Text></TouchableOpacity>
          <Text style={styles.formTitle}>교환학생 찾기</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>먼저 파견 정보를 등록해 주세요</Text>
          <Text style={styles.emptyBody}>같은 대학과 학기의 교환학생을 찾으려면 내 파견 정보가 필요해요.</Text>
          <TouchableOpacity style={styles.saveButton} onPress={onRegister}>
            <Text style={styles.saveButtonText}>파견 정보 등록하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sameSchool = SAMPLE_USERS.filter(
    (user) => user.universityId === exchangeInfo.universityId && user.semester === exchangeInfo.semester
  );
  const sameCity = SAMPLE_USERS.filter(
    (user) => user.city === exchangeInfo.city && user.semester === exchangeInfo.semester
  );
  const users = filter === 'same' ? sameSchool : sameCity;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.findHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.cancelText}>‹ 홈</Text></TouchableOpacity>
        <Text style={styles.formTitle}>교환학생 찾기</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.findContent} showsVerticalScrollIndicator={false}>
        <View style={styles.matchSummary}>
          <Text style={styles.matchSummaryTitle}>{exchangeInfo.universityName}</Text>
          <Text style={styles.matchSummaryMeta}>{exchangeInfo.city} · {exchangeInfo.semester}</Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'same' && styles.filterChipActive]}
            onPress={() => setFilter('same')}
          >
            <Text style={[styles.filterChipText, filter === 'same' && styles.filterChipTextActive]}>같은 대학 · 학기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'city' && styles.filterChipActive]}
            onPress={() => setFilter('city')}
          >
            <Text style={[styles.filterChipText, filter === 'city' && styles.filterChipTextActive]}>같은 도시 · 학기</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.resultCount}>{users.length}명 찾았어요</Text>

        {users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>아직 등록된 사람이 없어요</Text>
            <Text style={styles.emptyBody}>회원 데이터가 쌓이면 여기에 실제 교환학생이 표시돼요.</Text>
          </View>
        ) : (
          users.map((user) => <StudentCard key={user.id} user={user} />)
        )}

        <Text style={styles.prototypeNote}>지금은 기능 테스트용 샘플 사용자예요. 다음 단계에서 실제 회원 DB와 연결할 거예요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StudentCard({ user }) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.studentCard}>
      <View style={styles.studentAvatar}><Text style={styles.studentAvatarText}>{user.name.slice(0, 1)}</Text></View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{user.name}</Text>
        <Text style={styles.studentSchool}>{user.homeUniversity}</Text>
        <Text style={styles.studentIntro}>{user.intro}</Text>
        <Text style={styles.studentMeta}>{user.universityName} · {user.semester}</Text>
      </View>
      <Text style={styles.studentArrow}>›</Text>
    </TouchableOpacity>
  );
}

function HomeScreen({ exchangeInfo, onRegister, onFind }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.miniBrand}>교환점</Text>
            <Text style={styles.hello}>안녕하세요 👋</Text>
          </View>
          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>B</Text>
          </View>
        </View>

        <View style={styles.destinationCard}>
          <Text style={styles.cardEyebrow}>MY EXCHANGE</Text>
          {exchangeInfo ? (
            <>
              <Text style={styles.destinationTitle}>
                {exchangeInfo.city ? `${exchangeInfo.city} · ` : ''}
                {exchangeInfo.universityName}
              </Text>
              <Text style={styles.destinationBody}>{exchangeInfo.country} · {exchangeInfo.semester}</Text>
              <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
                <Text style={styles.registerButtonText}>파견 정보 수정하기</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.destinationTitle}>아직 파견 정보를 등록하지 않았어요</Text>
              <Text style={styles.destinationBody}>대학과 학기를 등록하면 같은 파견지의 교환학생을 바로 찾을 수 있어요.</Text>
              <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
                <Text style={styles.registerButtonText}>파견 정보 등록하기</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>교환점에서 뭐 할까?</Text>
        <View style={styles.grid}>
          <QuickCard icon="✈️" title="교환학생 찾기" subtitle="같은 도시 · 대학 · 학기" onPress={onFind} />
          <QuickCard icon="💬" title="커뮤니티" subtitle="질문하고 정보 나누기" />
          <QuickCard icon="✓" title="준비 체크" subtitle="비자 · 서류 · 출국 준비" />
          <QuickCard icon="👤" title="내 정보" subtitle="프로필과 파견 정보" />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>지금 많이 찾는 이야기</Text>
          <Text style={styles.moreText}>전체보기</Text>
        </View>
        <View style={styles.postCard}>
          <Text style={styles.postBadge}>여행메이트</Text>
          <Text style={styles.postTitle}>코펜하겐에서 같이 여행 갈 사람?</Text>
          <Text style={styles.postMeta}>덴마크 · 2027년 1학기 · 방금</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <NavItem label="홈" icon="⌂" active />
        <NavItem label="찾기" icon="⌕" onPress={onFind} />
        <NavItem label="커뮤니티" icon="◫" />
        <NavItem label="마이" icon="○" />
      </View>
    </SafeAreaView>
  );
}

function QuickCard({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.quickCard} onPress={onPress}>
      <View style={styles.quickIconWrap}><Text style={styles.quickIcon}>{icon}</Text></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function NavItem({ label, icon, active = false, onPress }) {
  return (
    <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={onPress}>
      <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function normalizeRorOrganization(item) {
  const displayName = item.names?.find((name) => name.types?.includes('ror_display'))?.value || item.names?.[0]?.value || '이름 없는 기관';
  const location = item.locations?.[0]?.geonames_details || {};
  return {
    id: item.id,
    name: displayName,
    city: location.name || '',
    country: location.country_name || '',
    countryCode: location.country_code || '',
  };
}

function parseSemester(value) {
  const match = typeof value === 'string' ? value.match(/^(\d{4})년\s(.+)$/) : null;
  const parsedYear = Number(match?.[1]);
  const parsedTerm = match?.[2];
  return {
    year: YEARS.includes(parsedYear) ? parsedYear : 2027,
    term: TERMS.includes(parsedTerm) ? parsedTerm : '1학기',
  };
}

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  miniBrand: { fontSize: 15, fontWeight: '800', color: COLORS.green, marginBottom: 5 },
  hello: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
  profileCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center' },
  profileText: { color: COLORS.greenDark, fontSize: 17, fontWeight: '800' },
  destinationCard: { backgroundColor: COLORS.green, borderRadius: 24, padding: 22, marginBottom: 28 },
  cardEyebrow: { color: '#DCE8DE', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
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
  postTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  postMeta: { marginTop: 7, color: COLORS.subtext, fontSize: 11 },
  bottomNav: { position: 'absolute', left: 14, right: 14, bottom: 10, height: 72, borderRadius: 24, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: COLORS.line },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { color: '#9AA19C', fontSize: 19, fontWeight: '700' },
  navLabel: { color: '#9AA19C', fontSize: 11, fontWeight: '700' },
  navActive: { color: COLORS.green },
  formContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  formTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  cancelText: { fontSize: 15, color: COLORS.green, fontWeight: '700' },
  fieldWrap: { marginBottom: 22 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  helperText: { color: COLORS.subtext, fontSize: 12, marginBottom: 10 },
  input: { height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, paddingHorizontal: 15, fontSize: 15, color: COLORS.text },
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
  wheelHighlight: { position: 'absolute', left: 6, right: 6, top: WHEEL_ITEM_HEIGHT, height: WHEEL_ITEM_HEIGHT, borderRadius: 10, backgroundColor: COLORS.greenSoft, zIndex: 0 },
  wheelItem: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { color: '#9AA19C', fontSize: 14, fontWeight: '600' },
  wheelTextSelected: { color: COLORS.greenDark, fontSize: 16, fontWeight: '800' },
  semesterPreview: { marginTop: 10, textAlign: 'center', color: COLORS.greenDark, fontSize: 13, fontWeight: '800' },
  saveButton: { marginTop: 12, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  findHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  findContent: { paddingHorizontal: 20, paddingBottom: 40 },
  matchSummary: { backgroundColor: COLORS.greenSoft, borderRadius: 18, padding: 16, marginBottom: 14 },
  matchSummaryTitle: { color: COLORS.greenDark, fontSize: 16, fontWeight: '800' },
  matchSummaryMeta: { color: COLORS.subtext, fontSize: 12, marginTop: 6 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterChipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.white },
  resultCount: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  studentAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  studentAvatarText: { color: COLORS.greenDark, fontSize: 18, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  studentSchool: { color: COLORS.green, fontSize: 12, fontWeight: '700', marginTop: 3 },
  studentIntro: { color: COLORS.text, fontSize: 12, marginTop: 6 },
  studentMeta: { color: COLORS.subtext, fontSize: 10, marginTop: 5 },
  studentArrow: { color: COLORS.subtext, fontSize: 24, marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  emptyCard: { padding: 20, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  emptyBody: { color: COLORS.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 },
  prototypeNote: { color: COLORS.subtext, fontSize: 11, lineHeight: 17, marginTop: 10, textAlign: 'center' },
});
