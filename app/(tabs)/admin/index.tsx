import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Pencil, CheckCircle } from 'lucide-react-native';

const BASE_URL = 'https://at52tm8me4yfm63sgxb9tx3u2csxcjqs.app.specular.dev';

const COLORS = {
  background: '#F5F0FF',
  surface: '#FFFFFF',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
  coral: '#FF6B6B',
  coralLight: '#FFE8E8',
  blue: '#4ECDC4',
  blueLight: '#E0F7F5',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  yellow: '#FFD93D',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  border: 'rgba(26,26,46,0.08)',
};

type Poll = {
  id: string;
  title: string;
  description?: string;
  option_a_label: string;
  option_b_label: string;
  option_a_emoji: string;
  option_b_emoji: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function PollCard({ poll, index, onPress }: { poll: Poll; index: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const scale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }], marginBottom: 12 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: poll.is_active ? COLORS.purple : COLORS.border,
          boxShadow: poll.is_active
            ? '0 4px 20px rgba(168,85,247,0.15)'
            : '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Emoji pair */}
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: poll.is_active ? COLORS.purpleLight : '#F5F5F5',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 22 }}>
              {poll.option_a_emoji}
              {poll.option_b_emoji}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '800',
                color: COLORS.text,
                flex: 1,
              }} numberOfLines={2}>
                {poll.title}
              </Text>
              {poll.is_active && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: COLORS.greenLight,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}>
                  <CheckCircle size={12} color={COLORS.green} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.green }}>ACTIVE</Text>
                </View>
              )}
            </View>

            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' }}>
              {poll.option_a_label}
              <Text style={{ color: COLORS.border }}> vs </Text>
              {poll.option_b_label}
            </Text>
          </View>

          <View style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: COLORS.purpleLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Pencil size={16} color={COLORS.purple} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const fetchPolls = useCallback(async () => {
    console.log('[AdminScreen] Fetching all polls from', `${BASE_URL}/api/polls`);
    try {
      const res = await fetch(`${BASE_URL}/api/polls`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[AdminScreen] Error fetching polls:', res.status, text);
        setError('Could not load polls');
        return;
      }
      const data = await res.json();
      const pollList: Poll[] = data.polls ?? data;
      console.log('[AdminScreen] Polls loaded:', pollList.length, 'polls');
      setPolls(pollList);
      setError(null);
    } catch (e) {
      console.error('[AdminScreen] Network error:', e);
      setError('No internet connection');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[AdminScreen] Screen focused — refreshing polls');
      setLoading(true);
      fetchPolls().finally(() => {
        setLoading(false);
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, [fetchPolls])
  );

  const handleRefresh = useCallback(async () => {
    console.log('[AdminScreen] Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchPolls();
    setRefreshing(false);
  }, [fetchPolls]);

  const handleCreatePoll = () => {
    console.log('[AdminScreen] User pressed create new poll button');
    router.push('/poll-edit');
  };

  const handleEditPoll = (id: string) => {
    console.log('[AdminScreen] User pressed edit poll:', id);
    router.push({ pathname: '/poll-edit', params: { id } });
  };

  const activeCount = polls.filter(p => p.is_active).length;
  const totalDisplay = polls.length.toString();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={{ marginTop: 16, fontSize: 18, color: COLORS.textSecondary, fontWeight: '600' }}>Loading polls... ⚙️</Text>
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
          onPress={() => { setLoading(true); fetchPolls().finally(() => setLoading(false)); }}
          style={{ marginTop: 24, backgroundColor: COLORS.purple, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.purple}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.purple, letterSpacing: 2, textTransform: 'uppercase' }}>
              ⚙️ Admin Panel
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.text, marginTop: 4, letterSpacing: -0.5 }}>
              Manage Polls
            </Text>
          </View>
          <Pressable
            onPress={handleCreatePoll}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: COLORS.purple,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(168,85,247,0.35)',
            }}
          >
            <Plus size={24} color="#FFF" />
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{
            flex: 1,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.purple }}>{totalDisplay}</Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 }}>Total polls</Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: activeCount > 0 ? COLORS.green : COLORS.border,
          }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: activeCount > 0 ? COLORS.green : COLORS.textSecondary }}>
              {activeCount}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 }}>Active now</Text>
          </View>
        </View>

        {/* Poll list */}
        {polls.length === 0 ? (
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 24,
            padding: 40,
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{ fontSize: 56 }}>📋</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 16 }}>No polls yet</Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>
              Create your first poll to get kids voting!
            </Text>
            <Pressable
              onPress={handleCreatePoll}
              style={{
                marginTop: 20,
                backgroundColor: COLORS.purple,
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Plus size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Create first poll</Text>
            </Pressable>
          </View>
        ) : (
          polls.map((poll, index) => (
            <PollCard
              key={poll.id}
              poll={poll}
              index={index}
              onPress={() => handleEditPoll(poll.id)}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}
