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
import { Download } from 'lucide-react-native';
import { DonutChart } from '@/components/DonutChart';
import { ResultsModal } from '@/components/ResultsModal';

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
  const barAnim = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  // Available bar width: screen - horizontal padding (40) - card padding (40) - label area (80) - pct badge (70)
  const maxBarWidth = width - 40 - 40 - 80 - 70;

  useEffect(() => {
    barAnim.setValue(0);
    Animated.timing(barAnim, {
      toValue: pct / 100,
      duration: 700,
      delay: index * 150,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animatedWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxBarWidth],
  });

  const pctDisplay = pct + '%';
  const countDisplay = count.toString();

  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      borderWidth: 1,
      borderColor: COLORS.border,
    }}>
      {/* Top row: emoji+label | bar | pct */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Left: emoji + label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 80 }}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1 }} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {/* Middle: bar track */}
        <View style={{ flex: 1, height: 14, backgroundColor: colorLight, borderRadius: 7, overflow: 'hidden' }}>
          <Animated.View style={{
            height: '100%',
            width: animatedWidth,
            backgroundColor: color,
            borderRadius: 7,
          }} />
        </View>

        {/* Right: count + pct */}
        <View style={{ alignItems: 'flex-end', width: 70 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: color }}>{pctDisplay}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginTop: 1 }}>
            {countDisplay}
            <Text style={{ fontWeight: '400' }}> votes</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const [poll, setPoll] = useState<PollWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
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
      contentOpacity.setValue(0);
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
          onPress={() => {
            console.log('[ResultsScreen] User pressed retry');
            setLoading(true);
            fetchResults().finally(() => setLoading(false));
          }}
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
  const leadingText = leadingChoice ? 'Leading' : "It's a tie!";

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
            marginBottom: 20,
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{ fontSize: 48 }}>{leadingEmoji}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8 }}>
              {leadingText}
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

        {/* Column Chart */}
        <View style={{
          backgroundColor: COLORS.surface,
          borderRadius: 24,
          padding: 24,
          marginTop: 8,
          marginBottom: 12,
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
            Vote breakdown
          </Text>
          <DonutChart
            valueA={poll.counts.a}
            valueB={poll.counts.b}
            labelA={poll.option_a_label}
            labelB={poll.option_b_label}
            emojiA={poll.option_a_emoji}
            emojiB={poll.option_b_emoji}
            colorA={COLORS.coral}
            colorB={COLORS.blue}
          />
        </View>

        {/* Total — tappable to open download modal */}
        <Pressable
          onPress={() => {
            console.log('[ResultsScreen] User tapped total votes card — opening ResultsModal for poll:', poll.id);
            setShowModal(true);
          }}
          style={({ pressed }) => ({
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            borderWidth: 1,
            borderColor: COLORS.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24 }}>🗳️</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text }}>
              {totalDisplay}
            </Text>
            <Text style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' }}>
              total votes
            </Text>
            <Download size={16} color={COLORS.textSecondary} />
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6 }}>
            Tap to download
          </Text>
        </Pressable>

        <Text style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: COLORS.textSecondary }}>
          Auto-refreshes every 5 seconds ⚡
        </Text>
      </ScrollView>

      <ResultsModal
        visible={showModal}
        poll={poll}
        onClose={() => {
          console.log('[ResultsScreen] ResultsModal closed');
          setShowModal(false);
        }}
      />
    </Animated.View>
  );
}
