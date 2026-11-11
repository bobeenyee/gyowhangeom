import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

// Supabase publishable keys are public client identifiers, NOT secrets.
// Secret / service_role keys must never appear here.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || 'https://dtrkktdxalajyncanzlc.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_ze6DaMfp1x_bUVEyeuAO0Q_I1jeZuwM';

export const isCloudConfigured = Boolean(url && key && /^https:\/\//.test(url));
export const supabase = isCloudConfigured
  ? createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
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
  if (/Email address not authorized|email_address_not_authorized/i.test(message)) return 'Supabase 기본 이메일 서버는 해당 프로젝트 팀원에게만 메일을 보낼 수 있어요. 팀 초대 또는 SMTP 설정이 필요합니다.';
  if (/UNIVERSITY_NOT_VERIFIED/.test(message)) return '대학 인증이 승인된 뒤에 이용할 수 있어요.';
  if (/relation .* does not exist|Could not find the table|Could not find the function|schema cache|Bucket not found/i.test(message)) {
    return '데이터베이스 설정이 아직 완료되지 않았어요. README의 SQL 설치 단계를 확인해 주세요.';
  }
  return message;
}

// Tables and columns added by the later SQL files: login keeps working on a database that has not applied them yet.
function unpackOptional(result) {
  if (['42P01', 'PGRST205', '42703'].includes(result.error?.code)) return null;
  return unpack(result);
}

export function toProfile(row) {
  return row ? {
    onboardingDone: row.onboarding_done !== false,
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
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    courses: row.courses || [],
    courseStatus: row.course_status || 'planned',
  } : null;
}

export function toInterest(row) {
  return row ? {
    region: row.region || '',
    universityId: row.university_id || '',
    universityName: row.university_name || '',
    country: row.country || '',
    countryCode: row.country_code || '',
    city: row.city || '',
  } : null;
}

export async function loadAccount(userId) {
  const [profileResult, exchangeResult, checklistResult, interestResult, verificationResult] = await Promise.all([
    supabase.from('people_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('exchange_assignments').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('checklist_items').select('item_key,done').eq('user_id', userId),
    supabase.from('exchange_interests').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('university_verifications').select('status,email').eq('user_id', userId).maybeSingle(),
  ]);
  let rawProfile = unpack(profileResult);
  if (!rawProfile) {
    const created = unpack(await supabase.from('people_profiles').upsert(
      { user_id: userId, nickname: '교환학생', discoverable: false },
      { onConflict: 'user_id', ignoreDuplicates: true }
    ).select('*').maybeSingle());
    rawProfile = created || unpack(await supabase.from('people_profiles')
      .select('*').eq('user_id', userId).single());
  }
  const rawExchange = unpack(exchangeResult);
  const rawChecks = unpack(checklistResult);
  const rawVerification = unpackOptional(verificationResult);
  return {
    profile: toProfile(rawProfile),
    exchangeInfo: toExchange(rawExchange),
    exchangeInterest: rawExchange ? null : toInterest(unpackOptional(interestResult)),
    verification: rawVerification ? { status: rawVerification.status, email: rawVerification.email } : null,
    checks:Object.fromEntries((rawChecks || []).map(({ item_key, done }) => [item_key, done])),
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
    start_date: info.startDate || null,
    end_date: info.endDate || null,
    courses: (info.courses || []).slice(0, 12).map((x) => x.slice(0, 60)),
    course_status: info.courseStatus || 'planned',
  }, { onConflict: 'user_id' }));
  unpackOptional(await supabase.from('exchange_interests').delete().eq('user_id', userId));
}

export async function saveInterest(userId, interest) {
  unpack(await supabase.from('exchange_interests').upsert({
    user_id: userId,
    region: interest.region.trim().slice(0, 120),
    university_id: interest.universityId || '',
    university_name: interest.universityName || '',
    country: interest.country || '',
    country_code: interest.countryCode || '',
    city: interest.city || '',
  }, { onConflict: 'user_id' }));
  unpack(await supabase.from('exchange_assignments').delete().eq('user_id', userId));
}

