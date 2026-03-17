import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { ResultsChart, PollWithCounts } from '@/components/ResultsChart';

interface ResultsModalProps {
  visible: boolean;
  poll: PollWithCounts | null;
  onClose: () => void;
}

export function ResultsModal({ visible, poll, onClose }: ResultsModalProps) {
  const chartRef = useRef<View>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    console.log('[ResultsModal] User pressed Download Chart for poll:', poll?.id, poll?.title);
    setDownloading(true);
    try {
      const uri = await captureRef(chartRef, {
        format: 'png',
        quality: 1.0,
      });
      console.log('[ResultsModal] Chart captured, uri:', uri);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log('[ResultsModal] MediaLibrary permission status:', status);

      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        console.log('[ResultsModal] Chart saved to photo library');
        Alert.alert('Saved!', 'Results chart saved to your photo library 📊');
      } else {
        console.warn('[ResultsModal] MediaLibrary permission denied');
        Alert.alert(
          'Permission required',
          'Please enable photo library access in Settings to save the chart.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error('[ResultsModal] Download error:', e);
      Alert.alert('Download failed', 'Could not save the chart. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!poll) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#F5F0FF' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'ios' ? 16 : 20,
          paddingBottom: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(26,26,46,0.08)',
        }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.3 }}>
            Results
          </Text>
          <Pressable
            onPress={() => {
              console.log('[ResultsModal] User closed results modal for poll:', poll.id);
              onClose();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(26,26,46,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20, color: '#1A1A2E', fontWeight: '600', lineHeight: 22 }}>×</Text>
          </Pressable>
        </View>

        {/* Scrollable chart area */}
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ViewShot target — white background for clean capture */}
          <View
            ref={chartRef}
            collapsable={false}
            style={{ backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden' }}
          >
            <ResultsChart poll={poll} />
          </View>
        </ScrollView>

        {/* Download button pinned at bottom */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: Platform.OS === 'ios' ? 36 : 20,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(26,26,46,0.08)',
        }}>
          <Pressable
            onPress={handleDownload}
            disabled={downloading}
            style={{
              backgroundColor: '#A855F7',
              borderRadius: 18,
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
              opacity: downloading ? 0.7 : 1,
              boxShadow: '0 4px 20px rgba(168,85,247,0.35)',
            }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={{ fontSize: 20 }}>📥</Text>
            )}
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800' }}>
              {downloading ? 'Saving...' : 'Download Chart 📥'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
