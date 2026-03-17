import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

const BASE_URL = 'https://at52tm8me4yfm63sgxb9tx3u2csxcjqs.app.specular.dev';

const COLORS = {
  background: '#F0F8FF',
  surface: '#FFFFFF',
  coral: '#FF6B6B',
  coralLight: '#FFE8E8',
  blue: '#4ECDC4',
  blueLight: '#E0F7F5',
  purple: '#A855F7',
  yellow: '#FFD93D',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  border: 'rgba(26,26,46,0.08)',
};

type PollWithCounts = {
  id: string;
  title: string;
  description?: string;
  option_a_label: string;
  option_b_label: string;
  option_a_emoji: string;
  option_b_emoji: string;
  is_active: boolean;
  counts: { a: number; b: number; total: number };
};

function ResultBar({
  emoji,
  label,
  count,
  total,
  color,
  colorLight,
  index,
}: {
  emoji: string;
  label: string;
  count: number;
  total: number;
  color: string;
  colorLight: string;
  index: number;
}) {
  const { width } = useWindowDimensions();
  const barWidth = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const maxBarWidth = width - 40 - 32; // screen padding + card padding

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: (pct / 100) * maxBarWidth,
      duration: 700,
      delay: index * 150,
      useNativeDriver: false,
    }).start();
  }, [pct, maxBarWidth]);

  const pctDisplay = pct + '%';
  const countDisplay = count.toString();

  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      borderWidth: 1,
      borderColor: COLORS.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colorLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 30 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }}>{label}</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 }}>
            {countDisplay}
            <Text style={{ color: COLORS.textSecondary }}> votes</Text>
          </Text>
        </View>
        <View style={{
          backgroundColor: colorLight,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: color }}>{pctDisplay}</Text>
        </View>
      </View>

      {/* Bar track */}
      <View style={{
        height: 16,
        backgroundColor: colorLight,
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          height: '100%',
          width: barWidth,
          backgroundColor: color,
          borderRadius: 8,
        }} />
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const [poll, setPoll] = useState<PollWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchResults = useCallback(async (silent = false) => {
    if (!silent) console.log('[ResultsScreen] Fetching active poll results');
    try {
      const res = await fetch(`${BASE_URL}/api/polls/active`);
      if (res.status === 404) {
        console.log('[ResultsScreen] No active poll (404)');
        setPoll(null);
        setError(null);
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error('[ResultsScreen] Error:', res.status, text);
        setError('Could not load results');
        return;
      }
      const data: PollWithCounts = await res.json();
      if (!silent) console.log('[ResultsScreen] Poll loaded:', data.id, 'counts:', data.counts);
      setPoll(data);
      setError(null);
    } catch (e) {
      console.error('[ResultsScreen] Network error:', e);
      if (!silent) setError('No internet connection');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[ResultsScreen] Screen focused — starting auto-refresh');
      setLoading(true);
      fetchResults().finally(() => {
        setLoading(false);
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });

      intervalRef.current = setInterval(() => {
        console.log('[ResultsScreen] Auto-refresh tick');
        fetchResults(true);
      }, 5000);

      return () => {
        console.log('[ResultsScreen] Screen blurred — stopping auto-refresh');
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [fetchResults])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={{ marginTop: 16, fontSize: 18, color: COLORS.textSecondary, fontWeight: '600' }}>Loading results... 📊</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 64 }}>😵</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>Oops!</Text>
        <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>{error}</Text>
        <Pressable
          onPress={() => { setLoading(true); fetchResults().finally(() => setLoading(false)); }}
          style={{ marginTop: 24, backgroundColor: COLORS.blue, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 80 }}>📊</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>No results yet!</Text>
        <Text style={{ fontSize: 17, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>Results will appear here once a poll is active 🗳️</Text>
      </View>
    );
  }

  const totalDisplay = poll.counts.total.toString();
  const leadingChoice = poll.counts.a > poll.counts.b ? 'a' : poll.counts.b > poll.counts.a ? 'b' : null;
  const leadingEmoji = leadingChoice === 'a' ? poll.option_a_emoji : leadingChoice === 'b' ? poll.option_b_emoji : '🤝';
  const leadingLabel = leadingChoice === 'a' ? poll.option_a_label : leadingChoice === 'b' ? poll.option_b_label : 'Tie!';

  return (
    <Animated.View style={{ flex: 1, opacity: contentOpacity, backgroundColor: COLORS.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.blue, letterSpacing: 2, textTransform: 'uppercase' }}>
            📊 Live Results
          </Text>
        </View>

        {/* Poll Title */}
        <Text style={{
          fontSize: 28,
          fontWeight: '900',
          color: COLORS.text,
          textAlign: 'center',
          letterSpacing: -0.5,
          lineHeight: 36,
          marginBottom: 24,
        }}>
          {poll.title}
        </Text>

        {/* Leading card */}
        {poll.counts.total > 0 && (
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 24,
            padding: 20,
            marginBottom: 24,
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{ fontSize: 48 }}>{leadingEmoji}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8 }}>
              {leadingChoice ? 'Leading' : 'It\'s a tie!'}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 4 }}>
              {leadingLabel}
            </Text>
          </View>
        )}

        {/* Result Bars */}
        <ResultBar
          emoji={poll.option_a_emoji}
          label={poll.option_a_label}
          count={poll.counts.a}
          total={poll.counts.total}
          color={COLORS.coral}
          colorLight={COLORS.coralLight}
          index={0}
        />
        <ResultBar
          emoji={poll.option_b_emoji}
          label={poll.option_b_label}
          count={poll.counts.b}
          total={poll.counts.total}
          color={COLORS.blue}
          colorLight={COLORS.blueLight}
          index={1}
        />

        {/* Total */}
        <View style={{
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 20,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}>
          <Text style={{ fontSize: 24 }}>🗳️</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text }}>
            {totalDisplay}
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' }}>
            total votes
          </Text>
        </View>

        <Text style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: COLORS.textSecondary }}>
          Auto-refreshes every 5 seconds ⚡
        </Text>
      </ScrollView>
    </Animated.View>
  );
}