export async function completeOnboarding(userId) {
  unpack(await supabase.from('people_profiles').update({ onboarding_done: true }).eq('user_id', userId));
}

// Same rule as private.is_university_email in supabase/university_email.sql, which is what actually decides.
export function isUniversityEmail(email) {
  const clean = email.trim().toLowerCase();
  return /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+(ac\.[a-z]{2}|edu|edu\.[a-z]{2})$/.test(clean) || clean.endsWith('@ewhain.net');
}

export async function requestUniversityCode(email) {
  const { error } = await supabase.functions.invoke('send-university-code', { body: { email: email.trim().toLowerCase() } });
  if (!error) return;
  const body = await error.context?.json?.().catch(() => null);
  throw new Error(body?.error || '인증 메일 서버가 아직 준비되지 않았어요. README의 이메일 인증 설정을 확인해 주세요.');
}

export async function confirmUniversityCode(code) {
  return unpack(await supabase.rpc('confirm_university_email_code', { p_code: code }));
}

function toListing(row) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerNickname: row.seller_nickname,
    title: row.title,
    description: row.description,
    priceText: row.price_text,
    category: row.category,
    country: row.country,
    countryCode: row.country_code,
    city: row.city,
    status: row.status,
    photoPath: row.photo_path || null,
    photoUrl: row.photo_path ? supabase.storage.from('market-photos').getPublicUrl(row.photo_path).data.publicUrl : null,
    handoffDate: row.handoff_date || '',
    handoffNote: row.handoff_note || '',
    canHold: Boolean(row.can_hold),
    time: new Date(row.created_at).toLocaleDateString('ko-KR'),
  };
}

export async function loadListings() {
  const data = unpack(await supabase.from('market_listings').select('*').order('created_at', { ascending: false }).limit(100));
  return (data || []).map(toListing);
}

export async function createListing(listing) {
  return unpack(await supabase.rpc('create_market_listing', {
    p_title: listing.title,
    p_description: listing.description,
    p_price_text: listing.priceText,
    p_category: listing.category,
  }));
}

// Listings are created with the existing verified-user RPC before optional metadata is saved.
// The seller-only RLS policy and column grants protect these later updates.
export async function updateListingHandoff(listingId, details) {
  unpack(await supabase.from('market_listings').update({
    handoff_date: details.handoffDate || null,
    handoff_note: String(details.handoffNote || '').slice(0, 250),
    can_hold: Boolean(details.canHold),
  }).eq('id', listingId));
}

export async function uploadListingPhoto(listingId, userId, base64Image) {
  const bytes = decode(base64Image);
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('사진은 5MB 이하로 첨부해 주세요.');
  const path = `${userId}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.jpg`;
  const storage = supabase.storage.from('market-photos');
  unpack(await storage.upload(path, bytes, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  }));
  try {
    const update = await supabase.from('market_listings')
      .update({ photo_path: path }).eq('id', listingId).eq('seller_id', userId)
      .select('id');
    const rows = unpack(update);
    if (!rows?.length) throw new Error('사진을 등록할 권한이 없어요.');
  } catch (error) {
    // Avoid leaving an orphan when attaching the image to the item fails.
    try { await storage.remove([path]); } catch (cleanupError) {
      console.warn('Photo cleanup failed:', cleanupError);
    }
    throw error;
  }
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function setListingStatus(listingId, status) {
  unpack(await supabase.from('market_listings').update({ status }).eq('id', listingId));
}

export async function startChat(listingId) {
  return unpack(await supabase.rpc('start_market_chat', { p_listing_id: listingId }));
}

export async function loadChats(userId) {
  const data = unpack(await supabase.from('market_conversations')
    .select('id,listing_id,buyer_id,seller_id,buyer_nickname,market_listings(title,seller_nickname)')
    .order('created_at', { ascending: false }));
  return (data || []).map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.market_listings?.title || '삭제된 게시글',
    otherNickname: row.buyer_id === userId ? row.market_listings?.seller_nickname || '판매자' : row.buyer_nickname,
    role: row.buyer_id === userId ? '구매 문의' : '내 물건 문의',
  }));
}

