import React, { useState } from 'react';
import {
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

const SEMESTER_OPTIONS = [
  '2027년 1학기',
  '2027년 2학기',
  '2027년 여름계절학기',
  '2027년 겨울계절학기',
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

  return (
    <HomeScreen
      exchangeInfo={exchangeInfo}
      onRegister={() => setScreen('register')}
    />
  );
}

function ExchangeRegistrationScreen({ initialValue, onCancel, onSave }) {
  const [country, setCountry] = useState(initialValue?.country || '');
  const [city, setCity] = useState(initialValue?.city || '');
  const [university, setUniversity] = useState(initialValue?.university || '');
  const [semester, setSemester] = useState(
    SEMESTER_OPTIONS.includes(initialValue?.semester) ? initialValue.semester : ''
  );

  const canSave = country.trim() && city.trim() && university.trim() && semester;

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

        <Field label="국가" value={country} onChangeText={setCountry} placeholder="예: 덴마크" />
        <Field label="도시" value={city} onChangeText={setCity} placeholder="예: 코펜하겐" />
        <Field label="파견 대학" value={university} onChangeText={setUniversity} placeholder="예: University of Copenhagen" />

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>파견 학기</Text>
          <View style={styles.semesterGrid}>
            {SEMESTER_OPTIONS.map((option) => {
              const selected = semester === option;
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.8}
                  style={[styles.semesterOption, selected && styles.semesterOptionSelected]}
                  onPress={() => setSemester(option)}
                >
                  <Text style={[styles.semesterOptionText, selected && styles.semesterOptionTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={() => onSave({
            country: country.trim(),
            city: city.trim(),
            university: university.trim(),
            semester,
          })}
        >
          <Text style={styles.saveButtonText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A1A7A2"
      />
    </View>
  );
}

function HomeScreen({ exchangeInfo, onRegister }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.miniBrand}>교환점</Text>
            <Text style={styles.hello}>안녕하세요 👋</Text>
          </View>
          <View style={styles.profileCircle}><Text style={styles.profileText}>B</Text></View>
        </View>

        <View style={styles.destinationCard}>
          <Text style={styles.cardEyebrow}>MY EXCHANGE</Text>
          {exchangeInfo ? (
            <>
              <Text style={styles.destinationTitle}>{exchangeInfo.city} · {exchangeInfo.university}</Text>
              <Text style={styles.destinationBody}>{exchangeInfo.country} · {exchangeInfo.semester}</Text>
              <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
                <Text style={styles.registerButtonText}>파견 정보 수정하기</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.destinationTitle}>아직 파견 정보를 등록하지 않았어요</Text>
              <Text style={styles.destinationBody}>국가 · 대학 · 학기를 등록하면 나와 같은 교환학생을 바로 찾을 수 있어요.</Text>
              <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
                <Text style={styles.registerButtonText}>파견 정보 등록하기</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>교환점에서 뭐 할까?</Text>
        <View style={styles.grid}>
          <QuickCard icon="✈️" title="교환학생 찾기" subtitle="같은 도시 · 대학 · 학기" />
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
        <NavItem label="찾기" icon="⌕" />
        <NavItem label="커뮤니티" icon="◫" />
        <NavItem label="마이" icon="○" />
      </View>
    </SafeAreaView>
  );
}

function QuickCard({ icon, title, subtitle }) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.quickCard}>
      <View style={styles.quickIconWrap}><Text style={styles.quickIcon}>{icon}</Text></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function NavItem({ label, icon, active = false }) {
  return (
    <TouchableOpacity style={styles.navItem} activeOpacity={0.8}>
      <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );
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
  fieldWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  input: { height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, paddingHorizontal: 15, fontSize: 15, color: COLORS.text },
  semesterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  semesterOption: { width: '48.5%', minHeight: 50, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  semesterOptionSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  semesterOptionText: { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  semesterOptionTextSelected: { color: COLORS.white },
  saveButton: { marginTop: 12, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
