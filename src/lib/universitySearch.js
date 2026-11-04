// Bilingual university lookup. Only ROR-confirmed organization records are selectable.
// Korean aliases improve discovery; ROR ID remains the database identity.
const KOREAN_ALIASES = [
  ['코펜하겐대학교', 'University of Copenhagen'],
  ['코펜하겐대학', 'University of Copenhagen'],
  ['코펜하겐비즈니스스쿨', 'Copenhagen Business School'],
  ['코펜하겐경영대학', 'Copenhagen Business School'],
  ['덴마크공과대학교', 'Technical University of Denmark'],
  ['덴마크공대', 'Technical University of Denmark'],
  ['오르후스대학교', 'Aarhus University'],
  ['오르후스대학', 'Aarhus University'],
  ['로스킬레대학교', 'Roskilde University'],
  ['올보르대학교', 'Aalborg University'],
  ['남덴마크대학교', 'University of Southern Denmark'],
  ['헬싱키대학교', 'University of Helsinki'],
  ['스톡홀름대학교', 'Stockholm University'],
  ['룬드대학교', 'Lund University'],
  ['웁살라대학교', 'Uppsala University'],
  ['오슬로대학교', 'University of Oslo'],
  ['암스테르담대학교', 'University of Amsterdam'],
  ['라이덴대학교', 'Leiden University'],
  ['위트레흐트대학교', 'Utrecht University'],
  ['옥스퍼드대학교', 'University of Oxford'],
  ['케임브리지대학교', 'University of Cambridge'],
  ['에든버러대학교', 'University of Edinburgh'],
  ['토론토대학교', 'University of Toronto'],
  ['브리티시컬럼비아대학교', 'University of British Columbia'],
  ['맥길대학교', 'McGill University'],
  ['시드니대학교', 'University of Sydney'],
  ['멜버른대학교', 'University of Melbourne'],
  ['뉴사우스웨일스대학교', 'University of New South Wales'],
  ['도쿄대학교', 'University of Tokyo'],
  ['교토대학교', 'Kyoto University'],
  ['오사카대학교', 'Osaka University'],
  ['와세다대학교', 'Waseda University'],
  ['게이오대학교', 'Keio University'],
  ['서울대학교', 'Seoul National University'],
  ['연세대학교', 'Yonsei University'],
  ['고려대학교', 'Korea University'],
  ['국민대학교', 'Kookmin University'],
  ['이화여자대학교', 'Ewha Womans University'],
  ['한양대학교', 'Hanyang University'],
  ['성균관대학교', 'Sungkyunkwan University'],
  ['카이스트', 'Korea Advanced Institute of Science and Technology'],
  ['포항공과대학교', 'Pohang University of Science and Technology'],
];

const isKorean = (value) => /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value);
const normalize = (value) => value.toLowerCase().replace(/[\s·.,()[\]\-]/g, '').replace(/대학$/,'대학교');
const isEducation = (record) => Array.isArray(record?.types) && record.types.includes('education');

export function normalizeRorOrganization(item, koreanLabel = '') {
  const displayName = item.names?.find((name) => name.types?.includes('ror_display'))?.value
    || item.names?.[0]?.value || '이름 없는 기관';
  const location = item.locations?.[0]?.geonames_details || {};
  return {
    id: item.id,
    name: displayName,
    koreanLabel: koreanLabel || item.names?.find((n) => n.lang === 'ko' && n.value)?.value || '',
    city: location.name || '',
    country: location.country_name || '',
    countryCode: location.country_code || '',
    latitude: typeof location.lat === 'number' ? location.lat : null,
    longitude: typeof location.lng === 'number' ? location.lng : null,
  };
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('학교 검색 서버 오류: ' + response.status);
  return response.json();
}

async function findRorByName(query, signal) {
  const url = 'https://api.ror.org/v2/organizations?query='
    + encodeURIComponent(query) + '&filter=types:education';
  const data = await getJson(url, signal);
  return (data.items || []).filter(isEducation).slice(0, 10);
}

// Wikidata has Korean university labels and ROR-linked identifiers (P6782).
// Missing Wikidata data is never treated as a verified university; fall back to ROR.
async function findViaWikidata(koreanQuery, signal) {
  const base = 'https://www.wikidata.org/w/api.php?action=';
  const searchUrl = base + 'wbsearchentities&search=' + encodeURIComponent(koreanQuery)
    + '&language=ko&uselang=ko&type=item&limit=6&format=json&origin=*';
  const search = await getJson(searchUrl, signal);
  const ids = (search.search || []).map((x) => x.id).filter((id) => /^Q\d+$/.test(id)).slice(0, 6);
  if (!ids.length) return [];
  const getUrl = base + 'wbgetentities&ids=' + ids.join('%7C')
    + '&props=labels%7Cclaims&languages=en%7Cko&format=json&origin=*';
  const data = await getJson(getUrl, signal);
  const entities = ids.map((id) => data.entities?.[id]).filter(Boolean);
  const queries = entities.map((entity) => ({
    label: entity.labels?.ko?.value || '',
    english: entity.labels?.en?.value || '',
    rorId: entity.claims?.P6782?.find((claim) =>
      claim.mainsnak?.datavalue?.value)?.mainsnak?.datavalue?.value || '',
  })).filter((item) => item.english || item.rorId);

  const resolved = await Promise.allSettled(queries.map(async (item) => {
    const byId = /^([a-z0-9]{9})$/.test(item.rorId)
      ? await getJson('https://api.ror.org/v2/organizations/' + item.rorId, signal)
      : null;
    const items = byId ? [byId] : await findRorByName(item.english, signal);
    const exact = items.filter(isEducation).filter((result) => {
      if (byId) return true;
      const names = (result.names || []).map((x) => x.value?.toLowerCase());
      return names.includes(item.english.toLowerCase());
    });
    return exact.map((result) => normalizeRorOrganization(result, item.label));
  }));
  return resolved.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value);
}

function aliasesForQuery(query) {
  const normalized = normalize(query);
  if (normalized.length < 3) return [];
  const matching = KOREAN_ALIASES.filter(([korean]) => {
    const target = normalize(korean);
    return target === normalized || (normalized.length >= 4 && target.startsWith(normalized));
  }).slice(0, 5);
  return matching.map(([label, english]) => ({ label, english }));
}

export async function searchUniversities(query, signal) {
  const search = query.trim();
  if (search.length < 2) return [];
  const korean = isKorean(search);
  const aliases = korean ? aliasesForQuery(search) : [];
  const requests = [
    findRorByName(search, signal).then((rows) => rows.map((row) => normalizeRorOrganization(row))),
    ...aliases.map(async ({ english, label }) =>
      (await findRorByName(english, signal)).filter((row) =>
        (row.names || []).some((name) => name.value?.toLowerCase() === english.toLowerCase()))
        .map((row) => normalizeRorOrganization(row, label))),
  ];
  const initial = await Promise.allSettled(requests);
  const matches = initial.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
  if (korean && matches.length < 4) {
    try { matches.push(...await findViaWikidata(search, signal)); }
    catch (e) { if (e.name === 'AbortError') throw e; }
  }
  if (initial.every((r) => r.status === 'rejected') && !matches.length) {
    throw new Error('대학 검색 서비스에 연결하지 못했어요.');
  }
  const unique = new Map();
  for (const item of matches) if (item.id && !unique.has(item.id)) unique.set(item.id, item);
  return [...unique.values()].slice(0, 10);
}
