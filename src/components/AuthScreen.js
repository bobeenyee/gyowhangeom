import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase, friendlyError } from '../lib/cloud';

const GREEN = '#486A55';
const BACKGROUND = '#F7F5EE';

export function AuthScreen() {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [noticeText, setNoticeText] = useState('');

  async function submit() {
    if (!email.includes('@') || password.length < 8) {
      setErrorText('올바른 이메일과 8자 이상의 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setErrorText('');
    setNoticeText('');
    try {
      if (registering) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: Platform.OS === 'web' && typeof window !== 'undefined'
            ? { emailRedirectTo: `${window.location.origin}/` }
            : undefined,
        });
        if (error) throw error;
        if (!data.session) {
          setNoticeText('가입 신청이 완료됐어요. 이메일의 확인 링크를 누른 뒤 로그인해 주세요. 인증 후 페이지가 닫혀도 이 화면에서 로그인할 수 있어요.');
          setRegistering(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setErrorText(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>교환점</Text>
          <Text style={styles.headline}>{registering ? '새 계정 만들기' : '로그인'}</Text>
          <Text style={styles.helper}>친구와 커뮤니티 글, 파견 정보, 체크인을 실제로 공유해요.</Text>
          <Text style={styles.fieldLabel}>이메일</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            textContentType="emailAddress" placeholder="이메일 주소" />
          <Text style={styles.fieldLabel}>비밀번호</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            secureTextEntry textContentType={registering ? 'newPassword' : 'password'}
            placeholder="8자 이상" />
          {!!errorText && <Text style={styles.error}>{errorText}</Text>}
          {!!noticeText && <Text style={styles.notice}>{noticeText}</Text>}
          <TouchableOpacity style={[styles.button, busy && { opacity: 0.6 }]}
            disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color="white" /> :
              <Text style={styles.buttonLabel}>{registering ? '회원가입' : '로그인'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setErrorText(''); setNoticeText(''); setRegistering((v) => !v); }} style={styles.toggle}>
            <Text style={styles.toggleLabel}>{registering ? '이미 계정이 있어요 · 로그인' : '계정이 없어요 · 회원가입'}</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            교환점 계정은 Expo 계정과 별개예요. 현재는 테스트용 서비스이며 중요한 개인 정보를 게시하지 마세요.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function SetupScreen({ onPreview }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.content, { justifyContent: 'center', flex: 1 }]}>
        <Text style={styles.brand}>교환점</Text>
        <Text style={styles.headline}>데이터베이스 연결 전이에요</Text>
        <Text style={styles.helper}>
          실제 회원가입과 데이터 공유를 사용하려면 Supabase 프로젝트를 만들고 README 안내대로 .env와 SQL을 설정해야 해요.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onPreview}>
          <Text style={styles.buttonLabel}>가상 데이터로 화면 미리보기</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>미리보기에서는 실제 회원이 없고 작성한 내용이 재실행하면 사라질 수 있어요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  content: { paddingHorizontal: 24, paddingVertical: 36, flexGrow: 1 },
  brand: { color: GREEN, fontSize: 28, fontWeight: '900', marginBottom: 42 },
  headline: { color: '#28312B', fontSize: 26, fontWeight: '800', marginBottom: 14 },
  helper: { fontSize: 15, lineHeight: 23, color: '#65756A', marginBottom: 28 },
  fieldLabel: { marginBottom: 8, fontSize: 14, color: '#28312B', fontWeight: '700' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E4DA', borderRadius: 14,
    height: 52, paddingHorizontal: 14, marginBottom: 18, fontSize: 15 },
  button: { height: 54, backgroundColor: GREEN, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginTop: 8 },
  buttonLabel: { fontSize: 16, fontWeight: '800', color: 'white' },
  toggle: { alignItems: 'center', padding: 18 },
  toggleLabel: { color: GREEN, fontWeight: '700' },
  error: { color: '#A34A4A', fontSize: 13, marginBottom: 12, lineHeight: 19 },
  notice: { color: GREEN, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  disclaimer: { marginTop: 18, lineHeight: 20, color: '#7A837D', fontSize: 12 },
});