export async function loadMessages(conversationId) {
  const data = unpack(await supabase.from('market_messages').select('id,sender_id,body,created_at')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(500));
  return (data || []).map((row) => ({ id: row.id, senderId: row.sender_id, body: row.body }));
}

export async function sendMessage(conversationId, body) {
  unpack(await supabase.rpc('send_market_message', { p_conversation_id: conversationId, p_body: body }));
}

export async function loadOpenChatRooms() {
  const data = unpack(await supabase.rpc('list_open_chat_rooms'));
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    country: row.country,
    countryCode: row.country_code,
    city: row.city,
    memberCount: Number(row.member_count),
    isMember: row.is_member,
  }));
}

export async function createOpenChatRoom(room) {
  return unpack(await supabase.rpc('create_open_chat_room', { p_title: room.title, p_description: room.description }));
}

export async function joinOpenChatRoom(roomId) {
  unpack(await supabase.rpc('join_open_chat_room', { p_room_id: roomId }));
}

export async function leaveOpenChatRoom(roomId) {
  unpack(await supabase.rpc('leave_open_chat_room', { p_room_id: roomId }));
}

export async function loadOpenChatMessages(roomId) {
  const data = unpack(await supabase.from('open_chat_messages').select('id,sender_id,sender_nickname,body')
    .eq('room_id', roomId).order('created_at', { ascending: true }).limit(500));
  return (data || []).map((row) => ({ id: row.id, senderId: row.sender_id, senderNickname: row.sender_nickname, body: row.body }));
}

export async function sendOpenChatMessage(roomId, body) {
  unpack(await supabase.rpc('send_open_chat_message', { p_room_id: roomId, p_body: body }));
}

// Moderation actions are limited to the authenticated account by database RLS.
export async function reportOpenChatMessage(messageId, reason) {
  unpack(await supabase.rpc('report_open_chat_message', {
    p_message_id: messageId,
    p_reason: reason,
  }));
}

export async function blockOpenChatUser(blockerId, blockedId, nickname = '') {
  const result = await supabase.from('open_chat_user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
    blocked_nickname: String(nickname).slice(0, 64),
  });
  if (result.error && result.error.code !== '23505') throw result.error;
}

export async function loadBlockedOpenChatUsers(blockerId) {
  const data = unpack(await supabase.from('open_chat_user_blocks')
    .select('blocked_id,blocked_nickname,created_at')
    .eq('blocker_id', blockerId).order('created_at', { ascending: false }));
  return (data || []).map((row) => ({
    blockedId: row.blocked_id, nickname: row.blocked_nickname,
  }));
}

export async function unblockOpenChatUser(blockerId, blockedId) {
  unpack(await supabase.from('open_chat_user_blocks').delete()
    .eq('blocker_id', blockerId).eq('blocked_id', blockedId));
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

export async function loadPosts(exchangeInfo = null, scope = 'all', selectedSemester = undefined) {
  if (scope !== 'all' && !exchangeInfo) return [];
  let query = supabase.from('posts')
    .select('id,category,title,body,country_code,city,year,term,university_id,created_at,comments(id,body,created_at)');
  // The default is the user's registered cohort. Explicit "전체 학기" removes term filtering.
  const semester = selectedSemester === undefined ? exchangeInfo?.semester : selectedSemester;
  if (semester && semester !== '전체 학기') {
    const match = semester.match(/^(\d{4})년\s(.+)$/);
    if (!match) return [];
    query = query.eq('year', Number(match[1])).eq('term', match[2]);
  }
  if (scope !== 'all' && exchangeInfo) {
    if (scope === 'school') query = query.eq('university_id', exchangeInfo.universityId);
    else if (scope === 'city') query = query.eq('country_code', exchangeInfo.countryCode).eq('city', exchangeInfo.city);
    else if (scope === 'country') query = query.eq('country_code', exchangeInfo.countryCode);
  }
  const data = unpack(await query.order('created_at', { ascending: false }).limit(60));
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

export async function reportPost(userId, postId, reason) {
  unpack(await supabase.from('content_reports').insert({
    reporter_id: userId, post_id: postId, reason,
  }));
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
