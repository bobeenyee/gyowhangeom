import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme';

// Existing post categories: no DB migration or changes to the friend's post format.
export const COMMUNITY_BOARDS = [
  { key: '질문', label: '질문·답변', hint: '서류 · 비자 · CPR' },
  { key: '생활', label: '현지 생활', hint: '숙소 · 교통 · 맛집' },
  { key: '수업', label: '수업·학점', hint: '강의 · 수강신청' },
  { key: '여행메이트', label: '여행·동행', hint: '주말 여행 · 모임' },
];
export const DEFAULT_FAVORITE_BOARDS = ['질문', '생활', '여행메이트'];
export const COMMUNITY_ALL_TERMS = '전체 학기';

export function boardTitle(key) {
  return COMMUNITY_BOARDS.find((board) => board.key === key)?.label || key;
}

export function FavoriteBoardSection({ favorites = [], onToggle, onOpen, compact = false }) {
  const [editing, setEditing] = useState(false);
  const visible = editing ? COMMUNITY_BOARDS : COMMUNITY_BOARDS.filter((board) => favorites.includes(board.key));

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>☆ 즐겨찾는 게시판</Text>
          <Text style={styles.sectionSub}>자주 보는 게시판부터 빠르게 찾아가요.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.editAction} onPress={() => setEditing((value) => !value)}>
          <Text style={styles.editText}>{editing ? '완료' : '편집'}</Text>
        </TouchableOpacity>
      </View>
      {visible.length === 0 && <Text style={styles.empty}>즐겨찾기가 비어 있어요. 편집을 눌러 게시판을 추가해 보세요.</Text>}
      <View style={styles.boardGrid}>
        {visible.map((board) => {
          const chosen = favorites.includes(board.key);
          return (
            <TouchableOpacity
              key={board.key}
              accessibilityRole="button"
              accessibilityLabel={editing ? board.label + (chosen ? ' 즐겨찾기 해제' : ' 즐겨찾기 추가') : board.label + ' 게시판 열기'}
              activeOpacity={0.8}
              style={[styles.boardTile, compact && styles.boardTileCompact, editing && chosen && styles.boardTileChosen]}
              onPress={() => editing ? onToggle(board.key) : onOpen(board.key)}
            >
              <View style={styles.boardTop}>
                <Text style={styles.boardTitle} numberOfLines={1}>{board.label}</Text>
                <Text style={[styles.star, chosen && styles.starSelected]}>{chosen ? '★' : '☆'}</Text>
              </View>
              <Text style={styles.boardHint} numberOfLines={1}>{board.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function semesterOptions(current, registered) {
  const seed = current && current !== COMMUNITY_ALL_TERMS
    ? current : registered || `${new Date().getFullYear()}년 1학기`;
  const year = Number(seed.match(/\d{4}/)?.[0]) || new Date().getFullYear();
  const terms = [COMMUNITY_ALL_TERMS];
  for (const y of [year - 1, year, year + 1]) {
    if (y < 2026 || y > 2050) continue;
    terms.push(`${y}년 1학기`, `${y}년 2학기`);
  }
  if (registered && !terms.includes(registered)) terms.push(registered);
  if (current && !terms.includes(current)) terms.push(current);
  return terms;
}

export function CommunityScopeSelector({ scope, onScopeChange, exchangeInfo, semester, onSemesterChange }) {
  const [showSemesters, setShowSemesters] = useState(false);
  const areas = [
    { key: 'all', title: '전체', detail: '모든 파견지' },
    ...(exchangeInfo ? [
      { key: 'country', title: '국가', detail: exchangeInfo.country || '내 국가' },
      { key: 'city', title: '도시', detail: exchangeInfo.city || '내 도시' },
      { key: 'school', title: '학교', detail: exchangeInfo.universityName || '내 대학' },
    ] : []),
  ];
  const selected = areas.find((area) => area.key === scope) || areas[0];
  const options = useMemo(
    () => semesterOptions(semester, exchangeInfo?.semester),
    [semester, exchangeInfo?.semester],
  );

  return (
    <View style={styles.selectorBlock}>
      <Text style={styles.selectorEyebrow}>교환학생 게시판</Text>
      <Text style={styles.selectorTitle}>{selected.detail}</Text>
      <Text style={styles.selectorSub}>내가 필요한 지역의 글만 골라볼 수 있어요.</Text>
      <View style={styles.areaTabs}>
        {areas.map((area) => (
          <TouchableOpacity
            key={area.key}
            accessibilityRole="button"
            accessibilityState={{ selected: scope === area.key }}
            onPress={() => onScopeChange(area.key)}
            style={[styles.areaTab, scope === area.key && styles.areaTabActive]}
          >
            <Text style={[styles.areaTabText, scope === area.key && styles.areaTabTextActive]}>{area.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!exchangeInfo && <Text style={styles.selectorHelp}>파견 정보를 등록하면 국가·도시·학교별 게시판이 열려요.</Text>}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => setShowSemesters((value) => !value)}
        style={styles.semesterToggle}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.semesterKicker}>파견 학기</Text>
          <Text style={styles.semesterCurrent}>{semester || COMMUNITY_ALL_TERMS}</Text>
        </View>
        <Text style={styles.semesterArrow}>{showSemesters ? '접기  ˄' : '변경  ˅'}</Text>
      </TouchableOpacity>
      {showSemesters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterChoices}>
          {options.map((value) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: semester === value }}
              style={[styles.semesterChip, semester === value && styles.semesterChipActive]}
              onPress={() => { onSemesterChange(value); setShowSemesters(false); }}
            >
              <Text style={[styles.semesterChipText, semester === value && styles.semesterChipTextActive]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <Text style={styles.scopeNotice}>지역과 학기를 바꾸면 실제 게시글 검색 조건도 함께 바뀌어요.</Text>
    </View>
  );
}

export function CompactCommunityPost({ post, onOpen, last = false }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.78}
      onPress={() => onOpen(post.id)}
      style={[styles.postRow, !last && styles.postRowBorder]}
    >
      <View style={styles.postTop}>
        <Text style={styles.postBoard}>{boardTitle(post.category || '이야기')}</Text>
        <Text style={styles.postTime}>{post.time || ''}</Text>
      </View>
      <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
      {!!post.body && <Text style={styles.postExcerpt} numberOfLines={1}>{post.body}</Text>}
      <View style={styles.postBottom}>
        <Text style={styles.postPlace} numberOfLines={1}>익명 · {post.meta || '교환 커뮤니티'}</Text>
        <Text style={styles.postReplies}>댓글 {post.comments?.length || 0}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function HomeCommunitySection({
  favorites, onToggleFavorite, onOpenBoard, posts = [], onOpenPost, onAllPosts, preview,
}) {
  // This is not a likes-based HOT ranking: Supabase has no post likes yet.
  const hasReplies = posts.some((post) => (post.comments?.length || 0) > 0);
  const highlighted = hasReplies
    ? [...posts].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0)).slice(0, 3)
    : posts.slice(0, 3);

  return (
    <View style={styles.homeCommunity}>
      <FavoriteBoardSection favorites={favorites} onToggle={onToggleFavorite} onOpen={onOpenBoard} compact />
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionTitle}>{hasReplies ? '◈ 댓글 많은 이야기' : '◈ 새로 올라온 이야기'}</Text>
          <Text style={styles.sectionSub}>{preview ? '화면 확인용 예시 게시글' : '현재 선택한 지역·학기 기준'}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={onAllPosts} style={styles.editAction}>
          <Text style={styles.editText}>더 보기 ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.postsCard}>
        {highlighted.length > 0
          ? highlighted.map((post, i) => <CompactCommunityPost key={post.id} post={post} last={i === highlighted.length - 1} onOpen={onOpenPost} />)
          : <Text style={styles.empty}>아직 올라온 글이 없어요. 첫 질문을 남겨보세요.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  homeCommunity: { marginBottom: 22 },
  section: { marginBottom: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { color: COLORS.subtext, fontSize: 11, marginTop: 5 },
  editAction: { paddingHorizontal: 8, paddingVertical: 8 },
  editText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  boardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boardTile: { width: '48%', minHeight: 78, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, padding: 13, justifyContent: 'center' },
  boardTileCompact: { minHeight: 76 },
  boardTileChosen: { borderColor: COLORS.accent },
  boardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  boardTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: COLORS.text },
  boardHint: { color: COLORS.subtext, fontSize: 10, marginTop: 6 },
  star: { color: COLORS.muted, fontSize: 17 },
  starSelected: { color: COLORS.accent },
  empty: { fontSize: 12, lineHeight: 20, color: COLORS.subtext, padding: 18 },
  selectorBlock: { backgroundColor: COLORS.surface, borderColor: COLORS.line, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 24 },
  selectorEyebrow: { color: COLORS.accent, fontWeight: '800', fontSize: 11 },
  selectorTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 6 },
  selectorSub: { color: COLORS.subtext, fontSize: 12, marginTop: 6 },
  areaTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.line, marginTop: 18 },
  areaTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  areaTabActive: { borderBottomColor: COLORS.accent },
  areaTabText: { color: COLORS.subtext, fontSize: 13, fontWeight: '700' },
  areaTabTextActive: { color: COLORS.accent, fontWeight: '800' },
  selectorHelp: { marginTop: 10, fontSize: 11, color: COLORS.subtext, lineHeight: 18 },
  semesterToggle: { marginTop: 14, backgroundColor: COLORS.input, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 12, flexDirection: 'row', alignItems: 'center' },
  semesterKicker: { color: COLORS.subtext, fontSize: 10 },
  semesterCurrent: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  semesterArrow: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  semesterChoices: { paddingTop: 10, paddingBottom: 3, gap: 8, flexDirection: 'row' },
  semesterChip: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: COLORS.line, borderRadius: 20 },
  semesterChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  semesterChipText: { color: COLORS.subtext, fontSize: 11, fontWeight: '700' },
  semesterChipTextActive: { color: COLORS.accent },
  scopeNotice: { color: COLORS.muted, fontSize: 10, marginTop: 10 },
  postsCard: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, paddingHorizontal: 14, overflow: 'hidden' },
  postRow: { paddingVertical: 13, minHeight: 99 },
  postRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  postTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  postBoard: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  postTime: { color: COLORS.muted, fontSize: 10 },
  postTitle: { color: COLORS.text, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  postExcerpt: { color: COLORS.subtext, fontSize: 12, marginTop: 3, lineHeight: 18 },
  postBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  postPlace: { color: COLORS.muted, fontSize: 10, flex: 1 },
  postReplies: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
});
