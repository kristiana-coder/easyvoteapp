import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pencil, Download } from 'lucide-react-native';
import { DonutChart, BarOption } from '@/components/DonutChart';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

const BASE_URL = 'https://at52tm8me4yfm63sgxb9tx3u2csxcjqs.app.specular.dev';

const OPTION_COLORS: Record<string, string> = {
  a: '#FF6B6B',
  b: '#4ECDC4',
  c: '#A855F7',
  d: '#F59E0B',
};

const COLORS = {
  background: '#FAF8FF',
  surface: '#FFFFFF',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  textTertiary: '#A0A0B8',
  border: 'rgba(26,26,46,0.08)',
  sectionBg: '#F5F0FF',
};

type PollWithCounts = {
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
  collection_id?: string | null;
  counts: { a: number; b: number; c: number; d: number; total: number };
};

type CombinedResults = {
  total_votes: number;
  total_polls: number;
  by_option: {
    [key: string]: { label: string; total: number; percentage: number };
  };
  polls_summary: {
    poll_id: string;
    poll_title: string;
    counts: { a: number; b: number; c: number; d: number; total: number };
  }[];
};

type CollectionDetail = {
  id: string;
  name: string;
  description?: string;
  color: string;
  emoji: string;
  poll_count?: number;
  created_at: string;
  updated_at: string;
  polls: PollWithCounts[];
  combined_results: CombinedResults;
};

function MiniPollBar({ countA, countB, total, colorA, colorB }: { countA: number; countB: number; total: number; colorA: string; colorB: string }) {
  const widthA = useRef(new Animated.Value(0)).current;
  const widthB = useRef(new Animated.Value(0)).current;
  const pctA = total > 0 ? countA / total : 0;
  const pctB = total > 0 ? countB / total : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthA, { toValue: pctA, duration: 600, delay: 100, useNativeDriver: false }),
      Animated.timing(widthB, { toValue: pctB, duration: 600, delay: 200, useNativeDriver: false }),
    ]).start();
  }, [pctA, pctB]);

  if (total === 0) {
    return <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F0F0F5' }} />;
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 2, height: 6 }}>
      <Animated.View style={{ flex: widthA, height: 6, borderRadius: 3, backgroundColor: colorA }} />
      <Animated.View style={{ flex: widthB, height: 6, borderRadius: 3, backgroundColor: colorB }} />
    </View>
  );
}

