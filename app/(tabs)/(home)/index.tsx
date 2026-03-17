import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_URL = 'https://at52tm8me4yfm63sgxb9tx3u2csxcjqs.app.specular.dev';

const COLORS = {
  background: '#FFF9F0',
  surface: '#FFFFFF',
  coral: '#FF6B6B',
  coralLight: '#FFE8E8',
  blue: '#4ECDC4',
  blueLight: '#E0F7F5',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  border: 'rgba(26,26,46,0.08)',
};

const OPTION_COLORS = [COLORS.coral, COLORS.blue, COLORS.purple, COLORS.amber];
const OPTION_COLORS_LIGHT = [COLORS.coralLight, COLORS.blueLight, COLORS.purpleLight, COLORS.amberLight];
const OPTION_SHADOWS = [
  'rgba(255,107,107,0.25)',
  'rgba(78,205,196,0.25)',
  'rgba(168,85,247,0.25)',
  'rgba(245,158,11,0.25)',
];

type Poll = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  option_a_label: string;
  option_b_label: string;
  option_a_emoji: string;
  option_b_emoji: string;
  option_c_label?: string | null;
  option_c_emoji?: string | null;
  option_d_label?: string | null;
  option_d_emoji?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PollWithCounts = Poll & {
  counts: { a: number; b: number; c: number; d: number; total: number };
};

type VoteChoice = 'a' | 'b' | 'c' | 'd';

