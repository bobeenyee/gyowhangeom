import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme';
import { friendlyError } from '../lib/cloud';

const REASONS = [
  { code: 'spam', label: '스팸·광고' },
  { code: 'harassment', label: '괴롭힘·비방' },
  { code: 'privacy', label: '개인정보 노출' },
  { code: 'other', label: '기타' },
];

// Kept separate from the existing ChatScreen styling and flows.
export function ChatSafetyPanel({
  mode, message, blockedUsers = [], onClose, onReport, onBlock, onUnblock,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);

  useEffect(() => {
    setError('');
    setConfirmBlock(false);
  }, [mode, message?.id]);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={Boolean(mode)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.title}>{mode === 'blocks' ? '차단한 사용자' : '메시지 신고·차단'}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} disabled={busy}>
              <Text style={styles.close}>닫기</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.contents} keyboardShouldPersistTaps="handled">
            {mode === 'message' && message && (
              <>
                <Text style={styles.helper}>
                  신고 내용은 운영 검토용으로만 저장돼요. 차단하면 이 사람의 오픈채팅 메시지가 내 화면에서 보이지 않아요.
                </Text>
                <View style={styles.message}>
                  <Text style={styles.sender}>{message.senderNickname || '참여자'}</Text>
                  <Text style={styles.messageText} numberOfLines={4}>{message.body}</Text>
                </View>
                <Text style={styles.label}>신고 사유 선택</Text>
                {REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.code} style={styles.item} disabled={busy}
                    onPress={() => run(() => onReport(message, reason.code))}
                    accessibilityRole="button"
                  >
                    <Text style={styles.itemText}>{reason.label}</Text>
                    <Text style={styles.arrow}>신고</Text>
                  </TouchableOpacity>
                ))}
                {confirmBlock ? (
                  <View style={styles.confirm}>
                    <Text style={styles.helper}>이 사용자를 차단할까요? 나중에 차단 목록에서 해제할 수 있어요.</Text>
                    <TouchableOpacity disabled={busy} onPress={() => run(() => onBlock(message))} style={styles.blockButton}>
                      <Text style={styles.blockText}>차단하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={busy} onPress={() => setConfirmBlock(false)} style={styles.cancelButton}>
                      <Text style={styles.cancelText}>취소</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity disabled={busy} onPress={() => setConfirmBlock(true)} style={styles.blockOutline}>
                    <Text style={styles.blockText}>이 사용자 차단</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {mode === 'blocks' && (
              <>
                <Text style={styles.helper}>차단을 해제하면 그 사용자의 메시지가 다시 표시될 수 있어요.</Text>
                {blockedUsers.length === 0 && <Text style={styles.helper}>차단한 사용자가 없어요.</Text>}
                {blockedUsers.map((user) => (
                  <View style={styles.blockedRow} key={user.blockedId}>
                    <Text style={styles.blockedName} numberOfLines={1}>{user.nickname || '차단한 사용자'}</Text>
                    <TouchableOpacity disabled={busy} onPress={() => run(() => onUnblock(user))} style={styles.unblockButton}>
                      <Text style={styles.unblockText}>차단 해제</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
          {busy && <ActivityIndicator color={COLORS.accent} style={{ marginBottom: 12 }} />}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, maxHeight: '85%', borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, padding: 20 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  close: { color: COLORS.accent, fontSize: 14, fontWeight: '700', padding: 6 },
  contents: { flexGrow: 0 },
  helper: { color: COLORS.subtext, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  message: { backgroundColor: COLORS.input, borderColor: COLORS.line, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  sender: { color: COLORS.accent, fontWeight: '700', marginBottom: 6, fontSize: 13 },
  messageText: { color: COLORS.text, fontSize: 14, lineHeight: 19 },
  label: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  item: { paddingVertical: 12, borderBottomColor: COLORS.line, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  itemText: { color: COLORS.text, fontSize: 14 },
  arrow: { color: COLORS.accent, fontSize: 13 },
  blockOutline: { borderColor: COLORS.error, borderWidth: 1, marginTop: 20, padding: 12, alignItems: 'center', borderRadius: 12 },
  blockButton: { backgroundColor: COLORS.errorSurface, borderWidth: 1, borderColor: COLORS.error, padding: 12, alignItems: 'center', borderRadius: 12 },
  blockText: { color: COLORS.error, fontSize: 14, fontWeight: '700' },
  confirm: { marginTop: 18 },
  cancelButton: { padding: 12, alignItems: 'center' },
  cancelText: { color: COLORS.subtext, fontSize: 14 },
  blockedRow: { paddingVertical: 12, borderBottomColor: COLORS.line, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockedName: { color: COLORS.text, flex: 1, marginRight: 12, fontSize: 14 },
  unblockButton: { padding: 9, borderRadius: 9, borderWidth: 1, borderColor: COLORS.accent },
  unblockText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  error: { color: COLORS.error, fontSize: 12, lineHeight: 18, marginTop: 8 },
});