function PollMiniCard({ poll, index, onPress }: { poll: PollWithCounts; index: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  const totalVotes = poll.counts?.total ?? 0;
  const totalDisplay = totalVotes.toString();
  const voteLabel = totalVotes === 1 ? 'vote' : 'votes';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }], marginBottom: 10 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        }}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: '#F5F5F5',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>
            {poll.option_a_emoji}
            {poll.option_b_emoji}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }} numberOfLines={2}>
            {poll.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <MiniPollBar
              countA={poll.counts?.a ?? 0}
              countB={poll.counts?.b ?? 0}
              total={totalVotes}
              colorA={OPTION_COLORS.a}
              colorB={OPTION_COLORS.b}
            />
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary }}>
              {totalDisplay}
              <Text style={{ fontWeight: '400' }}> {voteLabel}</Text>
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 16, color: COLORS.textTertiary }}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const chartRef = useRef<View>(null);

  const fetchCollection = useCallback(async () => {
    if (!id) return;
    console.log('[CollectionDetail] Fetching collection:', id, 'from', `${BASE_URL}/api/collections/${id}`);
    try {
      const res = await fetch(`${BASE_URL}/api/collections/${id}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[CollectionDetail] Error fetching collection:', res.status, text);
        setError('Could not load folder');
        return;
      }
      const data: CollectionDetail = await res.json();
      console.log('[CollectionDetail] Collection loaded:', data.name, 'polls:', data.polls?.length, 'total_votes:', data.combined_results?.total_votes);
      setCollection(data);
      setError(null);
    } catch (e) {
      console.error('[CollectionDetail] Network error:', e);
      setError('No internet connection');
    }
  }, [id]);

  useEffect(() => {
    fetchCollection().finally(() => {
      setLoading(false);
      Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    });
  }, [fetchCollection]);

  const handleRefresh = useCallback(async () => {
    console.log('[CollectionDetail] Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchCollection();
    setRefreshing(false);
  }, [fetchCollection]);

  const handleEdit = () => {
    console.log('[CollectionDetail] User pressed edit collection:', id);
    router.push({ pathname: '/collection-edit', params: { id } });
  };

  const handlePollPress = (pollId: string, pollTitle: string) => {
    console.log('[CollectionDetail] User tapped poll:', pollId, pollTitle);
    router.push({ pathname: '/poll-edit', params: { id: pollId } });
  };

  const handleDownloadChart = async () => {
    if (!chartRef.current) return;
    console.log('[CollectionDetail] User pressed download combined chart for collection:', id);
    setDownloading(true);
    try {
      const uri = await captureRef(chartRef, { format: 'png', quality: 1.0 });
      console.log('[CollectionDetail] Chart captured, uri:', uri);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log('[CollectionDetail] MediaLibrary permission status:', status);
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        console.log('[CollectionDetail] Combined chart saved to photo library');
        Alert.alert('Saved!', 'Combined results chart saved to your photo library 📊');
      } else {
        Alert.alert('Permission required', 'Please enable photo library access in Settings to save the chart.');
      }
    } catch (e) {
      console.error('[CollectionDetail] Download error:', e);
      Alert.alert('Download failed', 'Could not save the chart. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const collectionName = collection?.name ?? '';
  const collectionColor = collection?.color ?? COLORS.purple;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerRight: () => null }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </>
    );
  }

  if (error || !collection) {
    return (
      <>
        <Stack.Screen options={{ title: 'Folder' }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 64 }}>😵</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>Oops!</Text>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>{error ?? 'Folder not found'}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: COLORS.purple, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const combined = collection.combined_results;
  const chartOptions: BarOption[] = Object.entries(combined?.by_option ?? {}).map(([key, val]) => ({
    key,
    value: val.total,
    label: val.label,
    emoji: '',
    color: OPTION_COLORS[key] ?? '#999',
  }));

  const totalVotesDisplay = (combined?.total_votes ?? 0).toString();
  const totalPollsDisplay = (combined?.total_polls ?? 0).toString();
  const summaryText = `${totalVotesDisplay} total votes across ${totalPollsDisplay} polls`;

  return (
    <>
      <Stack.Screen
        options={{
          title: collectionName,
          headerRight: () => (
            <Pressable
              onPress={handleEdit}
              style={{ padding: 8 }}
              accessibilityLabel="Edit folder"
            >
              <Pencil size={20} color={collectionColor} />
            </Pressable>
          ),
        }}
      />
      <Animated.View style={{ flex: 1, opacity: contentOpacity, backgroundColor: COLORS.background }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={collectionColor} />
          }
        >
          {/* Banner */}
          <View style={{
            backgroundColor: collectionColor + '18',
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 28,
            borderBottomWidth: 1,
            borderBottomColor: collectionColor + '22',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: collectionColor + '28',
                borderWidth: 2,
                borderColor: collectionColor + '55',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 36 }}>{collection.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 }} numberOfLines={2}>
                  {collection.name}
                </Text>
                {collection.description ? (
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' }} numberOfLines={3}>
                    {collection.description}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            {/* Combined Results */}
            <View style={{
              backgroundColor: '#F5F0FF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.12)',
              boxShadow: '0 2px 12px rgba(168,85,247,0.08)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.purple, letterSpacing: 1, textTransform: 'uppercase' }}>
                  📊 Combined Results
                </Text>
                <Pressable
                  onPress={handleDownloadChart}
                  disabled={downloading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: COLORS.purpleLight,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: COLORS.purple,
                    opacity: downloading ? 0.6 : 1,
                  }}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={COLORS.purple} />
                  ) : (
                    <Download size={14} color={COLORS.purple} />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.purple }}>
                    {downloading ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 20 }}>
                {summaryText}
              </Text>

              {chartOptions.length > 0 ? (
                <View ref={chartRef} collapsable={false} style={{ backgroundColor: '#F5F0FF', borderRadius: 12, paddingVertical: 8 }}>
                  <DonutChart options={chartOptions} total={combined?.total_votes ?? 0} />
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ fontSize: 40 }}>🗳️</Text>
                  <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 8, fontWeight: '600' }}>No votes yet</Text>
                </View>
              )}
            </View>

            {/* Polls in this folder */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
                Polls in this folder
              </Text>

              {collection.polls.length === 0 ? (
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 28,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}>
                  <Text style={{ fontSize: 36 }}>📋</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12 }}>No polls yet</Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' }}>
                    Assign polls to this folder from the Admin tab
                  </Text>
                </View>
              ) : (
                collection.polls.map((poll, index) => (
                  <PollMiniCard
                    key={poll.id}
                    poll={poll}
                    index={index}
                    onPress={() => handlePollPress(poll.id, poll.title)}
                  />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}