type PollOption = {
  key: VoteChoice;
  emoji: string;
  label: string;
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function buildOptions(poll: Poll): PollOption[] {
  const opts: PollOption[] = [
    { key: 'a', emoji: poll.option_a_emoji, label: poll.option_a_label },
    { key: 'b', emoji: poll.option_b_emoji, label: poll.option_b_label },
  ];
  if (poll.option_c_label) {
    opts.push({ key: 'c', emoji: poll.option_c_emoji ?? '😐', label: poll.option_c_label });
  }
  if (poll.option_d_label) {
    opts.push({ key: 'd', emoji: poll.option_d_emoji ?? '🤔', label: poll.option_d_label });
  }
  return opts;
}

export default function VoteScreen() {
  const insets = useSafeAreaInsets();
  const [poll, setPoll] = useState<PollWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<VoteChoice | null>(null);
  const [voting, setVoting] = useState(false);

  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const chosenEmojiScale = useRef(new Animated.Value(1)).current;
  const buttonScales = useRef<Record<string, Animated.Value>>({
    a: new Animated.Value(1),
    b: new Animated.Value(1),
    c: new Animated.Value(1),
    d: new Animated.Value(1),
  }).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const fetchActivePoll = useCallback(async () => {
    console.log('[VoteScreen] Fetching active poll from', `${BASE_URL}/api/polls/active`);
    try {
      const res = await fetch(`${BASE_URL}/api/polls/active`);
      if (res.status === 404) {
        console.log('[VoteScreen] No active poll found (404)');
        setPoll(null);
        setError(null);
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error('[VoteScreen] Error fetching poll:', res.status, text);
        setError('Could not load the poll. Try again!');
        return;
      }
      const data: PollWithCounts = await res.json();
      console.log('[VoteScreen] Active poll loaded:', data.id, data.title);
      setPoll(data);
      setError(null);
    } catch (e) {
      console.error('[VoteScreen] Network error:', e);
      setError('No internet connection 😴');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchActivePoll().finally(() => {
      setLoading(false);
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [fetchActivePoll]);

  const handleVote = useCallback(async (choice: VoteChoice) => {
    if (!poll || voting) return;
    console.log('[VoteScreen] User pressed vote button:', choice, 'for poll:', poll.id);

    if (Platform.OS === 'ios') {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }

    setVoting(true);
    const btnScale = buttonScales[choice];

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
    ]).start();

    try {
      console.log('[VoteScreen] POST', `${BASE_URL}/api/polls/${poll.id}/votes`, { choice });
      const res = await fetch(`${BASE_URL}/api/polls/${poll.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[VoteScreen] Vote failed:', res.status, text);
        setVoting(false);
        return;
      }
      const data = await res.json();
      console.log('[VoteScreen] Vote success:', data);
      setVoted(choice);

      Animated.parallel([
        Animated.spring(chosenEmojiScale, { toValue: 1.6, useNativeDriver: true, speed: 20, bounciness: 12 }),
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(celebrationScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      ]).start();

      setTimeout(() => {
        console.log('[VoteScreen] Resetting vote state for next kid');
        Animated.parallel([
          Animated.timing(celebrationOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.spring(chosenEmojiScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
          Animated.spring(celebrationScale, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 4 }),
        ]).start(() => {
          setVoted(null);
          setVoting(false);
        });
      }, 2200);
    } catch (e) {
      console.error('[VoteScreen] Vote network error:', e);
      setVoting(false);
    }
  }, [poll, voting, buttonScales, chosenEmojiScale, celebrationOpacity, celebrationScale]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.coral} />
        <Text style={{ marginTop: 16, fontSize: 18, color: COLORS.textSecondary, fontWeight: '600' }}>Loading poll... 🎲</Text>
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
            console.log('[VoteScreen] Retry button pressed');
            setLoading(true);
            fetchActivePoll().finally(() => setLoading(false));
          }}
          style={{ marginTop: 24, backgroundColor: COLORS.coral, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 80 }}>😴</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>No poll right now!</Text>
        <Text style={{ fontSize: 17, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>Ask your teacher to start a new poll 🎉</Text>
      </View>
    );
  }

  const hasImage = !!(poll.image_url && poll.image_url.startsWith('http'));
  const titleMarginTop = hasImage ? 20 : 8;
  const options = buildOptions(poll);
  const optionCount = options.length;

  // Determine chosen emoji/label for celebration
  const chosenOption = voted ? options.find(o => o.key === voted) : null;
  const chosenEmoji = chosenOption?.emoji ?? '';
  const chosenLabel = chosenOption?.label ?? '';

  // Layout: 2 = row, 3 = first two row + third full, 4 = 2x2 grid
  const rows: PollOption[][] = [];
  if (optionCount <= 2) {
    rows.push(options);
  } else if (optionCount === 3) {
    rows.push([options[0], options[1]]);
    rows.push([options[2]]);
  } else {
    rows.push([options[0], options[1]]);
    rows.push([options[2], options[3]]);
  }

  return (
    <Animated.View style={{ flex: 1, opacity: contentOpacity, backgroundColor: COLORS.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header label */}
        <View style={{ alignItems: 'center', marginBottom: 8, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.coral, letterSpacing: 2, textTransform: 'uppercase' }}>
            🗳️ Time to Vote!
          </Text>
        </View>

        {/* Photo */}
        {hasImage ? (
          <View style={{
            width: '100%',
            height: 240,
            marginTop: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.14,
            shadowRadius: 12,
            elevation: 6,
          }}>
            <Image
              source={resolveImageSource(poll.image_url)}
              style={{ width: '100%', height: '100%', borderRadius: 20 }}
              contentFit="cover"
            />
          </View>
        ) : null}

        {/* Poll Title */}
        <Text style={{
          fontSize: 30,
          fontWeight: '800',
          color: COLORS.text,
          textAlign: 'center',
          letterSpacing: -0.5,
          lineHeight: 38,
          marginTop: titleMarginTop,
          marginBottom: 10,
          paddingHorizontal: 20,
        }}>
          {poll.title}
        </Text>

        {/* Description */}
        {poll.description ? (
          <Text style={{
            fontSize: 16,
            color: COLORS.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: 20,
            paddingHorizontal: 28,
          }}>
            {poll.description}
          </Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        {/* Vote Buttons */}
        <View style={{ paddingHorizontal: 20, width: '100%', gap: 16 }}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', gap: 16, width: '100%' }}>
              {row.map((opt) => {
                const globalIdx = options.findIndex(o => o.key === opt.key);
                const color = OPTION_COLORS[globalIdx] ?? COLORS.purple;
                const colorLight = OPTION_COLORS_LIGHT[globalIdx] ?? COLORS.purpleLight;
                const shadowColor = OPTION_SHADOWS[globalIdx] ?? 'rgba(168,85,247,0.25)';
                const isVoted = voted === opt.key;
                const isOther = voting && voted !== null && voted !== opt.key;

                return (
                  <Animated.View key={opt.key} style={{ flex: 1, transform: [{ scale: buttonScales[opt.key] }] }}>
                    <Pressable
                      onPress={() => handleVote(opt.key)}
                      disabled={voting}
                      style={{
                        minHeight: 160,
                        borderRadius: 24,
                        backgroundColor: colorLight,
                        borderWidth: 3,
                        borderColor: isVoted ? color : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        opacity: isOther ? 0.5 : 1,
                        boxShadow: `0 6px 24px ${shadowColor}`,
                      }}
                    >
                      <Animated.Text style={{
                        fontSize: 60,
                        transform: [{ scale: isVoted ? chosenEmojiScale : 1 }],
                      }}>
                        {opt.emoji}
                      </Animated.Text>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: '800',
                        color: color,
                        marginTop: 12,
                        textAlign: 'center',
                      }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}

          {/* Tap hint */}
          {!voted && !voting && (
            <Text style={{ marginTop: 4, fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' }}>
              Tap a button to vote! 👆
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Celebration Overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: celebrationOpacity,
        }}
      >
        <Animated.View style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 32,
          padding: 40,
          alignItems: 'center',
          transform: [{ scale: celebrationScale }],
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        }}>
          <Text style={{ fontSize: 80 }}>{chosenEmoji}</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.text, marginTop: 12, textAlign: 'center' }}>
            Thanks for voting!
          </Text>
          <Text style={{ fontSize: 36, marginTop: 4 }}>🎉</Text>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 8, fontWeight: '600' }}>
            You picked
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: '700' }}>
            {chosenLabel}
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
