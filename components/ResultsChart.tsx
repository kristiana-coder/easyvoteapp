import React from 'react';
import { View, Text, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { DonutChart } from '@/components/DonutChart';

export type PollWithCounts = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  option_a_label: string;
  option_b_label: string;
  option_a_emoji: string;
  option_b_emoji: string;
  is_active: boolean;
  counts: { a: number; b: number; total: number };
};

const CORAL = '#FF6B6B';
const TEAL = '#4ECDC4';
const CORAL_LIGHT = '#FFE8E8';
const TEAL_LIGHT = '#E0F7F5';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function HorizontalBar({
  emoji,
  label,
  count,
  total,
  color,
  colorLight,
}: {
  emoji: string;
  label: string;
  count: number;
  total: number;
  color: string;
  colorLight: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barWidth = pct + '%';
  const pctDisplay = pct + '%';
  const countDisplay = count.toString();

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A2E' }}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color }}>{pctDisplay}</Text>
          <Text style={{ fontSize: 12, color: '#6B6B8A', fontWeight: '600' }}>
            {countDisplay}
            <Text style={{ fontWeight: '400' }}> votes</Text>
          </Text>
        </View>
      </View>
      <View style={{ height: 14, backgroundColor: colorLight, borderRadius: 7, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: barWidth, backgroundColor: color, borderRadius: 7 }} />
      </View>
    </View>
  );
}

interface ResultsChartProps {
  poll: PollWithCounts;
}

export function ResultsChart({ poll }: ResultsChartProps) {
  const hasImage = Boolean(poll.image_url);
  const totalDisplay = poll.counts.total.toString();
  const totalLabel = poll.counts.total === 1 ? 'total vote' : 'total votes';

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      width: '100%',
    }}>
      {/* Title */}
      <Text style={{
        fontSize: 22,
        fontWeight: '900',
        color: '#1A1A2E',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.3,
      }}>
        {poll.title}
      </Text>

      {/* Subtitle / description */}
      {poll.description ? (
        <Text style={{
          fontSize: 14,
          color: '#6B6B8A',
          textAlign: 'center',
          marginBottom: 16,
          fontWeight: '500',
        }}>
          {poll.description}
        </Text>
      ) : (
        <View style={{ marginBottom: 16 }} />
      )}

      {/* Poll image */}
      {hasImage && (
        <View style={{ borderRadius: 14, overflow: 'hidden', height: 180, marginBottom: 20 }}>
          <Image
            source={resolveImageSource(poll.image_url)}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
      )}

      {/* Horizontal bar chart */}
      <View style={{
        backgroundColor: '#F8F5FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
      }}>
        <HorizontalBar
          emoji={poll.option_a_emoji}
          label={poll.option_a_label}
          count={poll.counts.a}
          total={poll.counts.total}
          color={CORAL}
          colorLight={CORAL_LIGHT}
        />
        <HorizontalBar
          emoji={poll.option_b_emoji}
          label={poll.option_b_label}
          count={poll.counts.b}
          total={poll.counts.total}
          color={TEAL}
          colorLight={TEAL_LIGHT}
        />
      </View>

      {/* Donut chart */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <DonutChart
          valueA={poll.counts.a}
          valueB={poll.counts.b}
          labelA={poll.option_a_label}
          labelB={poll.option_b_label}
          colorA={CORAL}
          colorB={TEAL}
          size={180}
          strokeWidth={20}
        />
      </View>

      {/* Total votes footer */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(26,26,46,0.07)',
      }}>
        <Text style={{ fontSize: 24 }}>📊</Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1A1A2E' }}>{totalDisplay}</Text>
        <Text style={{ fontSize: 14, color: '#6B6B8A', fontWeight: '600' }}>{totalLabel}</Text>
      </View>
    </View>
  );
}
