import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="hand.thumbsup.fill" />
        <Label>Vote</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="results">
        <Icon sf="chart.bar.fill" />
        <Label>Results</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collections">
        <Icon sf="folder.fill" />
        <Label>Folders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="admin">
        <Icon sf="gearshape.fill" />
        <Label>Admin</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
