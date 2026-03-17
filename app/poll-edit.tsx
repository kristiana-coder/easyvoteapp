import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  Animated,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Trash2, RotateCcw, Save, CheckCircle, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const BASE_URL = 'https://at52tm8me4yfm63sgxb9tx3u2csxcjqs.app.specular.dev';

const COLORS = {
  background: '#FAF8FF',
  surface: '#FFFFFF',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
  coral: '#FF6B6B',
  coralLight: '#FFE8E8',
  blue: '#4ECDC4',
  blueLight: '#E0F7F5',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  text: '#1A1A2E',
  textSecondary: '#6B6B8A',
  textTertiary: '#A0A0B8',
  border: 'rgba(26,26,46,0.10)',
  inputBg: '#F5F0FF',
};

type PollForm = {
  title: string;
  description: string;
  image_url: string;
  option_a_label: string;
  option_a_emoji: string;
  option_b_label: string;
  option_b_emoji: string;
  is_active: boolean;
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'url';
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
        keyboardType={keyboardType}
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

export default function PollEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<PollForm>({
    title: '',
    description: '',
    image_url: '',
    option_a_label: 'Like',
    option_a_emoji: '👍',
    option_b_label: 'Dislike',
    option_b_emoji: '👎',
    is_active: false,
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const screenTitle = isEditing ? 'Edit Poll' : 'New Poll';

  const setField = useCallback(<K extends keyof PollForm>(key: K, value: PollForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!isEditing) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }
    console.log('[PollEdit] Fetching poll:', id, 'from', `${BASE_URL}/api/polls/${id}`);
    fetch(`${BASE_URL}/api/polls/${id}`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('[PollEdit] Error loading poll:', res.status, text);
          setError('Could not load poll');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        console.log('[PollEdit] Poll loaded:', data.id, data.title);
        setForm({
          title: data.title ?? '',
          description: data.description ?? '',
          image_url: data.image_url ?? '',
          option_a_label: data.option_a_label ?? 'Like',
          option_a_emoji: data.option_a_emoji ?? '👍',
          option_b_label: data.option_b_label ?? 'Dislike',
          option_b_emoji: data.option_b_emoji ?? '👎',
          is_active: data.is_active ?? false,
        });
      })
      .catch(e => {
        console.error('[PollEdit] Network error loading poll:', e);
        setError('No internet connection');
      })
      .finally(() => {
        setLoading(false);
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
  }, [id, isEditing]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      Alert.alert('Missing question', 'Please enter a question for the poll.');
      return;
    }
    console.log('[PollEdit] User pressed save. isEditing:', isEditing, 'id:', id);
    setSaving(true);
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      image_url: form.image_url.trim() || undefined,
      option_a_label: form.option_a_label.trim() || 'Like',
      option_a_emoji: form.option_a_emoji.trim() || '👍',
      option_b_label: form.option_b_label.trim() || 'Dislike',
      option_b_emoji: form.option_b_emoji.trim() || '👎',
      is_active: form.is_active,
    };

    try {
      const url = isEditing ? `${BASE_URL}/api/polls/${id}` : `${BASE_URL}/api/polls`;
      const method = isEditing ? 'PUT' : 'POST';
      console.log('[PollEdit]', method, url, body);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[PollEdit] Save failed:', res.status, text);
        Alert.alert('Save failed', 'Could not save the poll. Please try again.');
        setSaving(false);
        return;
      }
      const data = await res.json();
      console.log('[PollEdit] Save success:', data.id ?? data);
      router.back();
    } catch (e) {
      console.error('[PollEdit] Save network error:', e);
      Alert.alert('Save failed', 'No internet connection.');
      setSaving(false);
    }
  }, [form, id, isEditing, router]);

  const handleResetVotes = useCallback(() => {
    console.log('[PollEdit] User pressed reset votes for poll:', id);
    Alert.alert(
      'Reset votes?',
      'This will clear all votes for this poll. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset votes',
          style: 'destructive',
          onPress: async () => {
            console.log('[PollEdit] Confirmed reset votes. POST', `${BASE_URL}/api/polls/${id}/reset`);
            try {
              const res = await fetch(`${BASE_URL}/api/polls/${id}/reset`, { method: 'POST' });
              if (!res.ok) {
                const text = await res.text();
                console.error('[PollEdit] Reset failed:', res.status, text);
                Alert.alert('Reset failed', 'Could not reset votes.');
                return;
              }
              const data = await res.json();
              console.log('[PollEdit] Reset success:', data);
              Alert.alert('Done!', 'Votes have been reset.');
            } catch (e) {
              console.error('[PollEdit] Reset network error:', e);
              Alert.alert('Reset failed', 'No internet connection.');
            }
          },
        },
      ]
    );
  }, [id]);

  const handleDelete = useCallback(() => {
    console.log('[PollEdit] User pressed delete poll:', id);
    Alert.alert(
      'Delete poll?',
      'This will permanently delete this poll and all its votes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete poll',
          style: 'destructive',
          onPress: async () => {
            console.log('[PollEdit] Confirmed delete. DELETE', `${BASE_URL}/api/polls/${id}`);
            try {
              const res = await fetch(`${BASE_URL}/api/polls/${id}`, { method: 'DELETE' });
              if (!res.ok) {
                const text = await res.text();
                console.error('[PollEdit] Delete failed:', res.status, text);
                Alert.alert('Delete failed', 'Could not delete the poll.');
                return;
              }
              const data = await res.json();
              console.log('[PollEdit] Delete success:', data);
              router.back();
            } catch (e) {
              console.error('[PollEdit] Delete network error:', e);
              Alert.alert('Delete failed', 'No internet connection.');
            }
          },
        },
      ]
    );
  }, [id, router]);

  const handlePickImage = useCallback(async () => {
    console.log('[PollEdit] User tapped image picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) {
      console.log('[PollEdit] Image picker cancelled');
      return;
    }
    const asset = result.assets[0];
    console.log('[PollEdit] Image picked, uploading to', `${BASE_URL}/api/upload`);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[PollEdit] Upload failed:', res.status, text);
        Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
        return;
      }
      const data = await res.json();
      console.log('[PollEdit] Upload success, url:', data.url);
      setField('image_url', data.url);
    } catch (e) {
      console.error('[PollEdit] Upload network error:', e);
      Alert.alert('Upload failed', 'No internet connection.');
    } finally {
      setUploading(false);
    }
  }, [setField]);

  const handleRemoveImage = useCallback(() => {
    console.log('[PollEdit] User removed image');
    setField('image_url', '');
  }, [setField]);

  const hasImagePreview = form.image_url.startsWith('http');

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
          {/* Question */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.purple, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
              📝 Poll Question
            </Text>
            <FormField
              label="Question *"
              value={form.title}
              onChangeText={v => setField('title', v)}
              placeholder="e.g. What's your favourite pizza topping?"
              multiline
            />
            <FormField
              label="Description (optional)"
              value={form.description}
              onChangeText={v => setField('description', v)}
              placeholder="Add more context for the kids..."
              multiline
            />
            {/* Image Picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Photo (optional)
              </Text>
              <Pressable onPress={handlePickImage} style={{ position: 'relative' }}>
                {hasImagePreview ? (
                  <View style={{ borderRadius: 16, overflow: 'hidden', height: 200, width: '100%' }}>
                    <Image
                      source={resolveImageSource(form.image_url)}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    {uploading && (
                      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#FFF" />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{
                    height: 200,
                    width: '100%',
                    borderRadius: 16,
                    backgroundColor: COLORS.inputBg,
                    borderWidth: 2,
                    borderColor: COLORS.border,
                    borderStyle: 'dashed',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    {uploading ? (
                      <ActivityIndicator size="large" color={COLORS.purple} />
                    ) : (
                      <>
                        <ImageIcon size={36} color={COLORS.textTertiary} />
                        <Text style={{ fontSize: 15, color: COLORS.textTertiary, fontWeight: '600' }}>Tap to add photo</Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>
              {hasImagePreview && (
                <Pressable
                  onPress={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 18, lineHeight: 20, fontWeight: '700' }}>×</Text>
                </Pressable>
              )}
            </View>

            {/* Secondary: manual URL entry */}
            <Pressable
              onPress={() => {
                console.log('[PollEdit] User toggled manual URL input, now:', !showUrlInput);
                setShowUrlInput(v => !v);
              }}
              style={{ marginBottom: showUrlInput ? 8 : 16, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 13, color: COLORS.purple, fontWeight: '600', textDecorationLine: 'underline' }}>
                {showUrlInput ? 'Hide URL input' : 'Or enter image URL'}
              </Text>
            </Pressable>
            {showUrlInput && (
              <FormField
                label="Image URL"
                value={form.image_url}
                onChangeText={v => setField('image_url', v)}
                placeholder="https://..."
                keyboardType="url"
              />
            )}
          </View>

          {/* Options */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Option A */}
            <View style={{
              flex: 1,
              backgroundColor: COLORS.coralLight,
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,107,107,0.2)',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.coral, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                Option A
              </Text>
              <FormField
                label="Label"
                value={form.option_a_label}
                onChangeText={v => setField('option_a_label', v)}
                placeholder="Like"
              />
              <FormField
                label="Emoji"
                value={form.option_a_emoji}
                onChangeText={v => setField('option_a_emoji', v)}
                placeholder="👍"
                maxLength={2}
              />
            </View>

            {/* Option B */}
            <View style={{
              flex: 1,
              backgroundColor: COLORS.blueLight,
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(78,205,196,0.2)',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.blue, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                Option B
              </Text>
              <FormField
                label="Label"
                value={form.option_b_label}
                onChangeText={v => setField('option_b_label', v)}
                placeholder="Dislike"
              />
              <FormField
                label="Emoji"
                value={form.option_b_emoji}
                onChangeText={v => setField('option_b_emoji', v)}
                placeholder="👎"
                maxLength={2}
              />
            </View>
          </View>

          {/* Active toggle */}
          <View style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: form.is_active ? COLORS.green : COLORS.border,
          }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color={form.is_active ? COLORS.green : COLORS.textSecondary} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}>Set as active poll</Text>
              </View>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
                Kids will see this poll on the Vote screen
              </Text>
            </View>
            <Switch
              value={form.is_active}
              onValueChange={v => {
                console.log('[PollEdit] User toggled is_active:', v);
                setField('is_active', v);
              }}
              trackColor={{ false: '#E5E5EA', true: COLORS.green }}
              thumbColor="#FFF"
            />
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
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create poll'}
            </Text>
          </Pressable>

          {/* Editing-only actions */}
          {isEditing && (
            <>
              <Pressable
                onPress={handleResetVotes}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 18,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 10,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: COLORS.blue,
                }}
              >
                <RotateCcw size={18} color={COLORS.blue} />
                <Text style={{ color: COLORS.blue, fontSize: 16, fontWeight: '700' }}>Reset votes</Text>
              </Pressable>

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
                <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>Delete poll</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}
