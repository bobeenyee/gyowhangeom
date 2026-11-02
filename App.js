import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.brand}>교환점</Text>
        <Text style={styles.tagline}>낯선 곳에서 추억을 교환하다.</Text>
        <Text style={styles.caption}>교환학생의 사람과 정보를 한곳에서 연결해요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F5EE',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    fontSize: 44,
    fontWeight: '800',
    color: '#486A55',
    letterSpacing: -1.5,
  },
  tagline: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#3E4A42',
    textAlign: 'center',
  },
  caption: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#7A837D',
    textAlign: 'center',
  },
});
