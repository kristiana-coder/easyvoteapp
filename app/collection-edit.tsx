import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Save, Trash2, Check } from 'lucide-react-native';

const BASE_URL = 'https://at52tm8me4yfm63sgxb9tx3u2csxcjqs.app.specular.dev';

const PRESET_COLORS = ['#FF6B6B', '#4ECDC4', '#A855F7', '#F59E0B', '#3B82F6', '#10B981'];

const COLORS = {
  background: '#FAF8FF',
  surface: '#FFFFFF',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  textTertiary: '#A0A0B8',
  border: 'rgba(26,26,46,0.10)',
  inputBg: '#F5F0FF',
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        multiline={multiline}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: COLORS.inputBg,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: COLORS.text,
          borderWidth: 2,
          borderColor: focused ? COLORS.purple : 'transparent',
          minHeight: multiline ? 80 : 52,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function CollectionEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const screenTitle = isEditing ? 'Edit Folder' : 'New Folder';

  useEffect(() => {
    if (!isEditing) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }
    console.log('[CollectionEdit] Fetching collection:', id, 'from', `${BASE_URL}/api/collections/${id}`);
    fetch(`${BASE_URL}/api/collections/${id}`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('[CollectionEdit] Error loading collection:', res.status, text);
          setError('Could not load folder');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        console.log('[CollectionEdit] Collection loaded:', data.id, data.name);
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        setEmoji(data.emoji ?? '📁');
        setColor(data.color ?? PRESET_COLORS[0]);
      })
      .catch(e => {
        console.error('[CollectionEdit] Network error loading collection:', e);
        setError('No internet connection');
      })
      .finally(() => {
        setLoading(false);
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
  }, [id, isEditing]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a name for the folder.');
      return;
    }
    console.log('[CollectionEdit] User pressed save. isEditing:', isEditing, 'id:', id, 'name:', name.trim());
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      emoji: emoji.trim() || '📁',
      color,
    };
    try {
      const url = isEditing ? `${BASE_URL}/api/collections/${id}` : `${BASE_URL}/api/collections`;
      const method = isEditing ? 'PUT' : 'POST';
      console.log('[CollectionEdit]', method, url, body);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[CollectionEdit] Save failed:', res.status, text);
        Alert.alert('Save failed', 'Could not save the folder. Please try again.');
        setSaving(false);
        return;
      }
      const data = await res.json();
      console.log('[CollectionEdit] Save success:', data.id ?? data);
      router.back();
    } catch (e) {
      console.error('[CollectionEdit] Save network error:', e);
      Alert.alert('Save failed', 'No internet connection.');
      setSaving(false);
    }
  }, [name, description, emoji, color, id, isEditing, router]);

  const handleDelete = useCallback(() => {
    console.log('[CollectionEdit] User pressed delete folder:', id);
    Alert.alert(
      'Delete folder?',
      'This will delete the folder. Polls inside will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete folder',
          style: 'destructive',
          onPress: async () => {
            console.log('[CollectionEdit] Confirmed delete. DELETE', `${BASE_URL}/api/collections/${id}`);
            try {
              const res = await fetch(`${BASE_URL}/api/collections/${id}`, { method: 'DELETE' });
              if (!res.ok) {
                const text = await res.text();
                console.error('[CollectionEdit] Delete failed:', res.status, text);
                Alert.alert('Delete failed', 'Could not delete the folder.');
                return;
              }
              const data = await res.json();
              console.log('[CollectionEdit] Delete success:', data);
              router.back();
            } catch (e) {
              console.error('[CollectionEdit] Delete network error:', e);
              Alert.alert('Delete failed', 'No internet connection.');
            }
          },
        },
      ]
    );
  }, [id, router]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: screenTitle }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: screenTitle }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 64 }}>😵</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 16, textAlign: 'center' }}>Oops!</Text>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>{error}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: COLORS.purple, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: screenTitle }} />
      <Animated.View style={{ flex: 1, opacity: contentOpacity, backgroundColor: COLORS.background }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 20,
            paddingTop: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Preview banner */}
          <View style={{
            backgroundColor: color + '18',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            borderWidth: 1,
            borderColor: color + '33',
          }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: color + '28',
              borderWidth: 2,
              borderColor: color + '55',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 32 }}>{emoji || '📁'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>
                {name || 'Folder name'}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>
                {description || 'No description'}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.purple, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              📝 Folder Details
            </Text>
            <FormField
              label="Folder name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Favourite Foods"
              maxLength={60}
            />
            <FormField
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="What is this folder about?"
              multiline
              maxLength={200}
            />

            {/* Emoji picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Emoji
              </Text>
              <TextInput
                value={emoji}
                onChangeText={v => {
                  console.log('[CollectionEdit] User changed emoji to:', v);
                  setEmoji(v);
                }}
                placeholder="📁"
                placeholderTextColor={COLORS.textTertiary}
                maxLength={2}
                style={{
                  backgroundColor: COLORS.inputBg,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 48,
                  textAlign: 'center',
                  color: COLORS.text,
                  borderWidth: 2,
                  borderColor: 'transparent',
                  height: 88,
                }}
              />
            </View>

            {/* Color picker */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Color
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => {
                  const isSelected = color === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        console.log('[CollectionEdit] User selected color:', c);
                        setColor(c);
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: c,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: '#FFF',
                        boxShadow: isSelected ? `0 0 0 3px ${c}` : '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                    >
                      {isSelected && <Check size={20} color="#FFF" strokeWidth={3} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: COLORS.purple,
              borderRadius: 18,
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
              marginBottom: 12,
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 20px rgba(168,85,247,0.35)',
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Save size={20} color="#FFF" />
            )}
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800' }}>
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create folder'}
            </Text>
          </Pressable>

          {/* Delete (edit mode only) */}
          {isEditing && (
            <Pressable
              onPress={handleDelete}
              style={{
                backgroundColor: COLORS.dangerLight,
                borderRadius: 18,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
                borderWidth: 2,
                borderColor: COLORS.danger,
              }}
            >
              <Trash2 size={18} color={COLORS.danger} />
              <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>Delete folder</Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}
