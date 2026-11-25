import React, { useEffect, useState } from 'react';
import { Alert as NativeAlert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme';

// react-native-web's Alert.alert does nothing, so the web shows its own dialog through AppAlertHost.
// iOS and Android keep the system alert.
let queue = [];
let notify = null;

function update(next) {
  queue = next;
  notify?.(queue);
}

export const Alert = {
  alert(title, message = '', buttons) {
    if (Platform.OS !== 'web') { NativeAlert.alert(title, message, buttons); return; }
    // Several requests can fail together with the same message; showing it once is enough.
    if (queue.some((item) => item.title === title && item.message === message)) return;
    update([...queue, { title, message, buttons: buttons?.length ? buttons : [{ text: '확인' }] }]);
  },
};

// Mount once, next to the app's root.
export function AppAlertHost() {
  const [items, setItems] = useState(queue);

  useEffect(() => {
    notify = setItems;
    setItems(queue);
    return () => { notify = null; };
  }, []);

  const current = items[0];
  if (Platform.OS !== 'web' || !current) return null;

  const choose = (button) => {
    update(queue.slice(1));
    button?.onPress?.();
  };
  // Escape picks the cancel button; a notice with only one button just closes.
  const dismiss = () => {
    const cancel = current.buttons.find((button) => button.style === 'cancel');
    if (cancel || current.buttons.length === 1) choose(cancel || current.buttons[0]);
  };
  const single = current.buttons.length === 1;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && <Text style={styles.message}>{current.message}</Text>}
          {current.buttons.map((button) => (
            <TouchableOpacity key={button.text} accessibilityRole="button" style={[styles.button, single && styles.buttonPrimary]} onPress={() => choose(button)}>
              <Text style={[styles.buttonText, button.style === 'cancel' && styles.buttonTextCancel, single && styles.buttonTextPrimary]}>{button.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: COLORS.surface, borderColor: COLORS.line, borderWidth: 1, borderRadius: 20, padding: 20 },
  title: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  message: { color: COLORS.subtext, fontSize: 14, lineHeight: 21, marginTop: 8 },
  button: { marginTop: 10, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.input, alignItems: 'center' },
  buttonPrimary: { marginTop: 18, backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  buttonText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  buttonTextPrimary: { color: COLORS.onAccent },
  buttonTextCancel: { color: COLORS.subtext },
});
