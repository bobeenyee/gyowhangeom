import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isCloudConfigured = Boolean(url && key && /^https:\/\//.test(url));
export const supabase = isCloudConfigured
  ? createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

function unpack(result) {
  if (result.error) throw result.error;
  return result.data;
}

export function friendlyError(error) {
  const message = String(error?.message || error || '알 수 없는 오류');
  if (/Failed to fetch|Network request failed/i.test(message)) return '서버에 연결하지 못했어요. 인터넷을 확인해 주세요.';
  if (/Invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 올바르지 않아요.';
  if (/Email not confirmed/i.test(message)) return '가입 확인 메일을 먼저 확인해 주세요.';
  if (/relation .* does not exist|Could not find the table|Could not find the function/i.test(message)) {
    return '데이터베이스 설정이 아직 완료되지 않았어요. README의 SQL 설치 단계를 확인해 주세요.';
  }
  return message;
}

export function toProfile(row) {
  return row ? {
    nickname: row.nickname || '교환학생',
    homeUniversity: row.home_university || '',
    showHomeUniversity: Boolean(row.show_home_university),
    discoverable: row.discoverable !== false,
    intro: row.intro || '',
    interests: row.interests || [],
    style: row.travel_style || [],
  } : null;
}

export function toExchange(row) {
  return row ? {
    universityId: row.university_id,
    universityName: row.university_name,
    country: row.country,
    countryCode: row.country_code,
    city: row.city,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    semester: row.year + '년 ' + row.term,
  } : null;
}

export async function loadAccount(userId) {
  const [profileResult, exchangeResult, checklistResult] = await Promise.all([
    supabase.from('people_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('exchange_assignments').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('checklist_items').select('item_key,done').eq('user_id', userId),
  ]);
  const rawProfile = unpack(profileResult);
  const rawExchange = unpack(exchangeResult);
  const rawChecks = unpack(checklistResult);
  return {
    profile: toProfile(rawProfile),
    exchangeInfo: toExchange(rawExchange),
    checks: Object.fromEntries((rawChecks || []).map(({ item_key, done }) => [item_key, done])),
  };
}

export async function saveProfile(userId, profile) {
  unpack(await supabase.from('people_profiles').upsert({
    user_id: userId,
    nickname: profile.nickname.trim().slice(0, 32) || '교환학생',
    home_university: profile.homeUniversity.trim().slice(0, 120),
    show_home_university: Boolean(profile.showHomeUniversity),
    discoverable: profile.discoverable !== false,
    intro: profile.intro.trim().slice(0, 300),
    interests: profile.interests.slice(0, 8).map((x) => x.slice(0, 24)),
    travel_style: profile.style.slice(0, 8).map((x) => x.slice(0, 24)),
  }, { onConflict: 'user_id' }));
}

export async function saveExchange(userId, info) {
  const match = info.semester.match(/^(\d{4})년\s(.+)$/);
  if (!match) throw new Error('파견 학기를 다시 선택해 주세요.');
  unpack(await supabase.from('exchange_assignments').upsert({
    user_id: userId,
    university_id: info.universityId,
    university_name: info.universityName,
    country: info.country,
    country_code: info.countryCode,
    city: info.city,
    latitude: info.latitude,
    longitude: info.longitude,
    year: Number(match[1]),
    term: match[2],
  }, { onConflict: 'user_id' }));
}

export async function loadPeople(info) {
  if (!info?.countryCode) return [];
  const match = info.semester.match(/^(\d{4})년\s(.+)$/);
  if (!match) return [];
  const records = unpack(await supabase.rpc('get_discoverable_people', {
    p_country_code: info.countryCode,
    p_year: Number(match[1]),
    p_term: match[2],
  }));
  return (records || []).map((row) => ({
    id: row.user_id,
    nickname: row.nickname,
    universityId: row.university_id,
    universityName: row.university_name,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    semester: row.year + '년 ' + row.term,
    homeUniversity: row.home_university || '',
    showHomeUniversity: Boolean(row.home_university),
    intro: row.intro || '',
    interests: row.interests || [],
    style: row.travel_style || [],
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
  }));
}

export async function loadPosts() {
  const data = unpack(await supabase.from('posts')
    .select('id,category,title,body,country_code,city,year,term,university_id,created_at,comments(id,body,created_at)')
    .order('created_at', { ascending: false }).limit(60));
  return (data || []).map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    meta: [row.city, row.year && row.term ? row.year + '년 ' + row.term : null].filter(Boolean).join(' · ') || '교환 커뮤니티',
    time: new Date(row.created_at).toLocaleDateString('ko-KR'),
    likes: 0,
    comments: (row.comments || []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((c) => c.body),
  }));
}

export async function createPost(post, exchangeInfo) {
  const match = exchangeInfo?.semester?.match(/^(\d{4})년\s(.+)$/);
  unpack(await supabase.rpc('create_anonymous_post', {
    p_category: post.category,
    p_title: post.title,
    p_body: post.body,
    p_country_code: exchangeInfo?.countryCode || '',
    p_city: exchangeInfo?.city || '',
    p_year: match ? Number(match[1]) : null,
    p_term: match ? match[2] : '',
    p_university_id: exchangeInfo?.universityId || '',
  }));
}

export async function createComment(postId, body) {
  unpack(await supabase.rpc('create_anonymous_comment', { p_post_id: postId, p_body: body }));
}

export async function saveCheck(userId, itemKey, done) {
  unpack(await supabase.from('checklist_items').upsert(
    { user_id: userId, item_key: itemKey, done }, { onConflict: 'user_id,item_key' }
  ));
}

export function roomKey(info) {
  if (!info?.countryCode || !info?.city || !info?.semester) return null;
  return [info.countryCode, info.city.trim().toLowerCase(), info.semester].join('|');
}

export const CHECKIN_QUESTION = 'departure-date-v1';

export async function loadCheckin(info, userId) {
  const room = roomKey(info);
  if (!room) return '';
  const data = unpack(await supabase.from('checkin_answers').select('answer')
    .eq('user_id', userId).eq('room_key', room).eq('question_key', CHECKIN_QUESTION).maybeSingle());
  return data?.answer || '';
}

export async function saveCheckin(info, userId, answer) {
  const room = roomKey(info);
  if (!room) throw new Error('먼저 파견 대학과 학기를 등록해 주세요.');
  unpack(await supabase.from('checkin_answers').upsert({
    user_id: userId, room_key: room, question_key: CHECKIN_QUESTION, answer: answer.trim().slice(0, 40),
  }, { onConflict: 'user_id,room_key,question_key' }));
}

export async function getCheckinSummary(info) {
  const room = roomKey(info);
  if (!room) return [];
  return unpack(await supabase.rpc('get_checkin_summary', { p_room_key: room, p_question_key: CHECKIN_QUESTION })) || [];
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((x) => Number.isFinite(x))) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) * 10) / 10;
}
