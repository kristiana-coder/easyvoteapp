import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Folder } from 'lucide-react-native';
import { BASE_URL } from '@/utils/api';

const COLORS = {
  background: '#FAF8FF',
  surface: '#FFFFFF',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  textTertiary: '#A0A0B8',
  border: 'rgba(26,26,46,0.08)',
};

type Collection = {
  id: string;
  name: string;
  description?: string;
  color: string;
  emoji: string;
  poll_count?: number;
  created_at: string;
  updated_at: string;
};

function CollectionCard({ collection, index, onPress }: { collection: Collection; index: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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

  const pollCountText = collection.poll_count === 1 ? '1 poll' : `${collection.poll_count ?? 0} polls`;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }], marginBottom: 12 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* Emoji circle */}
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: collection.color + '22',
          borderWidth: 2,
          borderColor: collection.color + '44',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 32 }}>{collection.emoji}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 }} numberOfLines={1}>
            {collection.name}
          </Text>
          {collection.description ? (
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 3, fontWeight: '500' }} numberOfLines={2}>
              {collection.description}
            </Text>
          ) : null}
          <View style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            backgroundColor: collection.color + '18',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: collection.color }}>
              {pollCountText}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <Text style={{ fontSize: 20, color: COLORS.textTertiary, fontWeight: '300' }}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      opacity,
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
    }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#E8E0F5' }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ width: '60%', height: 18, borderRadius: 9, backgroundColor: '#E8E0F5' }} />
        <View style={{ width: '80%', height: 13, borderRadius: 6, backgroundColor: '#EEE8FA' }} />
        <View style={{ width: 70, height: 22, borderRadius: 8, backgroundColor: '#EEE8FA' }} />
      </View>
    </Animated.View>
  );
}

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const fetchCollections = useCallback(async () => {
    console.log('[CollectionsScreen] Fetching collections from', `${BASE_URL}/api/collections`);
    try {
      const res = await fetch(`${BASE_URL}/api/collections`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[CollectionsScreen] Error fetching collections:', res.status, text);
        setError('Could not load folders');
        return;
      }
      const data = await res.json();
      const list: Collection[] = data.collections ?? data;
      console.log('[CollectionsScreen] Collections loaded:', list.length);
      setCollections(list);
      setError(null);
    } catch (e) {
      console.error('[CollectionsScreen] Network error:', e);
      setError('No internet connection');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[CollectionsScreen] Screen focused — refreshing');
      setLoading(true);
      fetchCollections().finally(() => {
        setLoading(false);
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, [fetchCollections])
  );

  const handleRefresh = useCallback(async () => {
    console.log('[CollectionsScreen] Pull-to-refresh triggered');
    setRefreshing(true);
    await fetchCollections();
    setRefreshing(false);
  }, [fetchCollections]);

  const handleCreate = () => {
    console.log('[CollectionsScreen] User pressed create new folder');
    router.push('/collection-edit');
  };

  const handleCardPress = (id: string, name: string) => {
    console.log('[CollectionsScreen] User tapped collection:', id, name);
    router.push({ pathname: '/collection-detail', params: { id } });
  };

  if (error && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 64 }}>😵</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>Oops!</Text>
        <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>{error}</Text>
        <Pressable
          onPress={() => {
            console.log('[CollectionsScreen] User pressed retry');
            setLoading(true);
            fetchCollections().finally(() => setLoading(false));
          }}
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.purple} />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.purple, letterSpacing: 2, textTransform: 'uppercase' }}>
              📁 Folders
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.text, marginTop: 4, letterSpacing: -0.5 }}>
              Collections
            </Text>
          </View>
          <Pressable
            onPress={handleCreate}
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

        {/* Content */}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : collections.length === 0 ? (
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 24,
            padding: 40,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: COLORS.purpleLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Folder size={36} color={COLORS.purple} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text }}>No folders yet</Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', maxWidth: 260 }}>
              Group your polls into folders to see combined results
            </Text>
            <Pressable
              onPress={handleCreate}
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
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Create first folder 📁</Text>
            </Pressable>
          </View>
        ) : (
          collections.map((col, index) => (
            <CollectionCard
              key={col.id}
              collection={col}
              index={index}
              onPress={() => handleCardPress(col.id, col.name)}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}
